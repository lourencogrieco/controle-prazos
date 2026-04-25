-- Fundação SaaS: multi-tenant, RLS e índices operacionais.
-- Esta migration é intencionalmente idempotente e tolera tabelas ausentes.

-- ─────────────────────────────────────────────────────────────────────
-- Helpers de tenant/perfil
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.user_empresa_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ue.empresa_id
  from public.usuarios_empresa ue
  where ue.user_id = auth.uid()
$$;

create or replace function public.is_empresa_member(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios_empresa ue
    where ue.user_id = auth.uid()
      and ue.empresa_id = p_empresa_id
  )
$$;

create or replace function public.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.is_empresa_member(p_empresa_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_empresa_member(public.try_uuid(p_empresa_id))
$$;

create or replace function public.has_empresa_role(p_empresa_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios_empresa ue
    where ue.user_id = auth.uid()
      and ue.empresa_id = p_empresa_id
      and ue.perfil = any (p_roles)
  )
$$;

create or replace function public.has_empresa_role(p_empresa_id text, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_empresa_role(public.try_uuid(p_empresa_id), p_roles)
$$;

create or replace function public.can_manage_empresa(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_empresa_role(
    p_empresa_id,
    array['admin','adm','socio_fundador','socio','controller','coordenador']
  )
$$;

create or replace function public.can_manage_empresa(p_empresa_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_empresa(public.try_uuid(p_empresa_id))
$$;

grant execute on function public.user_empresa_ids() to authenticated;
grant execute on function public.is_empresa_member(uuid) to authenticated;
grant execute on function public.is_empresa_member(text) to authenticated;
grant execute on function public.has_empresa_role(uuid, text[]) to authenticated;
grant execute on function public.has_empresa_role(text, text[]) to authenticated;
grant execute on function public.can_manage_empresa(uuid) to authenticated;
grant execute on function public.can_manage_empresa(text) to authenticated;
grant execute on function public.try_uuid(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- RLS por tabela de empresa
-- ─────────────────────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'pastas',
    'prazos_lhub',
    'tarefas_lhub',
    'tipos_pasta',
    'clientes_lhub',
    'areas_juridicas',
    'intimacoes_pje',
    'pje_config',
    'agenda_eventos',
    'honorarios',
    'cobrancas',
    'contas_pagar',
    'despesas',
    'oportunidades_crm',
    'andamentos_processo',
    'documentos_pasta'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);

      if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'lhub_tenant_select') then
        execute format(
          'create policy lhub_tenant_select on public.%I for select to authenticated using (public.is_empresa_member(empresa_id))',
          t
        );
      end if;

      if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'lhub_tenant_insert') then
        execute format(
          'create policy lhub_tenant_insert on public.%I for insert to authenticated with check (public.is_empresa_member(empresa_id))',
          t
        );
      end if;

      if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'lhub_tenant_update') then
        execute format(
          'create policy lhub_tenant_update on public.%I for update to authenticated using (public.is_empresa_member(empresa_id)) with check (public.is_empresa_member(empresa_id))',
          t
        );
      end if;

      if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'lhub_tenant_delete') then
        execute format(
          'create policy lhub_tenant_delete on public.%I for delete to authenticated using (public.is_empresa_member(empresa_id))',
          t
        );
      end if;
    end if;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- usuarios_empresa: evita isolamento quebrado e permite gestão por perfil
-- ─────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.usuarios_empresa') is not null then
    alter table public.usuarios_empresa enable row level security;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'usuarios_empresa' and policyname = 'lhub_users_select') then
      create policy lhub_users_select
      on public.usuarios_empresa
      for select
      to authenticated
      using (user_id = auth.uid() or public.is_empresa_member(empresa_id));
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'usuarios_empresa' and policyname = 'lhub_users_insert') then
      create policy lhub_users_insert
      on public.usuarios_empresa
      for insert
      to authenticated
      with check (public.can_manage_empresa(empresa_id));
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'usuarios_empresa' and policyname = 'lhub_users_update') then
      create policy lhub_users_update
      on public.usuarios_empresa
      for update
      to authenticated
      using (public.can_manage_empresa(empresa_id) or user_id = auth.uid())
      with check (public.can_manage_empresa(empresa_id) or user_id = auth.uid());
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'usuarios_empresa' and policyname = 'lhub_users_delete') then
      create policy lhub_users_delete
      on public.usuarios_empresa
      for delete
      to authenticated
      using (public.can_manage_empresa(empresa_id));
    end if;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- audit_log: usuário pode inserir logs da própria empresa; leitura gerencial.
-- ─────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.audit_log') is not null then
    alter table public.audit_log enable row level security;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audit_log' and policyname = 'lhub_audit_select') then
      create policy lhub_audit_select
      on public.audit_log
      for select
      to authenticated
      using (public.can_manage_empresa(empresa_id));
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audit_log' and policyname = 'lhub_audit_insert') then
      create policy lhub_audit_insert
      on public.audit_log
      for insert
      to authenticated
      with check (public.is_empresa_member(empresa_id) and user_id = auth.uid());
    end if;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- RPC de gestão de perfil usada pelo frontend.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.update_user_perfil(p_id uuid, p_perfil text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
begin
  select empresa_id
  into v_empresa_id
  from public.usuarios_empresa
  where id = p_id;

  if v_empresa_id is null then
    raise exception 'Usuário não encontrado';
  end if;

  if not public.can_manage_empresa(v_empresa_id) then
    raise exception 'Sem permissão para alterar perfil';
  end if;

  update public.usuarios_empresa
  set perfil = p_perfil
  where id = p_id
    and empresa_id = v_empresa_id;
end;
$$;

grant execute on function public.update_user_perfil(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- Storage: bucket documentos usa prefixo empresa_id/pasta_id/arquivo.
-- ─────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('storage.objects') is not null then
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'lhub_docs_select') then
      create policy lhub_docs_select
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'documentos'
        and public.is_empresa_member(public.try_uuid((storage.foldername(name))[1]))
      );
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'lhub_docs_insert') then
      create policy lhub_docs_insert
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'documentos'
        and public.is_empresa_member(public.try_uuid((storage.foldername(name))[1]))
      );
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'lhub_docs_update') then
      create policy lhub_docs_update
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'documentos'
        and public.is_empresa_member(public.try_uuid((storage.foldername(name))[1]))
      )
      with check (
        bucket_id = 'documentos'
        and public.is_empresa_member(public.try_uuid((storage.foldername(name))[1]))
      );
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'lhub_docs_delete') then
      create policy lhub_docs_delete
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'documentos'
        and public.is_empresa_member(public.try_uuid((storage.foldername(name))[1]))
      );
    end if;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- Índices operacionais
-- ─────────────────────────────────────────────────────────────────────

do $$
declare
  stmt text;
begin
  foreach stmt in array array[
    'create index if not exists idx_pastas_empresa_created on public.pastas (empresa_id, created_at desc)',
    'create index if not exists idx_pastas_empresa_processo on public.pastas (empresa_id, numero_processo)',
    'create index if not exists idx_prazos_empresa_prazo_status on public.prazos_lhub (empresa_id, prazo, status)',
    'create index if not exists idx_prazos_empresa_pasta on public.prazos_lhub (empresa_id, pasta_id)',
    'create index if not exists idx_tarefas_empresa_status_prazo on public.tarefas_lhub (empresa_id, status, prazo)',
    'create index if not exists idx_clientes_empresa_nome on public.clientes_lhub (empresa_id, nome)',
    'create index if not exists idx_intimacoes_empresa_data on public.intimacoes_pje (empresa_id, data_disponibilizacao desc)',
    'create index if not exists idx_intimacoes_empresa_processo on public.intimacoes_pje (empresa_id, numero_processo)',
    'create index if not exists idx_agenda_empresa_data on public.agenda_eventos (empresa_id, data)',
    'create index if not exists idx_honorarios_empresa_vencimento on public.honorarios (empresa_id, vencimento)',
    'create index if not exists idx_cobrancas_empresa_vencimento_status on public.cobrancas (empresa_id, data_vencimento, status)',
    'create index if not exists idx_contas_empresa_vencimento_status on public.contas_pagar (empresa_id, data_vencimento, status)',
    'create index if not exists idx_despesas_empresa_data_status on public.despesas (empresa_id, data desc, status)',
    'create index if not exists idx_oportunidades_empresa_status on public.oportunidades_crm (empresa_id, status, created_at desc)',
    'create index if not exists idx_andamentos_empresa_pasta_data on public.andamentos_processo (empresa_id, pasta_id, data_hora desc)',
    'create index if not exists idx_documentos_empresa_pasta on public.documentos_pasta (empresa_id, pasta_id, created_at desc)',
    'create index if not exists idx_audit_empresa_criado on public.audit_log (empresa_id, criado_em desc)',
    'create index if not exists idx_usuarios_empresa_user on public.usuarios_empresa (empresa_id, user_id)'
  ]
  loop
    begin
      execute stmt;
    exception
      when undefined_table or undefined_column then
        null;
    end;
  end loop;
end $$;
