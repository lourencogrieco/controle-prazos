-- Cria empresa e vínculo no mesmo cadastro do Auth.
-- Isso elimina a segunda etapa e também recupera usuários que ficaram parciais.

create or replace function public.provisionar_usuario_empresa_auth(
  p_user_id uuid,
  p_email text,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_empresa_nome text := nullif(trim(p_metadata ->> 'empresa'), '');
  v_nome text := coalesce(nullif(trim(p_metadata ->> 'nome'), ''), p_email);
begin
  select ue.empresa_id
  into v_empresa_id
  from public.usuarios_empresa ue
  where ue.user_id = p_user_id
  limit 1;

  if v_empresa_id is not null then
    return v_empresa_id;
  end if;

  -- Sem empresa no metadata, trata-se de convite ou conta administrativa.
  if v_empresa_nome is null then
    return null;
  end if;

  -- Reaproveita um convite pendente feito para o mesmo e-mail.
  if p_email is not null then
    update public.usuarios_empresa ue
    set user_id = p_user_id,
        nome = v_nome,
        email = p_email
    where ue.id = (
      select pendente.id
      from public.usuarios_empresa pendente
      where pendente.user_id is null
        and lower(pendente.email) = lower(p_email)
      order by pendente.id
      limit 1
    )
    returning ue.empresa_id into v_empresa_id;
  end if;

  if v_empresa_id is null then
    v_empresa_id := gen_random_uuid();

    insert into public.empresas (id, nome, criado_por)
    values (v_empresa_id, v_empresa_nome, p_user_id);

    insert into public.usuarios_empresa (
      empresa_id,
      empresa_nome,
      user_id,
      nome,
      email,
      perfil
    ) values (
      v_empresa_id,
      v_empresa_nome,
      p_user_id,
      v_nome,
      p_email,
      'socio_fundador'
    );
  end if;

  insert into public.pje_config (empresa_id, nomes, ativo)
  values (v_empresa_id::text, '{}', true)
  on conflict (empresa_id) do nothing;

  return v_empresa_id;
end;
$$;

revoke all on function public.provisionar_usuario_empresa_auth(uuid, text, jsonb) from public;

create or replace function public.handle_novo_usuario_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provisionar_usuario_empresa_auth(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  );
  return new;
end;
$$;

revoke all on function public.handle_novo_usuario_empresa() from public;

drop trigger if exists on_auth_user_created_empresa on auth.users;
create trigger on_auth_user_created_empresa
after insert on auth.users
for each row execute function public.handle_novo_usuario_empresa();

-- Repara cadastros anteriores que possuem empresa no metadata, mas não vínculo.
do $$
declare
  v_user auth.users%rowtype;
begin
  for v_user in
    select u.*
    from auth.users u
    where nullif(trim(u.raw_user_meta_data ->> 'empresa'), '') is not null
      and not exists (
        select 1
        from public.usuarios_empresa ue
        where ue.user_id = u.id
      )
  loop
    perform public.provisionar_usuario_empresa_auth(
      v_user.id,
      v_user.email,
      coalesce(v_user.raw_user_meta_data, '{}'::jsonb)
    );
  end loop;
end;
$$;
