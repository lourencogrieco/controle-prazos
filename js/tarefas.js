// ──────────────────────────────────────────────────────────────────────
// CRUD — TAREFAS (modal completo)
// ──────────────────────────────────────────────────────────────────────
function popularSelectResponsaveisTarefa(valorAtual) {
  popularRespCheckboxes('tarefaRespCheckboxes', valorAtual, state.usuarios);
}

function abrirModalNovaTarefa(id) {
  const t = id ? state.tarefas.find(x => x.id === id) : null;
  document.querySelector('#modalNovaTarefa .modal-head h3').textContent = t ? 'Editar Tarefa' : 'Nova Tarefa';
  document.getElementById('tarefaId').value          = t?.id || '';
  document.getElementById('tTitulo').value           = t?.titulo || '';
  document.getElementById('tTipo').value             = t?.tipo || 'Outro';
  document.getElementById('tPrioridade').value       = t?.prioridade?.toLowerCase() || 'normal';
  document.getElementById('tarefaPastaSelect').value = '';
  document.getElementById('tPrazo').value            = t?.dataLimite || '';
  document.getElementById('tDescricao').value        = t?.descricao || '';
  const statusRaw = t?.status || 'Pendente';
  document.getElementById('tStatus').value =
    statusRaw === 'Concluída'    ? 'concluida'   :
    statusRaw === 'Em andamento' ? 'em_andamento' : 'pendente';
  document.getElementById('tarefaStatusField').style.display = t ? '' : 'none';
  popularSelectsPastas();
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

  const tarefaId = document.getElementById('tarefaId').value;
  const obj = {
    id:          tarefaId || uid(),
    empresa_id:  state.empresaId,
    pasta_id:    document.getElementById('tarefaPastaSelect').value || null,
    titulo:      document.getElementById('tTitulo').value.trim(),
    tipo:        document.getElementById('tTipo').value,
    prioridade:  document.getElementById('tPrioridade').value,
    responsavel: getSelectedResps('tarefaRespCheckboxes'),
    prazo:       document.getElementById('tPrazo').value || null,
    descricao:   document.getElementById('tDescricao').value.trim() || null,
    status:      document.getElementById('tStatus').value || 'pendente',
  };

  const saveReq  = db.from('tarefas_lhub').upsert(obj).select();
  const tOut     = new Promise((_, r) => setTimeout(() => r(new Error('Sem resposta do banco em 12s. Verifique as políticas RLS.')), 12000));
  const { data, error } = await Promise.race([saveReq, tOut]);
  btn.disabled = false; btn.textContent = 'Salvar Tarefa';
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  if (!data?.length) { toast('Tarefa não salva: falta política INSERT no Supabase (execute o SQL de RLS).', 'error'); return; }
  fecharModalNovaTarefa();
  toast('Tarefa salva');
  await carregarDados();
});

async function excluirTarefa(id) {
  if (!confirm('Confirmar exclusão desta tarefa?')) return;
  const { error } = await db.from('tarefas_lhub').delete().eq('id', id).eq('empresa_id', state.empresaId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  toast('Tarefa excluída');
  await carregarDados();
}

async function alterarStatusTarefa(id, novoStatus) {
  const { error } = await db.from('tarefas_lhub')
    .update({ status: novoStatus })
    .eq('id', id)
    .eq('empresa_id', state.empresaId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  await carregarDados();
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
  const priorCls = t.prioridade === 'Alta' ? 'tarefa-card--alta'
                 : t.prioridade === 'Média' ? 'tarefa-card--media'
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

  return `<article class="tarefa-card ${priorCls}">
    <div class="tarefa-card-header">
      <div class="tarefa-tags">
        <span class="tag ${tagInfo.cls}">${tagInfo.label}</span>
        ${t.prioridade === 'Alta' || t.prioridade === 'Urgente' ? '<span class="tag tag--urgent">Alta</span>' : ''}
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
