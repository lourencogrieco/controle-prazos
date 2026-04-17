# Sistema de Controle de Prazos e Tarefas Jurídicas

## 1. Objetivo do Sistema

Criar uma plataforma para controle de:

- Prazos processuais
- Audiências
- Diligências
- Agendamentos
- Lembretes internos
- Delegação de responsáveis
- Controle de notificações
- Gestão de usuários e permissões

## 2. Estrutura de Usuários

### Sócio
- Acesso total ao sistema
- Visualiza todos os clientes, processos, prazos e usuários
- Pode criar, editar e excluir qualquer item
- Pode alterar responsáveis
- Pode visualizar relatórios e produtividade

### Controller
- Responsável pelo controle dos prazos
- Pode criar e distribuir tarefas
- Pode alterar datas de prazo fatal
- Pode validar conclusão dos prazos
- Pode acompanhar pendências da equipe

### Advogado
- Pode visualizar apenas os processos em que está vinculado
- Pode concluir tarefas
- Pode criar anotações
- Pode solicitar alteração de prazo
- Não pode excluir prazo fatal

### Estagiário
- Pode visualizar tarefas vinculadas
- Pode anexar documentos
- Pode marcar atividade como “em andamento”
- Não pode alterar data do prazo fatal
- Não pode excluir prazo ou tarefa
