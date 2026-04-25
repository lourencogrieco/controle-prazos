# Pendencias de Implementacao - Legal Hub

Atualizado em: 25/04/2026

Este arquivo registra o que ainda falta implementar ou revisar para continuar a evolucao do sistema sem perder contexto.

## Ja implementado recentemente

- Roadmap SaaS juridico inicial.
- RLS, indices e fundacao de seguranca no Supabase.
- Calculo/auditoria de prazos juridicos.
- Modelos de documentos com preenchimento por cliente/processo.
- Vinculo manual de intimacao com pasta.
- Criacao de nova pasta a partir de intimacao.
- Status de intimacao via RPC.
- Intimacoes arquivadas somem do acompanhamento.
- Retencao: intimacoes arquivadas ficam 14 dias e depois sao removidas do banco.
- Botao para visualizar intimacoes arquivadas.
- Intimacoes vinculadas aparecem como andamento da pasta.
- Intimacoes de segunda instancia entram na secao recursal.
- Numero do processo aparece no andamento recursal.
- Modal de leitura da intimacao limpa HTML bruto.
- Ajustes de CSS nos modais principais.
- Painel: clique em prazo/tarefa/agenda navega para a aba correta e destaca o item, sem abrir modal automaticamente.

## Pendencias criticas

1. Validar em ambiente real o bug de status "Arquivada"
   - Confirmar se, apos arquivar, a intimação nao volta como "Pendente" depois de sincronizar.
   - Revisar upsert da sincronizacao PJe para garantir que nao sobrescreva `status_lhub`, `pasta_id` e `arquivada_em`.
   - Ideal: trocar `ignoreDuplicates: true` por merge controlado que preserve campos internos do Legal Hub.

2. Melhorar sincronizacao PJe
   - Evitar recriar ou reativar intimação arquivada.
   - Criar log de importacao/sincronizacao.
   - Mostrar quantas intimações foram novas, ignoradas, atualizadas e arquivadas preservadas.

3. Vinculo de intimacao com pasta
   - Permitir busca mais inteligente por cliente, processo, pasta, parte contraria e numero sem mascara.
   - Sugerir automaticamente pasta provavel quando o numero do processo for parecido.
   - Mostrar alerta quando a intimacao for de 2ª instancia e a pasta for de 1ª instancia.

4. Andamentos da pasta
   - Persistir opcionalmente a intimacao vinculada como andamento real, se for necessario historico independente da lista de intimacoes.
   - Adicionar acao "Criar prazo" e "Criar tarefa" direto no detalhe do andamento de intimacao.
   - Melhorar layout da tabela de andamentos em telas menores.

5. Agenda e tarefas
   - Criar filtro automatico quando o painel direcionar para tarefas ou agenda.
   - Adicionar estado visual melhor para item destacado.
   - Permitir abrir modal apenas por botao/acao secundaria, nao pelo clique principal vindo do painel.

## Pendencias de produto

1. Area do cliente
   - Portal simples para cliente acompanhar pastas, documentos e compromissos.
   - Permissoes por cliente.
   - Historico de comunicacoes.

2. CRM juridico
   - Funil comercial completo.
   - Conversao de oportunidade em cliente/pasta.
   - Propostas e honorarios integrados.

3. Financeiro juridico
   - Honorarios recorrentes.
   - Exito.
   - Custas e despesas por pasta.
   - DRE simples do escritorio.
   - Relatorio por cliente, advogado e area.

4. Automacao de documentos
   - Editor de modelos dentro do sistema.
   - Variaveis documentadas.
   - Preenchimento automatico com dados de cliente, pasta, processo, valores e partes.
   - Exportacao DOCX/PDF.

5. Inteligencia juridica
   - Resumo de intimacao com IA.
   - Sugestao de prazo/tarefa com base no texto da intimacao.
   - Sugestao de tese/documento.
   - Jurimetria basica por tribunal, classe e resultado.

## Pendencias tecnicas

1. Multi-tenant e seguranca
   - Auditar todas as tabelas com `empresa_id`.
   - Confirmar RLS em tabelas novas.
   - Revisar funcoes `security definer`.
   - Garantir que RPCs sempre validem `is_empresa_member`.

2. Banco de dados
   - Revisar tipos `text` vs `uuid`.
   - Padronizar status em enums ou check constraints.
   - Criar tabelas de logs para sincronizacao, auditoria e eventos criticos.
   - Criar indexes para consultas frequentes.

3. Frontend
   - Remover estilos inline gradualmente.
   - Criar classes reutilizaveis para modais, tabelas e botoes.
   - Padronizar modais grandes e pequenos.
   - Testar responsividade mobile.

4. QA
   - Criar roteiro manual de teste:
     - sincronizar intimacoes;
     - vincular a pasta;
     - arquivar;
     - recarregar;
     - sincronizar novamente;
     - confirmar que nao volta para pendente.
   - Adicionar testes automatizados onde for viavel.

## Proxima implementacao recomendada

Prioridade 1:

Revisar a sincronizacao PJe para preservar campos internos (`status_lhub`, `pasta_id`, `arquivada_em`) e impedir que uma intimação arquivada volte para pendente apos nova importacao.

Motivo:

Esse bug afeta confianca operacional. Se o advogado arquiva uma intimacao e ela reaparece, o sistema passa inseguranca e aumenta risco de retrabalho.

## Arquivos mais relevantes

- `js/intimacoes.js`
- `js/mappers.js`
- `js/dashboard.js`
- `js/agenda.js`
- `js/andamentos.js`
- `js/tarefas.js`
- `js/pastas.js`
- `style.css`
- `index.html`
- `supabase/migrations/`

## Migracoes recentes importantes

- `20260425174210_intimacoes_pasta_manual_link.sql`
- `20260425174820_rpc_vincular_intimacao_pasta.sql`
- `20260425175610_rpc_status_intimacao.sql`
- `20260425180730_retencao_intimacoes_arquivadas.sql`

