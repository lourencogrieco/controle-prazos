-- Mantém neste repositório o histórico da função compartilhada com o Financeiro.
create or replace function public.criar_empresa_financeiro(
  p_nome_usuario text,
  p_nome_empresa text,
  p_cargo text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_empresa_id uuid;
begin
  if v_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  v_empresa_id := public.criar_empresa_e_usuario(
    p_nome_usuario,
    p_nome_empresa
  );

  update public.usuarios_empresa
  set perfil = 'admin',
      cargo = nullif(trim(p_cargo), '')
  where user_id = v_user_id
    and empresa_id = v_empresa_id;

  return v_empresa_id;
end;
$$;

revoke all on function public.criar_empresa_financeiro(text, text, text) from public;
grant execute on function public.criar_empresa_financeiro(text, text, text) to authenticated;
