# Pendencias de Implementacao - Legal Hub

Atualizado em: 26/04/2026

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
- Migration `20260425182640_importacao_intimacoes_preserva_status.sql` cria RPC para importacao idempotente de intimacoes preservando arquivadas.
- Cron `sync-intimacoes` passou a usar `importar_intimacoes_pje` e retornar contadores de inseridas, atualizadas e ignoradas por arquivamento.
- Migration `20260426103000_importacao_intimacoes_service_role.sql` permite que o cron com service role use a RPC de importacao preservando a validacao para usuarios comuns.
- Migration aplicada no Supabase remoto e function `sync-intimacoes` publicada em 26/04/2026.
- Teste tecnico remoto com intimação fake arquivada confirmou `ignoradas_arquivadas = 1`, preservando `status_lhub`, `pasta_id`, `texto` e `hash`.
- Invocacao remota da function confirmou resposta com `total_inseridas`, `total_atualizadas` e `total_ignoradas_arquivadas`.
- Validacao pela UI local com usuario temporario confirmou: arquivar remove da lista pendente, reimportacao preserva arquivada, reload nao traz de volta como pendente e a intimação aparece apenas em "Arquivadas". Usuario e intimação fake foram removidos apos o teste.
- Sanitizacao inicial de `js/intimacoes.js`: tabela deixou de usar handlers inline com JSON, campos externos passam por escape, links externos aceitam apenas http/https e `javascript:` e bloqueado. Teste com payload HTML/script fake confirmou que a UI nao cria `img`, `script`, `svg`, `iframe` nem link `javascript:`.
- Sanitizacao expandida para helpers comuns em `js/core.js` e para renders de `js/documentos.js`, `js/financeiro.js` e `js/configuracoes.js`: textos/atributos vindos de usuario passam por escape, recibos nao recebem mais payload JSON no `onclick` e selects/tabelas de clientes, modelos, auditoria, documentos e financeiro foram revisados.
- Sanitizacao expandida para os renders restantes de `js/dashboard.js`, `js/pastas.js`, `js/tarefas.js`, `js/agenda.js`, `js/prazos.js`, `js/atividades.js` e `js/relatorio.js`: cards, tabelas, selects, tooltips e exports HTML/PDF agora usam escape em textos e atributos dinamicos.
- Observabilidade inicial da sincronizacao PJe: criada tabela `pje_sync_logs`, cron e sincronizacao manual registram contadores/erros, UI exibe ultima importacao com status e totais. Validado com login de teste e Edge Function remota.
- Historico visual da sincronizacao PJe: aba de intimacoes ganhou modal "Histórico PJe" com ultimos 20 logs, filtro por status, origem, periodo, totais, nomes pesquisados e detalhes de erro.
- Paginacao server-side inicial: tabelas de Pastas e Prazos passaram a buscar a pagina atual no Supabase com `range()` e `count: exact`, mantendo o estado global para nao quebrar dashboard, modais e vinculos existentes.
- Paginacao server-side expandida: modal de Clientes ganhou busca/paginacao server-side e Pipeline CRM passou a carregar ate 30 oportunidades por coluna com contador real por status.
- Estabilizacao de criacao de conta/onboarding, logout, criacao de prazos/tarefas/agenda e exclusao de compromisso.
- Correcoes conservadoras para o MVP: tema/logo voltou a ter fallback padrao `logo.svg`, e a configuracao visual passou a ser isolada por empresa no navegador para evitar que contas de teste alterem a conta principal.

## Revisao da auditoria de 26/04/2026

O que faz sentido manter como prioridade:

- Estabilidade para testes com colegas: antes de novas funcionalidades grandes, executar roteiro manual com 2 ou 3 empresas/usuarios de teste validando login, logout, criacao de conta, agenda, tarefas, prazos, pastas, clientes, financeiro basico e intimações.
- Performance: Pastas, Prazos, Clientes e Pipeline CRM ja tiveram carregamento paginado/limitado em tentativas recentes, mas mexidas amplas nesse ponto aumentaram risco de regressao. Para o MVP, manter apenas ajustes pontuais e deixar a reducao do `carregarDados()` para uma rodada propria.
- Sincronizacao PJe: o cron agora usa a RPC de importacao preservando status, registra log resumido e a UI tem historico visual dos ultimos logs. Falta apenas repetir em rotina real com uma intimação real quando houver caso adequado.
- Sanitizacao: os principais renders de intimações, documentos, financeiro, configuracoes, dashboard, pastas, tarefas, agenda, prazos, atividades e relatorios ja usam helpers comuns de escape. O risco restante e revisar novas telas/codigo futuro para manter o padrao.
- Configuracoes visuais: tema e logo agora ficam isolados por empresa no `localStorage`. Ainda falta, numa etapa posterior, salvar essas preferencias no banco se for desejado que todos os usuarios da mesma empresa vejam a mesma marca.
- Numero de pasta: `gerarNumeroPasta()` continua client-side e pode gerar duplicidade com usuarios simultaneos.
- Produto: area do cliente, onboarding, billing, notificacoes confiaveis e DRE/fluxo de caixa seguem sendo os maiores gaps para SaaS publico.
- QA/seguranca: RLS esta versionado em migration, mas ainda precisa ser validado no banco remoto/producao com testes reais de isolamento entre empresas.

O que estava desatualizado ou deve sair do foco imediato:

- `script.js` duplicado: nao aparece mais carregado no `index.html`; manter apenas como checagem historica, nao como bug aberto.
- "Sem sanitizacao em andamentos" esta parcialmente resolvido; o risco principal agora e centralizar escape nos renders que recebem texto externo.
- Bug de intimacao arquivada: tratar como "correcao integrada e validada com cenário controlado", nao como ausencia total de solucao.

## Pendencias criticas

1. Manter sanitizacao como padrao de desenvolvimento
   - Helpers comuns `escHtml`, `escAttr` e `safeExternalUrl` ja foram promovidos para `js/core.js`.
   - Intimacoes, documentos, financeiro, configuracoes, dashboard, pastas, tarefas, agenda, prazos, atividades e relatorios ja tiveram os principais pontos revisados.
   - Em novas telas, evitar interpolacao direta de dados de usuario em `innerHTML`.
   - Trocar handlers inline com payload dinamico por `data-*` + event listeners quando houver dados externos complexos.

2. Evoluir historico visual da sincronizacao PJe
   - Modal de historico com ultimos 20 logs ja implementado.
   - Adicionar limpeza/retencao automatica de logs antigos se o volume crescer.
   - Considerar detalhes por nome pesquisado em tabela separada se a busca por muitos nomes ficar dificil de ler.

3. Paginacao server-side nas listas principais
   - Tratar como pos-MVP ou como tarefa isolada, porque alteracoes amplas nesse ponto ja causaram regressao perceptivel.
   - Se retomar, fazer uma tela por vez e validar antes de seguir.
   - Evitar carregar tudo no `carregarDados()`; carregar resumo/dashboard separado da lista paginada.
   - Manter cache apenas para dados pequenos e estaticos, como areas e tipos de pasta.

4. Geracao atomica de numero de pasta
   - Substituir `gerarNumeroPasta()` client-side por RPC/transacao no banco.
   - Manter preview no front apenas como estimativa visual.
   - Criar constraint unica para impedir duplicidade por empresa/area/tipo/ano/numero.

5. Vinculo de intimacao com pasta
   - Permitir busca mais inteligente por cliente, processo, pasta, parte contraria e numero sem mascara.
   - Sugerir automaticamente pasta provavel quando o numero do processo for parecido.
   - Mostrar alerta quando a intimacao for de 2ª instancia e a pasta for de 1ª instancia.

6. Andamentos da pasta
   - Persistir opcionalmente a intimacao vinculada como andamento real, se for necessario historico independente da lista de intimacoes.
   - Adicionar acao "Criar prazo" e "Criar tarefa" direto no detalhe do andamento de intimacao.
   - Melhorar layout da tabela de andamentos em telas menores.

7. Agenda e tarefas
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
   - Helpers de escape/sanitize ja centralizados em `js/core.js`; continuar aplicando nos modulos restantes.
   - Remover estilos inline gradualmente.
   - Criar classes reutilizaveis para modais, tabelas e botoes.
   - Padronizar modais grandes e pequenos.
   - Testar responsividade mobile.

4. QA
   - Criar roteiro manual de teste:
     - criar conta nova com empresa nova;
     - sair e entrar novamente;
     - confirmar que logo/tema de uma empresa nao vazam para outra;
     - criar, editar e excluir compromisso de agenda;
     - criar tarefa e prazo;
     - criar cliente e pasta;
     - validar que filtros principais nao quebram a lista;
     - sincronizar intimacoes;
     - vincular a pasta;
     - arquivar;
     - recarregar;
     - sincronizar novamente;
     - confirmar que nao volta para pendente.
   - Adicionar testes automatizados onde for viavel.

## Proxima implementacao recomendada

Prioridade 1:

Roteiro de QA e estabilizacao do MVP.

Motivo:

A meta imediata e deixar colegas testarem sem quebrar fluxos basicos. Depois das regressões recentes, o maior ganho pratico vem de validar e corrigir bugs pequenos, nao de expandir arquitetura ou performance.

Passos sugeridos:

1. Criar duas contas de teste em empresas diferentes e validar isolamento de dados, logo e tema.
2. Rodar o fluxo basico completo: login/logout, agenda, tarefas, prazos, clientes, pastas, financeiro e intimações.
3. Registrar bugs encontrados com tela, usuario, horario e acao executada.
4. Corrigir apenas problemas reproduziveis e pequenos ate o MVP ficar confiavel para teste externo.
5. Deixar performance/paginacao profunda, billing, portal do cliente e automacoes avancadas para depois dessa rodada.

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
- `supabase/functions/sync-intimacoes/index.ts`

## Migracoes recentes importantes

- `20260425174210_intimacoes_pasta_manual_link.sql`
- `20260425174820_rpc_vincular_intimacao_pasta.sql`
- `20260425175610_rpc_status_intimacao.sql`
- `20260425180730_retencao_intimacoes_arquivadas.sql`
- `20260425182640_importacao_intimacoes_preserva_status.sql`
- `20260426103000_importacao_intimacoes_service_role.sql`
