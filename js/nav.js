// ──────────────────────────────────────────────────────────────────────
// SUBTAB SWITCHING
// ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.subtab[data-subtab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.subtab').forEach(b => b.classList.remove('is-active'));
    document.querySelectorAll('.subtab-panel').forEach(p => p.classList.add('hidden'));
    btn.classList.add('is-active');
    document.getElementById(`subtab-${btn.dataset.subtab}`)?.classList.remove('hidden');
    if (btn.dataset.subtab === 'prazos')     renderPrazosAba();
    if (btn.dataset.subtab === 'tarefas')    { renderTarefasAba(); initMobileKanbanNav(); }
    if (btn.dataset.subtab === 'intimacoes') {
      const hoje = new Date().toISOString().slice(0, 10);
      const elDe  = document.getElementById('filtroIntimacoesDe');
      const elAte = document.getElementById('filtroIntimacoesAte');
      if (elDe && !elDe.value)  elDe.value  = hoje;
      if (elAte && !elAte.value) elAte.value = hoje;
      renderIntimacoesAba();
    }
  });
});

// ──────────────────────────────────────────────────────────────────────
// NAVEGAÇÃO GERAL
// ──────────────────────────────────────────────────────────────────────
function navegarPara(view) {
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  const tab = document.querySelector(`.nav-tab[data-view="${view}"]`);
  if (tab) tab.classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.classList.remove('is-active'));
  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.add('is-active');
  if (view === 'configuracoes') renderConfiguracoes();
  if (view === 'pipeline')      renderPipeline();
  if (view === 'atividades')    renderAtividades();
  if (view === 'agenda')        renderCalendario();
}

// TOP NAV TABS
// ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-tab[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.view;
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('is-active'));
    const view = document.getElementById(`view-${target}`);
    if (view) view.classList.add('is-active');
    if (target === 'pipeline')   renderPipeline();
    if (target === 'atividades') renderAtividades();
    if (target === 'agenda')     renderCalendario();
  });
});

// ──────────────────────────────────────────────────────────────────────
// DASHBOARD CLOCK
// ──────────────────────────────────────────────────────────────────────
// PICKER — TIPO DE SOLICITAÇÃO
// ──────────────────────────────────────────────────────────────────────
function abrirMenuSolicitacao() {
  document.getElementById('modalSolicitacaoTipo').classList.add('open');
}

function fecharMenuSolicitacao() {
  document.getElementById('modalSolicitacaoTipo').classList.remove('open');
}

function escolherSolicitacao(tipo) {
  fecharMenuSolicitacao();
  if (tipo === 'prazo')  { abrirModalNovoPrazo(null);  return; }
  if (tipo === 'tarefa') { abrirModalNovaTarefa(null); return; }
  if (tipo === 'evento') { document.getElementById('modalEvento').classList.add('open'); }
}

// ──────────────────────────────────────────────────────────────────────
function updateClock() {
  const t = currentTime();
  document.querySelectorAll('.dash-time').forEach(el => {
    el.textContent = `Atualizado às ${t}`;
  });
}
setInterval(updateClock, 1000);
updateClock();
