// ──────────────────────────────────────────────────────────────────────
// NAV BADGES
// ──────────────────────────────────────────────────────────────────────
function renderNavBadges() {
  const urgentes = state.prazos.filter(p => {
    if (p.status === 'Concluído') return false;
    return daysUntil(p.prazoFatal) <= 3;
  }).length;
  const badge = document.getElementById('navBadgePrazos');
  if (!badge) return;
  if (urgentes > 0) {
    badge.textContent = urgentes;
    badge.classList.remove('hidden');
  } else {
    badge.textContent = '';
    badge.classList.add('hidden');
  }
}

// ──────────────────────────────────────────────────────────────────────
// NAVEGAR PARA PRAZO ESPECÍFICO
// ──────────────────────────────────────────────────────────────────────
function navegarParaPrazo(prazoId) {
  // Navega para atividades > aba prazos
  navegarPara('atividades');
  setTimeout(() => {
    const btnPrazos = document.querySelector('.subtab[data-subtab="prazos"]');
    if (btnPrazos) btnPrazos.click();
    // Destaca o prazo na lista após render
    setTimeout(() => {
      const row = document.querySelector(`[data-prazo-id="${prazoId}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('highlight-row');
        setTimeout(() => row.classList.remove('highlight-row'), 2000);
      }
    }, 200);
  }, 100);
}

// ──────────────────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────────────────
function renderDashboard() {
  const tarefasPendentes = state.tarefas.filter(t => t.status === 'Pendente').length;
  const prazosSemana     = state.prazos.filter(p => {
    if (p.status === 'Concluído') return false;
    const d = daysUntil(p.prazoFatal);
    return d >= 0 && d <= 7;
  }).length;
  const prazosVencidos = state.prazos.filter(p =>
    p.status !== 'Concluído' && daysUntil(p.prazoFatal) < 0
  ).length;
  const pastasAtivas = state.pastas.filter(p => p.status === 'ativo').length;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('dashTarefasPendentes', tarefasPendentes);
  set('dashTarefasLabel',     `Tarefa${tarefasPendentes !== 1 ? 's' : ''} a fazer`);
  set('dashPrazosSemana',     prazosSemana);
  set('dashPrazosVencidos',   prazosVencidos);

  // ── Alertas de prazos urgentes ─────────────────────────────────────
  const alertas = state.prazos.filter(p => {
    if (p.status === 'Concluído') return false;
    return daysUntil(p.prazoFatal) <= 3;
  }).sort((a, b) => a.prazoFatal.localeCompare(b.prazoFatal));

  const alertaEl = document.getElementById('dashAlertasPrazos');
  if (alertaEl) {
    if (alertas.length > 0) {
      alertaEl.innerHTML = `<div class="dash-alerta-strip">
        <span class="dash-alerta-icon">⚠</span>
        <span class="dash-alerta-msg"><strong>${alertas.length} prazo${alertas.length > 1 ? 's' : ''}</strong> vence${alertas.length > 1 ? 'm' : ''} nos próximos 3 dias:</span>
        <span class="dash-alerta-list">${alertas.slice(0, 4).map(p => {
          const d = daysUntil(p.prazoFatal);
          const label = d < 0 ? 'Vencido' : d === 0 ? 'Hoje' : `${d}d`;
          return `<span class="dash-alerta-item" onclick="document.querySelector('[data-view=atividades]').click();document.querySelector('[data-subtab=prazos]').click()" title="${p.tipoPrazo}">${p.cliente || p.pastaNr || '—'} (${label})</span>`;
        }).join('')}${alertas.length > 4 ? `<span class="dash-alerta-item" style="color:var(--mu)">+${alertas.length - 4} mais</span>` : ''}</span>
      </div>`;
      alertaEl.classList.remove('hidden');
    } else {
      alertaEl.innerHTML = '';
      alertaEl.classList.add('hidden');
    }
  }

  // ── Próximos prazos ────────────────────────────────────────────────
  const proximos = state.prazos
    .filter(p => p.status !== 'Concluído' && daysUntil(p.prazoFatal) >= 0)
    .sort((a, b) => a.prazoFatal.localeCompare(b.prazoFatal))
    .slice(0, 6);

  const contPrazos = document.getElementById('dashProximosPrazos');
  if (contPrazos) {
    contPrazos.innerHTML = proximos.length
      ? proximos.map(p => {
          const diff  = daysUntil(p.prazoFatal);
          const cor   = diff <= 3 ? 'var(--red)' : diff <= 7 ? '#e07a17' : 'var(--mu)';
          const label = diff === 0 ? 'Hoje' : diff + 'd';
          return `<div class="dash-list-item" style="cursor:pointer" onclick="navegarParaPrazo('${p.id}')" title="Abrir prazo">
            <span class="dash-item-dot" style="background:${cor}"></span>
            <span class="dash-item-title">${p.cliente || p.pastaNr || '—'}</span>
            <span class="dash-item-meta">${p.tipoPrazo}</span>
            <span class="dash-item-days" style="color:${cor}">${label}</span>
          </div>`;
        }).join('')
      : '<div class="dash-empty">Nenhum prazo próximo.</div>';
  }

  // ── Tarefas pendentes ──────────────────────────────────────────────
  const PRIOR_COR = { Urgente:'var(--red)', Alta:'#e07a17', Normal:'var(--ac)', Baixa:'var(--mu)' };
  const PRIOR_ORD = { Urgente:0, Alta:1, Normal:2, Baixa:3 };

  const tarefasLista = state.tarefas
    .filter(t => t.status === 'Pendente')
    .sort((a, b) => (PRIOR_ORD[a.prioridade] ?? 2) - (PRIOR_ORD[b.prioridade] ?? 2))
    .slice(0, 6);

  const contTarefas = document.getElementById('dashTarefasLista');
  if (contTarefas) {
    contTarefas.innerHTML = tarefasLista.length
      ? tarefasLista.map(t => {
          const cor  = PRIOR_COR[t.prioridade] || 'var(--mu)';
          const dias = t.dataLimite
            ? (() => { const d = daysUntil(t.dataLimite); return d < 0 ? ' · vencida' : d === 0 ? ' · hoje' : ` · ${d}d`; })()
            : '';
          return `<div class="dash-list-item">
            <span class="dash-item-dot" style="background:${cor}"></span>
            <span class="dash-item-title">${t.titulo}</span>
            <span class="dash-item-meta">${t.tipo || '—'}${dias}</span>
          </div>`;
        }).join('')
      : '<div class="dash-empty">Nenhuma tarefa pendente.</div>';
  }

  renderDashProdutividade();

  // ── Agenda da semana ───────────────────────────────────────────────
  const hoje  = new Date();

  const base  = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const fim   = new Date(base); fim.setDate(fim.getDate() + 7);

  const TIPO_COR_AG = {
    'Prazo':      'var(--red)',
    'Audiência':  '#1890d8',
    'Reunião':    '#1d8b60',
    'Diligência': '#e07a17',
    'Lembrete':   'var(--mu)',
  };

  const eventosSemana = agendaEventos
    .filter(e => { const d = new Date(e.data + 'T00:00:00'); return d >= base && d <= fim; })
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 6);

  const contAgenda = document.getElementById('dashAgendaSemana');
  if (contAgenda) {
    contAgenda.innerHTML = eventosSemana.length
      ? eventosSemana.map(e => {
          const [, mm, dd] = e.data.split('-');
          const cor  = TIPO_COR_AG[e.tipo] || 'var(--mu)';
          const hora = e.hora ? ` · ${e.hora}` : '';
          return `<div class="dash-list-item">
            <span class="dash-date-chip">${dd}/${mm}</span>
            <span class="dash-item-title">${e.titulo}</span>
            <span class="dash-item-meta" style="color:${cor}">${e.tipo}${hora}</span>
          </div>`;
        }).join('')
      : '<div class="dash-empty">Nenhum evento esta semana.</div>';
  }
}

// ──────────────────────────────────────────────────────────────────────
// PRODUTIVIDADE DA EQUIPE — visível apenas para perfis gerenciais
// ──────────────────────────────────────────────────────────────────────
function renderDashProdutividade() {
  const secEl = document.getElementById('dashProdutividade');
  if (!secEl) return;

  const perfisGerenciais = ['socio', 'socio_fundador', 'admin', 'adm', 'controller'];
  if (!perfisGerenciais.includes(state.meuPerfil?.perfil || '')) {
    secEl.style.display = 'none';
    return;
  }
  secEl.style.display = '';

  // Período exibido
  const agora  = new Date();
  const meses  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const mesStr = `${meses[agora.getMonth()]}/${agora.getFullYear()}`;
  const periEl = document.getElementById('dashProdPeriodo');
  if (periEl) periEl.textContent = mesStr;

  // ── Acumula métricas por responsável ────────────────────────────────
  const stats = new Map(); // nome → { prazPend, prazVenc, prazConcl, tarPend, tarConcl }
  const _s = nome => {
    if (!stats.has(nome)) stats.set(nome, { prazPend:0, prazVenc:0, prazConcl:0, tarPend:0, tarConcl:0 });
    return stats.get(nome);
  };

  for (const p of state.prazos) {
    const resps = (p.responsavel || '').split(';').map(n => n.trim()).filter(Boolean);
    for (const nome of resps) {
      const s = _s(nome);
      if (p.status === 'Concluído')          s.prazConcl++;
      else if (daysUntil(p.prazoFatal) < 0)  s.prazVenc++;
      else                                   s.prazPend++;
    }
  }

  for (const t of state.tarefas) {
    const resps = (t.responsavel || '').split(';').map(n => n.trim()).filter(Boolean);
    for (const nome of resps) {
      const s = _s(nome);
      if (t.status === 'Concluída') s.tarConcl++;
      else                          s.tarPend++;
    }
  }

  const tableEl = document.getElementById('dashProdTable');
  if (!tableEl) return;

  if (!stats.size) {
    tableEl.innerHTML = '<p class="dash-empty">Nenhum responsável cadastrado nos prazos ou tarefas.</p>';
    return;
  }

  const sorted = [...stats.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));

  const rows = sorted.map(([nome, s]) => {
    const total      = s.prazConcl + s.prazPend + s.prazVenc;
    const taxaPrazo  = total > 0 ? Math.round(s.prazConcl / total * 100) : 0;
    const barW       = taxaPrazo;
    const barCor     = taxaPrazo >= 80 ? '#1d8b60' : taxaPrazo >= 50 ? '#e07a17' : 'var(--red)';

    return `<tr>
      <td>
        <div class="prod-user">
          <span class="avatar" style="width:26px;height:26px;font-size:.54rem;flex-shrink:0">${initials(nome)}</span>
          <span class="prod-user-nome">${nome}</span>
        </div>
      </td>
      <td><span class="prod-num ${s.prazVenc > 0 ? 'prod-num--danger' : ''}">${s.prazVenc}</span></td>
      <td><span class="prod-num ${s.prazPend > 0 ? 'prod-num--warn' : 'prod-num--zero'}">${s.prazPend}</span></td>
      <td><span class="prod-num prod-num--ok">${s.prazConcl}</span></td>
      <td><span class="prod-num ${s.tarPend > 0 ? 'prod-num--warn' : 'prod-num--zero'}">${s.tarPend}</span></td>
      <td><span class="prod-num prod-num--ok">${s.tarConcl}</span></td>
      <td>
        <div class="prod-bar-wrap">
          <div class="prod-bar" style="width:${barW}%;background:${barCor}"></div>
        </div>
        <span class="prod-bar-pct" style="color:${barCor}">${taxaPrazo}%</span>
      </td>
    </tr>`;
  }).join('');

  tableEl.innerHTML = `
    <table class="prod-table">
      <thead>
        <tr>
          <th>Responsável</th>
          <th>Prazos vencidos</th>
          <th>Prazos pendentes</th>
          <th>Prazos concluídos</th>
          <th>Tarefas pendentes</th>
          <th>Tarefas concluídas</th>
          <th>Conclusão prazos</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}
