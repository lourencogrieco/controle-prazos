-- Migração remota trazida para o repositório.

update public.andamentos_processo
set grau = 'STJ'
where grau = 'SUP';

comment on column public.andamentos_processo.grau is
  'Instância: G1 (1ª), G2 (2ª), STJ (Superior Tribunal de Justiça), STF (Supremo Tribunal Federal), JE (Juizado Especial)';
