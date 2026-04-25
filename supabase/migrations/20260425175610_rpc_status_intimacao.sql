-- RPC de status de intimação.
-- Evita falhas/intermitências do update direto via PostgREST e garante que
-- status_lhub/lida persistam com validação de empresa.

create or replace function public.atualizar_status_intimacao(
  p_intimacao_id text,
  p_status text
)
returns table (id text, status_lhub text, lida boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id text;
begin
  if p_status not in ('pendente', 'cumprida', 'prazo_agendado', 'arquivada') then
    raise exception 'Status inválido';
  end if;

  select i.empresa_id::text
  into v_empresa_id
  from public.intimacoes_pje i
  where i.id::text = p_intimacao_id;

  if v_empresa_id is null then
    raise exception 'Intimação não encontrada';
  end if;

  if not public.is_empresa_member(v_empresa_id) then
    raise exception 'Acesso negado';
  end if;

  update public.intimacoes_pje i
  set status_lhub = p_status,
      lida = p_status <> 'pendente'
  where i.id::text = p_intimacao_id
    and i.empresa_id::text = v_empresa_id
  returning i.id::text, i.status_lhub::text, i.lida
  into id, status_lhub, lida;

  return next;
end;
$$;

grant execute on function public.atualizar_status_intimacao(text, text) to authenticated;
