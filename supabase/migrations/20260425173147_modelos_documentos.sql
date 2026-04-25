-- Modelos de documentos por empresa.

create table if not exists public.modelos_documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  nome text not null,
  categoria text,
  descricao text,
  conteudo text not null default '',
  criado_por uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.modelos_documentos enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'modelos_documentos' and policyname = 'lhub_modelos_select') then
    create policy lhub_modelos_select
    on public.modelos_documentos
    for select
    to authenticated
    using (public.is_empresa_member(empresa_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'modelos_documentos' and policyname = 'lhub_modelos_insert') then
    create policy lhub_modelos_insert
    on public.modelos_documentos
    for insert
    to authenticated
    with check (public.is_empresa_member(empresa_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'modelos_documentos' and policyname = 'lhub_modelos_update') then
    create policy lhub_modelos_update
    on public.modelos_documentos
    for update
    to authenticated
    using (public.is_empresa_member(empresa_id))
    with check (public.is_empresa_member(empresa_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'modelos_documentos' and policyname = 'lhub_modelos_delete') then
    create policy lhub_modelos_delete
    on public.modelos_documentos
    for delete
    to authenticated
    using (public.is_empresa_member(empresa_id));
  end if;
end $$;

create index if not exists idx_modelos_documentos_empresa
  on public.modelos_documentos (empresa_id, created_at desc);

