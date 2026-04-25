-- Retenção de intimações arquivadas.
-- Mantém o registro por 14 dias para auditoria e remove automaticamente depois.

alter table public.intimacoes_pje
  add column if not exists arquivada_em timestamptz;

create index if not exists idx_intimacoes_pje_arquivada_em
  on public.intimacoes_pje (empresa_id, arquivada_em)
  where status_lhub = 'arquivada';

update public.intimacoes_pje
set arquivada_em = coalesce(arquivada_em, now())
where status_lhub = 'arquivada'
  and arquivada_em is null;

drop function if exists public.atualizar_status_intimacao(text, text);

create or replace function public.atualizar_status_intimacao(
  p_intimacao_id text,
  p_status text
)
returns table (id text, status_lhub text, lida boolean, arquivada_em timestamptz)
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
      lida = p_status <> 'pendente',
      arquivada_em = case
        when p_status = 'arquivada' then coalesce(i.arquivada_em, now())
        else null
      end
  where i.id::text = p_intimacao_id
    and i.empresa_id::text = v_empresa_id
  returning i.id::text, i.status_lhub::text, i.lida, i.arquivada_em
  into id, status_lhub, lida, arquivada_em;

  return next;
end;
$$;

grant execute on function public.atualizar_status_intimacao(text, text) to authenticated;

create or replace function public.limpar_intimacoes_arquivadas(
  p_dias integer default 14
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  if p_dias is null or p_dias < 1 then
    raise exception 'Período de retenção inválido';
  end if;

  delete from public.intimacoes_pje i
  where i.status_lhub = 'arquivada'
    and i.arquivada_em is not null
    and i.arquivada_em < now() - make_interval(days => p_dias)
    and (
      auth.uid() is null
      or public.is_empresa_member(i.empresa_id::text)
    );

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

grant execute on function public.limpar_intimacoes_arquivadas(integer) to authenticated;

do $$
begin
  begin
    create extension if not exists pg_cron with schema extensions;
  exception when others then
    null;
  end;

  if exists (select 1 from pg_namespace where nspname = 'cron') then
    begin
      perform cron.unschedule('lhub_limpar_intimacoes_arquivadas_14d');
    exception when others then
      null;
    end;

    perform cron.schedule(
      'lhub_limpar_intimacoes_arquivadas_14d',
      '17 3 * * *',
      $cron$select public.limpar_intimacoes_arquivadas(14);$cron$
    );
  end if;
exception when others then
  null;
end $$;
