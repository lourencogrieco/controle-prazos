-- Onboarding publico: cria uma empresa e vincula o usuario autenticado como fundador.
-- Usado pelo formulario "Criar nova conta" da tela de login.

alter table public.usuarios_empresa
  add column if not exists empresa_nome text;

create or replace function public.criar_empresa_e_usuario(
  p_nome_usuario text,
  p_nome_empresa text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_empresa_id uuid;
begin
  if v_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  select u.email
  into v_email
  from auth.users u
  where u.id = v_user_id;

  select ue.empresa_id
  into v_empresa_id
  from public.usuarios_empresa ue
  where ue.user_id = v_user_id
  limit 1;

  if v_empresa_id is not null then
    return v_empresa_id;
  end if;

  v_empresa_id := gen_random_uuid();

  insert into public.usuarios_empresa (
    empresa_id,
    empresa_nome,
    user_id,
    nome,
    email,
    perfil
  ) values (
    v_empresa_id,
    nullif(trim(p_nome_empresa), ''),
    v_user_id,
    nullif(trim(p_nome_usuario), ''),
    v_email,
    'socio_fundador'
  );

  return v_empresa_id;
end;
$$;

grant execute on function public.criar_empresa_e_usuario(text, text) to authenticated;
