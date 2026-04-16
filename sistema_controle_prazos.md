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

---

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

---

## 3. Cadastro de Clientes

Campos obrigatórios:

- Nome do cliente
- CPF/CNPJ
- Telefone
- E-mail
- Observações
- Responsável interno
- Status do cliente
  - Ativo
  - Inativo
  - Prospect

---

## 4. Cadastro de Processos

Campos:

- Número do processo
- Cliente vinculado
- Tribunal
- Vara
- Comarca
- Parte contrária
- Tipo de ação
- Responsável principal
- Advogado auxiliar
- Estagiário responsável
- Observações internas
- Status do processo
  - Ativo
  - Suspenso
  - Encerrado

---

## 5. Cadastro de Prazo

Cada prazo deve conter:

- Cliente
- Número do processo
- Tipo de prazo
- Data da publicação
- Quantidade de dias úteis
- Data fatal oficial
- Data interna do escritório
- Responsável pelo cumprimento
- Controller responsável
- Status

### Tipos de prazo
- Contestação
- Recurso
- Manifestação
- Réplica
- Cumprimento de decisão
- Contrarrazões
- Juntada de documentos
- Outros

### Status
- Pendente
- Em andamento
- Concluído
- Atrasado

### Regra de Data Interna
Data interna = 1 dia útil antes da data fatal oficial

Também deve considerar:
- Finais de semana
- Feriados nacionais
- Feriados estaduais
- Feriados municipais
- Recesso forense
- Suspensão de expediente dos tribunais

---

## 6. Campo de Descrição e Diretrizes do Prazo

Adicionar no cadastro de prazo:

- Descrição do prazo
- Diretrizes internas
- Estratégia processual
- Documentos necessários
- Ponto principal da tese
- Observações do responsável
- Pendências para estagiário
- Cliente precisa aprovar?
- Necessidade de documentos complementares?
- Data limite para coleta de documentos

### Exemplo de preenchimento

**Descrição:**  
Apresentar contestação alegando ausência de responsabilidade do ente público, com pedido subsidiário de redução do valor pleiteado.

**Diretrizes:**  
- Solicitar documentos ao cliente até 10/05/2026
- Verificar precedentes do TJSP
- Levantar jurisprudência favorável
- Anexar comprovantes de pagamento
- Revisão final pelo sócio até 18/05/2026

### Campos adicionais na tabela deadlines

- descricao
- diretrizes
- observacoes_internas
- documentos_pendentes
- data_limite_documentos
- aprovacao_cliente
- revisado_por
- data_revisao

---

## 7. Tipos de Tarefas

### Audiências
Campos:
- Processo
- Cliente
- Tipo de audiência
- Data e horário
- Local
- Link de audiência virtual
- Advogado responsável
- Estagiário acompanhante
- Observações

### Diligências
Campos:
- Processo
- Tipo de diligência
- Local
- Data
- Responsável
- Observações

### Agendamentos
Campos:
- Cliente
- Data e horário
- Tipo de reunião
- Responsável
- Observações

### Lembretes
Campos:
- Título
- Descrição
- Data
- Responsável
- Prioridade
  - Baixa
  - Média
  - Alta

---

## 8. Sistema de Notificações

O sistema deve gerar notificações automáticas:

- Quando um prazo for criado
- Quando faltar 1 dia para o prazo interno
- Quando o prazo estiver vencido
- Quando o prazo for concluído

As notificações podem ser:
- Dentro do sistema
- E-mail
- WhatsApp
- Push notification

---

## 9. Dashboard Principal

### Cards Superiores
- Total de prazos pendentes
- Total de prazos concluídos
- Prazos vencendo hoje
- Audiências do dia
- Tarefas atrasadas
- Clientes ativos

### Listas
- Próximos prazos
- Próximas audiências
- Tarefas pendentes
- Últimas atividades
- Usuários com mais tarefas

### Gráficos
- Prazos por responsável
- Prazos concluídos por mês
- Distribuição de tarefas
- Audiências por mês
- Processos por área

---

## 10. Banco de Dados - Tabelas Principais

### users
- id
- nome
- email
- senha
- cargo
- status

### clients
- id
- nome
- cpf_cnpj
- telefone
- email
- observacoes

### processes
- id
- numero_processo
- cliente_id
- tribunal
- vara
- comarca
- tipo_acao
- responsavel_id
- status

### deadlines
- id
- process_id
- tipo_prazo
- data_publicacao
- dias_uteis
- data_fatal
- data_interna
- responsavel_id
- controller_id
- status
- descricao
- diretrizes
- observacoes_internas
- documentos_pendentes
- data_limite_documentos
- aprovacao_cliente
- revisado_por
- data_revisao

### hearings
- id
- process_id
- data_hora
- tipo
- local
- link_virtual
- responsavel_id

### tasks
- id
- tipo
- titulo
- descricao
- responsavel_id
- data
- prioridade
- status

### notifications
- id
- usuario_id
- titulo
- mensagem
- lida
- data_envio
