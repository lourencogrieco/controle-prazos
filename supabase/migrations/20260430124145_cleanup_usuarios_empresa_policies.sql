-- Limpeza de políticas duplicadas em usuarios_empresa criada no remoto.

drop policy if exists "Membros da empresa" on public.usuarios_empresa;
drop policy if exists "admin_atualiza_membros" on public.usuarios_empresa;
drop policy if exists "admin_update_perfil" on public.usuarios_empresa;
drop policy if exists "empresa_usuarios_select" on public.usuarios_empresa;
drop policy if exists "ue:delete" on public.usuarios_empresa;
drop policy if exists "ue:insert" on public.usuarios_empresa;
drop policy if exists "ue:select" on public.usuarios_empresa;
