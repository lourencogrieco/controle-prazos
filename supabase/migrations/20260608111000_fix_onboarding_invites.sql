-- Reconcilia convite pendente por email no signup antes de criar nova empresa.

create or replace function public.criar_empresa_e_usuario(
  p_nome_usuario text,
  p_nome_empresa text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_empresa_id uuid;
  v_empresa_nome text := coalesce(nullif(trim(p_nome_empresa), ''), 'Minha empresa');
begin
  if v_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  select u.email
  into v_email
  from auth.users u
  where u.id = v_user_id;

  select ue.empresa_id
  into v_empresa_id
  from public.usuarios_empresa ue
  where ue.user_id = v_user_id
  limit 1;

  if v_empresa_id is not null then
    insert into public.pje_config (empresa_id, nomes, ativo)
    values (v_empresa_id::text, '{}', true)
    on conflict (empresa_id) do nothing;
    return v_empresa_id;
  end if;

  if v_email is not null then
    select ue.empresa_id
    into v_empresa_id
    from public.usuarios_empresa ue
    where ue.user_id is null
      and lower(ue.email) = lower(v_email)
    order by ue.id
    limit 1;

    if v_empresa_id is not null then
      update public.usuarios_empresa ue
      set user_id = v_user_id,
          nome = coalesce(nullif(trim(p_nome_usuario), ''), ue.nome, v_email),
          email = v_email
      where ue.empresa_id = v_empresa_id
        and ue.user_id is null
        and lower(ue.email) = lower(v_email);

      insert into public.pje_config (empresa_id, nomes, ativo)
      values (v_empresa_id::text, '{}', true)
      on conflict (empresa_id) do nothing;
      return v_empresa_id;
    end if;
  end if;

  v_empresa_id := gen_random_uuid();

  insert into public.empresas (id, nome, criado_por)
  values (v_empresa_id, v_empresa_nome, v_user_id);

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
    v_user_id,
    coalesce(nullif(trim(p_nome_usuario), ''), v_email),
    v_email,
    'socio_fundador'
  );

  insert into public.pje_config (empresa_id, nomes, ativo)
  values (v_empresa_id::text, '{}', true)
  on conflict (empresa_id) do nothing;

  return v_empresa_id;
end;
$$;

grant execute on function public.criar_empresa_e_usuario(text, text) to authenticated;
