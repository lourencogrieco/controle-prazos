# Sistema de Controle de Prazos Jurídicos

## Visão Geral

Sistema web para escritórios de advocacia focado em controle de prazos, tarefas, audiências, diligências, lembretes, gestão de equipe e produtividade.

O objetivo é centralizar todas as atividades operacionais do escritório em um único ambiente, com rastreabilidade, segurança, controle de acesso e notificações.

## Objetivos do Sistema

- Controlar prazos processuais
- Organizar tarefas internas
- Distribuir atividades entre a equipe
- Acompanhar audiências e diligências
- Controlar produtividade
- Reduzir risco de perda de prazo
- Gerar histórico de atividades
- Melhorar a gestão do escritório

## Estrutura de Pastas

```text
controle-prazos/
│
├── index.html
├── style.css
├── script.js
└── README.md
```

## Funcionalidades

- Cadastro de cliente
- Número do processo
- Tipo de atividade
- Data do prazo fatal
- Data interna automática com 1 dia de antecedência
- Campo de descrição/diretrizes
- Responsável pelo cumprimento
- Status do prazo
- Controle de perfis
- Alertas visuais
- Dashboard
- Notificações
- Relatórios

## Arquitetura Recomendada para Produção

### Frontend

- HTML5
- CSS3
- JavaScript
- React
- Next.js
- Tailwind CSS

### Backend

- Node.js
- Express.js
- JWT
- bcrypt
- API REST
- Middleware de autenticação
- Middleware de autorização
- Logs de acesso

### Banco de Dados

- PostgreSQL

#### Tabela usuarios

- id
- nome
- email
- senha_hash
- perfil
- ativo
- criado_em

#### Tabela clientes

- id
- nome
- cpf_cnpj
- telefone
- email
- observacoes
- criado_em

#### Tabela processos

- id
- cliente_id
- numero_processo
- vara
- tribunal
- tipo_acao
- observacoes
- criado_em

#### Tabela tarefas

- id
- processo_id
- tipo_tarefa
- titulo
- descricao
- data_prazo_fatal
- data_prazo_interno
- responsavel_id
- status
- prioridade
- criado_por
- concluido_por
- concluido_em
- criado_em

## Perfis de Usuário

### Sócio

- Visualiza tudo
- Cria usuários
- Edita qualquer tarefa
- Exclui tarefas
- Acessa relatórios

### Controller

- Cria e controla prazos
- Define responsáveis
- Altera status
- Gera relatórios

### Advogado

- Visualiza seus processos
- Atualiza status
- Conclui tarefas

### Estagiário

- Visualiza tarefas atribuídas
- Atualiza observações
- Não altera prazo fatal

## Regras de Negócio

- Todo prazo deve gerar automaticamente uma data interna 1 dia antes
- Considerar feriados nacionais, estaduais e municipais
- Considerar suspensão de prazos do CNJ
- Considerar recesso forense
- Registrar histórico completo de alterações

## Segurança

- Login com e-mail e senha
- Recuperação de senha
- JWT
- HTTPS
- Proteção contra SQL Injection
- Proteção contra XSS
- Proteção contra CSRF
- Backup diário automático

## Integrações Futuras

- Supabase
- Google Calendar
- Outlook Calendar
- WhatsApp API
- E-mail SMTP
- OCR de publicações
- Consulta processual automática

## Checklist para Entrega ao Cliente

- Layout responsivo
- Banco de dados configurado
- Usuário administrador criado
- Backup configurado
- Segurança implementada
- HTTPS ativo
- Logs implementados
- Manual do usuário
- Manual técnico
- Ambiente de produção
