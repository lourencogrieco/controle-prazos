Você deve se comportar como:

1) Um ESPECIALISTA em desenvolvimento de sistemas SaaS para escritórios de advocacia, com profundo conhecimento em:
- Rotinas jurídicas (prazos, publicações, andamentos, workflows processuais)
- Gestão de escritórios (financeiro, tarefas, equipe, produtividade)
- Experiência prática de advogados (usabilidade real, não teórica)
- Sistemas jurídicos líderes de mercado (como ProJuris, Astrea, ADVBOX)

2) Um DESENVOLVEDOR FULLSTACK SÊNIOR, com domínio em:
- Arquitetura de sistemas escaláveis (SaaS multi-tenant)
- Frontend moderno (UX/UI, performance, componentização)
- Backend robusto (APIs, segurança, regras de negócio)
- Banco de dados (modelagem eficiente e escalável)
- DevOps (deploy, monitoramento, segurança)
- Clean code e boas práticas

---

## 🎯 OBJETIVO

Você deve fazer uma AUDITORIA COMPLETA no sistema atual, com foco em:

1. Avaliar se o sistema está adequado para uso real por advogados
2. Identificar melhorias estratégicas e técnicas
3. Detectar bugs, inconsistências e riscos
4. Sugerir evoluções que aumentem escalabilidade e valor do produto
5. Melhorar o código sem quebrar o que já funciona

---

## ⚠️ REGRAS IMPORTANTES

- NÃO remover ou alterar funcionalidades que já estão funcionando corretamente
- NÃO sugerir mudanças teóricas desconectadas da prática jurídica
- SEMPRE priorizar soluções simples, escaláveis e de alto impacto
- Pensar como dono de SaaS (produto vendável e escalável)
- Pensar como advogado usuário final (praticidade e velocidade)
- Caso reescreva algo, justificar tecnicamente

---

## 🧠 ETAPAS DA ANÁLISE

### 1. ANÁLISE DO PRODUTO (VISÃO DE NEGÓCIO)
- O sistema resolve dores reais de advogados?
- Está competitivo com sistemas jurídicos do mercado?
- O que falta para ser vendável em escala?
- Quais features são obrigatórias e ainda não existem?

---

### 2. ANÁLISE FUNCIONAL (VISÃO DO ADVOGADO)
- Fluxo processual está intuitivo?
- Gestão de prazos está confiável?
- Controle de tarefas está eficiente?
- Interface está simples ou confusa?
- Existe algo que atrapalha o uso no dia a dia?

---

### 3. ANÁLISE TÉCNICA (CÓDIGO)
- Estrutura do projeto está organizada?
- Código está limpo e escalável?
- Há duplicação ou complexidade desnecessária?
- Existem riscos de bugs ou falhas?
- Segurança está adequada?
- Performance pode melhorar?

---

### 4. BANCO DE DADOS
- Modelagem está correta para SaaS?
- Suporta multi-tenant?
- Está preparado para crescimento?
- Existem redundâncias ou problemas estruturais?

---

### 5. UX/UI
- Interface está moderna e profissional?
- Fluxos estão rápidos e intuitivos?
- Existe fricção desnecessária?
- Pode melhorar conversão e retenção?

---

### 6. MELHORIAS ESTRATÉGICAS
Sugerir:
- Funcionalidades que aumentem valor percebido
- Diferenciais competitivos
- Possibilidades de monetização
- Automações inteligentes
- Uso de IA no sistema

---

### 7. REVISÃO DE BUGS
- Identificar possíveis erros
- Apontar riscos silenciosos
- Sugerir correções objetivas

---

## 🛠️ AÇÕES QUE VOCÊ PODE EXECUTAR

- Refatorar trechos de código (sem quebrar funcionalidades existentes)
- Melhorar estrutura de arquivos
- Sugerir novas implementações
- Criar melhorias incrementais
- Reorganizar arquitetura

---

## 📄 CLAUDE.MD (OBRIGATÓRIO)

Se necessário, você deve:

- Reescrever completamente o arquivo `claude.md`
- Organizar o contexto do sistema
- Documentar arquitetura, regras de negócio e padrões
- Garantir que futuras interações mantenham consistência

---

## 📦 FORMATO DA RESPOSTA

Sua resposta deve ser organizada em:

1. Diagnóstico geral do sistema
2. Principais problemas encontrados
3. Melhorias prioritárias (alto impacto)
4. Melhorias técnicas
5. Sugestões de novas features
6. Correções de bugs
7. Sugestões de arquitetura
8. (Se necessário) novo conteúdo do claude.md

---

## 🚀 MENTALIDADE

Aja como:
- Sócio técnico de uma legaltech
- Arquiteto de software experiente
- Advogado exigente usuário do sistema

Seu objetivo não é apenas revisar.
É transformar esse sistema em um SaaS jurídico de alto nível.

 ---                                                                                                          
  DIAGNÓSTICO GERAL                                                                                            
                                                                                                               
  O sistema é um SaaS jurídico funcional e bem estruturado com lógica de negócio sólida. Tem features que levam
   tempo para construir: integração com PJe, ESAJ e CNJ, controle financeiro completo e sistema de permissões  
  por perfil. Mas carrega dívida técnica significativa em segurança, escalabilidade e DevOps.                  
                                                                                                               
  ---                                                                                                          
  ESTRUTURA DO PROJETO                                                                                         
                                                                                                               
  Controle de prazos/                                                                                          
  ├── index.html            (2.862 linhas — shell da aplicação)                                                
  ├── style.css             (3.455 linhas — sistema de design completo)                                        
  ├── script.js             (4.625 linhas — ⚠️  DUPLICATA dos módulos em /js)                                   
  ├── js/                   (14 módulos: core, auth, pastas, prazos, tarefas,                                  
  │                          intimacoes, agenda, financeiro, relatorio, etc.)                                  
  ├── api/                  (4 Vercel Edge Functions: pje-proxy, esaj-proxy,                                   
  │                          cnj-proxy, pje-cron)                                                              
  └── supabase/functions/   (Deno: sync-intimacoes)                                                            
                                                                                                               
  Stack: Vanilla JS + HTML/CSS + Supabase (PostgreSQL) + Vercel Edge Functions                                 
                                                                                                               
  ---                                                                                                        
  PROBLEMAS CRÍTICOS (ordenados por risco)
                                                                                                               
  1. SEGURANÇA — URGENTE
                                                                                                               
  Credenciais hardcoded no código-fonte:                                                                       
  // core.js e script.js (duplicado!)
  const SUPA_URL = 'https://gcucadlnxttlxckravui.supabase.co';                                                 
  const SUPA_KEY = 'sb_publishable_5i0somnwIAvyLNImLSWYxg_yogC3bCb';                                           
  A chave sb_publishable_* é segura para o client-side, mas o projeto provavelmente está no GitHub — qualquer  
  pessoa pode usar sua infraestrutura. Mover para .env / Vercel secrets é obrigatório.                         
                                                                                                               
  Proxies CORS sem proteção:                                                                                   
  // api/pje-proxy.js                                                                                          
  const CORS = { 'Access-Control-Allow-Origin': '*' };                                                       
  // Sem rate limiting, sem autenticação                                                                       
  Qualquer um pode usar seus proxies para spammar PJe/ESAJ e ter seu IP bloqueado.                             
                                                                                                               
  Sem timeout/refresh de sessão — a sessão fica viva indefinidamente.                                          
                                                                                                               
  ---                                                                                                          
  2. DUPLICAÇÃO MASSIVA DE CÓDIGO                                                                              
                                                                                                               
  script.js (4.625 linhas) é praticamente uma cópia dos módulos em js/. Isso significa dois lugares para manter
   a mesma lógica — bugs corrigidos em um lugar ficam no outro.                                                
  
  ---                                                                                                          
  3. PERFORMANCE — CARREGAMENTO TOTAL A CADA ACESSO                                                          
                                                                                                               
  async function carregarDados() {
    // 14+ queries paralelas ao Supabase toda vez que abre o app                                               
    // Sem cache, sem delta sync, sem paginação                                                                
  }                                                                                                            
  Com 500+ pastas, isso vai travar. A busca de intimações é O(n) linear:                                       
  function pastaDaIntimacao(numeroProcesso) {                                                                  
    return state.pastas.find(p => p.processo && ...); // varre todo array                                    
  }                                                                                                            
                                                                                                               
  ---
  4. SEM TESTES, SEM CI/CD                                                                                     
                                                                                                             
  Zero testes. Zero pipeline de CI. Um bug em financeiro.js vai direto para produção sem nenhuma rede de
  segurança.                                                                                                   
  
  ---                                                                                                          
  5. FUNCIONALIDADES AUSENTES QUE QUALQUER CONCORRENTE TEM                                                   
                                                                                                               
  ┌─────────────────────────────────────────┬──────────────┐
  │                 Feature                 │    Status    │                                                   
  ├─────────────────────────────────────────┼──────────────┤                                                 
  │ Notificações por email (prazo vencendo) │ ✗ Não existe │
  ├─────────────────────────────────────────┼──────────────┤
  │ Logs de auditoria (quem alterou o quê)  │ ✗ Não existe │                                                   
  ├─────────────────────────────────────────┼──────────────┤                                                   
  │ Soft delete (lixeira)                   │ ✗ Não existe │                                                   
  ├─────────────────────────────────────────┼──────────────┤                                                   
  │ Export PDF/Excel                        │ ✗ Não existe │                                                 
  ├─────────────────────────────────────────┼──────────────┤                                                   
  │ Sync calendário (Google/Outlook)        │ ✗ Não existe │                                                 
  ├─────────────────────────────────────────┼──────────────┤                                                   
  │ Modo mobile                             │ ✗ Não existe │
  ├─────────────────────────────────────────┼──────────────┤                                                   
  │ Real-time multi-usuário                 │ ✗ Não existe │                                                 
  └─────────────────────────────────────────┴──────────────┘                                                   
                                                                                                             
  ---
  PONTOS FORTES (não mexer)
                                                                                                               
  - Sistema de permissões por perfil (8 roles bem definidos)
  - Multi-tenant com empresa_id em todas as tabelas                                                            
  - Integração PJe + ESAJ + CNJ (isso é difícil de fazer — valor real)                                         
  - Módulo financeiro (cobranças, contas a pagar, honorários, parcelamento)                                    
  - UI moderna com componentes consistentes (modais, badges de prazo, kanban)                                  
  - Cron diário às 07h para sync de intimações                                                                 
  - Formatação correta de datas pt-BR com timezone                                                             
                                                                                                               
  ---                                                                                                          
  MELHORIAS PRIORITÁRIAS (alto impacto)                                                                        
                                                                                                             
  SEMANA 1 — Segurança Básica

  1. ✅ Rotacionar credenciais Supabase
  2. ✅ Mover para .env + Vercel secrets
  3. ✅ Autenticação JWT nos proxies da API (proxy-guard.js)
  4. ✅ Rate limiting nos proxies (sliding window por userId)
  5. Verificar se todas as tabelas têm RLS ativo no Supabase

  MÊS 1 — Confiabilidade

  6.  ✅ Eliminar duplicação — script.js deletado
  7.  ✅ Email de notificação de prazos (notificar-prazos + Vercel cron)
        ⚠️  Bloqueado: ngadvogados.com.br pendente de verificação no Resend
            → Recuperar acesso ao Hostinger (conta antiga) OU trocar nameservers no Registro.br
  8.  ✅ Log de auditoria (tabela audit_log + logAuditoria() + UI em Configurações)
        ⚠️  Pendente: rodar SQL de criação da tabela no Supabase SQL Editor
  9.  ✅ Tratamento de erros no cron PJe (timeout 10s, logs detalhados, ultima_sync condicional)
  10. ⏸️  Backup automático — adiado (verificar plano Supabase antes)

  MÊS 2 — Escalabilidade

  11. Cache localStorage para dados estáticos (áreas, tipos de pasta)
  12. Paginação em prazos/tarefas
  13. Índice em memória por numero_processo (O(1) nas intimações)
  14. Real-time via Supabase Realtime subscriptions
  15. Export PDF relatório financeiro
