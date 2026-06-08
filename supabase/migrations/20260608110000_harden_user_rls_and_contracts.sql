-- Segurança e contratos de dados identificados na auditoria geral.

-- Usuarios comuns nao podem atualizar diretamente a propria linha,
-- pois isso permitiria trocar o proprio perfil via REST.
drop policy if exists lhub_users_update on public.usuarios_empresa;
create policy lhub_users_update
on public.usuarios_empresa
for update
to authenticated
using (public.can_manage_empresa(empresa_id))
with check (public.can_manage_empresa(empresa_id));

-- Contratos usados por upsert/configuracao no cliente.
create unique index if not exists idx_pje_config_empresa_unique
  on public.pje_config (empresa_id);

delete from public.andamentos_processo a
using public.andamentos_processo b
where a.ctid > b.ctid
  and a.empresa_id = b.empresa_id
  and a.pasta_id = b.pasta_id
  and a.data_hora = b.data_hora
  and a.codigo is not null
  and b.codigo is not null
  and a.codigo = b.codigo;

delete from public.andamentos_processo a
using public.andamentos_processo b
where a.ctid > b.ctid
  and a.empresa_id = b.empresa_id
  and a.pasta_id = b.pasta_id
  and a.data_hora = b.data_hora
  and a.codigo is null
  and b.codigo is null
  and a.nome = b.nome;

create unique index if not exists idx_andamentos_unique_codigo
  on public.andamentos_processo (empresa_id, pasta_id, data_hora, codigo)
  where codigo is not null;

create unique index if not exists idx_andamentos_unique_nome_sem_codigo
  on public.andamentos_processo (empresa_id, pasta_id, data_hora, nome)
  where codigo is null;

-- Bucket usado por documentos.js. Policies ja existem em migration anterior.
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;
