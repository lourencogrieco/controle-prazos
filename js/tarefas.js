// ──────────────────────────────────────────────────────────────────────
// CRUD — TAREFAS (modal completo)
// ──────────────────────────────────────────────────────────────────────
function popularSelectResponsaveisTarefa(valorAtual) {
  popularRespPicker('tarefaRespPicker', valorAtual, state.usuarios);
}

function abrirModalNovaTarefa(id) {
  const t = id ? state.tarefas.find(x => x.id === id) : null;
  document.querySelector('#modalNovaTarefa .modal-head h3').textContent = t ? 'Editar Tarefa' : 'Nova Tarefa';
  document.getElementById('tarefaId').value          = t?.id || '';
  document.getElementById('tTitulo').value           = t?.titulo || '';
  document.getElementById('tTipo').value             = t?.tipo || 'Outro';
  document.getElementById('tPrioridade').value       = t?.prioridade?.toLowerCase() || 'normal';
  document.getElementById('tPrazo').value            = t?.dataLimite || '';
  document.getElementById('tDescricao').value        = t?.descricao || '';
  const statusRaw = t?.status || 'Pendente';
  document.getElementById('tStatus').value =
    statusRaw === 'Concluída'    ? 'concluida'   :
    statusRaw === 'Em andamento' ? 'em_andamento' : 'pendente';
  document.getElementById('tarefaStatusField').style.display = t ? '' : 'none';
  popularSelectsPastas();
  document.getElementById('tarefaPastaSelect').value = t?.pastaId || '';
  popularSelectResponsaveisTarefa(t?.responsavel || '');
  document.getElementById('modalNovaTarefa').classList.add('open');
}

function fecharModalNovaTarefa() {
  document.getElementById('modalNovaTarefa').classList.remove('open');
  document.getElementById('novaTarefaForm').reset();
}

document.getElementById('btnNovaTarefa').addEventListener('click', () => abrirModalNovaTarefa(null));
document.getElementById('fecharNovaTarefa').addEventListener('click', fecharModalNovaTarefa);
document.getElementById('btnCancelarTarefa').addEventListener('click', fecharModalNovaTarefa);
document.getElementById('modalNovaTarefa').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModalNovaTarefa();
});

document.getElementById('novaTarefaForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarTarefa');
  btn.disabled = true; btn.textContent = 'Salvando…';

  try {
    if (!state.empresaId) { toast('Sessão não iniciada. Recarregue a página.', 'error'); return; }
    const tarefaId = document.getElementById('tarefaId').value;
    const obj = {
      id:          tarefaId || uid(),
      empresa_id:  state.empresaId,
      pasta_id:    document.getElementById('tarefaPastaSelect').value || null,
      titulo:      document.getElementById('tTitulo').value.trim(),
      tipo:        document.getElementById('tTipo').value,
      prioridade:  document.getElementById('tPrioridade').value,
      responsavel: getSelectedResps('tarefaRespPicker'),
      prazo:       document.getElementById('tPrazo').value || null,
      descricao:   document.getElementById('tDescricao').value.trim() || null,
      status:      document.getElementById('tStatus').value || 'pendente',
    };

    const saveReq = db.from('tarefas_lhub').upsert(obj).select();
    const tOut    = new Promise((_, r) => setTimeout(() => r(new Error('Sem resposta do banco em 12s. Verifique as políticas RLS.')), 12000));
    const { data, error } = await Promise.race([saveReq, tOut]);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    if (!data?.length) { toast('Tarefa não salva: falta política INSERT no Supabase (execute o SQL de RLS).', 'error'); return; }
    const nova = dbParaTarefa(data[0]);
    _stateUpsert(state.tarefas, nova);
    logAuditoria(tarefaId ? 'editar' : 'criar', 'tarefas_lhub', obj.id, `Tarefa ${tarefaId ? 'editada' : 'criada'}: ${obj.titulo}`);
    fecharModalNovaTarefa();
    toast('Tarefa salva');
    renderTarefasAba(); renderDashboard();
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
    console.error('[tarefa] exception:', err);
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar Tarefa';
  }
});

async function excluirTarefa(id) {
  if (!confirm('Confirmar exclusão desta tarefa?')) return;
  const t = state.tarefas.find(x => x.id === id);
  const { error } = await db.from('tarefas_lhub').delete().eq('id', id).eq('empresa_id', state.empresaId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  logAuditoria('excluir', 'tarefas_lhub', id, `Tarefa excluída: ${t?.titulo || '—'}`);
  _stateRemove(state.tarefas, id);
  toast('Tarefa excluída');
  renderTarefasAba(); renderDashboard();
  if (typeof renderTarefasNaPasta === 'function') renderTarefasNaPasta();
}

async function alterarStatusTarefa(id, novoStatus) {
  const { error } = await db.from('tarefas_lhub')
    .update({ status: novoStatus })
    .eq('id', id)
    .eq('empresa_id', state.empresaId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  const t = state.tarefas.find(x => x.id === id);
  if (t) {
    t.status = novoStatus === 'concluida' ? 'Concluída'
             : novoStatus === 'em_andamento' ? 'Em andamento' : 'Pendente';
  }
  renderTarefasAba(); renderDashboard();
  // Se o usuário está na aba de tarefas de uma pasta, atualiza aquele kanban também
  if (typeof renderTarefasNaPasta === 'function') renderTarefasNaPasta();
}

// ──────────────────────────────────────────────────────────────────────
// RENDER TAREFAS ABA — lê state.tarefas
// ──────────────────────────────────────────────────────────────────────
const TIPO_TAG_TAREFA = {
  'Contato com cliente':     { cls:'tag--area',         label:'Cliente' },
  'Contato com órgão':       { cls:'tag--type',         label:'Órgão' },
  'Pesquisa jurídica':       { cls:'tag--encerramento', label:'Pesquisa' },
  'Elaboração de documento': { cls:'tag--area',         label:'Documento' },
  'Diligência interna':      { cls:'tag--urgent',       label:'Diligência' },
  'Reunião':                 { cls:'tag--reuniao-t',    label:'Reunião' },
  'Outro':                   { cls:'tag--lembrete',     label:'Outro' },
};

function tarefaCard(t) {
  const diff     = t.dataLimite ? daysUntil(t.dataLimite) : null;
  const urgente  = diff !== null && diff <= 3;
  const priorCls = t.prioridade === 'Alta' || t.prioridade === 'Urgente' ? 'tarefa-card--alta'
                 : t.prioridade === 'Baixa' ? 'tarefa-card--normal'
                 : 'tarefa-card--normal';
  const tagInfo  = TIPO_TAG_TAREFA[t.tipo] ?? { cls:'tag--lembrete', label: t.tipo };
  const statusVal = t.status === 'Concluída' ? 'concluida'
    : t.status === 'Em andamento' ? 'em_andamento' : 'pendente';

  const acoes = podeEditarRegistro() ? `
    <div class="tarefa-actions">
      <button class="btn-icon" title="Editar" onclick="event.stopPropagation();abrirModalNovaTarefa('${t.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      ${podeExcluirRegistro() ? `<button class="btn-icon btn-icon--danger" title="Excluir" onclick="event.stopPropagation();excluirTarefa('${t.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
        </svg>
      </button>` : ''}
    </div>` : '';

  return `<article class="tarefa-card ${priorCls}" draggable="true" data-id="${t.id}" data-status="${statusVal}">
    <div class="tarefa-card-header">
      <div class="tarefa-tags">
        <span class="tag ${tagInfo.cls}">${tagInfo.label}</span>
        ${t.prioridade === 'Alta' || t.prioridade === 'Urgente' ? `<span class="tag tag--urgent">${t.prioridade}</span>` : ''}
      </div>
      ${acoes}
    </div>
    <p class="tarefa-titulo">${t.titulo}</p>
    <p class="tarefa-desc">${t.descricao}</p>
    <div class="tarefa-footer">
      <div class="tarefa-resp">
        ${avatarGroup(t.responsavel)}
      </div>
      <span class="tarefa-prazo ${urgente ? 'tarefa-prazo--urgente' : ''}">⏱ ${t.dataLimite ? formatDate(t.dataLimite) : '—'}</span>
    </div>
    ${podeEditarRegistro() ? `<select class="tarefa-status-sel" onchange="alterarStatusTarefa('${t.id}',this.value)">
      <option value="pendente" ${statusVal==='pendente' ? 'selected' : ''}>Pendente</option>
      <option value="em_andamento" ${statusVal==='em_andamento' ? 'selected' : ''}>Em andamento</option>
      <option value="concluida" ${statusVal==='concluida' ? 'selected' : ''}>Concluída</option>
    </select>` : ''}
  </article>`;
}

// Limite visível por coluna; expandido com "Mostrar mais"
const TAREFAS_POR_COLUNA = 10;
const _tarefasLimite = { pendente: TAREFAS_POR_COLUNA, andamento: TAREFAS_POR_COLUNA, concluida: TAREFAS_POR_COLUNA };

function _renderColuna(colId, items, limiteKey, emptyMsg) {
  const lim    = _tarefasLimite[limiteKey];
  const slice  = items.slice(0, lim);
  const resto  = items.length - slice.length;
  const botao  = resto > 0
    ? `<button class="btn-mostrar-mais" onclick="_expandirColuna('${limiteKey}',${items.length})">Mostrar mais ${resto} tarefa${resto !== 1 ? 's' : ''} ↓</button>`
    : (items.length > TAREFAS_POR_COLUNA
        ? `<button class="btn-mostrar-mais btn-mostrar-mais--recolher" onclick="_recolherColuna('${limiteKey}')">Recolher ↑</button>`
        : '');
  document.getElementById(colId).innerHTML =
    (slice.length ? slice.map(tarefaCard).join('') : `<div class="empty-state">${emptyMsg}</div>`) + botao;
}

function _expandirColuna(key, total) {
  _tarefasLimite[key] = total;
  renderTarefasAba();
}

function _recolherColuna(key) {
  _tarefasLimite[key] = TAREFAS_POR_COLUNA;
  renderTarefasAba();
}

function renderTarefasAba() {
  const busca  = (document.getElementById('buscaTarefas')?.value ?? '').toLowerCase();
  const tipo   = document.getElementById('filtroTarefasTipo')?.value ?? '';
  const status = document.getElementById('filtroTarefasStatus')?.value ?? '';

  const lista = state.tarefas.filter(t => {
    const m = !busca || t.titulo.toLowerCase().includes(busca) || t.descricao.toLowerCase().includes(busca);
    return m && (!tipo || t.tipo === tipo) && (!status || t.status === status);
  });

  const pendentes  = lista.filter(t => t.status === 'Pendente');
  const andamento  = lista.filter(t => t.status === 'Em andamento');
  const concluidas = lista.filter(t => t.status === 'Concluída');

  // Com filtro ativo: expande para mostrar todos os resultados sem truncar
  // Sem filtro: garante mínimo de TAREFAS_POR_COLUNA para o "Mostrar mais" funcionar
  if (busca || tipo || status) {
    _tarefasLimite.pendente  = Math.max(pendentes.length,  TAREFAS_POR_COLUNA);
    _tarefasLimite.andamento = Math.max(andamento.length,  TAREFAS_POR_COLUNA);
    _tarefasLimite.concluida = Math.max(concluidas.length, TAREFAS_POR_COLUNA);
  } else {
    // Ao limpar filtro, não recolhe abaixo do mínimo
    _tarefasLimite.pendente  = Math.max(_tarefasLimite.pendente,  TAREFAS_POR_COLUNA);
    _tarefasLimite.andamento = Math.max(_tarefasLimite.andamento, TAREFAS_POR_COLUNA);
    _tarefasLimite.concluida = Math.max(_tarefasLimite.concluida, TAREFAS_POR_COLUNA);
  }

  _renderColuna('colTarefasPendentes',  pendentes,  'pendente',  'Nenhuma tarefa pendente.');
  _renderColuna('colTarefasAndamento',  andamento,  'andamento', 'Nenhuma em andamento.');
  _renderColuna('colTarefasConcluidas', concluidas, 'concluida', 'Nenhuma concluída.');

  document.getElementById('countTarefasPendentes').textContent  = pendentes.length;
  document.getElementById('countTarefasAndamento').textContent  = andamento.length;
  document.getElementById('countTarefasConcluidas').textContent = concluidas.length;
  if (typeof updateMobileKanbanCounts === 'function') updateMobileKanbanCounts();
}

document.getElementById('buscaTarefas')?.addEventListener('input', renderTarefasAba);
document.getElementById('filtroTarefasTipo')?.addEventListener('change', renderTarefasAba);
document.getElementById('filtroTarefasStatus')?.addEventListener('change', renderTarefasAba);

// ──────────────────────────────────────────────────────────────────────
// DRAG-AND-DROP — mover tarefa entre colunas do kanban
// Funciona tanto no kanban de Atividades quanto no da Pasta.
// ──────────────────────────────────────────────────────────────────────
const _tarefaStatusMap = {
  // Atividades
  colTarefasPendentes:  'pendente',
  colTarefasAndamento:  'em_andamento',
  colTarefasConcluidas: 'concluida',
  // Pasta
  ptabTarefPendentes:   'pendente',
  ptabTarefAndamento:   'em_andamento',
  ptabTarefConcluidas:  'concluida',
};

function initTarefaKanbanDrag(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  let _dragId = null;

  // delegação em vez de re-bind a cada re-render
  container.addEventListener('dragstart', e => {
    const card = e.target.closest('.tarefa-card[data-id]');
    if (!card) return;
    _dragId = card.dataset.id;
    setTimeout(() => card.classList.add('is-dragging'), 0);
    e.dataTransfer.effectAllowed = 'move';
  });

  container.addEventListener('dragend', e => {
    const card = e.target.closest('.tarefa-card[data-id]');
    if (card) card.classList.remove('is-dragging');
    container.querySelectorAll('.board-col-body.drag-over')
      .forEach(c => c.classList.remove('drag-over'));
  });

  container.addEventListener('dragover', e => {
    const col = e.target.closest('.board-col-body');
    if (!col || !_dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    container.querySelectorAll('.board-col-body').forEach(c => c.classList.remove('drag-over'));
    col.classList.add('drag-over');
  });

  container.addEventListener('dragleave', e => {
    const col = e.target.closest('.board-col-body');
    if (col && !col.contains(e.relatedTarget)) col.classList.remove('drag-over');
  });

  container.addEventListener('drop', async e => {
    const col = e.target.closest('.board-col-body');
    if (!col) return;
    e.preventDefault();
    col.classList.remove('drag-over');
    const novoStatus = _tarefaStatusMap[col.id];
    if (!_dragId || !novoStatus) { _dragId = null; return; }
    const id = _dragId;
    _dragId = null;
    // Não mover se já está na mesma coluna
    const card = container.querySelector(`.tarefa-card[data-id="${id}"]`);
    if (card?.dataset.status === novoStatus) return;
    await alterarStatusTarefa(id, novoStatus);
  });
}

// Inicializa drag para os dois kanban de tarefas
initTarefaKanbanDrag('#subtab-tarefas');
initTarefaKanbanDrag('#ptab-tarefas');

// ──────────────────────────────────────────────────────────────────────
// TOUCH DRAG-AND-DROP — kanban de tarefas no mobile
// Estado compartilhado + listeners únicos no document para evitar duplicatas
// quando múltiplos containers são registrados.
// ──────────────────────────────────────────────────────────────────────
const _td = {
  ghost: null, dragId: null, srcCard: null, activeCol: null, container: null,
};

function _tdReset() {
  if (_td.ghost)     { _td.ghost.remove(); _td.ghost = null; }
  if (_td.srcCard)   { _td.srcCard.classList.remove('is-dragging'); }
  if (_td.activeCol) { _td.activeCol.classList.remove('drag-over'); }
  _td.dragId = _td.srcCard = _td.activeCol = _td.container = null;
}

// Listeners no document — adicionados uma única vez
document.addEventListener('touchmove', e => {
  if (!_td.ghost || !_td.dragId) return;
  e.preventDefault();

  const touch = e.touches[0];
  const gh    = _td.ghost.getBoundingClientRect();
  _td.ghost.style.top  = (touch.clientY - gh.height / 2) + 'px';
  _td.ghost.style.left = (touch.clientX - gh.width  / 2) + 'px';

  _td.ghost.style.display = 'none';
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  _td.ghost.style.display = '';

  // Procura coluna dentro do container ativo
  const colSelector = _td.container ? `#${_td.container.id} .board-col-body` : '.board-col-body';
  const col = el?.closest('.board-col-body');
  const validCol = col && _td.container?.contains(col) ? col : null;

  if (validCol !== _td.activeCol) {
    if (_td.activeCol) _td.activeCol.classList.remove('drag-over');
    _td.activeCol = validCol;
    if (_td.activeCol) _td.activeCol.classList.add('drag-over');
  }
}, { passive: false });

document.addEventListener('touchend', async () => {
  if (!_td.dragId) return;

  const dragId   = _td.dragId;
  const col      = _td.activeCol;
  const container = _td.container;
  _tdReset();

  if (col) {
    const novoStatus = _tarefaStatusMap[col.id];
    if (novoStatus && container) {
      const card = container.querySelector(`.tarefa-card[data-id="${dragId}"]`);
      if (card?.dataset.status !== novoStatus) {
        await alterarStatusTarefa(dragId, novoStatus);
      }
    }
  }
});

document.addEventListener('touchcancel', _tdReset);

function initTouchKanbanDrag(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.addEventListener('touchstart', e => {
    const card = e.target.closest('.tarefa-card[data-id]');
    if (!card) return;
    if (e.target.closest('button, select, a, input')) return;

    _td.dragId    = card.dataset.id;
    _td.srcCard   = card;
    _td.container = container;

    const touch = e.touches[0];
    const rect  = card.getBoundingClientRect();

    _td.ghost = card.cloneNode(true);
    Object.assign(_td.ghost.style, {
      position:      'fixed',
      width:         rect.width + 'px',
      top:           (touch.clientY - rect.height / 2) + 'px',
      left:          (touch.clientX - rect.width  / 2) + 'px',
      opacity:       '0.85',
      pointerEvents: 'none',
      zIndex:        '9999',
      transform:     'rotate(2deg) scale(1.03)',
      boxShadow:     '0 10px 28px rgba(0,0,0,.25)',
      transition:    'none',
      borderRadius:  '8px',
    });
    document.body.appendChild(_td.ghost);
    card.classList.add('is-dragging');
  }, { passive: true });
}

initTouchKanbanDrag('#subtab-tarefas');
initTouchKanbanDrag('#ptab-tarefas');
