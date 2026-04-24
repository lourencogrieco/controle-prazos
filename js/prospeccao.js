// ──────────────────────────────────────────────────────────────────────
// PROSPECÇÃO — Pipeline CRM
// ──────────────────────────────────────────────────────────────────────

// Colunas do kanban e seus labels
const PIPELINE_COLUNAS = [
  { status: 'oportunidade',       elId: 'colunaOportunidades', countId: 'countOportunidades', empty: 'Nenhuma oportunidade.' },
  { status: 'aguardando_validacao', elId: 'colunaValidacao',   countId: 'countValidacao',     empty: 'Nenhum aguardando.' },
  { status: 'aguardando_aceite',  elId: 'colunaAceite',        countId: 'countAceite',        empty: 'Nenhum aguardando aceite.' },
  { status: 'contrato_assinado',  elId: 'colunaAssinado',      countId: 'countAssinado',      empty: 'Nenhum contrato assinado.' },
];

// ── Card renderer ─────────────────────────────────────────────────────

function _oportCard(o) {
  const recusado = o.status === 'recusado';
  return `<article class="req-card${recusado ? ' req-card--refused' : ''}" data-opo-id="${o.id}" draggable="true">
    <div class="req-body">
      <div class="req-tags">
        ${o.area ? `<span class="tag tag--area">${o.area}</span>` : ''}
        ${o.tipo ? `<span class="tag tag--type">${o.tipo}</span>` : ''}
        ${recusado ? '<span class="tag tag--refused">Recusado</span>' : ''}
      </div>
      <p class="req-number" style="font-weight:600;margin:6px 0 4px">${o.titulo}</p>
      ${o.tese ? `<p class="req-meta" style="font-size:.74rem;color:var(--mu)">${o.tese}</p>` : ''}
      ${o.valor ? `<p class="req-meta"><strong>Valor est.:</strong> ${formatCurrency(o.valor)}</p>` : ''}
      ${o.motivoRecusa ? `<p class="req-refusal" style="color:var(--red);font-size:.74rem;margin-top:4px">Recusa: ${o.motivoRecusa}</p>` : ''}
    </div>
    <div class="req-foot">
      <span style="font-size:.72rem;color:var(--mu)">${o.data ? formatDate(o.data) : '—'}</span>
      <div style="display:flex;gap:4px">
        <button class="btn-icon" title="Editar" onclick="event.stopPropagation();abrirModalOportunidade('${o.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon btn-icon--danger" title="Excluir" onclick="event.stopPropagation();excluirOportunidade('${o.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  </article>`;
}

// ── Render pipeline ───────────────────────────────────────────────────

function renderPipeline() {
  const busca = (document.getElementById('buscaPipeline')?.value || '').toLowerCase();

  const lista = (state.oportunidades || []).filter(o => {
    if (!busca) return true;
    return (o.titulo + o.lead + o.area + o.tese).toLowerCase().includes(busca);
  });

  PIPELINE_COLUNAS.forEach(col => {
    const el = document.getElementById(col.elId);
    const countEl = document.getElementById(col.countId);
    if (!el) return;
    const items = lista.filter(o => o.status === col.status);
    el.innerHTML = items.length
      ? items.map(_oportCard).join('')
      : `<div class="empty-state">${col.empty}</div>`;
    if (countEl) countEl.textContent = items.length;
  });

  _initPipelineDrag();
}

// ── Drag & Drop ───────────────────────────────────────────────────────

function _initPipelineDrag() {
  let dragId = null;

  document.querySelectorAll('#view-pipeline [data-opo-id]').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragId = card.dataset.opoId;
      setTimeout(() => card.classList.add('is-dragging'), 0);
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
  });

  const statusMap = {};
  PIPELINE_COLUNAS.forEach(col => { statusMap[col.elId] = col.status; });

  document.querySelectorAll('#view-pipeline .board-col-body').forEach(col => {
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

      const { error } = await db.from('oportunidades_crm')
        .update({ status: novoStatus })
        .eq('id', id)
        .eq('empresa_id', state.empresaId);
      if (error) { toast('Erro ao mover: ' + error.message, 'error'); return; }

      const item = state.oportunidades.find(o => o.id === id);
      if (item) item.status = novoStatus;
      renderPipeline();
    });
  });
}

// ── Modal ─────────────────────────────────────────────────────────────

function abrirModalOportunidade(id) {
  const o = id ? (state.oportunidades || []).find(x => x.id === id) : null;
  document.getElementById('oportId').value           = o?.id || '';
  document.getElementById('oportTitulo').value       = o?.titulo || '';
  document.getElementById('oportArea').value         = o?.area || '';
  document.getElementById('oportTipo').value         = o?.tipo || '';
  document.getElementById('oportValor').value        = o?.valor || '';
  document.getElementById('oportData').value         = o?.data || '';
  document.getElementById('oportResponsavel').value  = o?.responsavel || '';
  document.getElementById('oportTese').value         = o?.tese || '';
  document.getElementById('oportObservacoes').value  = o?.observacoes || '';
  document.getElementById('oportMotivo').value       = o?.motivoRecusa || '';

  const motivoWrap = document.getElementById('oportMotivoWrap');
  if (motivoWrap) motivoWrap.style.display = o?.status === 'recusado' ? '' : 'none';

  document.getElementById('modalOportunidadeTitulo').textContent = o ? 'Editar Oportunidade' : 'Nova Oportunidade';
  document.getElementById('modalOportunidade').classList.add('open');
}

function fecharModalOportunidade() {
  document.getElementById('modalOportunidade').classList.remove('open');
  document.getElementById('formOportunidade').reset();
}

document.getElementById('formOportunidade').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarOportunidade');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    const id = document.getElementById('oportId').value;
    const obj = {
      id:           id || uid(),
      empresa_id:   state.empresaId,
      titulo:       document.getElementById('oportTitulo').value.trim(),
      area:         document.getElementById('oportArea').value || null,
      tipo:         document.getElementById('oportTipo').value.trim() || null,
      valor:        parseFloat(document.getElementById('oportValor').value) || 0,
      data:         document.getElementById('oportData').value || null,
      responsavel:  document.getElementById('oportResponsavel').value.trim() || null,
      tese:         document.getElementById('oportTese').value.trim() || null,
      observacoes:  document.getElementById('oportObservacoes').value.trim() || null,
      motivo_recusa: document.getElementById('oportMotivo').value.trim() || null,
      status:       id
        ? (state.oportunidades.find(o => o.id === id)?.status || 'oportunidade')
        : 'oportunidade',
    };

    const { data, error } = await db.from('oportunidades_crm').upsert(obj).select();
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    if (!data?.length) { toast('Não foi possível salvar.', 'error'); return; }

    const nova = dbParaOportunidade(data[0]);
    _stateUpsert(state.oportunidades, nova);
    fecharModalOportunidade();
    toast(id ? 'Oportunidade atualizada!' : 'Oportunidade criada!');
    renderPipeline();
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
});

async function excluirOportunidade(id) {
  if (!confirm('Excluir esta oportunidade?')) return;
  const { error } = await db.from('oportunidades_crm').delete().eq('id', id);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  _stateRemove(state.oportunidades, id);
  toast('Oportunidade excluída.');
  renderPipeline();
}

// ── Search listener ───────────────────────────────────────────────────

document.getElementById('buscaPipeline')?.addEventListener('input', renderPipeline);
