"use strict";

// ─── DATA ──────────────────────────────────────────────────────────────
const atividades = [
  {
    cliente:    "Eurofins do Brasil Análises de Alimentos Ltda.",
    processo:   "37/2025-2776",
    tipo:       "Encerramento de pasta",
    area:       "Consultivo",
    dataFatal:  "2026-04-18",
    responsavel: "Advogado",
    status:     "Pendente",
    descricao:  "Realizar encerramento da pasta com conferência documental e baixa do fluxo interno.",
    solicitante: "Julia Rodrigues Barreto",
    prioridade: "Urgente",
  },
  {
    cliente:    "Banco Prime Capital",
    processo:   "1002456-89.2026.8.26.0100",
    tipo:       "Prazo processual",
    area:       "Contencioso",
    dataFatal:  "2026-04-22",
    responsavel: "Controller",
    status:     "Em andamento",
    descricao:  "Protocolar contestação, revisar fundamentos e validar anexos obrigatórios do processo.",
    solicitante: "Mariana Innocenti",
    prioridade: "Alta",
  },
  {
    cliente:    "Hospital Santa Helena",
    processo:   "5001123-21.2026.8.26.0001",
    tipo:       "Audiência",
    area:       "Trabalhista",
    dataFatal:  "2026-04-25",
    responsavel: "Sócio",
    status:     "Em andamento",
    descricao:  "Preparar roteiro da audiência, alinhar estratégia de sustentação e revisar documentos.",
    solicitante: "Carlos Henrique",
    prioridade: "Média",
  },
  {
    cliente:    "Grupo Orion Logística",
    processo:   "0029874-44.2026.8.19.0001",
    tipo:       "Diligência",
    area:       "Tributário",
    dataFatal:  "2026-04-24",
    responsavel: "Estagiário",
    status:     "Concluído",
    descricao:  "Solicitação e conferência de documentos complementares finalizadas pelo apoio jurídico.",
    solicitante: "Ana Cláudia Argenta",
    prioridade: "Normal",
  },
  {
    cliente:    "Família Almeida",
    processo:   "0908877-14.2026.8.26.0100",
    tipo:       "Lembrete interno",
    area:       "Societário",
    dataFatal:  "2026-04-21",
    responsavel: "Advogado",
    status:     "Pendente",
    descricao:  "Confirmar notificação interna para revisão de petição antes do protocolo final.",
    solicitante: "João Carvalho",
    prioridade: "Alta",
  },
];

const oportunidades = [
  {
    numero:     "272-2026",
    lead:       "Vivar Sanchez Medicina Cardiológica Ltda.",
    tipo:       "Consultivo",
    tese:       "Consultoria Tributária",
    area:       "Tributário",
    status:     "Recusado",
    motivoRecusa: "subir honorários para 20k",
    responsavel: "CB",
    responsavelNome: "Cinthia Benvenuto de Carvalho Ferreira",
    data:       "2026-01-28",
  },
  {
    numero:     "60-2025",
    lead:       "Sts – Sociedade De Terceirização De Serviços Ltda.",
    tipo:       "Consultivo",
    tese:       "Consultoria Tributária",
    area:       "Tributário",
    status:     "Aguardando aceite",
    motivoRecusa: "subir honorários",
    responsavel: "CB AC",
    responsavelNome: "Ana Claudia de Andrade Argenta",
    data:       "2025-01-24",
    envio:      "automático",
  },
  {
    numero:     "67-2025",
    lead:       "Clinica De Olhos Octavio Moura Brasil Ltda.",
    tipo:       "Consultivo",
    tese:       "Consultoria Tributária",
    area:       "Tributário",
    status:     "Aguardando aceite",
    responsavel: "CB",
    responsavelNome: "Cinthia Benvenuto de Carvalho Ferreira",
    data:       "2025-02-10",
  },
  {
    numero:     "85-2025",
    lead:       "Farma Plus Distribuidora de Medicamentos Ltda.",
    tipo:       "Consultivo",
    tese:       "Consultoria Tributária",
    area:       "Tributário",
    status:     "Aguardando aceite",
    motivoRecusa: "revisão de proposta",
    responsavel: "CB",
    responsavelNome: "Cinthia Benvenuto de Carvalho Ferreira",
    data:       "2025-03-05",
  },
  {
    numero:     "124-2025",
    lead:       "Construtora Meridional S.A.",
    tipo:       "Contencioso",
    tese:       "Defesa Trabalhista",
    area:       "Trabalhista",
    status:     "Aguardando aceite",
    responsavel: "LG",
    responsavelNome: "Lourenço Grieco",
    data:       "2025-04-12",
  },
];

// ─── UTILS ─────────────────────────────────────────────────────────────
function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}

function daysUntil(iso) {
  const today = new Date();
  const base  = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = iso.split("-").map(Number);
  return Math.ceil((new Date(y, m - 1, d) - base) / 86400000);
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function statusClass(s) {
  if (s === "Concluído")    return "concluido";
  if (s === "Em andamento") return "andamento";
  return "pendente";
}

function currentTime() {
  return new Date().toLocaleTimeString("pt-BR");
}

// ─── CARD RENDERERS ────────────────────────────────────────────────────
function atividadeCard(item) {
  const diff    = daysUntil(item.dataFatal);
  const urgent  = item.prioridade === "Urgente" || diff <= 1;
  const classes = ["req-card", urgent ? "req-card--urgent" : "", item.status === "Concluído" ? "req-card--done" : ""].filter(Boolean).join(" ");

  return `
    <article class="${classes}">
      <div class="req-body">
        <div class="req-tags">
          <span class="tag tag--area">${item.area}</span>
          ${urgent ? '<span class="tag tag--urgent">Urgente</span>' : ""}
          <span class="tag tag--type">${item.tipo}</span>
        </div>
        <p class="req-number">${item.processo}</p>
        <p class="req-meta"><strong>Lead:</strong> ${item.cliente}</p>
        <p class="req-meta"><strong>Tipo:</strong> ${item.tipo}</p>
        <p class="req-description">${item.descricao}</p>
        <p class="req-date">${formatDate(item.dataFatal)}</p>
      </div>
      <div class="req-foot">
        <div class="req-avatars">
          <span class="avatar">${initials(item.responsavel)}</span>
          <span class="avatar avatar--plus">+</span>
        </div>
        <div class="req-owner">Solicitado por ${item.solicitante}</div>
      </div>
    </article>`;
}

function oportunidadeCard(item) {
  const recusado = item.status === "Recusado";
  const classes  = ["req-card", recusado ? "req-card--refused" : ""].filter(Boolean).join(" ");
  const tagClass = item.area === "Tributário" ? "tag--area" : "tag--type";

  return `
    <article class="${classes}">
      <div class="req-body">
        <div class="req-tags">
          <span class="tag ${tagClass}">${item.area}</span>
          ${recusado ? '<span class="tag tag--refused">Recusado</span>' : ""}
        </div>
        <p class="req-number">${item.numero}</p>
        <p class="req-meta"><strong>Lead:</strong> ${item.lead}</p>
        <p class="req-meta"><strong>Tipo:</strong> ${item.tipo}</p>
        <p class="req-meta"><strong>Tese:</strong> ${item.tese}</p>
        ${item.motivoRecusa ? `<p class="req-refusal">Motivo da recusa: ${item.motivoRecusa}</p>` : ""}
        ${!recusado && item.envio ? `<p class="req-date">Enviado ${item.envio}mente em ${formatDate(item.data)}</p>` : ""}
      </div>
      <div class="req-foot">
        <div class="req-avatars">
          ${item.responsavel.split(" ").map(r => `<span class="avatar">${r}</span>`).join("")}
          <span class="avatar avatar--plus">+</span>
        </div>
        <div class="req-owner">${recusado ? `Recusado em ${formatDate(item.data)}<br>por ${item.responsavelNome}` : `Enviado em ${formatDate(item.data)}<br>por ${item.responsavelNome}`}</div>
      </div>
    </article>`;
}

// ─── FILTER ────────────────────────────────────────────────────────────
function filteredAtividades() {
  const busca  = (document.getElementById("buscaPainel")?.value ?? "").trim().toLowerCase();
  const resp   = document.getElementById("filtroResponsavel")?.value ?? "";
  return atividades.filter(item => {
    const match = !busca ||
      item.cliente.toLowerCase().includes(busca) ||
      item.processo.toLowerCase().includes(busca) ||
      item.tipo.toLowerCase().includes(busca) ||
      item.area.toLowerCase().includes(busca);
    return match && (!resp || item.responsavel === resp);
  });
}

function filteredOportunidades() {
  const busca = (document.getElementById("buscaPipeline")?.value ?? "").trim().toLowerCase();
  if (!busca) return oportunidades;
  return oportunidades.filter(item =>
    item.lead.toLowerCase().includes(busca) ||
    item.numero.toLowerCase().includes(busca) ||
    item.area.toLowerCase().includes(busca)
  );
}

// ─── RENDER BOARD ATIVIDADES ───────────────────────────────────────────
function renderAtividades() {
  const lista     = filteredAtividades();
  const pendentes = lista.filter(i => i.status === "Pendente");
  const andamento = lista.filter(i => i.status === "Em andamento");
  const concluidos = lista.filter(i => i.status === "Concluído");

  const empty = label => `<div class="empty-state">${label}</div>`;

  document.getElementById("colunaPendentes").innerHTML  = pendentes.length  ? pendentes.map(atividadeCard).join("") : empty("Nenhuma nova solicitação.");
  document.getElementById("colunaAndamento").innerHTML  = andamento.length  ? andamento.map(atividadeCard).join("") : empty("Nenhuma atividade em andamento.");
  document.getElementById("colunaConcluidos").innerHTML = concluidos.length ? concluidos.map(atividadeCard).join("") : empty("Nenhuma atividade concluída.");

  document.getElementById("countNovas").textContent     = pendentes.length;
  document.getElementById("countAndamento").textContent = andamento.length;
  document.getElementById("countConcluidos").textContent = concluidos.length;
  document.getElementById("countCancelados").textContent = "0";

  // Metrics
  const total      = lista.length || 1;
  const urgentes   = lista.filter(i => i.status !== "Concluído" && (i.prioridade === "Urgente" || daysUntil(i.dataFatal) <= 1)).length;
  const pct        = Math.round((concluidos.length / total) * 100);

  document.getElementById("metricPendentes").textContent  = String(lista.filter(i => i.status !== "Concluído").length).padStart(2, "0");
  document.getElementById("metricUrgentes").textContent   = String(urgentes).padStart(2, "0");
  document.getElementById("metricConcluidos").textContent = String(concluidos.length).padStart(2, "0");
  document.getElementById("progressBar").style.width      = `${pct}%`;
  document.getElementById("progressLabel").textContent    = `${pct}% completo`;

  renderTabela(lista);
}

// ─── RENDER TABLE ──────────────────────────────────────────────────────
function renderTabela(lista) {
  document.getElementById("tabelaPrazos").innerHTML = lista.map(item => `
    <tr>
      <td><a href="#" class="table-link">${item.processo}</a></td>
      <td>${item.cliente}</td>
      <td>${item.tipo}</td>
      <td>${formatDate(item.dataFatal)}</td>
      <td>${item.responsavel}</td>
      <td><span class="status-pill ${statusClass(item.status)}">${item.status}</span></td>
    </tr>`).join("");
}

// ─── RENDER PIPELINE ───────────────────────────────────────────────────
function renderPipeline() {
  const lista    = filteredOportunidades();
  const recusado = lista.filter(i => i.status === "Recusado");
  const aceite   = lista.filter(i => i.status === "Aguardando aceite");

  const empty = label => `<div class="empty-state">${label}</div>`;

  document.getElementById("colunaOportunidades").innerHTML = recusado.length ? recusado.map(oportunidadeCard).join("") : empty("Nenhuma oportunidade.");
  document.getElementById("colunaAceite").innerHTML        = aceite.length   ? aceite.map(oportunidadeCard).join("")   : empty("Nenhum aguardando aceite.");
  document.getElementById("countOportunidades").textContent = recusado.length;
  document.getElementById("countAceite").textContent        = aceite.length;
  document.getElementById("countValidacao").textContent     = "0";
  document.getElementById("countAssinado").textContent      = "0";
}

// ─── FORM SUBMIT ───────────────────────────────────────────────────────
document.getElementById("prazoForm").addEventListener("submit", e => {
  e.preventDefault();

  atividades.unshift({
    cliente:    document.getElementById("cliente").value.trim(),
    processo:   document.getElementById("processo").value.trim(),
    tipo:       document.getElementById("tipo").value,
    area:       "Consultivo",
    dataFatal:  document.getElementById("dataFatal").value,
    responsavel: document.getElementById("responsavel").value,
    status:     document.getElementById("status").value,
    descricao:  document.getElementById("descricao").value.trim() || "Sem observações adicionais.",
    solicitante: "Lourenço Grieco",
    prioridade: document.getElementById("status").value === "Pendente" ? "Alta" : "Normal",
  });

  e.target.reset();
  renderAtividades();
});

// ─── SUBTABS ───────────────────────────────────────────────────────────
document.querySelectorAll(".subtab").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.closest(".subtabs").querySelectorAll(".subtab").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
  });
});

// ─── TOP NAV TABS ──────────────────────────────────────────────────────
document.querySelectorAll(".nav-tab[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.view;

    document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".view").forEach(v => v.classList.remove("is-active"));
    const view = document.getElementById(`view-${target}`);
    if (view) view.classList.add("is-active");

    if (target === "pipeline")  renderPipeline();
    if (target === "atividades") renderAtividades();
  });
});

// ─── SEARCH & FILTER LISTENERS ─────────────────────────────────────────
document.getElementById("buscaPainel")?.addEventListener("input", renderAtividades);
document.getElementById("filtroResponsavel")?.addEventListener("change", renderAtividades);
document.getElementById("buscaPipeline")?.addEventListener("input", renderPipeline);

// ─── DASHBOARD CLOCK ───────────────────────────────────────────────────
function updateClock() {
  const t = currentTime();
  document.querySelectorAll(".dash-time").forEach(el => {
    el.textContent = `Atualizado às ${t}`;
  });
}

setInterval(updateClock, 1000);
updateClock();

// ─── PRAZOS DATA ───────────────────────────────────────────────────────
const prazosProcessuais = [
  {
    pastaNr:    "57/2022-5975", codigoSIA: "202/2022-34",
    cliente:    "Bayer S.a.",
    processo:   "1000909-52.2022.8.26.0067",
    comarca:    "Borborema",
    tipoPrazo:  "Contestação",
    prazoFatal: "2026-05-15",
    descricao:  "Protocolar contestação com fundamentos revisados e todos os anexos obrigatórios.",
    intimacaoId: "INT-2026-042",
    responsavel: "Bruno F. S. Batista",
    status:     "Pendente",
  },
  {
    pastaNr:    "37/2025-2776", codigoSIA: "-",
    cliente:    "Eurofins do Brasil Análises de Alimentos Ltda.",
    processo:   "37/2025-2776",
    comarca:    "São Paulo",
    tipoPrazo:  "Encerramento de pasta",
    prazoFatal: "2026-04-18",
    descricao:  "Realizar encerramento da pasta com conferência documental e baixa do fluxo interno.",
    intimacaoId: "INT-2026-039",
    responsavel: "Advogado",
    status:     "Pendente",
  },
  {
    pastaNr:    "1002456/2026", codigoSIA: "-",
    cliente:    "Banco Prime Capital",
    processo:   "1002456-89.2026.8.26.0100",
    comarca:    "São Paulo",
    tipoPrazo:  "Prazo processual — Contestação",
    prazoFatal: "2026-04-22",
    descricao:  "Protocolar contestação, revisar fundamentos e validar anexos obrigatórios.",
    intimacaoId: "INT-2026-040",
    responsavel: "Controller",
    status:     "Em andamento",
  },
  {
    pastaNr:    "5001123/2026", codigoSIA: "-",
    cliente:    "Hospital Santa Helena",
    processo:   "5001123-21.2026.8.26.0001",
    comarca:    "São Paulo",
    tipoPrazo:  "Audiência",
    prazoFatal: "2026-04-25",
    descricao:  "Preparar roteiro de sustentação oral e revisar documentos da audiência trabalhista.",
    intimacaoId: null,
    responsavel: "Sócio",
    status:     "Em andamento",
  },
  {
    pastaNr:    "42/2017-5974", codigoSIA: "260/1992-1",
    cliente:    "Vera Maria Ritter",
    processo:   "0005678-12.2017.8.26.0100",
    comarca:    "São Paulo",
    tipoPrazo:  "Manifestação — recurso",
    prazoFatal: "2026-05-20",
    descricao:  "Apresentar contrarrazões ao recurso de apelação interposto pela parte contrária.",
    intimacaoId: "INT-2026-043",
    responsavel: "Lourenço Grieco",
    status:     "Pendente",
  },
  {
    pastaNr:    "2424/2026-5973", codigoSIA: "261/1999-1",
    cliente:    "PAPELARIA TABAJARA LTDA.",
    processo:   "0009001-44.2026.8.26.0100",
    comarca:    "São Paulo",
    tipoPrazo:  "Intimação — prazo 15 dias",
    prazoFatal: "2026-05-12",
    descricao:  "Cumprir determinação judicial de juntada de documentos contábeis.",
    intimacaoId: "INT-2026-044",
    responsavel: "Lourenço Grieco",
    status:     "Pendente",
  },
];

// ─── TAREFAS DATA ───────────────────────────────────────────────────────
const tarefasData = [
  {
    id: "T001", titulo: "Contato com cliente — Bayer S.a.",
    tipo: "Contato com cliente", prioridade: "Alta",
    descricao: "Agendar reunião para alinhamento sobre estratégia de contestação e documentos faltantes.",
    responsavel: "Lourenço Grieco", dataLimite: "2026-04-21", status: "Pendente",
  },
  {
    id: "T002", titulo: "Pesquisa jurisprudencial — rescisão contratual",
    tipo: "Pesquisa jurídica", prioridade: "Média",
    descricao: "Levantar precedentes do STJ sobre rescisão unilateral de contratos de distribuição nos últimos 5 anos.",
    responsavel: "Advogado", dataLimite: "2026-04-25", status: "Em andamento",
  },
  {
    id: "T003", titulo: "Contato com Receita Federal — CNPJ Eurofins",
    tipo: "Contato com órgão", prioridade: "Alta",
    descricao: "Solicitar certidão negativa de débitos junto à RFB para encerramento do processo administrativo.",
    responsavel: "Controller", dataLimite: "2026-04-22", status: "Pendente",
  },
  {
    id: "T004", titulo: "Elaborar minuta de acordo — Grupo Orion",
    tipo: "Elaboração de documento", prioridade: "Média",
    descricao: "Redigir proposta de acordo extrajudicial conforme parâmetros discutidos em reunião de 10/04/2026.",
    responsavel: "Lourenço Grieco", dataLimite: "2026-04-28", status: "Pendente",
  },
  {
    id: "T005", titulo: "Protocolar procuração — Família Almeida",
    tipo: "Diligência interna", prioridade: "Normal",
    descricao: "Realizar protocolo da procuração assinada e arquivar cópia nos autos digitais da pasta.",
    responsavel: "Estagiário", dataLimite: "2026-04-20", status: "Concluída",
  },
  {
    id: "T006", titulo: "Reunião com perito — Bayer S.a.",
    tipo: "Reunião", prioridade: "Alta",
    descricao: "Reunir com perito agronômico contratado para discussão do laudo preliminar sobre o defensivo Serenade.",
    responsavel: "Bruno F. S. Batista", dataLimite: "2026-04-29", status: "Pendente",
  },
  {
    id: "T007", titulo: "Contato com JUCERJA — regularização societária",
    tipo: "Contato com órgão", prioridade: "Normal",
    descricao: "Verificar status do processo de alteração contratual e solicitar certidão de arquivamento.",
    responsavel: "Controller", dataLimite: "2026-05-05", status: "Em andamento",
  },
];

// ─── INTIMAÇÕES DATA ────────────────────────────────────────────────────
const intimacoesData = [
  {
    id: "INT-2026-039", pastaNr: "37/2025-2776",
    cliente:    "Eurofins do Brasil Análises de Alimentos Ltda.",
    processo:   "37/2025-2776",
    orgao:      "Vara Cível — São Paulo",
    dataPublicacao: "2026-04-03",
    prazoFatal: "2026-04-18",
    descricao:  "Intimação para encerramento da pasta e baixa documental.",
    prazoVinculado: "37/2025-2776",
    status:     "Pendente",
    diasUteis:  false,
  },
  {
    id: "INT-2026-040", pastaNr: "1002456/2026",
    cliente:    "Banco Prime Capital",
    processo:   "1002456-89.2026.8.26.0100",
    orgao:      "2ª Vara Cível — Fórum Central",
    dataPublicacao: "2026-04-07",
    prazoFatal: "2026-04-22",
    descricao:  "Citação para apresentação de contestação no prazo de 15 dias úteis.",
    prazoVinculado: "1002456/2026",
    status:     "Em andamento",
    diasUteis:  true,
  },
  {
    id: "INT-2026-042", pastaNr: "57/2022-5975",
    cliente:    "Bayer S.a.",
    processo:   "1000909-52.2022.8.26.0067",
    orgao:      "Comarca de Borborema",
    dataPublicacao: "2026-04-14",
    prazoFatal: "2026-05-15",
    descricao:  "Intimação para apresentação de contestação — prazo de 30 dias úteis.",
    prazoVinculado: "57/2022-5975",
    status:     "Pendente",
    diasUteis:  true,
  },
  {
    id: "INT-2026-043", pastaNr: "42/2017-5974",
    cliente:    "Vera Maria Ritter",
    processo:   "0005678-12.2017.8.26.0100",
    orgao:      "TJSP — Câmara Empresarial",
    dataPublicacao: "2026-04-20",
    prazoFatal: "2026-05-20",
    descricao:  "Intimação para contrarrazões ao recurso de apelação — prazo de 30 dias.",
    prazoVinculado: "42/2017-5974",
    status:     "Pendente",
    diasUteis:  true,
  },
  {
    id: "INT-2026-044", pastaNr: "2424/2026-5973",
    cliente:    "PAPELARIA TABAJARA LTDA.",
    processo:   "0009001-44.2026.8.26.0100",
    orgao:      "10ª Vara Cível — São Paulo",
    dataPublicacao: "2026-04-25",
    prazoFatal: "2026-05-12",
    descricao:  "Juntada de documentos contábeis requisitados pelo juízo — prazo de 15 dias.",
    prazoVinculado: "2424/2026-5973",
    status:     "Pendente",
    diasUteis:  false,
  },
];

// ─── SUBTAB SWITCHING (atividades) ─────────────────────────────────────
document.querySelectorAll('.subtab[data-subtab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.subtab').forEach(b => b.classList.remove('is-active'));
    document.querySelectorAll('.subtab-panel').forEach(p => p.classList.add('hidden'));
    btn.classList.add('is-active');
    document.getElementById(`subtab-${btn.dataset.subtab}`)?.classList.remove('hidden');
    if (btn.dataset.subtab === 'prazos')     renderPrazosAba();
    if (btn.dataset.subtab === 'tarefas')    renderTarefasAba();
    if (btn.dataset.subtab === 'intimacoes') renderIntimacoesAba();
  });
});

// ─── RENDER PRAZOS ABA ─────────────────────────────────────────────────
function diasRestantesHtml(iso) {
  const diff = daysUntil(iso);
  if (diff < 0)  return `<span class="dias-vencido">Vencido (${Math.abs(diff)}d)</span>`;
  if (diff === 0) return `<span class="dias-urgente">Hoje!</span>`;
  if (diff <= 3)  return `<span class="dias-urgente">${diff}d</span>`;
  if (diff <= 10) return `<span class="dias-aviso">${diff}d</span>`;
  return `<span class="dias-ok">${diff}d</span>`;
}

function rowClassPrazo(iso) {
  const d = daysUntil(iso);
  if (d < 0)  return 'row-vencido';
  if (d <= 3) return 'row-urgente';
  return '';
}

function renderPrazosAba() {
  const busca = (document.getElementById('buscaPrazosAba')?.value ?? '').toLowerCase();
  const st    = document.getElementById('filtroPrazosStatus')?.value ?? '';
  const resp  = document.getElementById('filtroPrazosResponsavel')?.value ?? '';

  const lista = prazosProcessuais.filter(p => {
    const m = !busca || p.pastaNr.toLowerCase().includes(busca) ||
      p.processo.toLowerCase().includes(busca) || p.cliente.toLowerCase().includes(busca);
    return m && (!st || p.status === st) && (!resp || p.responsavel === resp);
  });

  document.getElementById('prazosInfo').textContent = `${lista.length} registro${lista.length !== 1 ? 's' : ''}`;

  document.getElementById('tabelaPrazosAba').innerHTML = lista.length
    ? lista.map(p => {
        const intHtml = p.intimacaoId
          ? `<a href="#" class="int-link" onclick="irParaIntimacao('${p.intimacaoId}')">${p.intimacaoId}</a>`
          : `<span class="no-int">—</span>`;
        return `<tr class="${rowClassPrazo(p.prazoFatal)}">
          <td><span class="table-link">${p.pastaNr}</span></td>
          <td>${p.codigoSIA}</td>
          <td>${p.cliente}</td>
          <td style="font-family:'IBM Plex Mono',monospace;font-size:.72rem">${p.processo}</td>
          <td>${p.comarca}</td>
          <td><span class="tag tag--area">${p.tipoPrazo}</span></td>
          <td>${formatDate(p.prazoFatal)}</td>
          <td>${diasRestantesHtml(p.prazoFatal)}</td>
          <td style="max-width:200px;font-size:.76rem">${p.descricao}</td>
          <td>${intHtml}</td>
          <td>${p.responsavel}</td>
          <td><span class="status-pill ${statusClass(p.status)}">${p.status}</span></td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="12" class="tbl-empty">Nenhum prazo encontrado.</td></tr>`;
}

function irParaIntimacao(id) {
  document.querySelectorAll('.subtab').forEach(b => b.classList.remove('is-active'));
  document.querySelectorAll('.subtab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector('.subtab[data-subtab="intimacoes"]').classList.add('is-active');
  document.getElementById('subtab-intimacoes').classList.remove('hidden');
  document.getElementById('buscaIntimacoes').value = id;
  renderIntimacoesAba();
}

document.getElementById('buscaPrazosAba')?.addEventListener('input', renderPrazosAba);
document.getElementById('filtroPrazosStatus')?.addEventListener('change', renderPrazosAba);
document.getElementById('filtroPrazosResponsavel')?.addEventListener('change', renderPrazosAba);

// ─── RENDER TAREFAS ABA ────────────────────────────────────────────────
const TIPO_TAG_TAREFA = {
  'Contato com cliente':    { cls:'tag--area',      label:'Cliente' },
  'Contato com órgão':      { cls:'tag--type',      label:'Órgão' },
  'Pesquisa jurídica':      { cls:'tag--encerramento', label:'Pesquisa' },
  'Elaboração de documento':{ cls:'tag--area',      label:'Documento' },
  'Diligência interna':     { cls:'tag--urgent',    label:'Diligência' },
  'Reunião':                { cls:'tag--reuniao-t', label:'Reunião' },
  'Outro':                  { cls:'tag--lembrete',  label:'Outro' },
};

function tarefaCard(t) {
  const diff      = t.dataLimite ? daysUntil(t.dataLimite) : null;
  const urgente   = diff !== null && diff <= 3;
  const priorCls  = t.prioridade === 'Alta' ? 'tarefa-card--alta' : t.prioridade === 'Média' ? 'tarefa-card--media' : 'tarefa-card--normal';
  const tagInfo   = TIPO_TAG_TAREFA[t.tipo] ?? { cls:'tag--lembrete', label: t.tipo };
  const prazoTxt  = t.dataLimite ? formatDate(t.dataLimite) : '—';
  const prazoCls  = urgente ? 'tarefa-prazo--urgente' : '';
  const av        = initials(t.responsavel);

  return `<article class="tarefa-card ${priorCls}">
    <div class="tarefa-tags">
      <span class="tag ${tagInfo.cls}">${tagInfo.label}</span>
      ${t.prioridade === 'Alta' ? '<span class="tag tag--urgent">Alta</span>' : ''}
    </div>
    <p class="tarefa-titulo">${t.titulo}</p>
    <p class="tarefa-desc">${t.descricao}</p>
    <div class="tarefa-footer">
      <div class="tarefa-resp">
        <span class="avatar" style="width:24px;height:24px;font-size:.58rem">${av}</span>
        ${t.responsavel}
      </div>
      <span class="tarefa-prazo ${prazoCls}">⏱ ${prazoTxt}</span>
    </div>
  </article>`;
}

function renderTarefasAba() {
  const busca  = (document.getElementById('buscaTarefas')?.value ?? '').toLowerCase();
  const tipo   = document.getElementById('filtroTarefasTipo')?.value ?? '';
  const status = document.getElementById('filtroTarefasStatus')?.value ?? '';

  const lista = tarefasData.filter(t => {
    const m = !busca || t.titulo.toLowerCase().includes(busca) || t.descricao.toLowerCase().includes(busca);
    return m && (!tipo || t.tipo === tipo) && (!status || t.status === status);
  });

  const pendentes  = lista.filter(t => t.status === 'Pendente');
  const andamento  = lista.filter(t => t.status === 'Em andamento');
  const concluidas = lista.filter(t => t.status === 'Concluída');

  document.getElementById('colTarefasPendentes').innerHTML  = pendentes.length  ? pendentes.map(tarefaCard).join('')  : '<div class="empty-state">Nenhuma tarefa pendente.</div>';
  document.getElementById('colTarefasAndamento').innerHTML  = andamento.length  ? andamento.map(tarefaCard).join('')  : '<div class="empty-state">Nenhuma em andamento.</div>';
  document.getElementById('colTarefasConcluidas').innerHTML = concluidas.length ? concluidas.map(tarefaCard).join('') : '<div class="empty-state">Nenhuma concluída.</div>';

  document.getElementById('countTarefasPendentes').textContent  = pendentes.length;
  document.getElementById('countTarefasAndamento').textContent  = andamento.length;
  document.getElementById('countTarefasConcluidas').textContent = concluidas.length;
}

document.getElementById('buscaTarefas')?.addEventListener('input', renderTarefasAba);
document.getElementById('filtroTarefasTipo')?.addEventListener('change', renderTarefasAba);
document.getElementById('filtroTarefasStatus')?.addEventListener('change', renderTarefasAba);

// ─── RENDER INTIMAÇÕES ABA ─────────────────────────────────────────────
function renderIntimacoesAba() {
  const busca  = (document.getElementById('buscaIntimacoes')?.value ?? '').toLowerCase();
  const status = document.getElementById('filtroIntimacoesStatus')?.value ?? '';

  const lista = intimacoesData.filter(i => {
    const m = !busca || i.id.toLowerCase().includes(busca) ||
      i.processo.toLowerCase().includes(busca) ||
      i.pastaNr.toLowerCase().includes(busca) ||
      i.cliente.toLowerCase().includes(busca);
    return m && (!status || i.status === status);
  });

  document.getElementById('intimacoesInfo').textContent = `${lista.length} registro${lista.length !== 1 ? 's' : ''}`;

  document.getElementById('tabelaIntimacoes').innerHTML = lista.length
    ? lista.map(i => {
        const prazoLink = i.prazoVinculado
          ? `<a href="#" class="int-prazo-link" onclick="irParaPrazo('${i.prazoVinculado}')">${i.prazoVinculado}</a>`
          : '—';
        const diasHtml  = diasRestantesHtml(i.prazoFatal);
        const rowCls    = rowClassPrazo(i.prazoFatal);
        return `<tr class="${rowCls}">
          <td class="int-id">${i.id}</td>
          <td><span class="table-link">${i.pastaNr}</span></td>
          <td>${i.cliente}</td>
          <td style="font-family:'IBM Plex Mono',monospace;font-size:.7rem">${i.processo}</td>
          <td>${i.orgao}</td>
          <td>${formatDate(i.dataPublicacao)}</td>
          <td>${formatDate(i.prazoFatal)}${i.diasUteis ? ' <span style="color:var(--mu);font-size:.65rem">(d.u.)</span>' : ''}</td>
          <td>${diasHtml}</td>
          <td style="max-width:180px;font-size:.76rem">${i.descricao}</td>
          <td>${prazoLink}</td>
          <td><span class="status-pill ${statusClass(i.status === 'Cumprida' ? 'Concluído' : i.status === 'Vencida' ? 'Pendente' : i.status)}">${i.status}</span></td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="11" class="tbl-empty">Nenhuma intimação encontrada.</td></tr>`;
}

function irParaPrazo(pastaNr) {
  document.querySelectorAll('.subtab').forEach(b => b.classList.remove('is-active'));
  document.querySelectorAll('.subtab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector('.subtab[data-subtab="prazos"]').classList.add('is-active');
  document.getElementById('subtab-prazos').classList.remove('hidden');
  document.getElementById('buscaPrazosAba').value = pastaNr;
  renderPrazosAba();
}

document.getElementById('buscaIntimacoes')?.addEventListener('input', renderIntimacoesAba);
document.getElementById('filtroIntimacoesStatus')?.addEventListener('change', renderIntimacoesAba);

// ─── RELATÓRIOS ────────────────────────────────────────────────────────

// Andamentos sample data derived from pastas array (filled at runtime)
const andamentosBase = [
  { pastaNr:"57/2022-5975", codigoSIA:"202/2022-34", cliente:"Bayer S.a.",                       area:"Cível e resolução de conflitos", data:"2022-09-23", andamento:"Ação principal",          advogado:"Bruno F. S. Batista", tipo:"Ação principal",            manual:false },
  { pastaNr:"57/2022-5975", codigoSIA:"202/2022-34", cliente:"Bayer S.a.",                       area:"Cível e resolução de conflitos", data:"2023-03-14", andamento:"Despacho — citação réu",  advogado:"Bruno F. S. Batista", tipo:"Despacho",                  manual:false },
  { pastaNr:"57/2022-5975", codigoSIA:"202/2022-34", cliente:"Bayer S.a.",                       area:"Cível e resolução de conflitos", data:"2023-07-20", andamento:"Juntada de contestação",  advogado:"Bruno F. S. Batista", tipo:"Juntada de documento",     manual:false },
  { pastaNr:"57/2022-5975", codigoSIA:"202/2022-34", cliente:"Bayer S.a.",                       area:"Cível e resolução de conflitos", data:"2024-02-08", andamento:"Nota interna — revisão",  advogado:"Bruno F. S. Batista", tipo:"Manual",                    manual:true  },
  { pastaNr:"42/2017-5974", codigoSIA:"260/1992-1",  cliente:"Vera Maria Ritter",                area:"Empresarial",                   data:"2017-03-10", andamento:"Distribuição da ação",    advogado:"Lourenço Grieco",     tipo:"Ação principal",            manual:false },
  { pastaNr:"42/2017-5974", codigoSIA:"260/1992-1",  cliente:"Vera Maria Ritter",                area:"Empresarial",                   data:"2018-06-22", andamento:"Sentença de 1ª instância", advogado:"Lourenço Grieco",    tipo:"Sentença",                  manual:false },
  { pastaNr:"42/2017-5974", codigoSIA:"260/1992-1",  cliente:"Vera Maria Ritter",                area:"Empresarial",                   data:"2019-04-15", andamento:"Acórdão — provimento parcial", advogado:"Lourenço Grieco", tipo:"Acórdão",               manual:false },
  { pastaNr:"14/2026-5981", codigoSIA:"-",           cliente:"SANTOS BRASIL PARTICIPAÇÕES S.A.", area:"Cível e resolução de conflitos", data:"2026-01-15", andamento:"Distribuição da ação",    advogado:"Lourenço Grieco",     tipo:"Ação principal",            manual:false },
  { pastaNr:"14/2026-5980", codigoSIA:"-",           cliente:"Convicon Conteineres",              area:"Cível e resolução de conflitos", data:"2026-01-14", andamento:"Distribuição da ação",   advogado:"Lourenço Grieco",     tipo:"Ação principal",            manual:false },
  { pastaNr:"14/2026-5979", codigoSIA:"-",           cliente:"Santos Brasil Participações S.a.",  area:"Cível e resolução de conflitos", data:"2026-01-13", andamento:"Distribuição da ação",   advogado:"Lourenço Grieco",     tipo:"Ação principal",            manual:false },
  { pastaNr:"14/2026-5978", codigoSIA:"-",           cliente:"Santos Brasil Logística S/a",       area:"Cível e resolução de conflitos", data:"2026-01-12", andamento:"Distribuição da ação",   advogado:"Lourenço Grieco",     tipo:"Ação principal",            manual:false },
  { pastaNr:"2424/2026-5973", codigoSIA:"261/1999-1", cliente:"PAPELARIA TABAJARA LTDA.",         area:"Empresarial",                   data:"2026-02-05", andamento:"Distribuição da ação",    advogado:"Lourenço Grieco",     tipo:"Ação principal",            manual:false },
  { pastaNr:"2424/2026-5973", codigoSIA:"261/1999-1", cliente:"PAPELARIA TABAJARA LTDA.",         area:"Empresarial",                   data:"2026-03-10", andamento:"Despacho — citação",      advogado:"Lourenço Grieco",     tipo:"Despacho",                  manual:false },
  { pastaNr:"2424/2026-5973", codigoSIA:"261/1999-1", cliente:"PAPELARIA TABAJARA LTDA.",         area:"Empresarial",                   data:"2026-04-01", andamento:"Intimação — prazo 15 dias", advogado:"Lourenço Grieco",  tipo:"Intimação",                 manual:false },
];

function gerarRelatorio() {
  const tipo       = document.querySelector('input[name="relTipo"]:checked')?.value ?? "pasta";
  const excManuais = document.getElementById("relExcluirManuais").checked;
  const tiposSel   = [...document.querySelectorAll(".rel-and-tipo:checked")].map(c => c.value);
  const dataInicio = document.getElementById("relDataInicio").value;
  const dataFim    = document.getElementById("relDataFim").value;
  const area       = document.getElementById("relArea").value;
  const resp       = document.getElementById("relResponsavel").value;

  let termoPasta   = document.getElementById("relNumeroPasta").value.trim().toLowerCase();
  let termoCliente = document.getElementById("relCliente").value.trim().toLowerCase();
  let termoProc    = document.getElementById("relProcesso").value.trim().toLowerCase();

  let resultado = andamentosBase.filter(a => {
    if (excManuais && a.manual)                                       return false;
    if (tiposSel.length && !tiposSel.includes(a.tipo))               return false;
    if (dataInicio && a.data < dataInicio)                            return false;
    if (dataFim   && a.data > dataFim)                                return false;
    if (area  && a.area !== area)                                     return false;
    if (resp  && !a.advogado.toLowerCase().includes(resp.toLowerCase())) return false;

    if (tipo === "pasta"    && termoPasta   && !a.pastaNr.toLowerCase().includes(termoPasta))   return false;
    if (tipo === "cliente"  && termoCliente && !a.cliente.toLowerCase().includes(termoCliente)) return false;
    if (tipo === "processo") {
      const pasta = pastas.find(p => p.numero === a.pastaNr);
      if (termoProc && !(pasta?.processo ?? "").toLowerCase().includes(termoProc))              return false;
    }
    return true;
  });

  // Sort by date desc
  resultado.sort((a, b) => b.data.localeCompare(a.data));

  // Render
  document.getElementById("relEmptyState").classList.add("hidden");
  document.getElementById("relResultado").classList.remove("hidden");
  document.getElementById("btnExportarPdf").disabled   = false;
  document.getElementById("btnExportarExcel").disabled = false;

  const tipoLabel  = { pasta:"Por pasta", cliente:"Por cliente", processo:"Por número de processo" }[tipo];
  const termoLabel = tipo === "pasta" ? termoPasta : tipo === "cliente" ? termoCliente : termoProc;
  document.getElementById("relResultadoKicker").textContent = tipoLabel;
  document.getElementById("relResultadoTitulo").textContent = termoLabel || "Todos os registros";

  const pastasUnicas = new Set(resultado.map(a => a.pastaNr));
  document.getElementById("relStatPastas").textContent     = pastasUnicas.size;
  document.getElementById("relStatAndamentos").textContent = resultado.length;
  document.getElementById("relStatPrazo").textContent      = dataInicio && dataFim
    ? `${formatDate(dataInicio)} — ${formatDate(dataFim)}`
    : dataInicio ? `a partir de ${formatDate(dataInicio)}`
    : dataFim   ? `até ${formatDate(dataFim)}`
    : "Todo o período";

  document.getElementById("relTabelaBody").innerHTML = resultado.length
    ? resultado.map(a => `
        <tr>
          <td><span class="table-link">${a.pastaNr}</span></td>
          <td>${a.codigoSIA}</td>
          <td>${a.cliente}</td>
          <td>${a.area}</td>
          <td>${formatDate(a.data)}</td>
          <td>${a.andamento}</td>
          <td>${a.advogado}</td>
          <td><span class="tag ${a.manual ? "tag--manual" : "tag--area"}">${a.tipo}</span></td>
        </tr>`).join("")
    : `<tr><td colspan="8" class="tbl-empty">Nenhum andamento encontrado com os filtros aplicados.</td></tr>`;

  document.getElementById("relCount").textContent =
    `${resultado.length} registro${resultado.length !== 1 ? "s" : ""} encontrado${resultado.length !== 1 ? "s" : ""}`;
}

// Report filter: tipo de relatório toggle
document.querySelectorAll('input[name="relTipo"]').forEach(radio => {
  radio.addEventListener("change", () => {
    document.getElementById("filterIdentPasta").classList.add("hidden");
    document.getElementById("filterIdentCliente").classList.add("hidden");
    document.getElementById("filterIdentProcesso").classList.add("hidden");
    document.getElementById(`filterIdent${radio.value.charAt(0).toUpperCase() + radio.value.slice(1)}`).classList.remove("hidden");
  });
});

// "Todos os andamentos" toggle
document.getElementById("relTodosAndamentos").addEventListener("change", e => {
  document.querySelectorAll(".rel-and-tipo").forEach(c => { c.checked = e.target.checked; });
});

// "Excluir manuais" auto-unchecks manual
document.getElementById("relExcluirManuais").addEventListener("change", e => {
  if (e.target.checked) {
    document.querySelectorAll(".rel-and-tipo").forEach(c => {
      if (c.value === "Manual") c.checked = false;
    });
  }
});

document.getElementById("btnGerarRelatorio").addEventListener("click", gerarRelatorio);

document.getElementById("btnLimparFiltros").addEventListener("click", () => {
  document.querySelectorAll('input[name="relTipo"]')[0].checked = true;
  document.getElementById("filterIdentPasta").classList.remove("hidden");
  document.getElementById("filterIdentCliente").classList.add("hidden");
  document.getElementById("filterIdentProcesso").classList.add("hidden");
  ["relNumeroPasta","relCliente","relProcesso","relDataInicio","relDataFim"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("relArea").value = "";
  document.getElementById("relResponsavel").value = "";
  document.getElementById("relTodosAndamentos").checked = true;
  document.getElementById("relExcluirManuais").checked  = false;
  document.querySelectorAll(".rel-and-tipo").forEach(c => { c.checked = true; });
  document.getElementById("relEmptyState").classList.remove("hidden");
  document.getElementById("relResultado").classList.add("hidden");
  document.getElementById("btnExportarPdf").disabled   = true;
  document.getElementById("btnExportarExcel").disabled = true;
});

document.getElementById("btnExportarExcel").addEventListener("click", () => {
  const rows = [...document.querySelectorAll("#relTabelaBody tr")];
  if (!rows.length) return;
  const headers = ["N° da pasta","Código SIA","Cliente","Área","Data","Andamento","Advogado","Tipo"];
  const csv = [headers.join(";"), ...rows.map(tr =>
    [...tr.querySelectorAll("td")].map(td => `"${td.textContent.trim()}"`).join(";")
  )].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
  a.download = `relatorio_legal_hub_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
});

// ─── AGENDA DATA ───────────────────────────────────────────────────────
const TIPO_COR = {
  "Prazo":     "prazo",
  "Audiência": "audiencia",
  "Reunião":   "reuniao",
  "Diligência":"diligencia",
  "Lembrete":  "lembrete",
};

const agendaEventos = [
  { data: "2026-04-17", titulo: "Reunião de equipe — Planejamento semanal",  tipo: "Reunião",    hora: "09:00", responsavel: "Lourenço Grieco",    local: "Sala de reuniões" },
  { data: "2026-04-18", titulo: "Prazo: Eurofins — Encerramento de pasta",   tipo: "Prazo",      hora: "",      responsavel: "Advogado",            local: "Interno" },
  { data: "2026-04-19", titulo: "Prazo: Banco Prime Capital — Contestação",  tipo: "Prazo",      hora: "",      responsavel: "Controller",          local: "Tribunal" },
  { data: "2026-04-21", titulo: "Lembrete: Família Almeida — Petição",       tipo: "Lembrete",   hora: "10:00", responsavel: "Advogado",            local: "Interno" },
  { data: "2026-04-22", titulo: "Audiência — Banco Prime Capital",           tipo: "Audiência",  hora: "14:30", responsavel: "Controller",          local: "2ª Vara Cível — Fórum Central" },
  { data: "2026-04-24", titulo: "Diligência: Grupo Orion Logística",         tipo: "Diligência", hora: "11:00", responsavel: "Estagiário",          local: "Cartório" },
  { data: "2026-04-25", titulo: "Audiência — Hospital Santa Helena",         tipo: "Audiência",  hora: "09:30", responsavel: "Sócio",               local: "3ª Vara do Trabalho" },
  { data: "2026-04-28", titulo: "Reunião com cliente — Grupo Orion",         tipo: "Reunião",    hora: "15:00", responsavel: "Lourenço Grieco",    local: "Escritório" },
  { data: "2026-04-29", titulo: "Prazo: Santos Brasil — Resposta",           tipo: "Prazo",      hora: "",      responsavel: "Lourenço Grieco",    local: "Tribunal" },
  { data: "2026-05-05", titulo: "Audiência — Bayer S.a.",                    tipo: "Audiência",  hora: "10:00", responsavel: "Bruno F. S. Batista", local: "Comarca de Borborema" },
  { data: "2026-05-08", titulo: "Reunião de acompanhamento financeiro",      tipo: "Reunião",    hora: "08:30", responsavel: "Lourenço Grieco",    local: "Sala de reuniões" },
  { data: "2026-05-12", titulo: "Prazo: Papelaria Tabajara — Manifestação",  tipo: "Prazo",      hora: "",      responsavel: "Lourenço Grieco",    local: "Tribunal" },
  { data: "2026-05-15", titulo: "Diligência — Vera Maria Ritter",            tipo: "Diligência", hora: "13:00", responsavel: "Advogado",            local: "Cartório São Paulo" },
  { data: "2026-05-20", titulo: "Audiência — Construtora Meridional",        tipo: "Audiência",  hora: "14:00", responsavel: "Lourenço Grieco",    local: "4ª Vara Trabalhista" },
];

let calAno   = 2026;
let calMes   = 3;          // 0-indexed: 3 = abril
let calDataSelecionada = null;

const MESES_PT  = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_PT   = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];

function eventosNoDia(iso) {
  return agendaEventos.filter(e => e.data === iso);
}

function eventosPorTipoNoMes(ano, mes) {
  const prefix = `${ano}-${String(mes + 1).padStart(2, "0")}`;
  const tipos  = {};
  agendaEventos.filter(e => e.data.startsWith(prefix)).forEach(e => {
    tipos[e.tipo] = (tipos[e.tipo] || 0) + 1;
  });
  return tipos;
}

function renderCalendario() {
  const titulo    = document.getElementById("calMonthYear");
  const grid      = document.getElementById("calGrid");
  titulo.textContent = `${MESES_PT[calMes]} ${calAno}`;

  const hoje      = new Date();
  const hojeIso   = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}-${String(hoje.getDate()).padStart(2,"0")}`;

  const primeiroDia  = new Date(calAno, calMes, 1).getDay(); // 0=dom
  const diasNoMes    = new Date(calAno, calMes + 1, 0).getDate();
  const diasMesAnterior = new Date(calAno, calMes, 0).getDate();

  const cells = [];

  // Cells from previous month
  for (let i = primeiroDia - 1; i >= 0; i--) {
    const d = diasMesAnterior - i;
    const m = calMes === 0 ? 12 : calMes;
    const a = calMes === 0 ? calAno - 1 : calAno;
    cells.push({ dia: d, mes: m, ano: a, other: true });
  }

  // Current month cells
  for (let d = 1; d <= diasNoMes; d++) {
    cells.push({ dia: d, mes: calMes + 1, ano: calAno, other: false });
  }

  // Next month cells to fill grid
  const resto = 42 - cells.length;
  for (let d = 1; d <= resto; d++) {
    const m = calMes === 11 ? 1 : calMes + 2;
    const a = calMes === 11 ? calAno + 1 : calAno;
    cells.push({ dia: d, mes: m, ano: a, other: true });
  }

  grid.innerHTML = cells.map(c => {
    const iso     = `${c.ano}-${String(c.mes).padStart(2,"0")}-${String(c.dia).padStart(2,"0")}`;
    const evs     = eventosNoDia(iso);
    const isHoje  = iso === hojeIso;
    const isSel   = iso === calDataSelecionada;
    const isUrgente = evs.some(e => e.tipo === "Prazo");

    const classes = [
      "cal-day",
      c.other  ? "cal-day--other"    : "",
      isHoje   ? "cal-day--today"    : "",
      isSel    ? "cal-day--selected" : "",
      isUrgente && !c.other ? "cal-day--has-urgent" : "",
    ].filter(Boolean).join(" ");

    const maxEv  = 3;
    const visible = evs.slice(0, maxEv);
    const extra  = evs.length - maxEv;

    const evHtml = visible.map(e =>
      `<span class="cal-ev cal-ev--${TIPO_COR[e.tipo] || "lembrete"}" title="${e.titulo}">${e.titulo}</span>`
    ).join("") + (extra > 0 ? `<span class="cal-ev cal-ev--more">+${extra} mais</span>` : "");

    return `<div class="${classes}" data-date="${iso}" role="button" tabindex="0">
      <span class="cal-day-num">${c.dia}</span>
      <div class="cal-events">${evHtml}</div>
    </div>`;
  }).join("");

  // Click handlers
  grid.querySelectorAll(".cal-day:not(.cal-day--other)").forEach(el => {
    el.addEventListener("click", () => selecionarDia(el.dataset.date));
    el.addEventListener("keydown", e => { if (e.key === "Enter") selecionarDia(el.dataset.date); });
  });

  renderResumoMes();
  renderProximos();
}

function selecionarDia(iso) {
  calDataSelecionada = iso;

  // Re-render to update selection
  renderCalendario();

  const [a, m, d] = iso.split("-").map(Number);
  const date      = new Date(a, m - 1, d);
  const label     = `${DIAS_PT[date.getDay()]}, ${d} de ${MESES_PT[m - 1]}`;

  document.getElementById("agendaDiaLabel").textContent  = `${d} de ${MESES_PT[m-1]}`;
  document.getElementById("agendaDiaTitulo").textContent = label;

  const evs   = eventosNoDia(iso);
  const lista = document.getElementById("agendaDiaLista");

  if (!evs.length) {
    lista.innerHTML = `<p class="agenda-aside-empty">Nenhum evento neste dia.</p>`;
    return;
  }

  lista.innerHTML = evs.map(e => `
    <div class="ev-item">
      <span class="ev-dot" style="background:${corDot(e.tipo)}"></span>
      <div class="ev-info">
        <p class="ev-titulo">${e.titulo}</p>
        <p class="ev-meta">${e.hora ? e.hora + " · " : ""}${e.responsavel}${e.local ? " · " + e.local : ""}</p>
      </div>
    </div>`).join("");
}

function renderProximos() {
  const hoje  = new Date();
  const base  = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const limite = new Date(base); limite.setDate(limite.getDate() + 7);

  const proximos = agendaEventos
    .filter(e => {
      const d = new Date(e.data + "T00:00:00");
      return d >= base && d <= limite;
    })
    .sort((a, b) => a.data.localeCompare(b.data));

  const el = document.getElementById("agendaProximos");

  if (!proximos.length) {
    el.innerHTML = `<p class="agenda-aside-empty">Nenhum evento nos próximos 7 dias.</p>`;
    return;
  }

  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}-${String(hoje.getDate()).padStart(2,"0")}`;

  el.innerHTML = proximos.map(e => {
    const isHoje   = e.data === hojeIso;
    const [,m,d]   = e.data.split("-").map(Number);
    const label    = `${d}/${m}${e.hora ? " · " + e.hora : ""}`;
    const badgeCls = isHoje ? "ev-date-badge--today" : (e.tipo === "Prazo" ? "ev-date-badge--urgent" : "");
    return `
      <div class="ev-item">
        <span class="ev-dot" style="background:${corDot(e.tipo)}"></span>
        <div class="ev-info">
          <p class="ev-titulo">${e.titulo}</p>
          <p class="ev-meta">${e.responsavel}</p>
        </div>
        <span class="ev-date-badge ${badgeCls}">${label}</span>
      </div>`;
  }).join("");
}

function renderResumoMes() {
  const contagem = eventosPorTipoNoMes(calAno, calMes);
  const total    = Object.values(contagem).reduce((a, b) => a + b, 0) || 1;
  const ordem    = ["Prazo","Audiência","Reunião","Diligência","Lembrete"];
  const cores    = { Prazo:"#e74d3c", "Audiência":"#1890d8", Reunião:"#1d8b60", Diligência:"#e07a17", Lembrete:"#aaa" };

  document.getElementById("agendaResumo").innerHTML = ordem
    .filter(t => contagem[t])
    .map(t => {
      const pct = Math.round((contagem[t] / total) * 100);
      return `
        <div class="bar-item">
          <div class="bar-label">
            <span>${t}</span>
            <span>${contagem[t]} evento${contagem[t] > 1 ? "s" : ""}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${cores[t]}"></div>
          </div>
        </div>`;
    }).join("") || `<p class="agenda-aside-empty">Nenhum evento este mês.</p>`;
}

function corDot(tipo) {
  const m = { Prazo:"#e74d3c", "Audiência":"#1890d8", Reunião:"#1d8b60", Diligência:"#e07a17", Lembrete:"#aaa" };
  return m[tipo] || "#aaa";
}

// Calendar navigation
document.getElementById("calPrev").addEventListener("click", () => {
  calMes--; if (calMes < 0) { calMes = 11; calAno--; }
  renderCalendario();
});

document.getElementById("calNext").addEventListener("click", () => {
  calMes++; if (calMes > 11) { calMes = 0; calAno++; }
  renderCalendario();
});

document.getElementById("calHoje").addEventListener("click", () => {
  const h = new Date();
  calAno  = h.getFullYear();
  calMes  = h.getMonth();
  const iso = `${calAno}-${String(calMes+1).padStart(2,"0")}-${String(h.getDate()).padStart(2,"0")}`;
  calDataSelecionada = iso;
  renderCalendario();
  selecionarDia(iso);
});

// Modal
document.getElementById("btnNovoEvento").addEventListener("click", () => {
  document.getElementById("modalEvento").classList.remove("hidden");
  if (calDataSelecionada) document.getElementById("evData").value = calDataSelecionada;
});

["modalClose","modalCancelar"].forEach(id => {
  document.getElementById(id).addEventListener("click", () => {
    document.getElementById("modalEvento").classList.add("hidden");
  });
});

document.getElementById("modalEvento").addEventListener("click", e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add("hidden");
});

document.getElementById("eventoForm").addEventListener("submit", e => {
  e.preventDefault();
  agendaEventos.push({
    data:        document.getElementById("evData").value,
    titulo:      document.getElementById("evTitulo").value.trim(),
    tipo:        document.getElementById("evTipo").value,
    hora:        document.getElementById("evHora").value,
    responsavel: document.getElementById("evResponsavel").value,
    local:       document.getElementById("evLocal").value.trim(),
  });
  agendaEventos.sort((a, b) => a.data.localeCompare(b.data));
  document.getElementById("modalEvento").classList.add("hidden");
  e.target.reset();
  renderCalendario();
  if (calDataSelecionada) selecionarDia(calDataSelecionada);
});

// ─── PASTA DATA ────────────────────────────────────────────────────────
const pastas = [
  {
    numero:       "14/2026-5981",
    codigoSIA:    "-",
    cliente:      "SANTOS BRASIL PARTICIPAÇÕES S.A.",
    parteContraria: "-",
    servico:      "Ação declaratória",
    area:         "Cível e resolução de conflitos",
    tipoServico:  "Contencioso",
    advogado:     "Lourenço Grieco",
    descricao:    "Ação declaratória referente a questões societárias.",
    dataDistribuicao: "15/01/2026",
    valorCausa:   "R$ 0,00",
    incluidoPor:  "Lourenço Grieco",
    processo:     "N° 0000001-00.2026.8.26.0001",
    comarca:      "SANTOS",
  },
  {
    numero:       "14/2026-5980",
    codigoSIA:    "-",
    cliente:      "Convicon Conteineres de Vila do Conde Ltda.",
    parteContraria: "-",
    servico:      "Ação declaratória",
    area:         "Cível e resolução de conflitos",
    tipoServico:  "Contencioso",
    advogado:     "Lourenço Grieco",
    descricao:    "Ação declaratória relativa a contrato de locação de contêineres.",
    dataDistribuicao: "14/01/2026",
    valorCausa:   "R$ 0,00",
    incluidoPor:  "Lourenço Grieco",
    processo:     "N° 0000002-00.2026.8.26.0001",
    comarca:      "SANTOS",
  },
  {
    numero:       "14/2026-5979",
    codigoSIA:    "-",
    cliente:      "Santos Brasil Participações S.a.",
    parteContraria: "-",
    servico:      "Ação declaratória",
    area:         "Cível e resolução de conflitos",
    tipoServico:  "Contencioso",
    advogado:     "Lourenço Grieco",
    descricao:    "Ação declaratória para reconhecimento de direitos societários.",
    dataDistribuicao: "13/01/2026",
    valorCausa:   "R$ 0,00",
    incluidoPor:  "Lourenço Grieco",
    processo:     "N° 0000003-00.2026.8.26.0001",
    comarca:      "SANTOS",
  },
  {
    numero:       "14/2026-5978",
    codigoSIA:    "-",
    cliente:      "Santos Brasil Logística S/a",
    parteContraria: "-",
    servico:      "Ação declaratória",
    area:         "Cível e resolução de conflitos",
    tipoServico:  "Contencioso",
    advogado:     "Lourenço Grieco",
    descricao:    "Ação declaratória de inexigibilidade de obrigação contratual.",
    dataDistribuicao: "12/01/2026",
    valorCausa:   "R$ 0,00",
    incluidoPor:  "Lourenço Grieco",
    processo:     "N° 0000004-00.2026.8.26.0001",
    comarca:      "SANTOS",
  },
  {
    numero:       "57/2022-5975",
    codigoSIA:    "202/2022-34",
    cliente:      "Bayer S.a.",
    parteContraria: "CARLOS EDUARDO BAESSO UBEDA",
    servico:      "Ação condenatória p/ indenização",
    area:         "Cível e resolução de conflitos",
    tipoServico:  "Migração SIA",
    advogado:     "Bruno Ferreira Soares Batista",
    descricao:    "Trata-se de ação em que o Autor pretende ver realizada desde logo prova pericial de engenharia agronômica para verificar e estimar as perdas que ele alega ter sofrido em razão da ineficácia do defensivo Serenade para controle do Cancro Cítrico.",
    dataDistribuicao: "23/09/2022",
    valorCausa:   "R$ 15.000,00",
    incluidoPor:  "Jean Carlos de Lima Holanda",
    processo:     "N° 1000909-52.2022.8.26.0067",
    comarca:      "BORBOREMA",
  },
  {
    numero:       "42/2017-5974",
    codigoSIA:    "260/1992-1",
    cliente:      "Vera Maria Ritter",
    parteContraria: "PLENA S/A CORRETORA DE SEGUROS",
    servico:      "Falência ou concordata",
    area:         "Empresarial",
    tipoServico:  "Contencioso",
    advogado:     "Lourenço Grieco",
    descricao:    "Ação de falência ou concordata referente a litígio empresarial.",
    dataDistribuicao: "10/03/2017",
    valorCausa:   "R$ 50.000,00",
    incluidoPor:  "Jean Carlos de Lima Holanda",
    processo:     "N° 0005678-12.2017.8.26.0100",
    comarca:      "SÃO PAULO",
  },
  {
    numero:       "2424/2026-5973",
    codigoSIA:    "261/1999-1",
    cliente:      "PAPELARIA TABAJARA LTDA.",
    parteContraria: "INDÚSTRIA PLÁSTICA RAMOS LTDA.",
    servico:      "Levantamento de crédito em concordata preventiva",
    area:         "Empresarial",
    tipoServico:  "Contencioso",
    advogado:     "Lourenço Grieco",
    descricao:    "Levantamento de crédito em processo de concordata preventiva da empresa devedora.",
    dataDistribuicao: "05/02/2026",
    valorCausa:   "R$ 120.000,00",
    incluidoPor:  "Lourenço Grieco",
    processo:     "N° 0009001-44.2026.8.26.0100",
    comarca:      "SÃO PAULO",
  },
];

// ─── PASTA LIST RENDER ─────────────────────────────────────────────────
let pastaPagAtual = 1;
let pastaLinhas   = 10;

function pastasVisiveis() {
  const busca = (document.getElementById("buscaPasta")?.value ?? "").trim().toLowerCase();
  if (!busca) return pastas;
  return pastas.filter(p =>
    p.numero.toLowerCase().includes(busca) ||
    p.cliente.toLowerCase().includes(busca) ||
    p.servico.toLowerCase().includes(busca) ||
    p.parteContraria.toLowerCase().includes(busca)
  );
}

function renderPastaList() {
  const lista   = pastasVisiveis();
  const total   = lista.length;
  const pages   = Math.max(1, Math.ceil(total / pastaLinhas));
  pastaPagAtual = Math.min(pastaPagAtual, pages);

  const inicio  = (pastaPagAtual - 1) * pastaLinhas;
  const slice   = lista.slice(inicio, inicio + pastaLinhas);

  document.getElementById("tabelaPastasBody").innerHTML = slice.map(p => `
    <tr data-pasta="${p.numero}">
      <td><input type="checkbox" onclick="event.stopPropagation()"></td>
      <td><span class="pasta-link">${p.numero}</span></td>
      <td>${p.codigoSIA}</td>
      <td class="pasta-client">${p.cliente}</td>
      <td>${p.parteContraria}</td>
      <td>${p.servico}</td>
    </tr>`).join("") || `<tr><td colspan="6" class="tbl-empty">Nenhuma pasta encontrada.</td></tr>`;

  const fim = Math.min(inicio + pastaLinhas, total);
  document.getElementById("pastasPaginacaoInfo").textContent =
    `Exibindo ${total ? inicio + 1 : 0} - ${fim} de ${total} • Página`;

  const pgSel = document.getElementById("pastaPagina");
  pgSel.innerHTML = Array.from({ length: pages }, (_, i) =>
    `<option value="${i+1}" ${i+1 === pastaPagAtual ? "selected" : ""}>${i+1}</option>`
  ).join("");
  document.getElementById("pastaTotalPaginas").textContent = `de ${pages}`;

  document.getElementById("pastaPgAnterior").disabled = pastaPagAtual <= 1;
  document.getElementById("pastaPgProxima").disabled  = pastaPagAtual >= pages;

  // Row click → detail
  document.querySelectorAll("#tabelaPastasBody tr[data-pasta]").forEach(tr => {
    tr.addEventListener("click", () => abrirPasta(tr.dataset.pasta));
  });
}

// ─── PASTA DETAIL ──────────────────────────────────────────────────────
function abrirPasta(numero) {
  const p = pastas.find(x => x.numero === numero);
  if (!p) return;

  // Show detail, hide list
  document.getElementById("pastas-list").classList.add("hidden");
  document.getElementById("pastas-detail").classList.remove("hidden");

  // Breadcrumb
  document.getElementById("pastaNumeroDetalhe").textContent = p.numero;

  // Sidebar
  document.getElementById("pastaAreaBadge").textContent = p.area;
  document.getElementById("pCliente").textContent       = p.cliente;
  document.getElementById("pCodigoSIA").textContent     = p.codigoSIA;
  document.getElementById("pTipoServico").textContent   = p.tipoServico;
  document.getElementById("pServico").textContent       = p.servico;
  document.getElementById("pParteContraria").textContent = p.parteContraria;
  document.getElementById("pAdvogado").textContent      = p.advogado;

  // Dados do processo
  document.getElementById("pDescricao").value         = p.descricao;
  document.getElementById("pDataDistribuicao").value  = p.dataDistribuicao;
  document.getElementById("pDataContrato").value      = "00/00/0000";
  document.getElementById("pValorCausa").value        = p.valorCausa;
  document.getElementById("pIncluidoPor").value       = p.incluidoPor;
  document.getElementById("pAreaResp").innerHTML      = `<option>${p.area}</option>`;
  document.getElementById("pAdvResp").innerHTML       = `<option>${p.advogado}</option>`;

  // Andamentos
  document.getElementById("instanciaNumero1").textContent = p.processo;
  document.getElementById("instanciaComarca1").textContent = `Comarca: ${p.comarca}`;

  // Reset to first tab
  document.querySelectorAll(".pasta-tab").forEach(b => b.classList.remove("is-active"));
  document.querySelectorAll(".pasta-pane").forEach(pn => pn.classList.remove("is-active"));
  document.querySelector('.pasta-tab[data-ptab="andamentos"]').classList.add("is-active");
  document.getElementById("ptab-andamentos").classList.add("is-active");
}

// ─── BACK TO LIST ──────────────────────────────────────────────────────
document.getElementById("btnVoltarPastas").addEventListener("click", () => {
  document.getElementById("pastas-detail").classList.add("hidden");
  document.getElementById("pastas-list").classList.remove("hidden");
});

// ─── PASTA SUB-TABS ────────────────────────────────────────────────────
document.querySelectorAll(".pasta-tab[data-ptab]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".pasta-tab").forEach(b => b.classList.remove("is-active"));
    document.querySelectorAll(".pasta-pane").forEach(pn => pn.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.getElementById(`ptab-${btn.dataset.ptab}`)?.classList.add("is-active");
  });
});

// ─── SIDEBAR COLLAPSE ──────────────────────────────────────────────────
document.getElementById("sidebarCollapseBtn").addEventListener("click", () => {
  const sidebar = document.getElementById("pastaSidebar");
  const btn     = document.getElementById("sidebarCollapseBtn");
  sidebar.classList.toggle("is-collapsed");
  btn.textContent = sidebar.classList.contains("is-collapsed") ? "›" : "‹";
});

// ─── PASTA PAGINATION ──────────────────────────────────────────────────
document.getElementById("pastaPgAnterior").addEventListener("click", () => {
  if (pastaPagAtual > 1) { pastaPagAtual--; renderPastaList(); }
});

document.getElementById("pastaPgProxima").addEventListener("click", () => {
  pastaPagAtual++; renderPastaList();
});

document.getElementById("pastaPagina").addEventListener("change", e => {
  pastaPagAtual = Number(e.target.value); renderPastaList();
});

document.getElementById("pastaLinhasPorPagina").addEventListener("change", e => {
  pastaLinhas   = Number(e.target.value);
  pastaPagAtual = 1;
  renderPastaList();
});

document.getElementById("buscaPasta").addEventListener("input", () => {
  pastaPagAtual = 1; renderPastaList();
});

// ─── INIT ──────────────────────────────────────────────────────────────
renderAtividades();
renderPipeline();
renderPastaList();
renderCalendario();

// Select today on load
const _h = new Date();
const _iso = `${_h.getFullYear()}-${String(_h.getMonth()+1).padStart(2,"0")}-${String(_h.getDate()).padStart(2,"0")}`;
selecionarDia(_iso);
