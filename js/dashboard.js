// ──────────────────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────────────────
function renderDashboard() {
  const agora = new Date();
  const em7dias = new Date(agora); em7dias.setDate(em7dias.getDate() + 7);

  const tarefasPendentes = state.tarefas.filter(t => t.status === 'Pendente').length;
  const prazosSemana     = state.prazos.filter(p => {
    if (p.status === 'Concluído') return false;
    const d = daysUntil(p.prazoFatal);
    return d >= 0 && d <= 7;
  }).length;
  const prazosVencidos   = state.prazos.filter(p =>
    p.status !== 'Concluído' && daysUntil(p.prazoFatal) < 0
  ).length;
  const pastasAtivas     = state.pastas.filter(p => p.status === 'ativo').length;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('dashTarefasPendentes', tarefasPendentes);
  set('dashTarefasLabel',     `Tarefa${tarefasPendentes !== 1 ? 's' : ''} a fazer`);
  set('dashPrazosSemana',     prazosSemana);
  set('dashPrazosVencidos',   prazosVencidos);
  set('dashPastasAtivas',     pastasAtivas);
  set('dashClientes',         state.clientes.length);

  // Próximos prazos (até 5)
  const proximos = state.prazos
    .filter(p => p.status !== 'Concluído' && daysUntil(p.prazoFatal) >= 0)
    .sort((a, b) => a.prazoFatal.localeCompare(b.prazoFatal))
    .slice(0, 5);

  const cont = document.getElementById('dashProximosPrazos');
  if (cont) {
    cont.innerHTML = proximos.length
      ? proximos.map(p => {
          const diff = daysUntil(p.prazoFatal);
          const cls  = diff <= 3 ? 'color:#c0392b;font-weight:700' : diff <= 7 ? 'color:#e07a17;font-weight:600' : '';
          return `<div style="display:flex;align-items:center;gap:10px;font-size:var(--text-sm)">
            <span style="font-family:'IBM Plex Mono',monospace;font-size:.7rem;${cls}">${formatDate(p.prazoFatal)}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.cliente || p.pastaNr}</span>
            <span style="color:var(--mu);font-size:.72rem">${p.tipoPrazo}</span>
            <span style="${cls}">${diff === 0 ? 'Hoje' : diff + 'd'}</span>
          </div>`;
        }).join('')
      : '<div style="color:var(--mu);font-size:var(--text-sm)">Nenhum prazo próximo.</div>';
  }
}
