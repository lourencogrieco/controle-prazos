-- Salva prazo e, quando houver intimação vinculada, atualiza a intimação
-- na mesma transação. Evita o fluxo parcial no cliente.

create or replace function public.salvar_prazo_lhub(
  p_id text,
  p_empresa_id text,
  p_pasta_id text,
  p_cliente text,
  p_tipo text,
  p_prazo date,
  p_responsavel text,
  p_status text,
  p_descricao text default null,
  p_intimacao_id text default null,
  p_prazo_data_base date default null,
  p_prazo_dias_uteis integer default null,
  p_prazo_regra text default null,
  p_prazo_calculado boolean default false,
  p_prazo_metadados jsonb default '{}'::jsonb
)
returns setof public.prazos_lhub
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null or btrim(p_id) = '' then
    raise exception 'ID do prazo é obrigatório';
  end if;

  if p_empresa_id is null or not public.is_empresa_member(p_empresa_id) then
    raise exception 'Acesso negado';
  end if;

  if p_tipo is null or btrim(p_tipo) = '' then
    raise exception 'Tipo de prazo é obrigatório';
  end if;

  if p_prazo is null then
    raise exception 'Data fatal é obrigatória';
  end if;

  if p_pasta_id is not null and not exists (
    select 1
    from public.pastas p
    where p.id::text = p_pasta_id
      and p.empresa_id::text = p_empresa_id
  ) then
    raise exception 'Pasta não encontrada para esta empresa';
  end if;

  if p_intimacao_id is not null and not exists (
    select 1
    from public.intimacoes_pje i
    where i.id::text = p_intimacao_id
      and i.empresa_id::text = p_empresa_id
  ) then
    raise exception 'Intimação não encontrada para esta empresa';
  end if;

  if exists (
    select 1
    from public.prazos_lhub p
    where p.id::text = p_id
      and p.empresa_id::text = p_empresa_id
  ) then
    update public.prazos_lhub p
    set pasta_id = p_pasta_id,
        cliente = nullif(btrim(coalesce(p_cliente, '')), ''),
        tipo = p_tipo,
        prazo = p_prazo,
        responsavel = nullif(btrim(coalesce(p_responsavel, '')), ''),
        status = coalesce(nullif(btrim(coalesce(p_status, '')), ''), 'pendente'),
        descricao = nullif(btrim(coalesce(p_descricao, '')), ''),
        intimacao_id = p_intimacao_id,
        prazo_data_base = p_prazo_data_base,
        prazo_dias_uteis = p_prazo_dias_uteis,
        prazo_regra = p_prazo_regra,
        prazo_calculado = coalesce(p_prazo_calculado, false),
        prazo_metadados = coalesce(p_prazo_metadados, '{}'::jsonb)
    where p.id::text = p_id
      and p.empresa_id::text = p_empresa_id;
  else
    insert into public.prazos_lhub (
      id,
      empresa_id,
      pasta_id,
      cliente,
      tipo,
      prazo,
      responsavel,
      status,
      descricao,
      intimacao_id,
      prazo_data_base,
      prazo_dias_uteis,
      prazo_regra,
      prazo_calculado,
      prazo_metadados
    ) values (
      p_id,
      p_empresa_id,
      p_pasta_id,
      nullif(btrim(coalesce(p_cliente, '')), ''),
      p_tipo,
      p_prazo,
      nullif(btrim(coalesce(p_responsavel, '')), ''),
      coalesce(nullif(btrim(coalesce(p_status, '')), ''), 'pendente'),
      nullif(btrim(coalesce(p_descricao, '')), ''),
      p_intimacao_id,
      p_prazo_data_base,
      p_prazo_dias_uteis,
      p_prazo_regra,
      coalesce(p_prazo_calculado, false),
      coalesce(p_prazo_metadados, '{}'::jsonb)
    );
  end if;

  if p_intimacao_id is not null then
    update public.intimacoes_pje i
    set status_lhub = 'prazo_agendado',
        lida = true
    where i.id::text = p_intimacao_id
      and i.empresa_id::text = p_empresa_id;
  end if;

  return query
  select p.*
  from public.prazos_lhub p
  where p.id::text = p_id
    and p.empresa_id::text = p_empresa_id;
end;
$$;

grant execute on function public.salvar_prazo_lhub(
  text,
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  date,
  integer,
  text,
  boolean,
  jsonb
) to authenticated;
