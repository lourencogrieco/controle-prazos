// ──────────────────────────────────────────────────────────────────────
// FINANCEIRO
// ──────────────────────────────────────────────────────────────────────

function formatCurrency(val) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Status helpers ────────────────────────────────────────────────────

function _statusCob(c) {
  if (c.status === 'pago') return 'pago';
  if (c.vencimento) {
    const hoje = new Date().toISOString().slice(0, 10);
    if (c.vencimento < hoje) return 'vencido';
  }
  return 'pendente';
}

function _statusCont(c) {
  if (c.status === 'pago') return 'pago';
  if (c.vencimento) {
    const hoje = new Date().toISOString().slice(0, 10);
    if (c.vencimento < hoje) return 'vencido';
  }
  return 'pendente';
}

function _badgeStatus(status) {
  if (status === 'pago')     return '<span class="status-pill status-pill--done">Pago</span>';
  if (status === 'vencido')  return '<span class="status-pill status-pill--danger">Vencido</span>';
  if (status === 'reembolsado') return '<span class="status-pill status-pill--done">Reembolsado</span>';
  return '<span class="status-pill status-pill--warn">Pendente</span>';
}

function _badgeRecorrencia(rec, parcelaNum, parcelaTotal) {
  if (!rec || rec === 'nenhuma') return '<span style="color:var(--mu)">—</span>';
  const map = { semanal:'Semanal', quinzenal:'Quinzenal', mensal:'Mensal',
    bimestral:'Bimestral', trimestral:'Trimestral', semestral:'Semestral', anual:'Anual' };
  const label = map[rec] || rec;
  if (parcelaNum && parcelaTotal) {
    return `<span class="badge-recorr">${label}</span><br><small style="color:var(--mu);font-size:.68rem">${parcelaNum}/${parcelaTotal}</small>`;
  }
  return `<span class="badge-recorr">${label}</span>`;
}

// ── Tab switching ─────────────────────────────────────────────────────

function finMudarAba(tab) {
  document.querySelectorAll('[data-fin-tab]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.finTab === tab);
  });
  document.querySelectorAll('.fin-panel').forEach(p => p.classList.add('hidden'));
  const panel = document.getElementById(`fin-panel-${tab}`);
  if (panel) panel.classList.remove('hidden');

  // Show correct action button
  document.getElementById('btnNovaCobranca').classList.add('hidden');
  document.getElementById('btnNovaContaPagar').classList.add('hidden');
  document.getElementById('btnNovaDespesa').classList.add('hidden');
  if (tab === 'cobrancas')   document.getElementById('btnNovaCobranca').classList.remove('hidden');
  if (tab === 'contaspagar') document.getElementById('btnNovaContaPagar').classList.remove('hidden');
  if (tab === 'despesas')    document.getElementById('btnNovaDespesa').classList.remove('hidden');

  if (tab === 'cobrancas')   renderFinCobrancas();
  if (tab === 'contaspagar') renderFinContasPagar();
  if (tab === 'despesas')    renderFinDespesas();
  if (tab === 'relatorio')   renderFinRelatorio();
}

// ── Entry point ───────────────────────────────────────────────────────

function renderFinanceiro() {
  renderFinVisaoGeral();
  // Re-render active tab if not visaogeral
  const active = document.querySelector('[data-fin-tab].is-active')?.dataset?.finTab;
  if (active === 'cobrancas')   renderFinCobrancas();
  if (active === 'contaspagar') renderFinContasPagar();
  if (active === 'despesas')    renderFinDespesas();
}

// ── Visão Geral ───────────────────────────────────────────────────────

function renderFinVisaoGeral() {
  const hoje     = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);
  const em7dias  = new Date(); em7dias.setDate(em7dias.getDate() + 7);
  const em7iso   = em7dias.toISOString().slice(0, 10);

  const cobs = state.cobrancas || [];
  const conts = state.contasPagar || [];

  // ── Mês atual – Cobranças ──────────────────────────────────────────
  const cobsMes = cobs.filter(c => (c.vencimento || '').startsWith(mesAtual));
  const cobsMesBruto     = cobsMes.reduce((s, c) => s + c.valor, 0);
  const cobsMesPend      = cobsMes.filter(c => _statusCob(c) !== 'pago');
  const cobsMesPago      = cobsMes.filter(c => c.status === 'pago');
  const cobsMesPendVal   = cobsMesPend.reduce((s, c) => s + c.valor, 0);
  const cobsMesPagoVal   = cobsMesPago.reduce((s, c) => s + (c.valorPago || c.valor), 0);

  // ── Mês atual – Contas a Pagar ─────────────────────────────────────
  const contsMes     = conts.filter(c => (c.vencimento || '').startsWith(mesAtual));
  const contsMesPend = contsMes.filter(c => _statusCont(c) !== 'pago');
  const contsMesPago = contsMes.filter(c => c.status === 'pago');
  const contsMesPendVal = contsMesPend.reduce((s, c) => s + c.valor, 0);
  const contsMesPagoVal = contsMesPago.reduce((s, c) => s + (c.valorPago || c.valor), 0);

  const resultadoMes = cobsMesPagoVal - contsMesPagoVal;

  // ── Consolidado ────────────────────────────────────────────────────
  const cobsPend    = cobs.filter(c => _statusCob(c) !== 'pago');
  const cobsVencidas = cobs.filter(c => _statusCob(c) === 'vencido');
  const cobsAVencer = cobs.filter(c => _statusCob(c) === 'pendente' && c.vencimento > hoje && c.vencimento <= em7iso);

  const cobsPendVal    = cobsPend.reduce((s, c) => s + c.valor, 0);
  const cobsVencidasVal = cobsVencidas.reduce((s, c) => s + c.valor, 0);
  const cobsAVencerVal  = cobsAVencer.reduce((s, c) => s + c.valor, 0);

  const contsPend    = conts.filter(c => _statusCont(c) !== 'pago');
  const contsPendVal = contsPend.reduce((s, c) => s + c.valor, 0);

  const eqResultado = cobsPendVal - contsPendVal;

  // ── Fill cards ─────────────────────────────────────────────────────
  _setText('finMesValorBruto',       formatCurrency(cobsMesBruto));
  _setText('finMesValorBrutoSub',    `${cobsMes.length} cobranças`);
  _setText('finMesReceber',          formatCurrency(cobsMesPendVal));
  _setText('finMesReceberSub',       `${cobsMesPend.length} pendente${cobsMesPend.length !== 1 ? 's' : ''}`);
  _setText('finMesRecebidas',        formatCurrency(cobsMesPagoVal));
  _setText('finMesRecebidasSub',     `${cobsMesPago.length} baixa${cobsMesPago.length !== 1 ? 's' : ''}`);
  _setText('finMesPagar',            formatCurrency(contsMesPendVal));
  _setText('finMesPagarSub',         `${contsMesPend.length} conta${contsMesPend.length !== 1 ? 's' : ''}`);
  _setText('finMesPagas',            formatCurrency(contsMesPagoVal));
  _setText('finMesPagasSub',         `${contsMesPago.length} paga${contsMesPago.length !== 1 ? 's' : ''}`);

  const resEl = document.getElementById('finMesResultado');
  if (resEl) {
    resEl.textContent = formatCurrency(resultadoMes);
    resEl.style.color = resultadoMes >= 0 ? '#00c896' : 'var(--red)';
  }
  _setText('finMesResultadoSub', resultadoMes >= 0 ? 'positivo' : 'negativo');

  _setText('finConsolidadoReceber',     formatCurrency(cobsPendVal));
  _setText('finConsolidadoReceberSub',  `${cobsPend.length} cobranças`);
  _setText('finConsolidadoVencidas',    formatCurrency(cobsVencidasVal));
  _setText('finConsolidadoVencidasSub', `${cobsVencidas.length} cobranças`);
  _setText('finConsolidadoAVencer',     formatCurrency(cobsAVencerVal));
  _setText('finConsolidadoAVencerSub',  `${cobsAVencer.length} cobranças`);

  _setText('finEqReceber',    formatCurrency(cobsPendVal));
  _setText('finEqReceberSub', `${cobsPend.length} cobranças pendentes`);
  _setText('finEqPagar',      formatCurrency(contsPendVal));
  _setText('finEqPagarSub',   `${contsPend.length} contas pendentes`);
  const eqEl = document.getElementById('finEqResultado');
  if (eqEl) {
    eqEl.textContent = formatCurrency(eqResultado);
    eqEl.style.color = eqResultado >= 0 ? '#00c896' : 'var(--red)';
  }
  _setText('finEqResultadoSub', eqResultado >= 0 ? 'resultado positivo' : 'resultado negativo');

  // ── Próximos vencimentos ───────────────────────────────────────────
  const proximos = cobs
    .filter(c => _statusCob(c) !== 'pago' && c.vencimento >= hoje)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 8);

  const proxEl = document.getElementById('finProximos');
  if (!proxEl) return;
  if (!proximos.length) {
    proxEl.innerHTML = `<p style="padding:16px 20px;color:var(--mu);font-size:.8rem">Nenhum vencimento próximo.</p>`;
    return;
  }
  proxEl.innerHTML = proximos.map(c => {
    const dias = daysUntil(c.vencimento);
    const urgente = dias <= 3;
    const label = dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `${dias}d`;
    return `<div class="prox-item" onclick="finMudarAba('cobrancas')">
      <div class="prox-info">
        <span class="prox-desc">${c.descricao}</span>
        <span class="prox-cliente">${c.clienteNome || '—'}</span>
      </div>
      <div class="prox-right">
        <span class="prox-valor">${formatCurrency(c.valor)}</span>
        <span class="prox-dias ${urgente ? 'prox-dias--urgente' : ''}">${label}</span>
      </div>
    </div>`;
  }).join('');

  // ── Alertas ────────────────────────────────────────────────────────
  const alertasEl = document.getElementById('finAlertas');
  if (alertasEl) {
    const vencidasHoje = cobs.filter(c => _statusCob(c) === 'vencido' && daysUntil(c.vencimento) >= -3);
    alertasEl.innerHTML = vencidasHoje.length
      ? `<div class="fin-alerta">⚠ ${vencidasHoje.length} cobrança${vencidasHoje.length > 1 ? 's' : ''} vencida${vencidasHoje.length > 1 ? 's' : ''} nos últimos 3 dias — <button class="btn-link-sm" onclick="finMudarAba('cobrancas')">ver cobranças</button></div>`
      : '';
  }
}

function _setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

// ── Cobranças ─────────────────────────────────────────────────────────

function renderFinCobrancas() {
  const busca  = (document.getElementById('buscaCob')?.value || '').toLowerCase();
  const fStatus = document.getElementById('filtroFinCobStatus')?.value || '';
  const fCat    = document.getElementById('filtroFinCobCat')?.value || '';
  const fMes    = document.getElementById('filtroFinCobMes')?.value || '';

  if (fMes) {
    _setText('finCobLabelPend', `A RECEBER EM ${_formatMes(fMes)}`);
    _setText('finCobLabelPago', `✓ RECEBIDO EM ${_formatMes(fMes)}`);
  } else {
    _setText('finCobLabelPend', 'TOTAL A RECEBER');
    _setText('finCobLabelPago', '✓ TOTAL RECEBIDO');
  }

  const lista = (state.cobrancas || []).filter(c => {
    const st = _statusCob(c);
    if (fStatus && st !== fStatus) return false;
    if (fCat && c.categoria !== fCat) return false;
    if (fMes && !(c.vencimento || '').startsWith(fMes)) return false;
    if (busca) {
      const txt = `${c.descricao} ${c.clienteNome}`.toLowerCase();
      if (!txt.includes(busca)) return false;
    }
    return true;
  }).sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));

  const pendentes = lista.filter(c => _statusCob(c) !== 'pago');
  const pagos     = lista.filter(c => c.status === 'pago');

  _setText('finCobPendente',      formatCurrency(pendentes.reduce((s, c) => s + c.valor, 0)));
  _setText('finCobPendenteCount', `${pendentes.length} cobrança${pendentes.length !== 1 ? 's' : ''} pendente${pendentes.length !== 1 ? 's' : ''}`);
  _setText('finCobPago',          formatCurrency(pagos.reduce((s, c) => s + (c.valorPago || c.valor), 0)));
  _setText('finCobPagoCount',     `${pagos.length} baixa${pagos.length !== 1 ? 's' : ''} registrada${pagos.length !== 1 ? 's' : ''}`);
  _setText('finCobCount',         `${lista.length} registro${lista.length !== 1 ? 's' : ''}`);
  _setText('finCobTotalPendente', formatCurrency(pendentes.reduce((s, c) => s + c.valor, 0)));
  _setText('finCobTotalPago',     formatCurrency(pagos.reduce((s, c) => s + (c.valorPago || c.valor), 0)));

  const tbody = document.getElementById('finCobBody');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="tbl-empty">Nenhuma cobrança encontrada.</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(c => {
    const st = _statusCob(c);
    const parc = c.parcelaNum ? ` ${c.parcelaNum}/${c.parcelaTotal}` : '';
    return `<tr>
      <td>
        <span class="fin-row-title">${c.clienteNome || '—'}</span>
        <span class="fin-row-sub">${c.descricao}${parc}</span>
      </td>
      <td>
        ${_catBadge(c.categoria)}
        ${st === 'pago' && c.dataPagamento ? `<span class="fin-row-sub fin-row-sub--pago" style="display:block;margin-top:2px">Pago em ${formatDate(c.dataPagamento)}</span>` : ''}
      </td>
      <td class="fin-cell-date">${c.vencimento ? formatDate(c.vencimento) : '—'}</td>
      <td class="fin-cell-mono">${formatCurrency(c.valor)}</td>
      <td>${_badgeRecorrencia(c.recorrencia, c.parcelaNum, c.parcelaTotal)}</td>
      <td>${_badgeStatus(st)}</td>
      <td class="fin-actions">
        ${st !== 'pago'
          ? `<button class="fin-icon-btn fin-icon-btn--pay" title="Dar baixa" onclick="abrirDarBaixa('${c.id}','cob')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>`
          : `<button class="fin-icon-btn" title="Gerar recibo" onclick="gerarRecibo(${JSON.stringify(c).replace(/"/g,'&quot;')},'cob')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>`}
        <button class="fin-icon-btn" title="Editar" onclick="abrirModalCobranca('${c.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="fin-icon-btn fin-icon-btn--del" title="Excluir" onclick="excluirCobranca('${c.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
      </td>
    </tr>`;
  }).join('');

  // Populate clientes datalist
  const dl = document.getElementById('cobClientesList');
  if (dl) dl.innerHTML = (state.clientes || []).map(c => `<option value="${c.nome}">`).join('');
}

// ── Contas a Pagar ────────────────────────────────────────────────────

function renderFinContasPagar() {
  const busca   = (document.getElementById('buscaCont')?.value || '').toLowerCase();
  const fStatus = document.getElementById('filtroFinContStatus')?.value || '';
  const fTipo   = document.getElementById('filtroFinContTipo')?.value || '';
  const fMes    = document.getElementById('filtroFinContMes')?.value || '';

  if (fMes) {
    _setText('finContLabelPend', `A PAGAR EM ${_formatMes(fMes)}`);
    _setText('finContLabelPago', `✓ PAGO EM ${_formatMes(fMes)}`);
  } else {
    _setText('finContLabelPend', 'TOTAL A PAGAR');
    _setText('finContLabelPago', '✓ TOTAL PAGO');
  }

  const lista = (state.contasPagar || []).filter(c => {
    const st = _statusCont(c);
    if (fStatus && st !== fStatus) return false;
    if (fTipo && c.tipo !== fTipo) return false;
    if (fMes && !(c.vencimento || '').startsWith(fMes)) return false;
    if (busca && !c.descricao.toLowerCase().includes(busca)) return false;
    return true;
  }).sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));

  const pendentes = lista.filter(c => _statusCont(c) !== 'pago');
  const pagos     = lista.filter(c => c.status === 'pago');

  _setText('finContPendente',      formatCurrency(pendentes.reduce((s, c) => s + c.valor, 0)));
  _setText('finContPendenteCount', `${pendentes.length} conta${pendentes.length !== 1 ? 's' : ''} pendente${pendentes.length !== 1 ? 's' : ''}`);
  _setText('finContPago',          formatCurrency(pagos.reduce((s, c) => s + (c.valorPago || c.valor), 0)));
  _setText('finContPagoCount',     `${pagos.length} paga${pagos.length !== 1 ? 's' : ''}`);
  _setText('finContCount',         `${lista.length} registro${lista.length !== 1 ? 's' : ''}`);
  _setText('finContTotalPendente', formatCurrency(pendentes.reduce((s, c) => s + c.valor, 0)));
  _setText('finContTotalPago',     formatCurrency(pagos.reduce((s, c) => s + (c.valorPago || c.valor), 0)));

  const tbody = document.getElementById('finContBody');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="tbl-empty">Nenhuma conta encontrada.</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(c => {
    const st = _statusCont(c);
    return `<tr>
      <td>
        <span class="fin-row-title">${c.descricao}</span>
        <span class="fin-row-sub">${c.tipo || ''}</span>
      </td>
      <td>
        ${c.tipo ? `<span class="fin-cat">${c.tipo}</span>` : '<span style="color:var(--mu)">—</span>'}
        ${st === 'pago' && c.dataPagamento ? `<span class="fin-row-sub fin-row-sub--pago" style="display:block;margin-top:2px">Pago em ${formatDate(c.dataPagamento)}</span>` : ''}
      </td>
      <td class="fin-cell-date">${c.vencimento ? formatDate(c.vencimento) : '—'}</td>
      <td class="fin-cell-mono">${formatCurrency(c.valor)}</td>
      <td>${_badgeRecorrencia(c.recorrencia, c.parcelaNum, c.parcelaTotal)}</td>
      <td>${_badgeStatus(st)}</td>
      <td class="fin-actions">
        ${st !== 'pago'
          ? `<button class="fin-icon-btn fin-icon-btn--pay" title="Dar baixa" onclick="abrirDarBaixa('${c.id}','cont')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>`
          : `<button class="fin-icon-btn" title="Gerar recibo" onclick="gerarRecibo(${JSON.stringify(c).replace(/"/g,'&quot;')},'cont')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>`}
        <button class="fin-icon-btn" title="Editar" onclick="abrirModalContaPagar('${c.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="fin-icon-btn fin-icon-btn--del" title="Excluir" onclick="excluirContaPagar('${c.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
      </td>
    </tr>`;
  }).join('');
}

// ── Despesas ──────────────────────────────────────────────────────────

function renderFinDespesas() {
  const busca   = (document.getElementById('buscaDesp')?.value || '').toLowerCase();
  const fStatus = document.getElementById('filtroFinDespStatus')?.value || '';

  const lista = (state.despesas || []).filter(d => {
    if (fStatus && d.status !== fStatus) return false;
    if (busca) {
      const txt = `${d.descricao} ${d.clienteNome}`.toLowerCase();
      if (!txt.includes(busca)) return false;
    }
    return true;
  }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  _setText('finDespCount', `${lista.length} registro${lista.length !== 1 ? 's' : ''}`);

  const tbody = document.getElementById('finDespBody');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="tbl-empty">Nenhuma despesa encontrada.</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(d => `<tr>
    <td>
      <span class="fin-row-title">${d.clienteNome || '—'}</span>
      <span class="fin-row-sub">${d.descricao}</span>
    </td>
    <td>
      ${_catBadge(d.categoria)}
      ${d.status === 'reembolsado' ? `<span class="fin-row-sub fin-row-sub--pago" style="display:block;margin-top:2px">Reembolsado${d.dataPagamento ? ' em ' + formatDate(d.dataPagamento) : ''}</span>` : ''}
    </td>
    <td class="fin-cell-date">${d.data ? formatDate(d.data) : '—'}</td>
    <td class="fin-cell-mono">${formatCurrency(d.valor)}</td>
    <td>${_badgeStatus(d.status)}</td>
    <td class="fin-actions">
      ${d.status !== 'reembolsado'
        ? `<button class="fin-icon-btn fin-icon-btn--pay" title="Registrar reembolso" onclick="abrirDarBaixa('${d.id}','desp')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>`
        : `<button class="fin-icon-btn" title="Gerar recibo" onclick="gerarRecibo(${JSON.stringify(d).replace(/"/g,'&quot;')},'desp')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>`}
      <button class="fin-icon-btn" title="Editar" onclick="abrirModalDespesa('${d.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      <button class="fin-icon-btn fin-icon-btn--del" title="Excluir" onclick="excluirDespesa('${d.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
    </td>
  </tr>`).join('');

  // Populate clientes datalist
  const dl = document.getElementById('despClientesList');
  if (dl) dl.innerHTML = (state.clientes || []).map(c => `<option value="${c.nome}">`).join('');
}

// ── Helpers ───────────────────────────────────────────────────────────

const _CAT_COLOR = {
  'Honorários de Êxito':    '#1d8b60',
  'Honorários Mensais':     '#e07a17',
  'Honorários Pro-Labore':  '#8b5cf6',
  'Custas':                 '#1890d8',
  'Diligências':            '#e74d3c',
  'Impostos':               '#dc2626',
  'Outros':                 '#9ca3af',
};

function _catBadge(cat) {
  if (!cat) return '<span style="color:var(--mu)">—</span>';
  return `<span class="fin-cat">${cat}</span>`;
}

function _formatMes(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${meses[m - 1]}/${y}`;
}

// ── Modal Cobrança ────────────────────────────────────────────────────

function abrirModalCobranca(id) {
  const c = id ? (state.cobrancas || []).find(x => x.id === id) : null;
  document.getElementById('cobId').value           = c?.id || '';
  document.getElementById('cobDescricao').value    = c?.descricao || '';
  document.getElementById('cobClienteNome').value  = c?.clienteNome || '';
  document.getElementById('cobValor').value        = c?.valor || '';
  document.getElementById('cobVencimento').value   = c?.vencimento || '';
  document.getElementById('cobCategoria').value    = c?.categoria || '';
  document.getElementById('cobRecorrencia').value  = c?.recorrencia || 'nenhuma';
  document.getElementById('cobObservacoes').value  = c?.observacoes || '';

  // Populate clientes datalist
  const dl = document.getElementById('cobClientesList');
  if (dl) dl.innerHTML = (state.clientes || []).map(cl => `<option value="${cl.nome}">`).join('');

  document.getElementById('modalCobrancaTitulo').textContent = c ? 'Editar Cobrança' : 'Nova Cobrança';
  document.getElementById('modalCobranca').classList.add('open');
}

function fecharModalCobranca() {
  document.getElementById('modalCobranca').classList.remove('open');
  document.getElementById('formCobranca').reset();
}

document.getElementById('formCobranca').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarCobranca');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    const id = document.getElementById('cobId').value;
    const obj = {
      id:              id || uid(),
      empresa_id:      state.empresaId,
      cliente_nome:    document.getElementById('cobClienteNome').value.trim() || null,
      descricao:       document.getElementById('cobDescricao').value.trim(),
      valor:           parseFloat(document.getElementById('cobValor').value) || 0,
      data_vencimento: document.getElementById('cobVencimento').value || null,
      categoria:       document.getElementById('cobCategoria').value || null,
      recorrencia:     document.getElementById('cobRecorrencia').value || 'nenhuma',
      observacoes:     document.getElementById('cobObservacoes').value.trim() || null,
      status:          id ? undefined : 'pendente',
    };
    if (!id) delete obj.status; // let DB default apply

    const saveReq = db.from('cobrancas').upsert(obj).select();
    const tOut    = new Promise((_, r) => setTimeout(() => r(new Error('Sem resposta em 12s')), 12000));
    const { data, error } = await Promise.race([saveReq, tOut]);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    if (!data?.length) { toast('Não foi possível salvar. Verifique as permissões.', 'error'); return; }

    fecharModalCobranca();
    toast(id ? 'Cobrança atualizada!' : 'Cobrança criada!');
    await carregarDados();
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
});

async function excluirCobranca(id) {
  if (!confirm('Excluir esta cobrança?')) return;
  const { error } = await db.from('cobrancas').delete().eq('id', id);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  toast('Cobrança excluída.');
  await carregarDados();
}

// ── Modal Conta a Pagar ───────────────────────────────────────────────

function abrirModalContaPagar(id) {
  const c = id ? (state.contasPagar || []).find(x => x.id === id) : null;
  document.getElementById('contId').value          = c?.id || '';
  document.getElementById('contDescricao').value   = c?.descricao || '';
  document.getElementById('contTipo').value        = c?.tipo || '';
  document.getElementById('contValor').value       = c?.valor || '';
  document.getElementById('contVencimento').value  = c?.vencimento || '';
  document.getElementById('contRecorrencia').value = c?.recorrencia || 'nenhuma';
  document.getElementById('contObservacoes').value = c?.observacoes || '';

  document.getElementById('modalContaTitulo').textContent = c ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar';
  document.getElementById('modalContaPagar').classList.add('open');
}

function fecharModalContaPagar() {
  document.getElementById('modalContaPagar').classList.remove('open');
  document.getElementById('formContaPagar').reset();
}

document.getElementById('formContaPagar').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarConta');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    const id = document.getElementById('contId').value;
    const obj = {
      id:              id || uid(),
      empresa_id:      state.empresaId,
      descricao:       document.getElementById('contDescricao').value.trim(),
      tipo:            document.getElementById('contTipo').value || null,
      valor:           parseFloat(document.getElementById('contValor').value) || 0,
      data_vencimento: document.getElementById('contVencimento').value || null,
      recorrencia:     document.getElementById('contRecorrencia').value || 'nenhuma',
      observacoes:     document.getElementById('contObservacoes').value.trim() || null,
    };

    const saveReq = db.from('contas_pagar').upsert(obj).select();
    const tOut    = new Promise((_, r) => setTimeout(() => r(new Error('Sem resposta em 12s')), 12000));
    const { data, error } = await Promise.race([saveReq, tOut]);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    if (!data?.length) { toast('Não foi possível salvar. Verifique as permissões.', 'error'); return; }

    fecharModalContaPagar();
    toast(id ? 'Conta atualizada!' : 'Conta criada!');
    await carregarDados();
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
});

async function excluirContaPagar(id) {
  if (!confirm('Excluir esta conta a pagar?')) return;
  const { error } = await db.from('contas_pagar').delete().eq('id', id);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  toast('Conta excluída.');
  await carregarDados();
}

// ── Modal Despesa ─────────────────────────────────────────────────────

function abrirModalDespesa(id) {
  const d = id ? (state.despesas || []).find(x => x.id === id) : null;
  document.getElementById('despId').value          = d?.id || '';
  document.getElementById('despDescricao').value   = d?.descricao || '';
  document.getElementById('despClienteNome').value = d?.clienteNome || '';
  document.getElementById('despValor').value       = d?.valor || '';
  document.getElementById('despData').value        = d?.data || '';
  document.getElementById('despCategoria').value   = d?.categoria || '';
  document.getElementById('despObservacoes').value = d?.observacoes || '';

  // Populate clientes datalist
  const dl = document.getElementById('despClientesList');
  if (dl) dl.innerHTML = (state.clientes || []).map(c => `<option value="${c.nome}">`).join('');

  document.getElementById('modalDespesaTitulo').textContent = d ? 'Editar Despesa' : 'Nova Despesa Reembolsável';
  document.getElementById('modalDespesa').classList.add('open');
}

function fecharModalDespesa() {
  document.getElementById('modalDespesa').classList.remove('open');
  document.getElementById('formDespesa').reset();
}

document.getElementById('formDespesa').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarDespesa');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    const id = document.getElementById('despId').value;
    const obj = {
      id:          id || uid(),
      empresa_id:  state.empresaId,
      cliente_nome: document.getElementById('despClienteNome').value.trim() || null,
      descricao:   document.getElementById('despDescricao').value.trim(),
      valor:       parseFloat(document.getElementById('despValor').value) || 0,
      data:        document.getElementById('despData').value || null,
      categoria:   document.getElementById('despCategoria').value || null,
      observacoes: document.getElementById('despObservacoes').value.trim() || null,
    };

    const saveReq = db.from('despesas').upsert(obj).select();
    const tOut    = new Promise((_, r) => setTimeout(() => r(new Error('Sem resposta em 12s')), 12000));
    const { data, error } = await Promise.race([saveReq, tOut]);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    if (!data?.length) { toast('Não foi possível salvar. Verifique as permissões.', 'error'); return; }

    fecharModalDespesa();
    toast(id ? 'Despesa atualizada!' : 'Despesa criada!');
    await carregarDados();
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
});

async function excluirDespesa(id) {
  if (!confirm('Excluir esta despesa?')) return;
  const { error } = await db.from('despesas').delete().eq('id', id);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  toast('Despesa excluída.');
  await carregarDados();
}

// ── Dar Baixa ─────────────────────────────────────────────────────────

function abrirDarBaixa(id, tipo) {
  document.getElementById('baixaId').value   = id;
  document.getElementById('baixaTipo').value = tipo;
  document.getElementById('baixaData').value = new Date().toISOString().slice(0, 10);
  document.getElementById('baixaValor').value = '';

  // Pre-fill valor original
  let item = null;
  if (tipo === 'cob')  item = (state.cobrancas || []).find(x => x.id === id);
  if (tipo === 'cont') item = (state.contasPagar || []).find(x => x.id === id);
  if (tipo === 'desp') item = (state.despesas || []).find(x => x.id === id);
  if (item) document.getElementById('baixaValor').value = item.valor;

  document.getElementById('modalDarBaixa').classList.add('open');
}

document.getElementById('formDarBaixa').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnConfirmarBaixa');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    const id    = document.getElementById('baixaId').value;
    const tipo  = document.getElementById('baixaTipo').value;
    const data  = document.getElementById('baixaData').value;
    const valor = parseFloat(document.getElementById('baixaValor').value) || null;

    let tabela, novoStatus;
    if (tipo === 'cob')  { tabela = 'cobrancas';    novoStatus = 'pago'; }
    if (tipo === 'cont') { tabela = 'contas_pagar';  novoStatus = 'pago'; }
    if (tipo === 'desp') { tabela = 'despesas';       novoStatus = 'reembolsado'; }

    const upd = { status: novoStatus, data_pagamento: data };
    if (valor) upd.valor_pago = valor;
    if (tipo === 'desp') { delete upd.data_pagamento; upd.data = data; }

    const { error } = await db.from(tabela).update(upd).eq('id', id);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }

    document.getElementById('modalDarBaixa').classList.remove('open');
    document.getElementById('formDarBaixa').reset();
    toast('Baixa registrada!');

    // Find item and offer recibo
    let item = null;
    if (tipo === 'cob')  item = (state.cobrancas || []).find(x => x.id === id);
    if (tipo === 'cont') item = (state.contasPagar || []).find(x => x.id === id);
    if (tipo === 'desp') item = (state.despesas || []).find(x => x.id === id);
    if (item) {
      item.status = novoStatus;
      item.dataPagamento = data;
      if (valor) item.valorPago = valor;
    }

    await carregarDados();

    // Ask to generate recibo
    if (tipo !== 'cont' && confirm('Deseja gerar o recibo?')) {
      const updated = tipo === 'cob'
        ? (state.cobrancas || []).find(x => x.id === id)
        : (state.despesas || []).find(x => x.id === id);
      if (updated) gerarRecibo(updated, tipo);
    }
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Confirmar baixa';
  }
});

// ── Recibo ────────────────────────────────────────────────────────────

function gerarRecibo(item, tipo) {
  const empresa = state.meuPerfil?.empresa_nome || 'Escritório';
  const dataPgto = item.dataPagamento ? formatDate(item.dataPagamento) : formatDate(item.data) || '—';
  const valorPago = formatCurrency(item.valorPago || item.valor);
  const cliente  = item.clienteNome || '—';
  const descricao = item.descricao || '—';

  const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="UTF-8"><title>Recibo</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #222; }
  h1 { font-size: 1.4rem; border-bottom: 2px solid #222; padding-bottom: 8px; }
  .rec-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; font-size: .9rem; }
  .rec-row strong { font-weight: 600; }
  .rec-valor { font-size: 1.6rem; font-weight: 700; text-align: center; margin: 20px 0; }
  .rec-foot { margin-top: 40px; font-size: .8rem; color: #666; text-align: center; }
  @media print { body { margin: 20px; } }
</style></head>
<body>
<h1>RECIBO DE ${tipo === 'desp' ? 'REEMBOLSO' : 'PAGAMENTO'}</h1>
<div class="rec-row"><span>Empresa</span><strong>${empresa}</strong></div>
${tipo !== 'cont' ? `<div class="rec-row"><span>Cliente</span><strong>${cliente}</strong></div>` : ''}
<div class="rec-row"><span>Descrição</span><strong>${descricao}</strong></div>
<div class="rec-row"><span>Data do pagamento</span><strong>${dataPgto}</strong></div>
<div class="rec-valor">${valorPago}</div>
<p style="text-align:center;font-size:.85rem">Recibo emitido em ${new Date().toLocaleDateString('pt-BR')}</p>
<div class="rec-foot">Este documento é um comprovante de ${tipo === 'desp' ? 'reembolso' : 'pagamento'} gerado pelo Legal Hub.</div>
<script>window.print();<\/script>
</body></html>`;

  const w = window.open('', '_blank', 'width=700,height=600');
  if (w) { w.document.write(html); w.document.close(); }
}

// ── Relatórios ────────────────────────────────────────────────────────

function renderFinRelatorio() {
  const tipo     = document.getElementById('relFinTipo')?.value || 'cobrancas';
  const busca    = (document.getElementById('relFinBusca')?.value || '').toLowerCase();
  const fStatus  = document.getElementById('relFinStatus')?.value || '';
  const fCat     = document.getElementById('relFinCategoria')?.value || '';
  const fDe      = document.getElementById('relFinDe')?.value || '';
  const fAte     = document.getElementById('relFinAte')?.value || '';

  let lista = [];
  let thead = '';
  let rowFn;

  if (tipo === 'cobrancas') {
    lista = (state.cobrancas || []).filter(c => {
      const st = _statusCob(c);
      const stMap = { pago: 'pago', vencido: 'vencido', pendente: 'pendente' };
      if (fStatus) {
        const mapped = fStatus === 'pago' ? 'pago' : fStatus;
        if (st !== mapped) return false;
      }
      if (fCat && c.categoria !== fCat) return false;
      if (fDe  && (c.vencimento || '') < fDe)  return false;
      if (fAte && (c.vencimento || '') > fAte + '-31') return false;
      if (busca && !`${c.descricao} ${c.clienteNome}`.toLowerCase().includes(busca)) return false;
      return true;
    }).sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));

    thead = `<tr>
      <th style="width:26%">Descrição</th><th style="width:16%">Cliente</th>
      <th style="width:13%">Categoria</th><th style="width:10%">Vencimento</th>
      <th style="width:11%">Valor</th><th style="width:10%">Recorrência</th>
      <th style="width:8%">Status</th><th style="width:6%">Pago em</th>
    </tr>`;
    rowFn = c => {
      const st = _statusCob(c);
      return `<tr>
        <td><span class="fin-row-title">${c.descricao}</span></td>
        <td><span class="fin-row-sub" style="color:var(--fg)">${c.clienteNome || '—'}</span></td>
        <td>${_catBadge(c.categoria)}</td>
        <td class="fin-cell-date">${c.vencimento ? formatDate(c.vencimento) : '—'}</td>
        <td class="fin-cell-mono">${formatCurrency(c.valor)}</td>
        <td>${_badgeRecorrencia(c.recorrencia, c.vencimento)}</td>
        <td>${_badgeStatus(st)}</td>
        <td class="fin-cell-date">${c.dataPagamento ? formatDate(c.dataPagamento) : '—'}</td>
      </tr>`;
    };

  } else if (tipo === 'contaspagar') {
    lista = (state.contasPagar || []).filter(c => {
      const st = _statusCont(c);
      if (fStatus && st !== fStatus) return false;
      if (fCat && c.tipo !== fCat) return false;
      if (fDe  && (c.vencimento || '') < fDe)  return false;
      if (fAte && (c.vencimento || '') > fAte + '-31') return false;
      if (busca && !c.descricao.toLowerCase().includes(busca)) return false;
      return true;
    }).sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));

    thead = `<tr>
      <th style="width:34%">Descrição</th><th style="width:16%">Tipo</th>
      <th style="width:12%">Vencimento</th><th style="width:12%">Valor</th>
      <th style="width:11%">Recorrência</th><th style="width:9%">Status</th>
      <th style="width:6%">Pago em</th>
    </tr>`;
    rowFn = c => {
      const st = _statusCont(c);
      return `<tr>
        <td><span class="fin-row-title">${c.descricao}</span></td>
        <td>${c.tipo || '—'}</td>
        <td class="fin-cell-date">${c.vencimento ? formatDate(c.vencimento) : '—'}</td>
        <td class="fin-cell-mono">${formatCurrency(c.valor)}</td>
        <td>${_badgeRecorrencia(c.recorrencia, c.vencimento)}</td>
        <td>${_badgeStatus(st)}</td>
        <td class="fin-cell-date">${c.dataPagamento ? formatDate(c.dataPagamento) : '—'}</td>
      </tr>`;
    };

  } else {
    lista = (state.despesas || []).filter(d => {
      if (fStatus) {
        const stNorm = fStatus === 'pago' ? 'reembolsado' : fStatus;
        if (d.status !== stNorm) return false;
      }
      if (fCat && d.categoria !== fCat) return false;
      if (fDe  && (d.data || '') < fDe)  return false;
      if (fAte && (d.data || '') > fAte + '-31') return false;
      if (busca && !`${d.descricao} ${d.clienteNome}`.toLowerCase().includes(busca)) return false;
      return true;
    }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    thead = `<tr>
      <th style="width:30%">Descrição</th><th style="width:18%">Cliente</th>
      <th style="width:14%">Categoria</th><th style="width:10%">Data</th>
      <th style="width:12%">Valor</th><th style="width:10%">Status</th>
    </tr>`;
    rowFn = d => `<tr>
      <td><span class="fin-row-title">${d.descricao}</span></td>
      <td><span class="fin-row-sub" style="color:var(--fg)">${d.clienteNome || '—'}</span></td>
      <td>${d.categoria || '—'}</td>
      <td class="fin-cell-date">${d.data ? formatDate(d.data) : '—'}</td>
      <td class="fin-cell-mono">${formatCurrency(d.valor)}</td>
      <td>${_badgeStatus(d.status)}</td>
    </tr>`;
  }

  // Totalizadores
  const total    = lista.reduce((s, r) => s + (r.valor || 0), 0);
  const pagos    = lista.filter(r => r.status === 'pago' || r.status === 'reembolsado');
  const pendentes = lista.filter(r => r.status !== 'pago' && r.status !== 'reembolsado');
  const totEl = document.getElementById('relFinTotais');
  if (totEl) {
    totEl.innerHTML = `
      <div class="fin-bar-block fin-bar-block--pend" style="flex:none;min-width:200px">
        <span class="fin-bar-label">TOTAL</span>
        <span class="fin-bar-value">${formatCurrency(total)}</span>
        <span class="fin-bar-count">${lista.length} registro${lista.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="fin-bar-block fin-bar-block--pago" style="flex:none;min-width:200px">
        <span class="fin-bar-label">PAGO / RECEBIDO</span>
        <span class="fin-bar-value fin-bar-value--green">${formatCurrency(pagos.reduce((s,r) => s + (r.valorPago || r.valor || 0), 0))}</span>
        <span class="fin-bar-count">${pagos.length} baixa${pagos.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="fin-bar-block" style="flex:none;min-width:200px;border-left:3px solid var(--mu)">
        <span class="fin-bar-label">PENDENTE</span>
        <span class="fin-bar-value" style="color:var(--mu)">${formatCurrency(pendentes.reduce((s,r) => s + (r.valor || 0), 0))}</span>
        <span class="fin-bar-count">${pendentes.length} pendente${pendentes.length !== 1 ? 's' : ''}</span>
      </div>`;
  }

  _setText('relFinCount', `${lista.length} registro${lista.length !== 1 ? 's' : ''}`);
  _setText('relFinTotal', formatCurrency(total));

  document.getElementById('relFinThead').innerHTML = thead;
  const tbody = document.getElementById('relFinBody');
  tbody.innerHTML = lista.length
    ? lista.map(rowFn).join('')
    : `<tr><td colspan="8" class="tbl-empty">Nenhum registro encontrado para os filtros selecionados.</td></tr>`;
}

function relFinExportarCSV() {
  const tipo  = document.getElementById('relFinTipo')?.value || 'cobrancas';
  const tbody = document.getElementById('relFinBody');
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll('tr:not(.tbl-empty)'));
  if (!rows.length) { toast('Nenhum dado para exportar.', 'error'); return; }

  const headers = Array.from(document.getElementById('relFinThead').querySelectorAll('th'))
    .map(th => `"${th.textContent.trim()}"`).join(';');

  const lines = rows.map(tr =>
    Array.from(tr.querySelectorAll('td')).map(td => {
      const txt = td.textContent.trim().replace(/\s+/g, ' ').replace(/"/g, '""');
      return `"${txt}"`;
    }).join(';')
  );

  const csv = [headers, ...lines].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `relatorio-${tipo}-${new Date().toISOString().slice(0,10)}.csv`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('CSV exportado!');
}

// ── Subtabs event listener ────────────────────────────────────────────

document.querySelectorAll('[data-fin-tab]').forEach(btn => {
  btn.addEventListener('click', () => finMudarAba(btn.dataset.finTab));
});

// ── Filter listeners ──────────────────────────────────────────────────

['buscaCob','filtroFinCobStatus','filtroFinCobCat','filtroFinCobMes'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', renderFinCobrancas);
  document.getElementById(id)?.addEventListener('change', renderFinCobrancas);
});
['buscaCont','filtroFinContStatus','filtroFinContTipo','filtroFinContMes'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', renderFinContasPagar);
  document.getElementById(id)?.addEventListener('change', renderFinContasPagar);
});
['buscaDesp','filtroFinDespStatus'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', renderFinDespesas);
  document.getElementById(id)?.addEventListener('change', renderFinDespesas);
});
['relFinTipo','relFinBusca','relFinStatus','relFinCategoria','relFinDe','relFinAte'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', renderFinRelatorio);
  document.getElementById(id)?.addEventListener('change', renderFinRelatorio);
});
