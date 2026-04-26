// ──────────────────────────────────────────────────────────────────────
// NAV BADGES
// ──────────────────────────────────────────────────────────────────────
let _navBadgesSeq = 0;

async function carregarNavBadgesResumo() {
  if (!state.empresaId) return { urgentes: 0 };
  const { count, error } = await db.from('prazos_lhub')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', state.empresaId)
    .neq('status', 'concluido')
    .lte('prazo', _dashIsoOffset(3));
  if (error) throw error;
  return { urgentes: count || 0 };
}

async function renderNavBadges() {
  const seq = ++_navBadgesSeq;
  let urgentes = 0;
  try {
    ({ urgentes } = await carregarNavBadgesResumo());
  } catch (err) {
    console.warn('[nav-badges] falha ao carregar resumo:', err);
    urgentes = 0;
  }
  if (seq !== _navBadgesSeq) return;
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

function navegarParaTarefa(tarefaId) {
  navegarPara('atividades');
  setTimeout(() => {
    const btnTarefas = document.querySelector('.subtab[data-subtab="tarefas"]');
    if (btnTarefas) btnTarefas.click();
    const filtroStatus = document.getElementById('filtroTarefasStatus');
    const filtroTipo = document.getElementById('filtroTarefasTipo');
    const busca = document.getElementById('buscaTarefas');
    if (filtroStatus) filtroStatus.value = '';
    if (filtroTipo) filtroTipo.value = '';
    if (busca) busca.value = '';
    if (typeof renderTarefasAba === 'function') renderTarefasAba();
    setTimeout(() => {
      const card = document.querySelector(`.tarefa-card[data-id="${CSS.escape(tarefaId)}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlight-row');
        setTimeout(() => card.classList.remove('highlight-row'), 2000);
      }
    }, 200);
  }, 100);
}

function navegarParaEvento(eventoId) {
  const evento = agendaEventos.find(e => e.id === eventoId);
  navegarPara('agenda');
  setTimeout(() => {
    if (evento?.data) {
      const [ano, mes] = evento.data.split('-').map(Number);
      calAno = ano;
      calMes = mes - 1;
      calDataSelecionada = evento.data;
      renderCalendario();
      selecionarDia(evento.data);
    }
    setTimeout(() => {
      const item = document.querySelector(`.ev-item[data-evento-id="${CSS.escape(eventoId)}"]`);
      if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        item.classList.add('highlight-row');
        setTimeout(() => item.classList.remove('highlight-row'), 2000);
      }
    }, 160);
  }, 100);
}

function abrirRisco(tipo) {
  if (tipo === 'prazos_vencidos') {
    navegarPara('atividades');
    setTimeout(() => document.querySelector('[data-subtab=prazos]')?.click(), 80);
    return;
  }
  if (tipo === 'intimacoes_pendentes') {
    navegarPara('atividades');
    setTimeout(() => {
      document.querySelector('[data-subtab=intimacoes]')?.click();
      const st = document.getElementById('filtroIntimacoesStatus');
      const de = document.getElementById('filtroIntimacoesDe');
      const ate = document.getElementById('filtroIntimacoesAte');
      if (st) st.value = 'pendente';
      if (de) de.value = '';
      if (ate) ate.value = '';
      renderIntimacoesAba();
    }, 80);
    return;
  }
  if (tipo === 'tarefas_sem_responsavel') {
    navegarPara('atividades');
    setTimeout(() => document.querySelector('[data-subtab=tarefas]')?.click(), 80);
    return;
  }
  if (tipo === 'financeiro_vencido') navegarPara('financeiro');
}

// ──────────────────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────────────────
let _dashboardSeq = 0;

function _dashIsoOffset(dias) {
  const hoje = new Date();
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function _dashPrazoFromRow(row) {
  const p = dbParaPrazo(row);
  if (row.pastas) {
    p.pastaNr = row.pastas.numero || '';
    p.processo = row.pastas.numero_processo || '';
    p.comarca = row.pastas.comarca || '';
  } else if (typeof _enrichPrazo === 'function') {
    _enrichPrazo(p);
  }
  return p;
}

function _dashEventoFromRow(e) {
  return {
    id:            e.id,
    data:          e.data,
    titulo:        e.titulo,
    tipo:          e.tipo,
    hora:          e.hora || '',
    responsavel:   e.responsavel || '',
    local:         e.local || '',
    participantes: e.participantes || '',
  };
}

async function carregarDashboardResumo() {
  const hojeIso = _dashIsoOffset(0);
  const em3Iso  = _dashIsoOffset(3);
  const em7Iso  = _dashIsoOffset(7);

  const basePrazo = (opts) => db.from('prazos_lhub')
    .select('*, pastas(numero, numero_processo, comarca)', opts)
    .eq('empresa_id', state.empresaId)
    .neq('status', 'concluido');

  const [
    tarefasPendentesRes,
    prazosSemanaRes,
    prazosVencidosCountRes,
    alertasRes,
    proximosRes,
    tarefasListaRes,
    agendaRes,
    prazosVencidosRes,
    tarefasSemRespRes,
    cobrancasVencidasRes,
  ] = await Promise.all([
    db.from('tarefas_lhub')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', state.empresaId)
      .eq('status', 'pendente'),
    db.from('prazos_lhub')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', state.empresaId)
      .neq('status', 'concluido')
      .gte('prazo', hojeIso)
      .lte('prazo', em7Iso),
    db.from('prazos_lhub')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', state.empresaId)
      .neq('status', 'concluido')
      .lt('prazo', hojeIso),
    basePrazo({ count: 'exact' })
      .lte('prazo', em3Iso)
      .order('prazo', { ascending: true })
      .limit(8),
    basePrazo()
      .gte('prazo', hojeIso)
      .order('prazo', { ascending: true })
      .limit(6),
    db.from('tarefas_lhub')
      .select('*')
      .eq('empresa_id', state.empresaId)
      .eq('status', 'pendente')
      .limit(20),
    db.from('agenda_eventos')
      .select('*')
      .eq('empresa_id', state.empresaId)
      .gte('data', hojeIso)
      .lte('data', em7Iso)
      .order('data', { ascending: true })
      .limit(6),
    basePrazo()
      .lt('prazo', hojeIso)
      .order('prazo', { ascending: true })
      .limit(3),
    db.from('tarefas_lhub')
      .select('*', { count: 'exact' })
      .eq('empresa_id', state.empresaId)
      .neq('status', 'concluida')
      .or('responsavel.is.null,responsavel.eq.')
      .limit(2),
    db.from('cobrancas')
      .select('*', { count: 'exact' })
      .eq('empresa_id', state.empresaId)
      .neq('status', 'pago')
      .lt('data_vencimento', hojeIso)
      .order('data_vencimento', { ascending: true })
      .limit(2),
  ]);

  const erros = [
    tarefasPendentesRes, prazosSemanaRes, prazosVencidosCountRes, alertasRes,
    proximosRes, tarefasListaRes, agendaRes, prazosVencidosRes, tarefasSemRespRes,
    cobrancasVencidasRes,
  ].map(r => r.error).filter(Boolean);
  if (erros.length) throw erros[0];

  const PRIOR_ORD = { Urgente:0, Alta:1, Normal:2, Baixa:3 };
  const tarefasLista = (tarefasListaRes.data || [])
    .map(dbParaTarefa)
    .sort((a, b) => (PRIOR_ORD[a.prioridade] ?? 2) - (PRIOR_ORD[b.prioridade] ?? 2))
    .slice(0, 6);

  const eventosSemana = (agendaRes.data || []).map(_dashEventoFromRow);
  for (const ev of eventosSemana) {
    const idx = agendaEventos.findIndex(e => e.id === ev.id);
    if (idx >= 0) agendaEventos[idx] = ev;
    else agendaEventos.push(ev);
  }
  agendaEventos.sort((a, b) => a.data.localeCompare(b.data));

  return {
    tarefasPendentes: tarefasPendentesRes.count || 0,
    prazosSemana: prazosSemanaRes.count || 0,
    prazosVencidosCount: prazosVencidosCountRes.count || 0,
    alertas: (alertasRes.data || []).map(_dashPrazoFromRow),
    alertasTotal: alertasRes.count || 0,
    proximos: (proximosRes.data || []).map(_dashPrazoFromRow),
    tarefasLista,
    eventosSemana,
    riscos: {
      prazosVencidos: (prazosVencidosRes.data || []).map(_dashPrazoFromRow),
      prazosVencidosTotal: prazosVencidosCountRes.count || 0,
      intimacoesPendentes: state.intimacoes
        .filter(i => (i.status || 'pendente') === 'pendente')
        .sort((a, b) => (b.dataPublicacao || '').localeCompare(a.dataPublicacao || '')),
      tarefasSemResp: (tarefasSemRespRes.data || []).map(dbParaTarefa),
      tarefasSemRespTotal: tarefasSemRespRes.count || 0,
      cobrancasVencidas: (cobrancasVencidasRes.data || []).map(dbParaCobranca),
      cobrancasVencidasTotal: cobrancasVencidasRes.count || 0,
    },
  };
}

async function renderDashboard() {
  const seq = ++_dashboardSeq;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  let resumo;
  try {
    resumo = await carregarDashboardResumo();
  } catch (err) {
    console.warn('[dashboard] falha ao carregar resumo:', err);
    const msg = `<div class="dash-empty">Erro ao carregar dashboard: ${escHtml(err.message || 'falha desconhecida')}</div>`;
    ['dashProximosPrazos', 'dashTarefasLista', 'dashAgendaSemana', 'dashRiskList'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = msg;
    });
    return;
  }
  if (seq !== _dashboardSeq) return;

  set('dashTarefasPendentes', resumo.tarefasPendentes);
  set('dashTarefasLabel',     `Tarefa${resumo.tarefasPendentes !== 1 ? 's' : ''} a fazer`);
  set('dashPrazosSemana',     resumo.prazosSemana);
  set('dashPrazosVencidos',   resumo.prazosVencidosCount);

  renderDashboardRiscos(resumo.riscos);

  // ── Alertas de prazos urgentes ─────────────────────────────────────
  const alertas = resumo.alertas;
  const alertasTotal = resumo.alertasTotal;

  const alertaEl = document.getElementById('dashAlertasPrazos');
  if (alertaEl) {
    if (alertasTotal > 0) {
      alertaEl.innerHTML = `<div class="dash-alerta-strip">
        <span class="dash-alerta-icon">⚠</span>
        <span class="dash-alerta-msg"><strong>${alertasTotal} prazo${alertasTotal > 1 ? 's' : ''}</strong> vence${alertasTotal > 1 ? 'm' : ''} nos próximos 3 dias:</span>
        <span class="dash-alerta-list">${alertas.slice(0, 4).map(p => {
          const d = daysUntil(p.prazoFatal);
          const label = d < 0 ? 'Vencido' : d === 0 ? 'Hoje' : `${d}d`;
          return `<span class="dash-alerta-item" onclick="document.querySelector('[data-view=atividades]').click();document.querySelector('[data-subtab=prazos]').click()" title="${escAttr(p.tipoPrazo || '')}">${escHtml(p.cliente || p.pastaNr || '—')} (${escHtml(label)})</span>`;
        }).join('')}${alertasTotal > 4 ? `<span class="dash-alerta-item" style="color:var(--mu)">+${alertasTotal - 4} mais</span>` : ''}</span>
      </div>`;
      alertaEl.classList.remove('hidden');
    } else {
      alertaEl.innerHTML = '';
      alertaEl.classList.add('hidden');
    }
  }

  // ── Próximos prazos ────────────────────────────────────────────────
  const proximos = resumo.proximos;

  const contPrazos = document.getElementById('dashProximosPrazos');
  if (contPrazos) {
    contPrazos.innerHTML = proximos.length
      ? proximos.map(p => {
          const diff  = daysUntil(p.prazoFatal);
          const cor   = diff <= 3 ? 'var(--red)' : diff <= 7 ? '#e07a17' : 'var(--mu)';
          const label = diff === 0 ? 'Hoje' : diff + 'd';
          const id = escAttr(p.id);
          return `<div class="dash-list-item" style="cursor:pointer" onclick="navegarParaPrazo('${id}')" title="Abrir prazo">
            <span class="dash-item-dot" style="background:${cor}"></span>
            <span class="dash-item-title">${escHtml(p.cliente || p.pastaNr || '—')}</span>
            <span class="dash-item-meta">${escHtml(p.tipoPrazo || '—')}</span>
            <span class="dash-item-days" style="color:${cor}">${escHtml(label)}</span>
          </div>`;
        }).join('')
      : '<div class="dash-empty">Nenhum prazo próximo.</div>';
  }

  // ── Tarefas pendentes ──────────────────────────────────────────────
  const PRIOR_COR = { Urgente:'var(--red)', Alta:'#e07a17', Normal:'var(--ac)', Baixa:'var(--mu)' };
  const tarefasLista = resumo.tarefasLista;

  const contTarefas = document.getElementById('dashTarefasLista');
  if (contTarefas) {
    contTarefas.innerHTML = tarefasLista.length
      ? tarefasLista.map(t => {
          const cor  = PRIOR_COR[t.prioridade] || 'var(--mu)';
          const dias = t.dataLimite
            ? (() => { const d = daysUntil(t.dataLimite); return d < 0 ? ' · vencida' : d === 0 ? ' · hoje' : ` · ${d}d`; })()
            : '';
          const id = escAttr(t.id);
          return `<div class="dash-list-item" style="cursor:pointer" onclick="navegarParaTarefa('${id}')" title="Ver tarefa na aba de atividades">
            <span class="dash-item-dot" style="background:${cor}"></span>
            <span class="dash-item-title">${escHtml(t.titulo || '—')}</span>
            <span class="dash-item-meta">${escHtml(`${t.tipo || '—'}${dias}`)}</span>
          </div>`;
        }).join('')
      : '<div class="dash-empty">Nenhuma tarefa pendente.</div>';
  }

  renderDashProdutividade();

  // ── Agenda da semana ───────────────────────────────────────────────
  const TIPO_COR_AG = {
    'Prazo':      'var(--red)',
    'Audiência':  '#1890d8',
    'Reunião':    '#1d8b60',
    'Diligência': '#e07a17',
    'Lembrete':   'var(--mu)',
  };

  const eventosSemana = resumo.eventosSemana;

  const contAgenda = document.getElementById('dashAgendaSemana');
  if (contAgenda) {
    contAgenda.innerHTML = eventosSemana.length
      ? eventosSemana.map(e => {
          const [, mm, dd] = e.data.split('-');
          const cor  = TIPO_COR_AG[e.tipo] || 'var(--mu)';
          const hora = e.hora ? ` · ${e.hora}` : '';
          const id = escAttr(e.id);
          return `<div class="dash-list-item" style="cursor:pointer" onclick="navegarParaEvento('${id}')" title="Ver compromisso na agenda">
            <span class="dash-date-chip">${dd}/${mm}</span>
            <span class="dash-item-title">${escHtml(e.titulo || '—')}</span>
            <span class="dash-item-meta" style="color:${cor}">${escHtml(`${e.tipo || '—'}${hora}`)}</span>
          </div>`;
        }).join('')
      : '<div class="dash-empty">Nenhum evento esta semana.</div>';
  }
}

function renderDashboardRiscos(dados) {
  const prazosVencidos = dados?.prazosVencidos || [];
  const intimacoesPendentes = dados?.intimacoesPendentes || [];
  const tarefasSemResp = dados?.tarefasSemResp || [];
  const cobrancasVencidas = dados?.cobrancasVencidas || [];

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('riskPrazosVencidos', dados?.prazosVencidosTotal ?? prazosVencidos.length);
  set('riskIntimacoesPendentes', intimacoesPendentes.length);
  set('riskTarefasSemResponsavel', dados?.tarefasSemRespTotal ?? tarefasSemResp.length);
  set('riskFinanceiroVencido', dados?.cobrancasVencidasTotal ?? cobrancasVencidas.length);

  const riscos = [
    ...prazosVencidos.slice(0, 3).map(p => ({
      nivel: 'danger',
      titulo: p.cliente || p.pastaNr || 'Prazo sem cliente',
      meta: `${p.tipoPrazo || 'Prazo'} · venceu em ${formatDate(p.prazoFatal)}`,
      acao: `navegarParaPrazo('${escAttr(p.id)}')`,
    })),
    ...intimacoesPendentes.slice(0, 2).map(i => ({
      nivel: 'warn',
      titulo: i.processo || 'Intimação sem processo',
      meta: `${i.tribunal || 'Tribunal'} · publicada em ${formatDate(i.dataPublicacao)}`,
      acao: `abrirRisco('intimacoes_pendentes')`,
    })),
    ...cobrancasVencidas.slice(0, 2).map(c => ({
      nivel: 'danger',
      titulo: c.clienteNome || c.descricao || 'Cobrança vencida',
      meta: `${typeof formatCurrency === 'function' ? formatCurrency(c.valor) : c.valor} · venceu em ${formatDate(c.vencimento)}`,
      acao: `abrirRisco('financeiro_vencido')`,
    })),
    ...tarefasSemResp.slice(0, 2).map(t => ({
      nivel: 'warn',
      titulo: t.titulo || 'Tarefa sem título',
      meta: `${t.tipo || 'Tarefa'} · sem responsável definido`,
      acao: `navegarParaTarefa('${escAttr(t.id)}')`,
    })),
  ].slice(0, 6);

  const listEl = document.getElementById('dashRiskList');
  if (!listEl) return;
  listEl.innerHTML = riscos.length
    ? riscos.map(r => `<button type="button" class="risk-item risk-item--${escAttr(r.nivel)}" onclick="${escAttr(r.acao)}">
        <span class="risk-dot"></span>
        <span class="risk-copy">
          <strong>${escHtml(r.titulo)}</strong>
          <small>${escHtml(r.meta)}</small>
        </span>
      </button>`).join('')
    : '<div class="dash-empty">Nenhum risco crítico encontrado agora.</div>';
}

// ──────────────────────────────────────────────────────────────────────
// PRODUTIVIDADE DA EQUIPE — visível apenas para perfis gerenciais
// ──────────────────────────────────────────────────────────────────────
let _dashProdSeq = 0;

function _dashProdSplitResponsaveis(valor) {
  return String(valor || '').split(';').map(n => n.trim()).filter(Boolean);
}

function _dashProdStats() {
  const stats = new Map();
  const get = nome => {
    if (!stats.has(nome)) stats.set(nome, { prazPend:0, prazVenc:0, prazConcl:0, tarPend:0, tarConcl:0 });
    return stats.get(nome);
  };
  return { stats, get };
}

async function carregarDashProdutividade() {
  const hojeIso = _dashIsoOffset(0);
  const [prazosRes, tarefasRes] = await Promise.all([
    db.from('prazos_lhub')
      .select('responsavel,status,prazo')
      .eq('empresa_id', state.empresaId)
      .not('responsavel', 'is', null),
    db.from('tarefas_lhub')
      .select('responsavel,status')
      .eq('empresa_id', state.empresaId)
      .not('responsavel', 'is', null),
  ]);
  if (prazosRes.error) throw prazosRes.error;
  if (tarefasRes.error) throw tarefasRes.error;

  const { stats, get } = _dashProdStats();

  for (const p of prazosRes.data || []) {
    for (const nome of _dashProdSplitResponsaveis(p.responsavel)) {
      const s = get(nome);
      if (p.status === 'concluido')       s.prazConcl++;
      else if (p.prazo && p.prazo < hojeIso) s.prazVenc++;
      else                                s.prazPend++;
    }
  }

  for (const t of tarefasRes.data || []) {
    for (const nome of _dashProdSplitResponsaveis(t.responsavel)) {
      const s = get(nome);
      if (t.status === 'concluida') s.tarConcl++;
      else                          s.tarPend++;
    }
  }

  return stats;
}

async function renderDashProdutividade() {
  const seq = ++_dashProdSeq;
  const secEl = document.getElementById('dashProdutividade');
  if (!secEl) return;

  if (!PERFIS_GESTAO.includes(state.meuPerfil?.perfil || '')) {
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

  const tableEl = document.getElementById('dashProdTable');
  if (!tableEl) return;
  tableEl.innerHTML = '<p class="dash-empty">Carregando produtividade…</p>';

  let stats;
  try {
    stats = await carregarDashProdutividade();
  } catch (err) {
    if (seq !== _dashProdSeq) return;
    tableEl.innerHTML = `<p class="dash-empty">Erro ao carregar produtividade: ${escHtml(err.message || 'falha desconhecida')}</p>`;
    return;
  }
  if (seq !== _dashProdSeq) return;

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
          <span class="avatar" style="width:26px;height:26px;font-size:.54rem;flex-shrink:0">${escHtml(initials(nome))}</span>
          <span class="prod-user-nome">${escHtml(nome)}</span>
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
