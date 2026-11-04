-- Padroniza nomes de pessoas e preserva particulas portuguesas em minusculas.

create or replace function public.formatar_nome_pessoa(p_nome text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_partes text[];
  v_resultado text[] := array[]::text[];
  v_parte text;
  v_indice integer := 0;
begin
  if nullif(btrim(p_nome), '') is null then
    return p_nome;
  end if;

  v_partes := regexp_split_to_array(regexp_replace(btrim(p_nome), '\s+', ' ', 'g'), ' ');
  foreach v_parte in array v_partes loop
    v_indice := v_indice + 1;
    if v_indice > 1 and lower(v_parte) = any (array['de', 'da', 'do', 'das', 'dos', 'e']) then
      v_resultado := array_append(v_resultado, lower(v_parte));
    else
      v_resultado := array_append(v_resultado, initcap(lower(v_parte)));
    end if;
  end loop;

  return array_to_string(v_resultado, ' ');
end;
$$;

create or replace function public.normalizar_nome_usuario_trigger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.nome := public.formatar_nome_pessoa(new.nome);
  return new;
end;
$$;

drop trigger if exists normalizar_nome_usuario on public.usuarios_empresa;
create trigger normalizar_nome_usuario
before insert or update of nome on public.usuarios_empresa
for each row execute function public.normalizar_nome_usuario_trigger();

drop trigger if exists normalizar_nome_convite on public.convites_empresa;
create trigger normalizar_nome_convite
before insert or update of nome on public.convites_empresa
for each row execute function public.normalizar_nome_usuario_trigger();

update public.usuarios_empresa
set nome = public.formatar_nome_pessoa(nome)
where lower(email) = 'jeronimo@ngadvogados.com.br'
   or lower(nome) like 'jeronimo%';

update public.convites_empresa
set nome = public.formatar_nome_pessoa(nome)
where nome is not null
  and (lower(email) = 'jeronimo@ngadvogados.com.br' or lower(nome) like 'jeronimo%');

revoke all on function public.formatar_nome_pessoa(text) from public, anon, authenticated;
revoke all on function public.normalizar_nome_usuario_trigger() from public, anon, authenticated;
