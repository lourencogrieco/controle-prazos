-- RPC de vínculo manual de intimação com pasta.
-- Usa security definer para evitar falhas de RLS/PostgREST no update direto,
-- mantendo validação de pertencimento à empresa para intimação e pasta.

create or replace function public.vincular_intimacao_pasta(
  p_intimacao_id text,
  p_pasta_id text
)
returns table (id text, pasta_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id text;
begin
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

  if p_pasta_id is not null and not exists (
    select 1
    from public.pastas p
    where p.id::text = p_pasta_id
      and p.empresa_id::text = v_empresa_id
  ) then
    raise exception 'Pasta não encontrada para esta empresa';
  end if;

  update public.intimacoes_pje i
  set pasta_id = p_pasta_id
  where i.id::text = p_intimacao_id
    and i.empresa_id::text = v_empresa_id
  returning i.id::text, i.pasta_id::text
  into id, pasta_id;

  return next;
end;
$$;

grant execute on function public.vincular_intimacao_pasta(text, text) to authenticated;
