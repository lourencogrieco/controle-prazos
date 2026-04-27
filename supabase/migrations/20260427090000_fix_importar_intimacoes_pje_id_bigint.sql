-- Corrige a importacao PJe quando a coluna intimacoes_pje.id e bigint.
-- O payload JSON chega com id textual, mas a tabela espera bigint.

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
  v_id bigint;
  v_id_text text;
  v_empresa_id text;
  v_status_lhub text;
  v_is_service_role boolean := coalesce(auth.role(), '') = 'service_role';
begin
  inseridas := 0;
  atualizadas := 0;
  ignoradas_arquivadas := 0;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Payload inválido';
  end if;

  for r in select value from jsonb_array_elements(p_rows)
  loop
    v_id_text := nullif(r->>'id', '');
    v_empresa_id := nullif(r->>'empresa_id', '');
    v_status_lhub := null;

    if v_id_text is null or v_empresa_id is null then
      continue;
    end if;

    if v_id_text !~ '^[0-9]+$' then
      continue;
    end if;

    v_id := v_id_text::bigint;

    if not v_is_service_role and not public.is_empresa_member(v_empresa_id) then
      raise exception 'Acesso negado';
    end if;

    if exists (
      select 1
      from public.intimacoes_pje_arquivadas_log l
      where l.empresa_id = v_empresa_id
        and l.intimacao_id = v_id_text
    ) then
      ignoradas_arquivadas := ignoradas_arquivadas + 1;
      continue;
    end if;

    select i.status_lhub
    into v_status_lhub
    from public.intimacoes_pje i
    where i.id = v_id
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
        where i.id = v_id
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
      where i.id = v_id
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
grant execute on function public.importar_intimacoes_pje(jsonb) to service_role;
