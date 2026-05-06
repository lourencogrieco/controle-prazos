do $$
declare
  v_constraint record;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'prazos_lhub'
      and column_name = 'intimacao_id'
      and data_type <> 'text'
  ) then
    for v_constraint in
      select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      join unnest(con.conkey) col(attnum) on true
      join pg_attribute att on att.attrelid = rel.oid and att.attnum = col.attnum
      where nsp.nspname = 'public'
        and rel.relname = 'prazos_lhub'
        and att.attname = 'intimacao_id'
        and con.contype = 'f'
    loop
      execute format('alter table public.prazos_lhub drop constraint if exists %I', v_constraint.conname);
    end loop;

    alter table public.prazos_lhub
      alter column intimacao_id type text
      using nullif(intimacao_id::text, '');
  end if;
end $$;

create index if not exists idx_prazos_empresa_intimacao
  on public.prazos_lhub (empresa_id, intimacao_id);
