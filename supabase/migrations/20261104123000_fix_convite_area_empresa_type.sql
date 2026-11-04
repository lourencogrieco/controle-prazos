-- areas_juridicas.empresa_id e texto no schema legado; a empresa do convite e uuid.
-- Mantem a assinatura publica e faz a comparacao de tenant com cast explicito.

create or replace function public.convidar_usuario_empresa(
  p_empresa_id uuid,
  p_nome text,
  p_email text,
  p_perfil text,
  p_area_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text := lower(btrim(p_email));
begin
  if not public.can_manage_empresa(p_empresa_id) then
    raise exception 'Sem permissao para convidar usuarios desta empresa.';
  end if;

  if nullif(btrim(p_nome), '') is null or v_email is null or position('@' in v_email) <= 1 then
    raise exception 'Nome e email validos sao obrigatorios.';
  end if;

  if p_perfil is null or p_perfil not in (
    'estagiario', 'advogado', 'coordenador', 'socio', 'socio_fundador',
    'financeiro', 'controller', 'admin', 'adm'
  ) then
    raise exception 'Perfil invalido.';
  end if;

  if p_area_id is not null and not exists (
    select 1 from public.areas_juridicas a
    where a.id = p_area_id and a.empresa_id = p_empresa_id::text
  ) then
    raise exception 'Area invalida para esta empresa.';
  end if;

  if exists (
    select 1
    from public.usuarios_empresa ue
    join auth.users au on au.id = ue.user_id
    where ue.empresa_id = p_empresa_id and lower(au.email) = v_email
  ) then
    raise exception 'Este email ja pertence a um usuario da empresa.';
  end if;

  insert into public.convites_empresa (
    empresa_id, nome, email, perfil, area_id, criado_por
  ) values (
    p_empresa_id, btrim(p_nome), v_email, p_perfil, p_area_id, auth.uid()
  )
  on conflict (empresa_id, lower(email)) where usado_em is null and email is not null
  do update set
    nome = excluded.nome,
    perfil = excluded.perfil,
    area_id = excluded.area_id,
    criado_por = auth.uid(),
    created_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.convidar_usuario_empresa(uuid, text, text, text, text) from public;
grant execute on function public.convidar_usuario_empresa(uuid, text, text, text, text) to authenticated;
