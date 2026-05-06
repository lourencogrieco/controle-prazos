-- Índices leves para buscas com ILIKE nas telas operacionais.

create extension if not exists pg_trgm;

create index if not exists idx_pastas_numero_trgm
  on public.pastas using gin (numero gin_trgm_ops);

create index if not exists idx_pastas_cliente_trgm
  on public.pastas using gin (cliente gin_trgm_ops);

create index if not exists idx_pastas_parte_contraria_trgm
  on public.pastas using gin (parte_contraria gin_trgm_ops);

create index if not exists idx_pastas_numero_processo_trgm
  on public.pastas using gin (numero_processo gin_trgm_ops);

create index if not exists idx_clientes_nome_trgm
  on public.clientes_lhub using gin (nome gin_trgm_ops);

create index if not exists idx_clientes_cpf_cnpj_trgm
  on public.clientes_lhub using gin (cpf_cnpj gin_trgm_ops);

create index if not exists idx_prazos_cliente_trgm
  on public.prazos_lhub using gin (cliente gin_trgm_ops);

create index if not exists idx_prazos_tipo_trgm
  on public.prazos_lhub using gin (tipo gin_trgm_ops);
