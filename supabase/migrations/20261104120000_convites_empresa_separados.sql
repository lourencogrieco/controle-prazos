-- Separa convites pendentes de vínculos efetivos.
-- usuarios_empresa continua exigindo user_id: um convite ainda não é um usuário.

-- A tabela ja existe em producao para convites por codigo. As colunas abaixo
-- ampliam esse modelo sem invalidar convites legados.
create table if not exists public.convites_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null default encode(gen_random_bytes(12), 'hex'),
  criado_por uuid not null references auth.users(id),
  created_at timestamptz default now(),
  usado_em timestamptz null,
  usado_por uuid null references auth.users(id)
);

alter table public.convites_empresa
  add column if not exists nome text,
  add column if not exists email text,
  add column if not exists perfil text,
  add column if not exists area_id text references public.areas_juridicas(id) on delete set null;

alter table public.convites_empresa drop constraint if exists convites_empresa_dados_email_check;
alter table public.convites_empresa add constraint convites_empresa_dados_email_check check (
  email is null or (
    nullif(btrim(nome), '') is not null
    and position('@' in email) > 1
    and perfil in (
      'estagiario', 'advogado', 'coordenador', 'socio', 'socio_fundador',
      'financeiro', 'controller', 'admin', 'adm'
    )
  )
);

create unique index if not exists idx_convites_empresa_email_pendente
  on public.convites_empresa (empresa_id, lower(email))
  where usado_em is null and email is not null;

create index if not exists idx_convites_empresa_email_status
  on public.convites_empresa (lower(email), usado_em);

alter table public.convites_empresa enable row level security;

drop policy if exists lhub_convites_select on public.convites_empresa;
create policy lhub_convites_select
on public.convites_empresa
for select
to authenticated
using (public.can_manage_empresa(empresa_id));

revoke all on table public.convites_empresa from public, anon, authenticated;
grant select on table public.convites_empresa to authenticated;

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
    where a.id = p_area_id and a.empresa_id = p_empresa_id
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

create or replace function public.aceitar_convite_empresa(
  p_user_id uuid,
  p_email text,
  p_nome text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convite public.convites_empresa%rowtype;
  v_empresa_nome text;
  v_empresa_id uuid;
begin
  if p_user_id is null or nullif(btrim(p_email), '') is null then
    return null;
  end if;

  if exists (select 1 from public.usuarios_empresa where user_id = p_user_id) then
    select empresa_id into v_empresa_id
    from public.usuarios_empresa where user_id = p_user_id limit 1;
    return v_empresa_id;
  end if;

  select * into v_convite
  from public.convites_empresa
  where usado_em is null and email is not null and lower(email) = lower(btrim(p_email))
  order by created_at
  for update skip locked
  limit 1;

  if v_convite.id is null then
    return null;
  end if;

  select nome into v_empresa_nome from public.empresas where id = v_convite.empresa_id;

  insert into public.usuarios_empresa (
    empresa_id, empresa_nome, user_id, nome, email, perfil, area_id
  ) values (
    v_convite.empresa_id,
    v_empresa_nome,
    p_user_id,
    coalesce(nullif(btrim(p_nome), ''), v_convite.nome, p_email),
    lower(btrim(p_email)),
    v_convite.perfil,
    v_convite.area_id
  );

  update public.convites_empresa
  set usado_por = p_user_id, usado_em = now()
  where id = v_convite.id;

  return v_convite.empresa_id;
end;
$$;

revoke all on function public.aceitar_convite_empresa(uuid, text, text) from public, anon, authenticated;

-- O cadastro autenticado tenta o convite antes de criar uma empresa nova.
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
  v_empresa_nome text := coalesce(nullif(btrim(p_nome_empresa), ''), 'Minha empresa');
begin
  if v_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  select empresa_id into v_empresa_id
  from public.usuarios_empresa where user_id = v_user_id limit 1;

  if v_empresa_id is not null then
    return v_empresa_id;
  end if;

  v_empresa_id := public.aceitar_convite_empresa(v_user_id, v_email, p_nome_usuario);
  if v_empresa_id is not null then
    return v_empresa_id;
  end if;

  v_empresa_id := gen_random_uuid();
  insert into public.empresas (id, nome, criado_por)
  values (v_empresa_id, v_empresa_nome, v_user_id);

  insert into public.usuarios_empresa (
    empresa_id, empresa_nome, user_id, nome, email, perfil
  ) values (
    v_empresa_id, v_empresa_nome, v_user_id,
    coalesce(nullif(btrim(p_nome_usuario), ''), v_email), v_email, 'socio_fundador'
  );

  insert into public.pje_config (empresa_id, nomes, ativo)
  values (v_empresa_id::text, '{}', true)
  on conflict (empresa_id) do nothing;

  return v_empresa_id;
end;
$$;

grant execute on function public.criar_empresa_e_usuario(text, text) to authenticated;

-- O trigger de Auth também consome o convite antes do provisionamento normal.
create or replace function public.handle_novo_usuario_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
begin
  v_empresa_id := public.aceitar_convite_empresa(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', new.email)
  );

  if v_empresa_id is null then
    perform public.provisionar_usuario_empresa_auth(
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data, '{}'::jsonb)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.handle_novo_usuario_empresa() from public, anon, authenticated;
