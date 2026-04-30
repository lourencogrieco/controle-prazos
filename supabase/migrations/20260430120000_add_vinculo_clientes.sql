-- Adiciona coluna "vinculo" na tabela clientes_lhub
-- Permite vincular clientes a associações para geração de relatórios agrupados

ALTER TABLE public.clientes_lhub
  ADD COLUMN IF NOT EXISTS vinculo text;

-- Índice para buscas e relatórios por vínculo
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_vinculo
  ON public.clientes_lhub (empresa_id, vinculo)
  WHERE vinculo IS NOT NULL;
