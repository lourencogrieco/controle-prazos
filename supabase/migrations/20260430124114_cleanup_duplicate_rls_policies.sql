-- Limpeza de políticas RLS duplicadas criada originalmente no Supabase remoto.
-- Mantém as policies lhub_tenant_* nas tabelas operacionais.

drop policy if exists "clientes_lhub: delete da empresa" on public.clientes_lhub;
drop policy if exists "clientes_lhub: insert da empresa" on public.clientes_lhub;
drop policy if exists "clientes_lhub: select da empresa" on public.clientes_lhub;
drop policy if exists "clientes_lhub: update da empresa" on public.clientes_lhub;
drop policy if exists "clientes_lhub_delete" on public.clientes_lhub;
drop policy if exists "clientes_lhub_insert" on public.clientes_lhub;
drop policy if exists "clientes_lhub_select" on public.clientes_lhub;
drop policy if exists "clientes_lhub_update" on public.clientes_lhub;
drop policy if exists "empresa_clientes_lhub" on public.clientes_lhub;

drop policy if exists "empresa_pastas" on public.pastas;
drop policy if exists "empresa_pastas_all" on public.pastas;
drop policy if exists "pastas: acesso por empresa" on public.pastas;
drop policy if exists "pastas_delete" on public.pastas;
drop policy if exists "pastas_empresa" on public.pastas;
drop policy if exists "pastas_insert" on public.pastas;
drop policy if exists "pastas_rls" on public.pastas;
drop policy if exists "pastas_select" on public.pastas;
drop policy if exists "pastas_update" on public.pastas;

drop policy if exists "empresa_tipos_pasta" on public.tipos_pasta;
drop policy if exists "tipos_pasta_delete" on public.tipos_pasta;
drop policy if exists "tipos_pasta_empresa" on public.tipos_pasta;
drop policy if exists "tipos_pasta_insert" on public.tipos_pasta;
drop policy if exists "tipos_pasta_rls" on public.tipos_pasta;
drop policy if exists "tipos_pasta_select" on public.tipos_pasta;
drop policy if exists "tipos_pasta_update" on public.tipos_pasta;

drop policy if exists "areas_juridicas_delete" on public.areas_juridicas;
drop policy if exists "areas_juridicas_insert" on public.areas_juridicas;
drop policy if exists "areas_juridicas_rls" on public.areas_juridicas;
drop policy if exists "areas_juridicas_select" on public.areas_juridicas;
drop policy if exists "areas_juridicas_update" on public.areas_juridicas;
drop policy if exists "empresa_areas_juridicas" on public.areas_juridicas;

drop policy if exists "prazos_delete" on public.prazos_lhub;
drop policy if exists "prazos_insert" on public.prazos_lhub;
drop policy if exists "prazos_select" on public.prazos_lhub;
drop policy if exists "prazos_update" on public.prazos_lhub;

drop policy if exists "tarefas_delete" on public.tarefas_lhub;
drop policy if exists "tarefas_insert" on public.tarefas_lhub;
drop policy if exists "tarefas_select" on public.tarefas_lhub;
drop policy if exists "tarefas_update" on public.tarefas_lhub;

drop policy if exists "agenda_empresa" on public.agenda_eventos;
drop policy if exists "agenda_eventos_delete" on public.agenda_eventos;
drop policy if exists "agenda_eventos_insert" on public.agenda_eventos;
drop policy if exists "agenda_eventos_select" on public.agenda_eventos;
drop policy if exists "agenda_eventos_update" on public.agenda_eventos;

drop policy if exists "intimacoes_pje_delete" on public.intimacoes_pje;
drop policy if exists "intimacoes_pje_insert" on public.intimacoes_pje;
drop policy if exists "intimacoes_pje_rls" on public.intimacoes_pje;
drop policy if exists "intimacoes_pje_select" on public.intimacoes_pje;
drop policy if exists "intimacoes_pje_update" on public.intimacoes_pje;

drop policy if exists "pje_config_delete" on public.pje_config;
drop policy if exists "pje_config_insert" on public.pje_config;
drop policy if exists "pje_config_rls" on public.pje_config;
drop policy if exists "pje_config_select" on public.pje_config;
drop policy if exists "pje_config_update" on public.pje_config;

drop policy if exists "cobrancas_delete" on public.cobrancas;
drop policy if exists "cobrancas_insert" on public.cobrancas;
drop policy if exists "cobrancas_select" on public.cobrancas;
drop policy if exists "cobrancas_update" on public.cobrancas;

drop policy if exists "contas_pagar_delete" on public.contas_pagar;
drop policy if exists "contas_pagar_insert" on public.contas_pagar;
drop policy if exists "contas_pagar_select" on public.contas_pagar;
drop policy if exists "contas_pagar_update" on public.contas_pagar;

drop policy if exists "despesas_delete" on public.despesas;
drop policy if exists "despesas_insert" on public.despesas;
drop policy if exists "despesas_select" on public.despesas;
drop policy if exists "despesas_update" on public.despesas;

drop policy if exists "honorarios_empresa" on public.honorarios;

drop policy if exists "documentos_pasta_delete" on public.documentos_pasta;
drop policy if exists "documentos_pasta_insert" on public.documentos_pasta;
drop policy if exists "documentos_pasta_select" on public.documentos_pasta;
drop policy if exists "documentos_pasta_update" on public.documentos_pasta;
drop policy if exists "empresa_documentos" on public.documentos_pasta;

drop policy if exists "andamentos_processo_delete" on public.andamentos_processo;
drop policy if exists "andamentos_processo_insert" on public.andamentos_processo;
drop policy if exists "andamentos_processo_select" on public.andamentos_processo;
drop policy if exists "andamentos_processo_update" on public.andamentos_processo;
drop policy if exists "empresa_andamentos" on public.andamentos_processo;

drop policy if exists "oportunidades_crm_empresa_isolamento" on public.oportunidades_crm;
