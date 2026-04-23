// ──────────────────────────────────────────────────────────────────────
// DATA — hardcoded (demo data para pipeline)
// ──────────────────────────────────────────────────────────────────────
const oportunidades = [];

const intimacoesData = [];

const andamentosBase = [];

// ──────────────────────────────────────────────────────────────────────
// CARD RENDERERS
// ──────────────────────────────────────────────────────────────────────
function atividadeCard(item) {
  const diff    = item.dataFatal ? daysUntil(item.dataFatal) : 99;
  const urgent  = item.prioridade === 'Urgente' || diff <= 1;
  const done    = item.status === 'Concluído' || item.status === 'Concluída';
  const classes = ['req-card', urgent ? 'req-card--urgent' : '', done ? 'req-card--done' : ''].filter(Boolean).join(' ');
  const daysCls = diff < 0 ? 'req-days--vencido' : diff <= 3 ? 'req-days--urgente' : diff <= 10 ? 'req-days--aviso' : 'req-days--ok';
  const av      = initials(item.responsavel || '?');

  return `<article class="${classes}" draggable="true" data-id="${item.id}">
    <div class="req-row-top">
      <div class="req-tags-inline">
        <span class="tag tag--area">${item.area || 'Prazo'}</span>
        <span class="tag tag--type">${item.tipo}</span>
        ${urgent ? '<span class="tag tag--urgent">Urgente</span>' : ''}
      </div>
      <span class="req-drag-handle" title="Arraste para mover">⠿</span>
    </div>
    <div class="req-row-main">
      <span class="req-client">${item.cliente}</span>
      ${item.processo ? `<span class="req-tipo">${item.processo}</span>` : ''}
    </div>
    <div class="req-row-foot">
      <span class="req-days ${daysCls}">${item.dataFatal ? formatDate(item.dataFatal) : '—'}</span>
      <div class="req-foot-right">
        ${item.responsavel ? `<span class="req-resp-name">${item.responsavel}</span>` : ''}
        <span class="avatar" style="width:22px;height:22px;font-size:.52rem;flex-shrink:0">${av}</span>
      </div>
    </div>
  </article>`;
}

function oportunidadeCard(item) {
  const recusado = item.status === 'Recusado';
  const classes  = ['req-card', recusado ? 'req-card--refused' : ''].filter(Boolean).join(' ');
  const tagClass = item.area === 'Tributário' ? 'tag--area' : 'tag--type';
  return `
    <article class="${classes}">
      <div class="req-body">
        <div class="req-tags">
          <span class="tag ${tagClass}">${item.area}</span>
          ${recusado ? '<span class="tag tag--refused">Recusado</span>' : ''}
        </div>
        <p class="req-number">${item.numero}</p>
        <p class="req-meta"><strong>Lead:</strong> ${item.lead}</p>
        <p class="req-meta"><strong>Tipo:</strong> ${item.tipo}</p>
        <p class="req-meta"><strong>Tese:</strong> ${item.tese}</p>
        ${item.motivoRecusa ? `<p class="req-refusal">Motivo da recusa: ${item.motivoRecusa}</p>` : ''}
        ${!recusado && item.envio ? `<p class="req-date">Enviado ${item.envio}mente em ${formatDate(item.data)}</p>` : ''}
      </div>
      <div class="req-foot">
        <div class="req-avatars">
          ${item.responsavel.split(' ').map(r => `<span class="avatar">${r}</span>`).join('')}
        </div>
        <div class="req-owner">${recusado
          ? `Recusado em ${formatDate(item.data)}<br>por ${item.responsavelNome}`
          : `Enviado em ${formatDate(item.data)}<br>por ${item.responsavelNome}`}</div>
      </div>
    </article>`;
}

// ──────────────────────────────────────────────────────────────────────
// RENDER ATIVIDADES (painel Minhas Atividades — usa state.prazos como fonte viva)
// ──────────────────────────────────────────────────────────────────────
function filteredAtividades() {
  const busca = (document.getElementById('buscaPainel')?.value ?? '').toLowerCase();
  const resp  = document.getElementById('filtroResponsavel')?.value ?? '';
  // Converte prazos do DB para formato de atividade para o kanban
  const lista = state.prazos.map(p => ({
    id:          p.id,
    cliente:     p.cliente,
    processo:    p.pastaNr,
    tipo:        p.tipoPrazo,
    area:        'Prazo',
    dataFatal:   p.prazoFatal,
    responsavel: p.responsavel,
    status:      p.status,
    descricao:   p.descricao,
    solicitante: null,
    prioridade:  daysUntil(p.prazoFatal) <= 3 ? 'Urgente' : 'Normal',
  }));
  return lista.filter(item => {
    const match = !busca ||
      (item.cliente || '').toLowerCase().includes(busca) ||
      (item.processo || '').toLowerCase().includes(busca) ||
      (item.tipo || '').toLowerCase().includes(busca);
    return match && (!resp || item.responsavel === resp);
  });
}

function renderAtividades() {
  const lista      = filteredAtividades();
  const pendentes  = lista.filter(i => i.status === 'Pendente' || i.status === 'Atrasado');
  const andamento  = lista.filter(i => i.status === 'Em andamento');
  const concluidos = lista.filter(i => i.status === 'Concluído' || i.status === 'Concluída');
  const cancelados = lista.filter(i => i.status === 'Cancelado');
  const empty = label => `<div class="empty-state">${label}</div>`;

  document.getElementById('colunaPendentes').innerHTML  = pendentes.length  ? pendentes.map(atividadeCard).join('')  : empty('Nenhuma nova solicitação.');
  document.getElementById('colunaAndamento').innerHTML  = andamento.length  ? andamento.map(atividadeCard).join('')  : empty('Nenhuma atividade em andamento.');
  document.getElementById('colunaConcluidos').innerHTML = concluidos.length ? concluidos.map(atividadeCard).join('') : empty('Nenhuma atividade concluída.');
  document.getElementById('colunaCancelados').innerHTML = cancelados.length ? cancelados.map(atividadeCard).join('') : empty('Nenhuma solicitação cancelada.');

  document.getElementById('countNovas').textContent      = pendentes.length;
  document.getElementById('countAndamento').textContent  = andamento.length;
  document.getElementById('countConcluidos').textContent = concluidos.length;
  document.getElementById('countCancelados').textContent = cancelados.length;

  initKanbanDrag();

  const total    = lista.length || 1;
  const urgentes = lista.filter(i => i.status !== 'Concluído' && i.status !== 'Concluída' &&
    (i.prioridade === 'Urgente' || daysUntil(i.dataFatal) <= 1)).length;
  const pct      = Math.round((concluidos.length / total) * 100);

  document.getElementById('metricPendentes').textContent  = String(lista.filter(i => i.status !== 'Concluído' && i.status !== 'Concluída').length).padStart(2, '0');
  document.getElementById('metricUrgentes').textContent   = String(urgentes).padStart(2, '0');
  document.getElementById('metricConcluidos').textContent = String(concluidos.length).padStart(2, '0');
  document.getElementById('progressBar').style.width      = `${pct}%`;
  document.getElementById('progressLabel').textContent    = `${pct}% completo`;

  renderTabela(lista);
}

function renderTabela(lista) {
  document.getElementById('tabelaPrazos').innerHTML = lista.map(item => `
    <tr>
      <td><a href="#" class="table-link">${item.processo || '—'}</a></td>
      <td>${item.cliente}</td>
      <td>${item.tipo}</td>
      <td>${item.dataFatal ? formatDate(item.dataFatal) : '—'}</td>
      <td>${item.responsavel}</td>
      <td><span class="status-pill ${statusClass(item.status)}">${item.status}</span></td>
    </tr>`).join('');
}

// ──────────────────────────────────────────────────────────────────────
// RENDER PIPELINE
// ──────────────────────────────────────────────────────────────────────
function filteredOportunidades() {
  const busca = (document.getElementById('buscaPipeline')?.value ?? '').toLowerCase();
  if (!busca) return oportunidades;
  return oportunidades.filter(item =>
    item.lead.toLowerCase().includes(busca) ||
    item.numero.toLowerCase().includes(busca) ||
    item.area.toLowerCase().includes(busca)
  );
}

function renderPipeline() {
  const lista    = filteredOportunidades();
  const recusado = lista.filter(i => i.status === 'Recusado');
  const aceite   = lista.filter(i => i.status === 'Aguardando aceite');
  const empty = label => `<div class="empty-state">${label}</div>`;

  document.getElementById('colunaOportunidades').innerHTML = recusado.length ? recusado.map(oportunidadeCard).join('') : empty('Nenhuma oportunidade.');
  document.getElementById('colunaAceite').innerHTML        = aceite.length   ? aceite.map(oportunidadeCard).join('')   : empty('Nenhum aguardando aceite.');
  document.getElementById('countOportunidades').textContent = recusado.length;
  document.getElementById('countAceite').textContent        = aceite.length;
  document.getElementById('countValidacao').textContent     = '0';
  document.getElementById('countAssinado').textContent      = '0';
}

// ──────────────────────────────────────────────────────────────────────
// KANBAN DRAG-AND-DROP
// ──────────────────────────────────────────────────────────────────────
function initKanbanDrag() {
  let dragId = null;

  document.querySelectorAll('#subtab-todas .req-card[data-id]').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragId = card.dataset.id;
      setTimeout(() => card.classList.add('is-dragging'), 0);
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
  });

  const statusMap = {
    colunaPendentes:  'pendente',
    colunaAndamento:  'em_andamento',
    colunaConcluidos: 'concluido',
    colunaCancelados: 'cancelado',
  };

  document.querySelectorAll('#subtab-todas .board-col-body').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
    });
    col.addEventListener('drop', async e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const novoStatus = statusMap[col.id];
      if (!dragId || !novoStatus) return;
      const id = dragId;
      dragId = null;
      const { error } = await db.from('prazos_lhub')
        .update({ status: novoStatus })
        .eq('id', id)
        .eq('empresa_id', state.empresaId);
      if (error) { toast('Erro ao mover: ' + error.message, 'error'); return; }
      await carregarDados();
    });
  });
}

// ──────────────────────────────────────────────────────────────────────
// SEARCH & FILTER LISTENERS
// ──────────────────────────────────────────────────────────────────────
document.getElementById('buscaPainel')?.addEventListener('input', renderAtividades);
document.getElementById('filtroResponsavel')?.addEventListener('change', renderAtividades);
document.getElementById('buscaPipeline')?.addEventListener('input', renderPipeline);
