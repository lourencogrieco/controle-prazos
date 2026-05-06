-- Permite criar prazos diretamente a partir de intimações e manter o vínculo.

alter table public.prazos_lhub
  add column if not exists intimacao_id text;

create index if not exists idx_prazos_empresa_intimacao
  on public.prazos_lhub (empresa_id, intimacao_id);
