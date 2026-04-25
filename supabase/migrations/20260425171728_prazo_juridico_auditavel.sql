-- Motor auditável de cálculo de prazos.
-- Mantém a sugestão calculável no backend e registra a regra aplicada.

do $$
begin
  if to_regclass('public.prazos_lhub') is not null then
    alter table public.prazos_lhub
      add column if not exists prazo_data_base date,
      add column if not exists prazo_dias_uteis integer,
      add column if not exists prazo_regra text,
      add column if not exists prazo_calculado boolean not null default false,
      add column if not exists prazo_metadados jsonb not null default '{}'::jsonb;
  end if;
end $$;

create or replace function public.prazo_dias_uteis_por_tipo(p_tipo text)
returns integer
language sql
immutable
as $$
  select case p_tipo
    when 'Agravo' then 15
    when 'Agravo em Recurso Especial' then 15
    when 'Agravo em Recurso Extraordinário' then 15
    when 'Agravo Interno' then 15
    when 'Contestação' then 15
    when 'Embargos de Declaração' then 5
    when 'Manifestação' then 15
    when 'Recurso de Apelação' then 15
    when 'Recurso Especial' then 15
    when 'Recurso Extraordinário' then 15
    when 'Réplica' then 15
    else null
  end
$$;

create or replace function public.prazo_pascoa(p_ano integer)
returns date
language plpgsql
immutable
as $$
declare
  a integer;
  b integer;
  c integer;
  d integer;
  e integer;
  f integer;
  g integer;
  h integer;
  i integer;
  k integer;
  l integer;
  m integer;
  mes integer;
  dia integer;
begin
  a := p_ano % 19;
  b := floor(p_ano / 100);
  c := p_ano % 100;
  d := floor(b / 4);
  e := b % 4;
  f := floor((b + 8) / 25);
  g := floor((b - f + 1) / 3);
  h := (19 * a + b - d - g + 15) % 30;
  i := floor(c / 4);
  k := c % 4;
  l := (32 + 2 * e + 2 * i - h - k) % 7;
  m := floor((a + 11 * h + 22 * l) / 451);
  mes := floor((h + l - 7 * m + 114) / 31);
  dia := ((h + l - 7 * m + 114) % 31) + 1;
  return make_date(p_ano, mes, dia);
end;
$$;

create or replace function public.prazo_feriados_nacionais(p_ano integer)
returns table(data date, nome text)
language sql
stable
as $$
  with pascoa as (
    select public.prazo_pascoa(p_ano) as data
  )
  select make_date(p_ano, 1, 1),  'Confraternização Universal' union all
  select make_date(p_ano, 4, 21), 'Tiradentes' union all
  select make_date(p_ano, 5, 1),  'Dia do Trabalhador' union all
  select make_date(p_ano, 9, 7),  'Independência do Brasil' union all
  select make_date(p_ano, 10, 12),'Nossa Senhora Aparecida' union all
  select make_date(p_ano, 11, 2), 'Finados' union all
  select make_date(p_ano, 11, 15),'Proclamação da República' union all
  select make_date(p_ano, 11, 20),'Consciência Negra' union all
  select make_date(p_ano, 12, 25),'Natal' union all
  select data - 48, 'Segunda-feira de Carnaval' from pascoa union all
  select data - 47, 'Terça-feira de Carnaval' from pascoa union all
  select data - 2,  'Sexta-feira Santa' from pascoa union all
  select data + 60, 'Corpus Christi' from pascoa
$$;

create or replace function public.prazo_is_recesso_forense(p_data date)
returns boolean
language sql
immutable
as $$
  select (extract(month from p_data) = 12 and extract(day from p_data) >= 20)
      or (extract(month from p_data) = 1 and extract(day from p_data) <= 20)
$$;

create or replace function public.prazo_is_dia_util(p_data date)
returns boolean
language sql
stable
as $$
  select extract(isodow from p_data) between 1 and 5
     and not public.prazo_is_recesso_forense(p_data)
     and not exists (
       select 1
       from public.prazo_feriados_nacionais(extract(year from p_data)::integer) f
       where f.data = p_data
     )
$$;

create or replace function public.calcular_prazo_juridico(
  p_tipo text,
  p_data_base date,
  p_dias_uteis integer default null
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_dias integer;
  v_cursor date;
  v_contados integer := 0;
  v_ignorados jsonb := '[]'::jsonb;
  v_motivo text;
begin
  v_dias := coalesce(p_dias_uteis, public.prazo_dias_uteis_por_tipo(p_tipo));

  if p_data_base is null or v_dias is null or v_dias < 1 then
    return null;
  end if;

  v_cursor := p_data_base + 1;

  while v_contados < v_dias loop
    v_motivo := null;

    if extract(isodow from v_cursor) in (6, 7) then
      v_motivo := 'fim_de_semana';
    elsif public.prazo_is_recesso_forense(v_cursor) then
      v_motivo := 'recesso_forense';
    elsif exists (
      select 1
      from public.prazo_feriados_nacionais(extract(year from v_cursor)::integer) f
      where f.data = v_cursor
    ) then
      select f.nome
      into v_motivo
      from public.prazo_feriados_nacionais(extract(year from v_cursor)::integer) f
      where f.data = v_cursor
      limit 1;
      v_motivo := 'feriado_nacional: ' || v_motivo;
    end if;

    if v_motivo is null then
      v_contados := v_contados + 1;
    else
      v_ignorados := v_ignorados || jsonb_build_object(
        'data', v_cursor,
        'motivo', v_motivo
      );
    end if;

    if v_contados < v_dias then
      v_cursor := v_cursor + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'dataFatal', v_cursor,
    'dataBase', p_data_base,
    'diasUteis', v_dias,
    'regra', v_dias || ' dias úteis',
    'metodo', 'dias_uteis_nacionais_recesso',
    'excluiDiaBase', true,
    'diasIgnorados', v_ignorados
  );
end;
$$;

grant execute on function public.prazo_dias_uteis_por_tipo(text) to authenticated;
grant execute on function public.prazo_pascoa(integer) to authenticated;
grant execute on function public.prazo_feriados_nacionais(integer) to authenticated;
grant execute on function public.prazo_is_recesso_forense(date) to authenticated;
grant execute on function public.prazo_is_dia_util(date) to authenticated;
grant execute on function public.calcular_prazo_juridico(text, date, integer) to authenticated;

do $$
begin
  if to_regclass('public.prazos_lhub') is not null then
    create index if not exists idx_prazos_empresa_calculo
      on public.prazos_lhub (empresa_id, prazo_calculado, prazo_data_base);
  end if;
end $$;

