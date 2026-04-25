-- Permite vincular manualmente uma intimação/comunicação a uma pasta.
-- Necessário para 2ª instância, recursos e comunicações cujo CNJ não é o
-- mesmo número cadastrado como processo principal da pasta.

alter table public.intimacoes_pje
  add column if not exists pasta_id text references public.pastas(id) on delete set null;

create index if not exists idx_intimacoes_empresa_pasta
  on public.intimacoes_pje (empresa_id, pasta_id);
