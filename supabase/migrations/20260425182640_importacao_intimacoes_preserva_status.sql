-- Importacao idempotente de intimacoes.
-- Preserva campos internos do Legal Hub e impede que arquivadas voltem como pendentes.

create table if not exists public.intimacoes_pje_arquivadas_log (
  empresa_id text not null,
  intimacao_id text not null,
  arquivada_em timestamptz not null default now(),
  numero_processo text,
  sigla_tribunal text,
  data_disponibilizacao date,
  primary key (empresa_id, intimacao_id)
);

alter table public.intimacoes_pje_arquivadas_log enable row level security;

drop policy if exists "intimacoes_pje_arquivadas_log_select_member" on public.intimacoes_pje_arquivadas_log;
create policy "intimacoes_pje_arquivadas_log_select_member"
on public.intimacoes_pje_arquivadas_log
for select
using (public.is_empresa_member(empresa_id));

insert into public.intimacoes_pje_arquivadas_log (
  empresa_id,
  intimacao_id,
  arquivada_em,
  numero_processo,
  sigla_tribunal,
  data_disponibilizacao
)
select
  i.empresa_id::text,
  i.id::text,
  coalesce(i.arquivada_em, now()),
  coalesce(i.numero_processo_mascara, i.numero_processo),
  i.sigla_tribunal,
  i.data_disponibilizacao
from public.intimacoes_pje i
where i.status_lhub = 'arquivada'
on conflict (empresa_id, intimacao_id) do update
set arquivada_em = least(public.intimacoes_pje_arquivadas_log.arquivada_em, excluded.arquivada_em),
    numero_processo = coalesce(public.intimacoes_pje_arquivadas_log.numero_processo, excluded.numero_processo),
    sigla_tribunal = coalesce(public.intimacoes_pje_arquivadas_log.sigla_tribunal, excluded.sigla_tribunal),
    data_disponibilizacao = coalesce(public.intimacoes_pje_arquivadas_log.data_disponibilizacao, excluded.data_disponibilizacao);

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
  v_numero_processo text;
  v_tribunal text;
  v_data date;
begin
  if p_status not in ('pendente', 'cumprida', 'prazo_agendado', 'arquivada') then
    raise exception 'Status inválido';
  end if;

  select i.empresa_id::text,
         coalesce(i.numero_processo_mascara, i.numero_processo),
         i.sigla_tribunal,
         i.data_disponibilizacao
  into v_empresa_id, v_numero_processo, v_tribunal, v_data
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

  if p_status = 'arquivada' then
    insert into public.intimacoes_pje_arquivadas_log (
      empresa_id,
      intimacao_id,
      arquivada_em,
      numero_processo,
      sigla_tribunal,
      data_disponibilizacao
    ) values (
      v_empresa_id,
      p_intimacao_id,
      coalesce(arquivada_em, now()),
      v_numero_processo,
      v_tribunal,
      v_data
    )
    on conflict (empresa_id, intimacao_id) do update
    set arquivada_em = least(public.intimacoes_pje_arquivadas_log.arquivada_em, excluded.arquivada_em),
        numero_processo = coalesce(public.intimacoes_pje_arquivadas_log.numero_processo, excluded.numero_processo),
        sigla_tribunal = coalesce(public.intimacoes_pje_arquivadas_log.sigla_tribunal, excluded.sigla_tribunal),
        data_disponibilizacao = coalesce(public.intimacoes_pje_arquivadas_log.data_disponibilizacao, excluded.data_disponibilizacao);
  else
    delete from public.intimacoes_pje_arquivadas_log l
    where l.empresa_id = v_empresa_id
      and l.intimacao_id = p_intimacao_id;
  end if;

  return next;
end;
$$;

grant execute on function public.atualizar_status_intimacao(text, text) to authenticated;

create or replace function public.importar_intimacoes_pje(
  p_rows jsonb
)
returns table (inseridas integer, atualizadas integer, ignoradas_arquivadas integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  v_id text;
  v_empresa_id text;
  v_status_lhub text;
begin
  inseridas := 0;
  atualizadas := 0;
  ignoradas_arquivadas := 0;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Payload inválido';
  end if;

  for r in select value from jsonb_array_elements(p_rows)
  loop
    v_id := nullif(r->>'id', '');
    v_empresa_id := nullif(r->>'empresa_id', '');

    if v_id is null or v_empresa_id is null then
      continue;
    end if;

    if not public.is_empresa_member(v_empresa_id) then
      raise exception 'Acesso negado';
    end if;

    if exists (
      select 1
      from public.intimacoes_pje_arquivadas_log l
      where l.empresa_id = v_empresa_id
        and l.intimacao_id = v_id
    ) then
      ignoradas_arquivadas := ignoradas_arquivadas + 1;
      continue;
    end if;

    select i.status_lhub
    into v_status_lhub
    from public.intimacoes_pje i
    where i.id::text = v_id
      and i.empresa_id::text = v_empresa_id;

    if found then
      if v_status_lhub = 'arquivada' then
        insert into public.intimacoes_pje_arquivadas_log (
          empresa_id,
          intimacao_id,
          arquivada_em,
          numero_processo,
          sigla_tribunal,
          data_disponibilizacao
        )
        select i.empresa_id::text,
               i.id::text,
               coalesce(i.arquivada_em, now()),
               coalesce(i.numero_processo_mascara, i.numero_processo),
               i.sigla_tribunal,
               i.data_disponibilizacao
        from public.intimacoes_pje i
        where i.id::text = v_id
          and i.empresa_id::text = v_empresa_id
        on conflict (empresa_id, intimacao_id) do nothing;

        ignoradas_arquivadas := ignoradas_arquivadas + 1;
        continue;
      end if;

      update public.intimacoes_pje i
      set data_disponibilizacao = nullif(r->>'data_disponibilizacao', '')::date,
          sigla_tribunal = nullif(r->>'sigla_tribunal', ''),
          tipo_comunicacao = nullif(r->>'tipo_comunicacao', ''),
          nome_orgao = nullif(r->>'nome_orgao', ''),
          texto = nullif(r->>'texto', ''),
          numero_processo = nullif(r->>'numero_processo', ''),
          numero_processo_mascara = nullif(r->>'numero_processo_mascara', ''),
          link = nullif(r->>'link', ''),
          tipo_documento = nullif(r->>'tipo_documento', ''),
          nome_classe = nullif(r->>'nome_classe', ''),
          status = nullif(r->>'status', ''),
          meio_completo = nullif(r->>'meio_completo', ''),
          hash = nullif(r->>'hash', '')
      where i.id::text = v_id
        and i.empresa_id::text = v_empresa_id;

      atualizadas := atualizadas + 1;
    else
      insert into public.intimacoes_pje (
        id,
        empresa_id,
        data_disponibilizacao,
        sigla_tribunal,
        tipo_comunicacao,
        nome_orgao,
        texto,
        numero_processo,
        numero_processo_mascara,
        link,
        tipo_documento,
        nome_classe,
        status,
        meio_completo,
        hash,
        status_lhub,
        lida,
        arquivada_em
      ) values (
        v_id,
        v_empresa_id,
        nullif(r->>'data_disponibilizacao', '')::date,
        nullif(r->>'sigla_tribunal', ''),
        nullif(r->>'tipo_comunicacao', ''),
        nullif(r->>'nome_orgao', ''),
        nullif(r->>'texto', ''),
        nullif(r->>'numero_processo', ''),
        nullif(r->>'numero_processo_mascara', ''),
        nullif(r->>'link', ''),
        nullif(r->>'tipo_documento', ''),
        nullif(r->>'nome_classe', ''),
        nullif(r->>'status', ''),
        nullif(r->>'meio_completo', ''),
        nullif(r->>'hash', ''),
        'pendente',
        false,
        null
      );

      inseridas := inseridas + 1;
    end if;
  end loop;

  return next;
end;
$$;

grant execute on function public.importar_intimacoes_pje(jsonb) to authenticated;
