# Legal Hub — Contexto para Claude Code

## Projeto
SaaS de gestão jurídica para escritórios de advocacia. Multi-tenant via `empresa_id`.
Deploy: Vercel (frontend + Edge Functions). Banco: Supabase (PostgreSQL + Auth + RLS).

## Stack
- Frontend: Vanilla JS (SPA), sem build step — arquivos servidos diretamente pelo Vercel
- Backend: Vercel Edge Functions em `api/`
- Banco: Supabase — projeto `gcucadlnxttlxckravui`
- Edge Functions Supabase: `supabase/functions/`

## Arquivos principais
| Arquivo | Responsabilidade |
|---|---|
| `index.html` | SPA única — todo HTML, modais, abas |
| `style.css` | Estilos globais |
| `js/core.js` | State global, utils, Supabase client |
| `js/mappers.js` | `carregarDados()` — carrega todas as 9 tabelas do banco |
| `js/pastas.js` | CRUD de pastas |
| `js/prazos.js` | CRUD de prazos |
| `js/tarefas.js` | CRUD de tarefas |
| `js/intimacoes.js` | Render e sync manual de intimações PJe |
| `js/andamentos.js` | Andamentos CNJ/DataJud + manuais |
| `js/relatorio.js` | Geração de relatórios de andamentos |
| `js/agenda.js` | Calendário |
| `js/configuracoes.js` | Configurações de empresa, usuários, clientes |
| `api/pje-proxy.js` | Proxy Vercel → API PJe pública |
| `api/cnj-proxy.js` | Proxy Vercel → DataJud/CNJ |
| `api/esaj-proxy.js` | Proxy Vercel → ESAJ |
| `api/pje-cron.js` | Cron Vercel → dispara sync automático PJe (07h dias úteis) |
| `supabase/functions/sync-intimacoes/index.ts` | Edge Function: importa intimações de todos os escritórios |

## Convenções críticas
- **Versionamento de cache**: toda vez que um arquivo JS ou CSS é alterado, incrementar `?v=N` no `index.html`. Versão atual: **v=39**
- **Form save pattern**: `upsert(...).select()` + `Promise.race` com timeout de 12s + try-catch-finally com reset do botão no `finally`
- **RLS**: tabelas usam `empresa_id TEXT`. Cast necessário: `empresa_id::uuid = minha_empresa_id()`
- **Resp-picker**: componente `div.resp-picker` → `div.resp-chips` + `select.resp-add-select`. Funções: `popularRespPicker(id, str, lista, placeholder?)` e `getSelectedResps(id)`
- **Uppercase**: campos de texto de pasta são `text-transform: uppercase` no CSS. Valores salvos no banco com `.toUpperCase()` no submit handler
- **agendaEventos**: declarado em `core.js` (não em `agenda.js`) por questão de ordem de carregamento
- **Texto sempre em maiúsculas** nos campos: cliente, parte contrária, tipo de serviço, serviço, advogado

## Multi-tenant
- Cada empresa tem um `empresa_id` (UUID como texto nas tabelas)
- `state.empresaId` é populado no login
- Todas as queries filtram por `empresa_id`
- A Edge Function `sync-intimacoes` itera sobre todos os `pje_config` com `ativo = true`

---

## Fluxo completo — jornada do prazo (do PJe até o controle)

```
PJe (tribunal)
    │
    ▼ [Cron 07h úteis OU clique manual]
api/pje-cron.js (Vercel Cron) → supabase/functions/sync-intimacoes
    │  fetch comunicaapi.pje.jus.br
    │  upsert → intimacoes_pje
    ▼
carregarDados() → state.intimacoes
    │
    ▼ renderIntimacoesAba()
[Usuário vê intimação: "TJSP · Contestação · hoje"]
    │
    ▼ clica "+ Prazo" → criarPrazoDaIntimacao()
abrirModalNovoPrazo() pré-preenchido
    │  tipo: "Manifestação"
    │  descricao: "Intimação ... (24/04/2026)"
    │  pasta: vinculada automaticamente pelo nº do processo
    ▼
[Usuário define data fatal + clica Salvar]
    │
    ▼ prazos_lhub.upsert()
state.prazos atualizado
    │
    ▼ renderPrazosAba() + renderDashboard()
[Prazo aparece no dashboard como urgente se ≤ 3 dias]
    │
    ▼ [D-3] → Notificação push / email automático
[Advogado recebe alerta no celular]
```

---

## Roadmap

### v1.1 — Estabilização
- [x] RLS 100% em todas as tabelas
- [x] Relatórios com dados reais do banco (`js/relatorio.js`)
- [x] Sync automático PJe via Cron 07h dias úteis (`api/pje-cron.js` + `vercel.json`)
- [ ] Atualização local do state (sem `carregarDados()` a cada ação)
- [ ] Notificações de prazos vencendo em ≤ 3 dias (badge no nav + painel)

### v1.2 — Financeiro MVP
- [ ] Cadastro de honorários por pasta
- [ ] Dashboard financeiro: a receber, atrasado, recebido no mês
- [ ] Geração de boleto via API (Asaas ou Efipay)
- [ ] Relatório financeiro exportável

### v2.0 — SaaS Multi-escritório
- [ ] Página de planos e pagamento (Stripe)
- [ ] Trial 14 dias automático
- [ ] Limite de pastas por plano
- [ ] Subdomain por escritório (escritorio.legalhub.com.br)
- [ ] App mobile (PWA ou React Native)
- [ ] Notificações push reais (FCM)
- [ ] API pública para integrações (Zapier etc.)

### Monetização sugerida
| Plano | Preço | Limite |
|---|---|---|
| Solo | R$ 97/mês | 1 usuário, 50 pastas |
| Equipe | R$ 297/mês | 5 usuários, 300 pastas |
| Escritório | R$ 697/mês | 15 usuários, ilimitado |
| Enterprise | Custom | Multi-CNPJ, SLA, suporte dedicado |

TAM estimado: ~60.000 escritórios no Brasil com 2–30 advogados.
Ticket médio R$ 300/mês = mercado de R$ 216M/ano endereçável.
