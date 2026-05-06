-- Migração remota trazida para o repositório.

alter table public.intimacoes_pje
  add column if not exists grau text;

comment on column public.intimacoes_pje.grau is
  'Override de instância: G1, G2, STJ, STF, JE. Se NULL, calculado pelo número do processo.';

update public.intimacoes_pje
set grau = 'STJ'
where id = 597307473;
