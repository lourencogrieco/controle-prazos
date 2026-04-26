-- Historico resumido de sincronizacoes PJe.
-- Guarda apenas metadados/contadores para diagnostico, sem payloads das intimacoes.

create table if not exists public.pje_sync_logs (
  id uuid primary key default gen_random_uuid(),
  empresa_id text not null,
  origem text not null default 'manual',
  data_inicio date,
  data_fim date,
  nomes text[] not null default '{}',
  inseridas integer not null default 0,
  atualizadas integer not null default 0,
  ignoradas_arquivadas integer not null default 0,
  erros text[] not null default '{}',
  ok boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.pje_sync_logs enable row level security;

drop policy if exists "pje_sync_logs_select_member" on public.pje_sync_logs;
create policy "pje_sync_logs_select_member"
on public.pje_sync_logs
for select
using (public.is_empresa_member(empresa_id));

drop policy if exists "pje_sync_logs_insert_member" on public.pje_sync_logs;
create policy "pje_sync_logs_insert_member"
on public.pje_sync_logs
for insert
with check (public.is_empresa_member(empresa_id));

create index if not exists idx_pje_sync_logs_empresa_created
  on public.pje_sync_logs (empresa_id, created_at desc);
