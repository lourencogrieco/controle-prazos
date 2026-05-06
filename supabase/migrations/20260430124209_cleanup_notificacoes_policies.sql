-- Limpeza de políticas duplicadas em notificacoes criada no remoto.

do $$
begin
  if to_regclass('public.notificacoes') is not null then
    drop policy if exists "insert_empresa" on public.notificacoes;
    drop policy if exists "select_proprias" on public.notificacoes;
    drop policy if exists "update_proprias" on public.notificacoes;
    drop policy if exists "Notificações do usuário" on public.notificacoes;

    if not exists (
       select 1
       from pg_policies
       where schemaname = 'public'
         and tablename = 'notificacoes'
         and policyname = 'notif_delete_proprias'
     ) then
      create policy notif_delete_proprias on public.notificacoes
        for delete to authenticated
        using (user_id = auth.uid());
    end if;
  end if;
end $$;
