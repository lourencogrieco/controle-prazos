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
