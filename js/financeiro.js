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

function _badgeRecorrencia(rec) {
  if (!rec || rec === 'nenhuma') return '—';
  const map = { semanal:'Semanal', quinzenal:'Quinzenal', mensal:'Mensal',
    bimestral:'Bimestral', trimestral:'Trimestral', semestral:'Semestral', anual:'Anual' };
  return `<span class="badge-recorr">${map[rec] || rec}</span>`;
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

  const mesLabel = fMes || new Date().toISOString().slice(0, 7);
  _setText('finCobMesLabel',     _formatMes(mesLabel));
  _setText('finCobMesLabelPago', _formatMes(mesLabel));

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
    const pInfo = c.parcelaNum ? `<small style="color:var(--mu)"> (${c.parcelaNum}/${c.parcelaTotal})</small>` : '';
    return `<tr>
      <td>${c.descricao}${pInfo}</td>
      <td style="font-size:.78rem;text-transform:uppercase">${c.clienteNome || '—'}</td>
      <td>${c.categoria || '—'}</td>
      <td style="white-space:nowrap">${c.vencimento ? formatDate(c.vencimento) : '—'}</td>
      <td style="font-family:'IBM Plex Mono',monospace;font-weight:600">${formatCurrency(c.valor)}</td>
      <td>${_badgeRecorrencia(c.recorrencia)}</td>
      <td>${_badgeStatus(st)}</td>
      <td style="white-space:nowrap">
        ${st !== 'pago' ? `<button class="btn-link-sm" onclick="abrirDarBaixa('${c.id}','cob')">Baixa</button>` : `<button class="btn-link-sm" onclick="gerarRecibo(${JSON.stringify(c).replace(/"/g,'&quot;')},'cob')">Recibo</button>`}
        <button class="btn-link-sm" onclick="abrirModalCobranca('${c.id}')" style="margin-left:4px">Editar</button>
        <button class="btn-link-sm" style="color:var(--red);margin-left:4px" onclick="excluirCobranca('${c.id}')">Excluir</button>
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

  const mesLabel = fMes || new Date().toISOString().slice(0, 7);
  _setText('finContMesLabel',     _formatMes(mesLabel));
  _setText('finContMesLabelPago', _formatMes(mesLabel));

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
      <td>${c.descricao}</td>
      <td>${c.tipo || '—'}</td>
      <td style="white-space:nowrap">${c.vencimento ? formatDate(c.vencimento) : '—'}</td>
      <td style="font-family:'IBM Plex Mono',monospace;font-weight:600">${formatCurrency(c.valor)}</td>
      <td>${_badgeRecorrencia(c.recorrencia)}</td>
      <td>${_badgeStatus(st)}</td>
      <td style="white-space:nowrap">
        ${st !== 'pago' ? `<button class="btn-link-sm" onclick="abrirDarBaixa('${c.id}','cont')">Baixa</button>` : `<button class="btn-link-sm" onclick="gerarRecibo(${JSON.stringify(c).replace(/"/g,'&quot;')},'cont')">Recibo</button>`}
        <button class="btn-link-sm" onclick="abrirModalContaPagar('${c.id}')" style="margin-left:4px">Editar</button>
        <button class="btn-link-sm" style="color:var(--red);margin-left:4px" onclick="excluirContaPagar('${c.id}')">Excluir</button>
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
    tbody.innerHTML = `<tr><td colspan="7" class="tbl-empty">Nenhuma despesa encontrada.</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(d => `<tr>
    <td>${d.descricao}</td>
    <td style="font-size:.78rem;text-transform:uppercase">${d.clienteNome || '—'}</td>
    <td>${d.categoria || '—'}</td>
    <td style="white-space:nowrap">${d.data ? formatDate(d.data) : '—'}</td>
    <td style="font-family:'IBM Plex Mono',monospace;font-weight:600">${formatCurrency(d.valor)}</td>
    <td>${_badgeStatus(d.status)}</td>
    <td style="white-space:nowrap">
      ${d.status !== 'reembolsado' ? `<button class="btn-link-sm" onclick="abrirDarBaixa('${d.id}','desp')">Reembolsar</button>` : `<button class="btn-link-sm" onclick="gerarRecibo(${JSON.stringify(d).replace(/"/g,'&quot;')},'desp')">Recibo</button>`}
      <button class="btn-link-sm" onclick="abrirModalDespesa('${d.id}')" style="margin-left:4px">Editar</button>
      <button class="btn-link-sm" style="color:var(--red);margin-left:4px" onclick="excluirDespesa('${d.id}')">Excluir</button>
    </td>
  </tr>`).join('');

  // Populate clientes datalist
  const dl = document.getElementById('despClientesList');
  if (dl) dl.innerHTML = (state.clientes || []).map(c => `<option value="${c.nome}">`).join('');
}

// ── Helpers ───────────────────────────────────────────────────────────

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
