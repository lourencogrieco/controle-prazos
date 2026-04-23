// ──────────────────────────────────────────────────────────────────────
// CRUD — TAREFAS (modal completo)
// ──────────────────────────────────────────────────────────────────────
function popularSelectResponsaveisTarefa(valorAtual) {
  const sel = document.getElementById('tResponsavel');
  if (!sel) return;
  sel.innerHTML = '<option value="">— sem responsável —</option>' +
    state.usuarios.map(u =>
      `<option value="${u.nome}" ${u.nome === valorAtual ? 'selected' : ''}>${u.nome}</option>`
    ).join('');
}

function abrirModalNovaTarefa(id) {
  const t = id ? state.tarefas.find(x => x.id === id) : null;
  document.getElementById('tarefaId').value          = t?.id || '';
  document.getElementById('tTitulo').value           = t?.titulo || '';
  document.getElementById('tTipo').value             = t?.tipo || 'Outro';
  document.getElementById('tPrioridade').value       = t?.prioridade?.toLowerCase() || 'normal';
  document.getElementById('tarefaPastaSelect').value = '';
  document.getElementById('tPrazo').value            = t?.dataLimite || '';
  document.getElementById('tDescricao').value        = t?.descricao || '';
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
    responsavel: document.getElementById('tResponsavel').value.trim(),
    prazo:       document.getElementById('tPrazo').value || null,
    descricao:   document.getElementById('tDescricao').value.trim() || null,
    status:      tarefaId
      ? (state.tarefas.find(t => t.id === tarefaId)?.status === 'Concluída' ? 'concluida'
        : state.tarefas.find(t => t.id === tarefaId)?.status === 'Em andamento' ? 'em_andamento'
        : 'pendente')
      : 'pendente',
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
  const av       = initials(t.responsavel);
  return `<article class="tarefa-card ${priorCls}">
    <div class="tarefa-tags">
      <span class="tag ${tagInfo.cls}">${tagInfo.label}</span>
      ${t.prioridade === 'Alta' || t.prioridade === 'Urgente' ? '<span class="tag tag--urgent">Alta</span>' : ''}
    </div>
    <p class="tarefa-titulo">${t.titulo}</p>
    <p class="tarefa-desc">${t.descricao}</p>
    <div class="tarefa-footer">
      <div class="tarefa-resp">
        <span class="avatar" style="width:24px;height:24px;font-size:.58rem">${av}</span>
        ${t.responsavel}
      </div>
      <span class="tarefa-prazo ${urgente ? 'tarefa-prazo--urgente' : ''}">⏱ ${t.dataLimite ? formatDate(t.dataLimite) : '—'}</span>
    </div>
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
