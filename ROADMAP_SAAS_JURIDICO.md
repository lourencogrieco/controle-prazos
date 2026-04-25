# Roadmap SaaS Jurídico

## Objetivo

Evoluir o Legal Hub de sistema interno para SaaS jurídico escalável, seguro e vendável, cobrindo gestão de processos, prazos, documentos, financeiro, CRM, área do cliente e inteligência jurídica.

## Fase 0 - Fundação Crítica (1 a 2 semanas)

- [x] Remover segredos hardcoded e exigir variáveis de ambiente para integrações.
- [x] Versionar base de RLS e índices do Supabase com migrations.
- [x] Criar políticas RLS multi-tenant iniciais para tabelas com `empresa_id`.
- [x] Garantir filtros de tenant nos deletes/updates diretos encontrados no cliente.
- [x] Criar índices mínimos por `empresa_id`, datas, status, pasta e processo.
- [ ] Aplicar a migration no banco remoto e validar políticas em produção.
- Criar suíte de testes para proxies, permissões e cálculo de prazo.
- Sanitizar renderizações com dados vindos do usuário.

## Fase 1 - Produto Vendável (3 a 6 semanas)

- Criar fluxo guiado: cliente -> pasta/processo -> prazo/tarefa -> cobrança.
- [x] Criar dashboard de risco: prazos vencidos, intimações pendentes, tarefas sem responsável, cobranças vencidas.
- [x] Iniciar motor de cálculo de prazos com dias úteis, feriados nacionais e recesso.
- [ ] Evoluir cálculo de prazos para backend auditável com regras por tribunal/UF.
- Criar linha do tempo completa da pasta com andamentos, prazos, tarefas, documentos e financeiro.
- Melhorar CRM: origem do lead, próximo contato, motivo de perda, conversão em pasta e contrato.
- Implementar paginação server-side nas principais listas.

## Fase 2 - SaaS Comercial (6 a 10 semanas)

- Implementar planos Starter, Pro, Business e Enterprise.
- Criar billing/assinaturas.
- Criar onboarding por escritório e primeiro usuário admin.
- Criar área do cliente com documentos, cobranças e andamento simplificado.
- Criar templates de documentos com variáveis da pasta.
- Criar notificações por e-mail/WhatsApp para prazos, cobranças e tarefas.
- Criar relatórios exportáveis com filtros salvos.

## Fase 3 - Diferenciação Legaltech (10 a 16 semanas)

- IA para resumir intimações e sugerir providências.
- IA para gerar minutas a partir de templates e dados da pasta.
- Jurimetria por tribunal, vara, classe, assunto e fase.
- Score de risco processual e financeiro por cliente/pasta.
- Automação de atendimento e follow-up de leads.
- BI executivo para sócios: receita, inadimplência, produtividade, êxito e carteira em risco.

## Ordem Recomendada De Implementação

1. Segurança e multi-tenant.
2. Cálculo confiável de prazos.
3. Linha do tempo da pasta.
4. Dashboard de risco.
5. Área do cliente.
6. Automação de documentos.
7. Billing SaaS.
8. IA e jurimetria.

## Critério Para Vender

O produto só deve ser vendido como SaaS quando tiver:

- RLS testado e versionado.
- Cálculo de prazo auditável.
- Backup e logs.
- Onboarding claro.
- Paginação e performance aceitáveis com milhares de registros.
- Política LGPD mínima.
- Fluxo comercial com planos e cobrança.
