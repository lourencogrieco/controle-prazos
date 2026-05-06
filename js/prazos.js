// ──────────────────────────────────────────────────────────────────────
// CRUD — PRAZOS (formulário rápido do Painel + modal completo)
// ──────────────────────────────────────────────────────────────────────
document.getElementById('prazoForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!state.empresaId) { toast('Faça login primeiro', 'error'); return; }
  const processoOuPasta = document.getElementById('processo').value.trim();
  const pastaVinculada = encontrarPastaParaPrazo(processoOuPasta);
  const obj = {
    id:          uid(),
    empresa_id:  state.empresaId,
    pasta_id:    pastaVinculada?.id || null,
    cliente:     document.getElementById('cliente').value.trim() || pastaVinculada?.cliente || null,
    tipo:        document.getElementById('tipo').value,
    prazo:       document.getElementById('dataFatal').value,
    responsavel: document.getElementById('responsavel').value,
    descricao:   document.getElementById('descricao').value.trim() || null,
    status:      document.getElementById('status').value === 'Concluído' ? 'concluido' : 'pendente',
  };
  const { error } = await db.from('prazos_lhub').insert(obj);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  const novo = dbParaPrazo(obj); _enrichPrazo(novo);
  _stateUpsert(state.prazos, novo);
  logAuditoria('criar', 'prazos_lhub', obj.id, `Prazo criado: ${obj.tipo} — ${obj.cliente || '—'}`);
  e.target.reset();
  toast('Prazo cadastrado');
  atualizarViewsPrazoAposMudanca();
});

function encontrarPastaParaPrazo(valor) {
  const raw = String(valor || '').trim();
  if (!raw) return null;
  const norm = raw.replace(/\D/g, '');
  return state.pastas.find(p =>
    p.id === raw ||
    p.numero === raw ||
    (p.processo && p.processo.replace(/\D/g, '') === norm)
  ) || null;
}

function atualizarViewsPrazoAposMudanca() {
  renderPrazosAba();
  renderAtividades();
  renderDashboard();
  renderNavBadges();
  if (typeof renderPrazosNaPasta === 'function') renderPrazosNaPasta();
  if (typeof renderSolicitacoesNaPasta === 'function') renderSolicitacoesNaPasta();
}

// Preenche datalist de responsáveis filtrando pelo area_id da pasta
function popularResponsaveisDatalist(areaId) {
  const dl = document.getElementById('prazoResponsavelList');
  if (!dl) return;
  const lista = areaId
    ? state.usuarios.filter(u => u.area_id === areaId || !u.area_id)
    : state.usuarios;
  dl.innerHTML = lista.map(u => `<option value="${escAttr(u.nome)}"></option>`).join('');
}

// Modal completo de prazo
function abrirModalNovoPrazo(id) {
  const p = id ? state.prazos.find(x => x.id === id) : null;
  document.querySelector('#modalNovoPrazo .modal-head h3').textContent = p ? 'Editar Prazo' : 'Novo Prazo';
  popularSelectsPastas({ prazoPastaSelect: p?.pastaId || '' });
  document.getElementById('prazoId').value           = p?.id || '';
  document.getElementById('prazoIntimacaoId').value  = p?.intimacaoId || '';
  document.getElementById('prazoPastaSelect').value  = p?.pastaId || '';
  document.getElementById('prazoCliente').value      = p?.cliente || '';
  document.getElementById('prazoTipo').value         = p?.tipoPrazo || '';
  document.getElementById('prazoFatal').value        = p?.prazoFatal || '';
  document.getElementById('prazoDiasUteis').value    = p?.prazoDiasUteis && [5, 10, 15].includes(Number(p.prazoDiasUteis))
    ? String(p.prazoDiasUteis)
    : '';
  document.getElementById('prazoStatus').value       = p?.status === 'Concluído' ? 'concluido'
    : p?.status === 'Em andamento' ? 'em_andamento' : 'pendente';
  document.getElementById('prazoDescricao').value    = p?.descricao || '';
  const fatalEl = document.getElementById('prazoFatal');
  limparPrazoCalculoDataset(fatalEl);
  if (p?.prazoCalculado) {
    fatalEl.dataset.dataBase = p.prazoDataBase || '';
    fatalEl.dataset.calculado = '1';
    fatalEl.dataset.diasUteis = String(p.prazoDiasUteis || '');
    fatalEl.dataset.regra = p.prazoRegra || '';
    fatalEl.dataset.metadados = JSON.stringify(p.prazoMetadados || {});
    fatalEl.dataset.sugerida = p.prazoFatal || '';
  }
  renderPrazoCalculoInfo(p);
  popularRespPicker('prazoRespPicker', p?.responsavel || '', state.usuarios);

  // Controle de permissão para data fatal
  const podData = podeAlterarDataPrazo();
  const podeAlterarCamposPrazo = podData || !p;
  document.getElementById('prazoFatal').disabled = !podeAlterarCamposPrazo;
  document.getElementById('prazoTipo').disabled  = !podeAlterarCamposPrazo;
  document.getElementById('prazoDiasUteis').disabled = !podeAlterarCamposPrazo;
  document.getElementById('prazoAvisoPermissao').style.display = (!podeAlterarCamposPrazo && p) ? '' : 'none';

  document.getElementById('modalNovoPrazo').classList.add('open');
}

function fecharModalNovoPrazo() {
  document.getElementById('modalNovoPrazo').classList.remove('open');
  document.getElementById('novoPrazoForm').reset();
  renderPrazoCalculoInfo(null);
}

document.getElementById('btnNovoPrazo').addEventListener('click', () => abrirModalNovoPrazo(null));
document.getElementById('fecharNovoPrazo').addEventListener('click', fecharModalNovoPrazo);
document.getElementById('btnCancelarPrazo').addEventListener('click', fecharModalNovoPrazo);
document.getElementById('modalNovoPrazo').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModalNovoPrazo();
});

document.getElementById('prazoPastaSelect').addEventListener('change', e => {
  const pastaId = e.target.value;
  const pasta   = state.pastas.find(p => p.id === pastaId);
  if (pasta) {
    document.getElementById('prazoCliente').value = pasta.cliente;
  }
});

function limparPrazoCalculoDataset(el) {
  if (!el) return;
  el.dataset.dataBase = '';
  el.dataset.calculado = '';
  el.dataset.diasUteis = '';
  el.dataset.regra = '';
  el.dataset.metadados = '';
  el.dataset.sugerida = '';
}

function renderPrazoCalculoInfo(prazoOuSugestao) {
  const el = document.getElementById('prazoCalculoInfo');
  if (!el) return;
  const calculado = prazoOuSugestao?.prazoCalculado || prazoOuSugestao?.calculado;
  const regra = prazoOuSugestao?.prazoRegra || prazoOuSugestao?.regra || '';
  const dataBase = prazoOuSugestao?.prazoDataBase || prazoOuSugestao?.dataBase || '';
  const dataFatalJuridica = prazoOuSugestao?.dataFatalJuridica || prazoOuSugestao?.prazoMetadados?.dataFatalJuridica || '';
  if (!calculado && !regra) {
    el.classList.add('hidden');
    el.innerHTML = '';
    return;
  }
  el.classList.remove('hidden');
  el.innerHTML = `
    <strong>Prazo interno calculado automaticamente</strong>
    <span>${escHtml(`${regra || 'Regra não informada'}${dataBase ? ` · data-base ${formatDate(dataBase)}` : ''}${dataFatalJuridica ? ` · fatal jurídico ${formatDate(dataFatalJuridica)}` : ''}`)}</span>
  `;
}

function prazoCalculoBadge(p) {
  if (!p?.prazoCalculado) return '<span class="calc-badge calc-badge--manual">Manual</span>';
  const title = [
    p.prazoRegra || 'Prazo calculado',
    p.prazoDataBase ? `Data-base: ${formatDate(p.prazoDataBase)}` : '',
    p.prazoMetadados?.dataFatalJuridica ? `Fatal jurídico: ${formatDate(p.prazoMetadados.dataFatalJuridica)}` : '',
  ].filter(Boolean).join(' · ');
  return `<span class="calc-badge" title="${escAttr(title)}">Auto</span>`;
}

function aplicarControleInternoPrazo(sugestao) {
  if (!sugestao?.dataFatal) return sugestao;
  const dataFatalJuridica = sugestao.dataFatal;
  const prazoInterno = window.PrazoJuridico?.diaUtilAnterior(dataFatalJuridica) || dataFatalJuridica;
  return {
    ...sugestao,
    dataFatal: prazoInterno,
    dataFatalJuridica,
    prazoInterno: true,
    antecipacaoDiasUteis: 1,
    regra: `${sugestao.regra || 'Prazo calculado'} - controle interno D-1`,
  };
}

async function calcularPrazoAuditavel(tipo, dataBase, diasUteisManual = null) {
  if (!tipo || !dataBase) return null;
  const diasUteis = Number(diasUteisManual) || null;
  try {
    if (typeof db !== 'undefined' && db?.rpc) {
      const params = {
        p_tipo: tipo,
        p_data_base: dataBase,
      };
      if (diasUteis) params.p_dias_uteis = diasUteis;
      const { data, error } = await db.rpc('calcular_prazo_juridico', params);
      if (!error && data) return aplicarControleInternoPrazo(data);
      if (error) console.warn('[prazo] fallback cálculo local:', error.message);
    }
  } catch (err) {
    console.warn('[prazo] fallback cálculo local:', err.message);
  }

  const local = diasUteis
    ? (() => {
        const dataFatal = window.PrazoJuridico?.calcularPrazo(dataBase, diasUteis);
        return dataFatal ? { dataFatal, diasUteis, regra: `${diasUteis} dias úteis` } : null;
      })()
    : window.PrazoJuridico?.sugerirPrazo({ tipo, dataBase });
  return aplicarControleInternoPrazo(local ? {
    dataFatal: local.dataFatal,
    dataBase,
    diasUteis: local.diasUteis,
    regra: local.regra,
    metodo: 'frontend_fallback',
    excluiDiaBase: true,
  } : null);
}

async function preencherPrazoSugerido() {
  const tipoEl  = document.getElementById('prazoTipo');
  const fatalEl = document.getElementById('prazoFatal');
  const descEl  = document.getElementById('prazoDescricao');
  const diasEl  = document.getElementById('prazoDiasUteis');
  const dataBase = fatalEl?.dataset?.dataBase || '';
  const sugestao = await calcularPrazoAuditavel(tipoEl?.value, dataBase, diasEl?.value || null);
  if (!sugestao) return;

  fatalEl.value = sugestao.dataFatal;
  fatalEl.dataset.calculado = '1';
  fatalEl.dataset.sugerida = sugestao.dataFatal;
  fatalEl.dataset.diasUteis = String(sugestao.diasUteis || '');
  fatalEl.dataset.regra = sugestao.regra || '';
  fatalEl.dataset.metadados = JSON.stringify(sugestao);
  renderPrazoCalculoInfo({ ...sugestao, calculado: true });
  const nota = `Prazo interno sugerido automaticamente: ${sugestao.regra} a partir da publicação/intimação${sugestao.dataFatalJuridica ? `; fatal jurídico em ${formatDate(sugestao.dataFatalJuridica)}` : ''}.`;
  if (descEl) {
    const descricaoSemNotaAntiga = descEl.value
      .split('\n')
      .filter(l => !/^(Prazo sugerido automaticamente|Prazo interno sugerido automaticamente):/.test(l.trim()))
      .join('\n')
      .trim();
    descEl.value = [descricaoSemNotaAntiga, nota].filter(Boolean).join('\n');
  }
}

document.getElementById('prazoTipo').addEventListener('change', () => { preencherPrazoSugerido(); });
document.getElementById('prazoDiasUteis')?.addEventListener('change', () => { preencherPrazoSugerido(); });
document.getElementById('prazoFatal').addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.sugerida && el.value !== el.dataset.sugerida) {
    el.dataset.calculado = '';
    renderPrazoCalculoInfo(null);
  }
});

document.getElementById('novoPrazoForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarPrazo');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    if (!state.empresaId) { toast('Sessão não iniciada. Recarregue a página.', 'error'); return; }
    const prazoId = document.getElementById('prazoId').value;
    const podData = podeAlterarDataPrazo();

    // Se está editando e não tem permissão, usa os valores originais do state
    const prazoOriginal = prazoId ? state.prazos.find(x => x.id === prazoId) : null;
    const tipo = podData
      ? document.getElementById('prazoTipo').value
      : (prazoOriginal?.tipoPrazo || document.getElementById('prazoTipo').value);
    const prazo = podData
      ? document.getElementById('prazoFatal').value
      : (prazoOriginal?.prazoFatal || document.getElementById('prazoFatal').value);

    if (!tipo)  { toast('Selecione o tipo de prazo.', 'error'); return; }
    if (!prazo) { toast('Informe a data fatal.', 'error'); return; }
    const fatalEl = document.getElementById('prazoFatal');
    const prazoCalculado = fatalEl.dataset.calculado === '1';

    const obj = {
      id:           prazoId || uid(),
      empresa_id:   state.empresaId,
      pasta_id:     document.getElementById('prazoPastaSelect').value || null,
      cliente:      document.getElementById('prazoCliente').value.trim() || null,
      tipo,
      prazo,
      responsavel:  getSelectedResps('prazoRespPicker') || null,
      status:       document.getElementById('prazoStatus').value || 'pendente',
      descricao:    document.getElementById('prazoDescricao').value.trim() || null,
      intimacao_id: document.getElementById('prazoIntimacaoId')?.value || null,
      prazo_data_base: prazoCalculado ? (fatalEl.dataset.dataBase || null) : null,
      prazo_dias_uteis: prazoCalculado ? (Number(fatalEl.dataset.diasUteis) || null) : null,
      prazo_regra: prazoCalculado ? (fatalEl.dataset.regra || null) : null,
      prazo_calculado: prazoCalculado,
      prazo_metadados: prazoCalculado && fatalEl.dataset.metadados
        ? JSON.parse(fatalEl.dataset.metadados)
        : {},
    };

    const salvarPrazo = row => prazoId
      ? db.from('prazos_lhub').update(row).eq('id', prazoId).eq('empresa_id', state.empresaId)
      : db.from('prazos_lhub').insert(row);
    let saveReq = salvarPrazo(obj);
    const tOut     = new Promise((_, r) => setTimeout(() => r(new Error('Sem resposta do banco em 12s. Verifique as políticas RLS.')), 12000));
    let { error } = await Promise.race([saveReq, tOut]);
    if (error && /intimacao_id|prazo_data_base|prazo_dias_uteis|prazo_regra|prazo_calculado|prazo_metadados|invalid input syntax for type uuid/i.test(error.message || '')) {
      const legacyObj = { ...obj };
      delete legacyObj.intimacao_id;
      delete legacyObj.prazo_data_base;
      delete legacyObj.prazo_dias_uteis;
      delete legacyObj.prazo_regra;
      delete legacyObj.prazo_calculado;
      delete legacyObj.prazo_metadados;
      saveReq = salvarPrazo(legacyObj);
      ({ error } = await Promise.race([saveReq, tOut]));
    }
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    const novo = dbParaPrazo(obj); _enrichPrazo(novo);
    _stateUpsert(state.prazos, novo);
    if (obj.intimacao_id) {
      const { error: intErro } = await db.from('intimacoes_pje')
        .update({ status_lhub: 'prazo_agendado', lida: true })
        .eq('id', obj.intimacao_id)
        .eq('empresa_id', state.empresaId);
      if (intErro) {
        toast('Prazo salvo, mas não foi possível atualizar a intimação: ' + intErro.message, 'error');
      } else {
        const intim = state.intimacoes.find(i => i.id === obj.intimacao_id);
        if (intim) intim.status = 'prazo_agendado';
        if (typeof renderIntimacoesAba === 'function') renderIntimacoesAba();
      }
    }
    logAuditoria(prazoId ? 'editar' : 'criar', 'prazos_lhub', obj.id, `Prazo ${prazoId ? 'editado' : 'criado'}: ${obj.tipo} — ${obj.cliente || '—'}`);
    fecharModalNovoPrazo();
    toast('Prazo salvo!');
    atualizarViewsPrazoAposMudanca();
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
    console.error('[prazo] exception:', err);
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar Prazo';
  }
});

async function excluirPrazo(id) {
  if (!confirm('Confirmar exclusão deste prazo?')) return;
  const p = state.prazos.find(x => x.id === id);
  const { error } = await db.from('prazos_lhub').delete().eq('id', id).eq('empresa_id', state.empresaId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  logAuditoria('excluir', 'prazos_lhub', id, `Prazo excluído: ${p?.tipoPrazo || '—'} — ${p?.cliente || '—'}`);
  _stateRemove(state.prazos, id);
  toast('Prazo excluído');
  atualizarViewsPrazoAposMudanca();
}

// ──────────────────────────────────────────────────────────────────────
// RENDER PRAZOS ABA — lê state.prazos
// ──────────────────────────────────────────────────────────────────────
function diasRestantesHtml(iso) {
  const diff = daysUntil(iso);
  if (diff < 0)   return `<span class="dias-vencido">Vencido (${Math.abs(diff)}d)</span>`;
  if (diff === 0) return `<span class="dias-urgente">Hoje!</span>`;
  if (diff <= 3)  return `<span class="dias-urgente">${diff}d</span>`;
  if (diff <= 10) return `<span class="dias-aviso">${diff}d</span>`;
  return `<span class="dias-ok">${diff}d</span>`;
}

function rowClassPrazo(iso) {
  const d = daysUntil(iso);
  if (d < 0)  return 'row-vencido';
  if (d <= 3) return 'row-urgente';
  return '';
}

// ── Estado de paginação ───────────────────────────────────────────────
let prazoPagAtual = 1;
let prazoLinhas   = 10;
let _prazoListSeq = 0;

function prazoStatusParaDb(status) {
  return {
    'Pendente': 'pendente',
    'Em andamento': 'em_andamento',
    'Concluído': 'concluido',
    'Cancelado': 'cancelado',
    'Atrasado': 'atrasado',
  }[status] || status;
}

function _prazosPaginacaoAtualizar(total) {
  const pages  = Math.max(1, Math.ceil(total / prazoLinhas));
  prazoPagAtual = Math.min(prazoPagAtual, pages);

  const inicio = (prazoPagAtual - 1) * prazoLinhas + 1;
  const fim    = Math.min(prazoPagAtual * prazoLinhas, total);
  document.getElementById('prazosInfo').textContent =
    total ? `Exibindo ${inicio}–${fim} de ${total}` : '0 registros';

  const pgSel = document.getElementById('prazosPagina');
  if (pgSel) {
    pgSel.innerHTML = Array.from({ length: pages }, (_, i) =>
      `<option value="${i + 1}" ${i + 1 === prazoPagAtual ? 'selected' : ''}>${i + 1}</option>`
    ).join('');
  }
  const totalEl = document.getElementById('prazosTotalPaginas');
  if (totalEl) totalEl.textContent = `de ${pages}`;

  const btnAnt = document.getElementById('prazosPgAnterior');
  const btnPrx = document.getElementById('prazosPgProxima');
  if (btnAnt) btnAnt.disabled = prazoPagAtual <= 1;
  if (btnPrx) btnPrx.disabled = prazoPagAtual >= pages;
}

async function carregarPrazosPagina() {
  const busca = postgrestIlikeTerm(document.getElementById('buscaPrazosAba')?.value ?? '');
  const st    = document.getElementById('filtroPrazosStatus')?.value ?? '';
  const resp  = document.getElementById('filtroPrazosResponsavel')?.value ?? '';
  const inicio = (prazoPagAtual - 1) * prazoLinhas;

  let query = db.from('prazos_lhub')
    .select('*, pastas(numero, numero_processo, comarca)', { count: 'exact' })
    .eq('empresa_id', state.empresaId)
    .order('prazo', { ascending: true });

  if (st) query = query.eq('status', prazoStatusParaDb(st));
  if (resp) query = query.ilike('responsavel', `%${postgrestIlikeTerm(resp)}%`);
  const mapRow = row => {
    const p = dbParaPrazo(row);
    if (row.pastas) {
      p.pastaNr = row.pastas.numero || '';
      p.processo = row.pastas.numero_processo || '';
      p.comarca = row.pastas.comarca || '';
    } else {
      _enrichPrazo(p);
    }
    _stateUpsert(state.prazos, p);
    return p;
  };

  if (busca) {
    const { data, error } = await query.limit(1000);
    if (error) throw error;
    const termo = busca.toLowerCase();
    const filtrada = (data || []).map(mapRow).filter(p =>
      (p.cliente || '').toLowerCase().includes(termo) ||
      (p.tipoPrazo || '').toLowerCase().includes(termo) ||
      (p.descricao || '').toLowerCase().includes(termo) ||
      (p.responsavel || '').toLowerCase().includes(termo) ||
      (p.pastaNr || '').toLowerCase().includes(termo) ||
      (p.processo || '').toLowerCase().includes(termo) ||
      (p.comarca || '').toLowerCase().includes(termo)
    );
    return { lista: filtrada.slice(inicio, inicio + prazoLinhas), total: filtrada.length };
  }

  const { data, count, error } = await query.range(inicio, inicio + prazoLinhas - 1);
  if (error) throw error;
  const lista = (data || []).map(mapRow);
  return { lista, total: count ?? lista.length };
}

async function renderPrazosAba() {
  const seq = ++_prazoListSeq;
  const tbody = document.getElementById('tabelaPrazosAba');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="13" class="tbl-empty">Carregando prazos…</td></tr>`;

  let lista = [];
  let total = 0;
  try {
    ({ lista, total } = await carregarPrazosPagina());
  } catch (err) {
    if (seq !== _prazoListSeq) return;
    tbody.innerHTML = `<tr><td colspan="13" class="tbl-empty">Erro ao carregar prazos: ${escHtml(err.message)}</td></tr>`;
    return;
  }
  if (seq !== _prazoListSeq) return;

  const pages = Math.max(1, Math.ceil(total / prazoLinhas));
  if (prazoPagAtual > pages) {
    prazoPagAtual = pages;
    renderPrazosAba();
    return;
  }
  _prazosPaginacaoAtualizar(total);

  tbody.innerHTML = lista.length
    ? lista.map(p => {
        // 1. link direto por ID
      let intimData = p.intimacaoId
        ? (state.intimacoes.find(i => i.id === p.intimacaoId)?.dataPublicacao || null)
        : null;
      // 2. fallback: extrai data do padrão "(DD/MM/YYYY)" no final da descrição
      if (!intimData && p.descricao) {
        const dm = p.descricao.match(/\((\d{2}\/\d{2}\/\d{4})\)\s*$/);
        if (dm) {
          const [dd, mm, yyyy] = dm[1].split('/');
          intimData = yyyy + '-' + mm + '-' + dd;
        }
      }
        const id = escAttr(p.id);
        const pastaNr = escAttr(p.pastaNr || '');
        const pastaLink = p.pastaNr
          ? `<a href="#" class="table-link" onclick="event.preventDefault();navegarPara('pastas');setTimeout(()=>abrirPasta('${pastaNr}'),100)">${escHtml(p.pastaNr)}</a>`
          : '—';
        const acoes = podeEditarRegistro() ? `
          <div class="row-actions">
            ${podeEditarRegistro() ? `<button class="btn-icon" title="Editar" onclick="event.stopPropagation();abrirModalNovoPrazo('${id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg></button>` : ''}
            ${podeExcluirRegistro() ? `<button class="btn-icon btn-icon--danger" title="Excluir" onclick="event.stopPropagation();excluirPrazo('${id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
              </svg></button>` : ''}
          </div>` : '';
        return `<tr class="${rowClassPrazo(p.prazoFatal)}" data-prazo-id="${id}">
          <td>${pastaLink}</td>
          <td>${escHtml(p.cliente || '—')}</td>
          <td style="font-family:'IBM Plex Mono',monospace;font-size:.72rem">${escHtml(p.processo || '—')}</td>
          <td>${escHtml(p.comarca || '—')}</td>
          <td>${escHtml(p.tipoPrazo || '—')}</td>
          <td>${formatDate(p.prazoFatal)}</td>
          <td>${prazoCalculoBadge(p)}</td>
          <td>${diasRestantesHtml(p.prazoFatal)}</td>
          <td style="max-width:200px;font-size:.76rem">${escHtml(p.descricao || '—')}</td>
          <td>${intimData ? formatDate(intimData) : '—'}</td>
          <td>${avatarGroup(p.responsavel)}</td>
          <td><span class="status-pill ${statusClass(p.status)}">${escHtml(p.status)}</span></td>
          <td>${acoes}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="13" class="tbl-empty">Nenhum prazo cadastrado.</td></tr>`;
}

function irParaIntimacao(id) {
  document.querySelectorAll('.subtab').forEach(b => b.classList.remove('is-active'));
  document.querySelectorAll('.subtab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector('.subtab[data-subtab="intimacoes"]').classList.add('is-active');
  document.getElementById('subtab-intimacoes').classList.remove('hidden');
  document.getElementById('buscaIntimacoes').value = id;
  renderIntimacoesAba();
}

function exportarPrazosCSV() {
  const busca = (document.getElementById('buscaPrazosAba')?.value ?? '').toLowerCase();
  const st    = document.getElementById('filtroPrazosStatus')?.value ?? '';
  const resp  = document.getElementById('filtroPrazosResponsavel')?.value ?? '';
  const lista = state.prazos.filter(p => {
    const m = !busca ||
      (p.pastaNr || '').toLowerCase().includes(busca) ||
      (p.processo || '').toLowerCase().includes(busca) ||
      (p.cliente  || '').toLowerCase().includes(busca);
    const respMatch = !resp || (p.responsavel || '').split(';').map(n => n.trim()).includes(resp);
    return m && (!st || p.status === st) && respMatch;
  });
  const hoje = new Date().toISOString().slice(0, 10);
  exportarCSV(lista.map(p => ({
    pasta:       p.pastaNr || '—',
    cliente:     p.cliente,
    processo:    p.processo || '—',
    comarca:     p.comarca  || '—',
    tipo:        p.tipoPrazo,
    prazo_fatal: p.prazoFatal ? formatDate(p.prazoFatal) : '—',
    dias:        p.prazoFatal ? daysUntil(p.prazoFatal) : '—',
    status:      p.status,
    responsavel: (p.responsavel || '').replace(/;/g, ', '),
    descricao:   p.descricao,
  })), [
    { label: 'N° Pasta',       key: 'pasta' },
    { label: 'Cliente',        key: 'cliente' },
    { label: 'N° Processo',    key: 'processo' },
    { label: 'Comarca',        key: 'comarca' },
    { label: 'Tipo de Prazo',  key: 'tipo' },
    { label: 'Prazo Fatal',    key: 'prazo_fatal' },
    { label: 'Dias Restantes', key: 'dias' },
    { label: 'Status',         key: 'status' },
    { label: 'Responsável',    key: 'responsavel' },
    { label: 'Descrição',      key: 'descricao' },
  ], `prazos_${hoje}.csv`);
}

document.getElementById('btnExportarPrazos')?.addEventListener('click', exportarPrazosCSV);

document.getElementById('buscaPrazosAba')?.addEventListener('input', () => { prazoPagAtual = 1; renderPrazosAba(); });
document.getElementById('filtroPrazosStatus')?.addEventListener('change', () => { prazoPagAtual = 1; renderPrazosAba(); });
document.getElementById('filtroPrazosResponsavel')?.addEventListener('change', () => { prazoPagAtual = 1; renderPrazosAba(); });

document.getElementById('prazosLinhas')?.addEventListener('change', e => {
  prazoLinhas   = Number(e.target.value);
  prazoPagAtual = 1;
  renderPrazosAba();
});
document.getElementById('prazosPagina')?.addEventListener('change', e => {
  prazoPagAtual = Number(e.target.value);
  renderPrazosAba();
});
document.getElementById('prazosPgAnterior')?.addEventListener('click', () => {
  if (prazoPagAtual > 1) { prazoPagAtual--; renderPrazosAba(); }
});
document.getElementById('prazosPgProxima')?.addEventListener('click', () => {
  prazoPagAtual++;
  renderPrazosAba();
});
