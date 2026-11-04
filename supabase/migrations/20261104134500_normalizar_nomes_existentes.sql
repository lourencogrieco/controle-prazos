-- Aplica a regra de capitalizacao aos cadastros anteriores ao trigger.

update public.usuarios_empresa
set nome = public.formatar_nome_pessoa(nome)
where nome is distinct from public.formatar_nome_pessoa(nome);

update public.convites_empresa
set nome = public.formatar_nome_pessoa(nome)
where nome is not null
  and nome is distinct from public.formatar_nome_pessoa(nome);
