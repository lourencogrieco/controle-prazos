-- Remove a sobrecarga antiga da RPC para evitar ambiguidade no PostgREST.
-- A versão atual aceita p_grau e é a única que deve permanecer exposta.

drop function if exists public.vincular_intimacao_pasta(text, text);

grant execute on function public.vincular_intimacao_pasta(text, text, text) to authenticated;

-- Correção pontual solicitada: a pasta 10/2026-7 tem intimações de
-- Apelação/Remessa Necessária que devem aparecer em 2ª instância/recursal.
update public.intimacoes_pje i
set grau = 'G2'
from public.pastas p
where p.id::text = i.pasta_id::text
  and p.numero = '10/2026-7'
  and i.id::text in ('600531005', '601101057');
