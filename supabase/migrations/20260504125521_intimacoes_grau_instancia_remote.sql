-- Migration criada originalmente no remoto. Mantida para alinhar histórico.

alter table public.intimacoes_pje
  add column if not exists grau text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.intimacoes_pje'::regclass
      and conname = 'intimacoes_pje_grau_check'
  ) then
    alter table public.intimacoes_pje
      add constraint intimacoes_pje_grau_check
      check (grau is null or grau in ('G1', 'G2', 'STJ', 'STF'));
  end if;
end $$;

create or replace function public.vincular_intimacao_pasta(
  p_intimacao_id text,
  p_pasta_id text,
  p_grau text default null
)
returns table (id text, pasta_id text, grau text)
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

  if p_grau is not null and p_grau not in ('G1', 'G2', 'STJ', 'STF') then
    raise exception 'Grau inválido: use G1, G2, STJ ou STF';
  end if;

  update public.intimacoes_pje i
  set pasta_id = p_pasta_id,
      grau = coalesce(p_grau, i.grau)
  where i.id::text = p_intimacao_id
    and i.empresa_id::text = v_empresa_id
  returning i.id::text, i.pasta_id::text, i.grau
  into id, pasta_id, grau;

  return next;
end;
$$;

grant execute on function public.vincular_intimacao_pasta(text, text, text) to authenticated;
