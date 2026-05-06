// ──────────────────────────────────────────────────────────────────────
// RENDER INTIMAÇÕES ABA
// ──────────────────────────────────────────────────────────────────────

// Gera link direto para o processo no portal do tribunal
// TJSP: foro 0000 = 2º grau (cposg) | foro != 0000 = 1º grau (cpopg)
function linkProcesso(processo, tribunal) {
  if (!processo) return null;
  const digits = processo.replace(/\D/g, '');
  if (digits.length < 20) return null;
  const foroStr  = digits.slice(16);          // OOOO (4 dígitos)
  const foroNum  = parseInt(foroStr, 10);
  const trib     = (tribunal || '').toLowerCase();
  const segundo  = foroNum === 0;             // foro 0000 = 2ª instância

  if (trib.includes('tjsp')) {
    if (segundo) {
      // Extracts NNNNNNN-DD.AAAA from NNNNNNN-DD.AAAA.J.TT.OOOO
      const numDigitoAno = processo.split('.').slice(0, 2).join('.');
      return `https://esaj.tjsp.jus.br/cposg/search.do?cbPesquisa=NUMPROC` +
        `&numeroDigitoAnoUnificado=${encodeURIComponent(numDigitoAno)}` +
        `&foroNumeroUnificado=0000` +
        `&dePesquisaNuUnificado=${encodeURIComponent(processo)}` +
        `&tipoNuProcesso=UNIFICADO`;
    }
    return `https://esaj.tjsp.jus.br/cpopg/search.do?cbPesquisa=NUMPROC` +
      `&foroNumeroUnificado=${foroStr}` +
      `&dadosConsulta.valorConsultaNuUnificado=${encodeURIComponent(processo)}` +
      `&dadosConsulta.tipoNuProcesso=UNIFICADO`;
  }
  if (trib.includes('tjmg')) {
    return `https://processo.tjmg.jus.br/cpopg2/open.do?processo.numero=${encodeURIComponent(processo)}`;
  }
  if (trib.includes('tjrj')) {
    return `https://www4.tjrj.jus.br/consultaProcessoWebV2/consultaMov.do?numProcesso=${encodeURIComponent(processo)}`;
  }
  if (trib.includes('tjrs')) {
    return `https://www.tjrs.jus.br/site_php/consulta/consulta_processo.php?NUMPROC=${encodeURIComponent(processo)}`;
  }
  if (trib.includes('stj')) {
    return `https://processo.stj.jus.br/SCON/pesquisar.jsp?b=ACOR&livre=${encodeURIComponent(processo)}`;
  }
  if (trib.includes('trf')) {
    return `https://eproc.trf1.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica&num_processo=${encodeURIComponent(processo)}`;
  }
  return null;
}

// Encontra pasta vinculada: primeiro por vínculo manual, depois por CNJ.
function pastaDaIntimacao(intim) {
  if (!intim) return null;
  if (intim.pastaId) {
    const manual = state.pastas.find(p => p.id === intim.pastaId);
    if (manual) return manual;
  }
  return _pastaPorProcesso(intim.processo);
}

const INTIM_STATUS_LABEL = {
  pendente:       'Pendente',
  cumprida:       'Cumprida',
  prazo_agendado: 'Prazo agendado',
  arquivada:      'Arquivada',
};
const INTIM_STATUS_CLASS = {
  pendente:       'status-pill--warn',
  cumprida:       'status-pill--done',
  prazo_agendado: 'status-pill--info',
  arquivada:      'status-pill--muted',
};

let _intimacaoVinculoAtual = null;

function mesmoIdIntimacao(a, b) {
  return String(a ?? '') === String(b ?? '');
}

function grauProcessoIntimacao(intim) {
  if (intim?.grau) return intim.grau;
  const tribunal = String(intim?.tribunal || '').toLowerCase();
  if (tribunal.includes('stf')) return 'STF';
  if (tribunal.includes('stj')) return 'STJ';

  const digits = String(intim?.processo || intim?.numero_processo || '').replace(/\D/g, '');
  const foro = digits.length >= 20 ? digits.slice(16) : '';
  return foro === '0000' ? 'G2' : 'G1';
}

function isGrauRecursal(grau) {
  return ['G2', 'STJ', 'STF', 'SUP'].includes(String(grau || '').toUpperCase());
}

function intimacaoPorId(id) {
  return state.intimacoes.find(i => mesmoIdIntimacao(i.id, id)) || null;
}

function resumoUltimaSyncPJe() {
  const log = state.pjeSyncLogs?.[0];
  if (!log) return '';
  const quando = log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '—';
  const status = log.ok ? 'ok' : 'com erro';
  const erros = Array.isArray(log.erros) && log.erros.length ? ` · ${log.erros.length} erro(s)` : '';
  return `Última importação: ${quando} · ${status} · ${log.inseridas || 0} nova(s), ${log.atualizadas || 0} atualizada(s), ${log.ignoradas_arquivadas || 0} preservada(s)${erros}`;
}

function pjeOrigemLabel(origem) {
  return {
    manual_hoje: 'Manual: hoje',
    manual_data: 'Manual: por data',
    cron: 'Cron automático',
    edge_function: 'Edge Function',
  }[origem] || origem || '—';
}

function pjePeriodoLabel(log) {
  const ini = log.data_inicio ? formatDate(log.data_inicio) : '';
  const fim = log.data_fim ? formatDate(log.data_fim) : '';
  if (ini && fim && ini !== fim) return `${ini} a ${fim}`;
  return ini || fim || '—';
}

function renderHistoricoPJe() {
  const tbody = document.getElementById('historicoPJeBody');
  const resumoEl = document.getElementById('historicoPJeResumo');
  if (!tbody) return;

  const filtro = document.getElementById('filtroHistoricoPJeStatus')?.value || '';
  const logs = (state.pjeSyncLogs || []).filter(log => {
    if (filtro === 'ok') return !!log.ok;
    if (filtro === 'erro') return !log.ok;
    return true;
  });

  if (resumoEl) {
    const total = state.pjeSyncLogs?.length || 0;
    const erros = (state.pjeSyncLogs || []).filter(l => !l.ok).length;
    resumoEl.textContent = `${total} sincronização${total !== 1 ? 'es' : ''} carregada${total !== 1 ? 's' : ''} · ${erros} com erro`;
  }

  tbody.innerHTML = logs.length
    ? logs.map(log => {
        const quando = log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '—';
        const nomes = Array.isArray(log.nomes) ? log.nomes : [];
        const erros = Array.isArray(log.erros) ? log.erros : [];
        const erroResumo = erros.length
          ? `<details><summary>${erros.length} erro${erros.length !== 1 ? 's' : ''}</summary><div style="margin-top:6px;color:var(--red);font-size:.72rem">${erros.map(e => `<div>${escHtml(e)}</div>`).join('')}</div></details>`
          : '<span style="color:var(--mu)">—</span>';
        return `<tr>
          <td style="white-space:nowrap;font-size:.75rem">${escHtml(quando)}</td>
          <td><span class="status-pill ${log.ok ? 'status-pill--done' : 'status-pill--warn'}">${log.ok ? 'OK' : 'Erro'}</span></td>
          <td>${escHtml(pjeOrigemLabel(log.origem))}</td>
          <td style="white-space:nowrap">${escHtml(pjePeriodoLabel(log))}</td>
          <td style="font-size:.74rem">
            ${Number(log.inseridas || 0)} nova(s)<br>
            ${Number(log.atualizadas || 0)} atualizada(s)<br>
            ${Number(log.ignoradas_arquivadas || 0)} preservada(s)
          </td>
          <td style="font-size:.74rem">${nomes.length ? escHtml(nomes.join(', ')) : '—'}</td>
          <td style="font-size:.74rem;max-width:260px">${erroResumo}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="7" class="tbl-empty">Nenhum log encontrado para o filtro selecionado.</td></tr>`;
}

function abrirModalHistoricoPJe() {
  renderHistoricoPJe();
  document.getElementById('modalHistoricoPJe')?.classList.add('open');
}

function fecharModalHistoricoPJe() {
  document.getElementById('modalHistoricoPJe')?.classList.remove('open');
}

async function recarregarHistoricoPJe() {
  if (!state.empresaId) return;
  const btn = document.querySelector('#modalHistoricoPJe .btn-outline[onclick="recarregarHistoricoPJe()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Recarregando…'; }
  try {
    const { data, error } = await db.from('pje_sync_logs')
      .select('*')
      .eq('empresa_id', state.empresaId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) { toast('Erro ao carregar histórico PJe: ' + error.message, 'error'); return; }
    state.pjeSyncLogs = data || [];
    renderHistoricoPJe();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Recarregar'; }
  }
}

async function registrarLogSyncPJe({ origem, dataInicio, dataFim, nomes, resumo, erros = [] }) {
  if (!state.empresaId) return;
  const row = {
    empresa_id: state.empresaId,
    origem,
    data_inicio: dataInicio || null,
    data_fim: dataFim || dataInicio || null,
    nomes: nomes || [],
    inseridas: resumo?.inseridas || 0,
    atualizadas: resumo?.atualizadas || 0,
    ignoradas_arquivadas: resumo?.ignoradas_arquivadas || 0,
    erros,
    ok: !erros.length,
  };
  const { error } = await db.from('pje_sync_logs').insert(row);
  if (error) {
    console.warn('[pje_sync_logs] falha ao registrar:', error.message);
    return;
  }
  state.pjeSyncLogs = [{ ...row, created_at: new Date().toISOString() }, ...(state.pjeSyncLogs || [])].slice(0, 20);
  renderHistoricoPJe();
}

function termosBuscaPJe() {
  const nomes = Array.isArray(state.pjeConfig?.nomes) ? state.pjeConfig.nomes : [];
  const oabs = Array.isArray(state.pjeConfig?.oabs) ? state.pjeConfig.oabs : [];
  const termos = [
    ...nomes.map(n => String(n || '').trim()).filter(Boolean),
    ...oabs.map(normalizarOabBuscaPJe).filter(Boolean),
  ];
  return [...new Set(termos)];
}

function textoLegivelIntimacao(texto) {
  const raw = String(texto || '').trim();
  if (!raw) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = raw;
  const decodificado = textarea.value;
  const normalizado = decodificado
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
  if (!/[<][a-z!/][\s\S]*[>]/i.test(normalizado)) {
    textarea.innerHTML = normalizado;
    return textarea.value
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  const doc = new DOMParser().parseFromString(normalizado, 'text/html');
  doc.querySelectorAll('script,style').forEach(el => el.remove());
  const legivel = (doc.body?.innerText || doc.documentElement?.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/([a-záéíóúâêôãõç])([A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g, '$1 $2')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (legivel && !/[<][a-z!/][\s\S]*[>]/i.test(legivel)) return legivel;
  return normalizado
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|table|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderIntimacoesAba() {
  const busca  = (document.getElementById('buscaIntimacoes')?.value ?? '').toLowerCase();
  const status = document.getElementById('filtroIntimacoesStatus')?.value ?? '';
  const vinculo = document.getElementById('filtroIntimacoesVinculo')?.value ?? '';
  const de     = document.getElementById('filtroIntimacoesDe')?.value ?? '';
  const ate    = document.getElementById('filtroIntimacoesAte')?.value ?? '';

  const lista = state.intimacoes.filter(i => {
    const st = i.status || 'pendente';
    if (!status && st === 'arquivada') return false;
    const temPasta = !!pastaDaIntimacao(i);
    if (vinculo === 'vinculadas' && !temPasta) return false;
    if (vinculo === 'sem_vinculo' && temPasta) return false;
    const m = !busca ||
      String(i.processo || '').toLowerCase().includes(busca) ||
      String(i.orgao || '').toLowerCase().includes(busca) ||
      String(i.tribunal || '').toLowerCase().includes(busca) ||
      String(i.nomeClasse || '').toLowerCase().includes(busca) ||
      String(i.tipoDocumento || '').toLowerCase().includes(busca);
    const dataOk = (!de || i.dataPublicacao >= de) && (!ate || i.dataPublicacao <= ate);
    return m && (!status || st === status) && dataOk;
  });

  const cfg = state.pjeConfig;
  const ultimaSync = cfg?.ultima_sync
    ? `Última sync: ${new Date(cfg.ultima_sync).toLocaleString('pt-BR')}`
    : 'Nenhuma sincronização realizada';
  const ultimaImportacao = resumoUltimaSyncPJe();
  const semVinculo = state.intimacoes.filter(i =>
    (i.status || 'pendente') !== 'arquivada' && !pastaDaIntimacao(i)
  ).length;
  const arquivadas = state.intimacoes.filter(i => (i.status || 'pendente') === 'arquivada').length;
  const btnArquivadas = document.getElementById('btnVerArquivadas');
  if (btnArquivadas) {
    btnArquivadas.textContent = status === 'arquivada' ? 'Voltar ao acompanhamento' : `Arquivadas (${arquivadas})`;
    btnArquivadas.classList.toggle('is-active', status === 'arquivada');
  }

  document.getElementById('intimacoesInfo').textContent =
    `${lista.length} registro${lista.length !== 1 ? 's' : ''} · ${semVinculo} sem pasta · ${ultimaSync}${ultimaImportacao ? ' · ' + ultimaImportacao : ''}`;

  document.getElementById('tabelaIntimacoes').innerHTML = lista.length
    ? lista.map(i => {
        const st   = i.status || 'pendente';
        const opts = Object.entries(INTIM_STATUS_LABEL)
          .map(([v, t]) => `<option value="${escAttr(v)}"${v === st ? ' selected' : ''}>${escHtml(t)}</option>`)
          .join('');
        const idAttr = escAttr(i.id);
        const pasta = pastaDaIntimacao(i);
        const pastaCell = pasta
          ? `<button class="btn-link-sm int-link" data-action="abrir-pasta" data-pasta-numero="${escAttr(pasta.numero)}" title="Abrir pasta">${escHtml(pasta.numero)}</button>`
          : `<button class="btn-link-sm" data-action="vincular" data-id="${idAttr}" title="Vincular esta intimação a uma pasta">Vincular</button>`;
        const linkDireto = safeExternalUrl(linkProcesso(i.processo, i.tribunal));
        const linkOriginal = safeExternalUrl(i.link);
        const linkVer = linkDireto || linkOriginal;
        return `<tr data-intimacao-id="${idAttr}" style="cursor:default">
          <td style="font-family:'IBM Plex Mono',monospace;font-size:.7rem;white-space:nowrap">
            <button class="btn-link-sm" data-action="ler" data-id="${idAttr}" title="Ler intimação" style="font-family:inherit;text-align:left">${escHtml(i.processo || '—')}</button>
          </td>
          <td style="font-size:.75rem">${pastaCell}</td>
          <td><span class="badge-tribunal">${escHtml(i.tribunal || '—')}</span></td>
          <td style="font-size:.75rem;max-width:160px">${escHtml(i.orgao || '—')}</td>
          <td style="white-space:nowrap">${formatDate(i.dataPublicacao)}</td>
          <td style="font-size:.75rem">${escHtml(i.tipoDocumento || i.nomeClasse || '—')}</td>
          <td style="font-size:.75rem">${escHtml(i.nomeClasse || '—')}</td>
          <td>
            <select class="intim-status-sel" data-id="${idAttr}" style="font-size:.72rem;padding:3px 6px;background:var(--bg);border:1px solid var(--br);border-radius:2px;color:inherit;cursor:pointer">
              ${opts}
            </select>
          </td>
          <td style="white-space:nowrap">
            <button class="btn-link-sm" data-action="ler" data-id="${idAttr}" title="Ler texto">Ler</button>
            <button class="btn-link-sm" data-action="vincular" data-id="${idAttr}" title="Vincular pasta" style="margin-left:6px">Vincular</button>
            <button class="btn-link-sm" data-action="criar-prazo" data-id="${idAttr}" title="Criar prazo" style="margin-left:6px">+ Prazo</button>
            <button class="btn-link-sm" data-action="criar-tarefa" data-id="${idAttr}" title="Criar tarefa" style="margin-left:4px">+ Tarefa</button>
          </td>
          <td>${linkVer ? `<a href="${escAttr(linkVer)}" target="_blank" rel="noopener noreferrer" class="int-link">Ver ↗</a>` : '—'}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="10" class="tbl-empty">Nenhuma intimação encontrada para o período selecionado.</td></tr>`;

  // Bind status dropdowns
  document.querySelectorAll('.intim-status-sel').forEach(sel => {
    sel.addEventListener('change', e => {
      alterarStatusIntimacao(sel.dataset.id, e.target.value, sel);
    });
  });

  document.querySelectorAll('#tabelaIntimacoes [data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      const action = e.currentTarget.dataset.action;
      if (action === 'abrir-pasta') {
        navegarPara('pastas');
        const numero = e.currentTarget.dataset.pastaNumero || '';
        setTimeout(() => abrirPasta(numero), 100);
        return;
      }
      const intim = intimacaoPorId(e.currentTarget.dataset.id);
      if (!intim) { toast('Intimação não encontrada.', 'error'); return; }
      if (action === 'ler') lerIntimacao(intim);
      if (action === 'vincular') abrirModalVincularIntimacao(intim);
      if (action === 'criar-prazo') criarPrazoDaIntimacao(intim);
      if (action === 'criar-tarefa') criarTarefaDaIntimacao(intim);
    });
  });
}

function alternarIntimacoesArquivadas() {
  const status = document.getElementById('filtroIntimacoesStatus');
  if (!status) return;
  status.value = status.value === 'arquivada' ? '' : 'arquivada';
  renderIntimacoesAba();
}

async function alterarStatusIntimacao(id, novoStatus, selectEl) {
  const item = state.intimacoes.find(i => mesmoIdIntimacao(i.id, id));
  const statusAnterior = item?.status || 'pendente';
  const rowEl = document.querySelector(`tr[data-intimacao-id="${CSS.escape(id)}"]`);
  if (selectEl) selectEl.disabled = true;

  const { data, error } = await db.rpc('atualizar_status_intimacao', {
    p_intimacao_id: id,
    p_status: novoStatus,
  });
  const row = Array.isArray(data) ? data[0] : data;

  if (selectEl) selectEl.disabled = false;
  if (error || !row) {
    if (selectEl) selectEl.value = statusAnterior;
    toast('Erro ao atualizar status: ' + (error?.message || 'registro não encontrado'), 'error');
    return;
  }

  if (novoStatus === 'arquivada') {
    state.intimacoes = state.intimacoes.filter(i => !mesmoIdIntimacao(i.id, id));
  } else if (item) {
    item.status = row.status_lhub || (row.lida ? 'cumprida' : 'pendente');
    item.arquivadaEm = row.arquivada_em || null;
  }
  const statusFiltro = document.getElementById('filtroIntimacoesStatus')?.value ?? '';
  if (novoStatus === 'arquivada' && statusFiltro !== 'arquivada' && rowEl) {
    rowEl.style.transition = 'opacity .18s ease, transform .18s ease';
    rowEl.style.opacity = '0';
    rowEl.style.transform = 'translateX(8px)';
  }
  renderIntimacoesAba();
  renderDashboard();
  if (state.currentPastaId && typeof carregarAndamentosCNJ === 'function') {
    carregarAndamentosCNJ(state.currentPastaId);
  }
  toast(novoStatus === 'arquivada' ? 'Intimação arquivada e removida do acompanhamento.' : 'Status atualizado!');
}

function renderOpcoesVinculoIntimacao(busca = '') {
  const select = document.getElementById('vincularIntimacaoPasta');
  const info = document.getElementById('vincularIntimacaoPastaInfo');
  if (!select) return;
  const atual = pastaDaIntimacao(_intimacaoVinculoAtual);
  const termo = busca.trim().toLowerCase();
  const pastas = state.pastas
    .filter(p => p.status !== 'arquivado')
    .filter(p => !termo ||
      (p.numero || '').toLowerCase().includes(termo) ||
      (p.cliente || '').toLowerCase().includes(termo) ||
      (p.processo || '').toLowerCase().includes(termo) ||
      (p.parteContraria || '').toLowerCase().includes(termo)
    )
    .slice(0, 80);

  select.innerHTML = '<option value="">— Selecionar pasta —</option>' + pastas
    .map(p => `<option value="${escAttr(p.id)}"${p.id === atual?.id ? ' selected' : ''}>${escHtml(`${p.numero} — ${p.cliente || '—'}${p.processo ? ' · ' + p.processo : ''}`)}</option>`)
    .join('');

  if (atual && !pastas.some(p => p.id === atual.id)) {
    select.insertAdjacentHTML('beforeend', `<option value="${escAttr(atual.id)}" selected>${escHtml(`${atual.numero} — ${atual.cliente || '—'}${atual.processo ? ' · ' + atual.processo : ''}`)}</option>`);
  }
  if (info) {
    const totalAtivas = state.pastas.filter(p => p.status !== 'arquivado').length;
    info.textContent = termo
      ? `${pastas.length} resultado${pastas.length !== 1 ? 's' : ''} encontrado${pastas.length !== 1 ? 's' : ''}`
      : `${totalAtivas} pasta${totalAtivas !== 1 ? 's' : ''} disponível${totalAtivas !== 1 ? 'is' : ''}`;
  }
}

function _grauLabel(grau) {
  const labels = { G1: '1ª Instância', G2: '2ª Instância / Recursal', STJ: 'STJ', STF: 'STF' };
  return labels[grau] || grau || '—';
}

function abrirModalVincularIntimacao(intim) {
  _intimacaoVinculoAtual = intim;
  document.getElementById('vincularIntimacaoId').value = intim.id || '';
  document.getElementById('vincularIntimacaoProcesso').textContent = intim.processo || '—';
  document.getElementById('vincularIntimacaoMeta').textContent =
    `${intim.tribunal || 'Tribunal'} · ${formatDate(intim.dataPublicacao)} · ${intim.orgao || '—'}`;

  // Preencher seletor de instância: se já tem grau salvo usa ele; senão detecta
  const grauSel = document.getElementById('vincularIntimacaoGrau');
  const grauInfo = document.getElementById('vincularIntimacaoGrauInfo');
  if (grauSel) {
    if (intim.grau) {
      grauSel.value = intim.grau;
      if (grauInfo) grauInfo.textContent = `Instância salva: ${_grauLabel(intim.grau)}`;
    } else {
      const detectedGrau = (typeof detectarGrauPorProcesso === 'function')
        ? detectarGrauPorProcesso(intim.processo, intim.tribunal)
        : 'G1';
      grauSel.value = 'auto';
      if (grauInfo) grauInfo.textContent = `Detecção automática: ${_grauLabel(detectedGrau)}`;
    }
  }

  const busca = document.getElementById('buscaVincularIntimacaoPasta');
  if (busca) busca.value = '';
  renderOpcoesVinculoIntimacao();

  document.getElementById('modalVincularIntimacao').classList.add('open');
  setTimeout(() => busca?.focus(), 80);
}

function fecharModalVincularIntimacao() {
  document.getElementById('modalVincularIntimacao').classList.remove('open');
  document.getElementById('vincularIntimacaoId').value = '';
  document.getElementById('vincularIntimacaoPasta').value = '';
  const busca = document.getElementById('buscaVincularIntimacaoPasta');
  if (busca) busca.value = '';
  const grauSel = document.getElementById('vincularIntimacaoGrau');
  if (grauSel) grauSel.value = 'auto';
  const grauInfo = document.getElementById('vincularIntimacaoGrauInfo');
  if (grauInfo) grauInfo.textContent = '';
  _intimacaoVinculoAtual = null;
}

function criarPastaDaIntimacaoVinculada() {
  const intim = _intimacaoVinculoAtual;
  if (!intim?.id) { toast('Intimação não encontrada para criar pasta.', 'error'); return; }
  const grau = grauProcessoIntimacao(intim);
  const recursal = isGrauRecursal(grau);
  state.intimacaoParaVincularNovaPasta = {
    id: intim.id,
    processo: intim.processo || '',
    grau,
    classe: intim.nomeClasse || '',
    orgao: intim.orgao || '',
    tribunal: intim.tribunal || '',
    dataPublicacao: intim.dataPublicacao || '',
    texto: textoLegivelIntimacao(intim.texto) || '',
  };
  fecharModalVincularIntimacao();
  abrirModalNovaPasta(null);
  document.getElementById('pCategoria').value = 'Contencioso Judicial';
  document.getElementById('pProcesso').value = recursal ? '' : (intim.processo || '');
  document.getElementById('pTipoAcao').value = (intim.nomeClasse || intim.tipoDocumento || 'Intimação').toUpperCase();
  document.getElementById('pComarca').value = intim.orgao || '';
  document.getElementById('pDataAb').value = intim.dataPublicacao || '';
  document.getElementById('pObs').value = [
    `Pasta criada a partir de intimação vinculada.`,
    recursal && intim.processo ? `Processo recursal (${grau}): ${intim.processo}` : '',
    intim.tribunal ? `Tribunal: ${intim.tribunal}` : '',
    intim.orgao ? `Órgão: ${intim.orgao}` : '',
    textoLegivelIntimacao(intim.texto) || '',
  ].filter(Boolean).join('\n');
}

async function salvarVinculoIntimacao() {
  const id = document.getElementById('vincularIntimacaoId').value;
  const pastaId = document.getElementById('vincularIntimacaoPasta').value;
  if (!id || !pastaId) { toast('Selecione uma pasta para vincular.', 'error'); return; }

  // Determinar grau: se "auto", detectar pelo processo; senão usar seleção manual
  const grauSel = document.getElementById('vincularIntimacaoGrau');
  let grau = grauSel?.value || 'auto';
  if (grau === 'auto') {
    const intim = _intimacaoVinculoAtual;
    grau = (typeof detectarGrauPorProcesso === 'function')
      ? detectarGrauPorProcesso(intim?.processo, intim?.tribunal)
      : 'G1';
  }

  const btn = document.getElementById('btnSalvarVinculoIntimacao');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
  try {
    const { data, error } = await db.rpc('vincular_intimacao_pasta', {
      p_intimacao_id: id,
      p_pasta_id: pastaId,
      p_grau: grau,
    });
    const row = Array.isArray(data) ? data[0] : data;

    if (error || !row) {
      toast('Erro ao vincular pasta: ' + (error?.message || 'registro não encontrado'), 'error');
      return;
    }

    let avisoProcesso = '';
    const item = state.intimacoes.find(i => mesmoIdIntimacao(i.id, id));
    if (item) { item.pastaId = row.pasta_id; item.grau = row.grau || grau; }
    if (typeof aplicarProcessoDaIntimacaoNaPasta === 'function') {
      try {
        await aplicarProcessoDaIntimacaoNaPasta(row.pasta_id, item || intimacaoPorId(id));
      } catch (processoError) {
        console.warn('[intimacoes] falha ao aplicar processo da intimação:', processoError);
        avisoProcesso = 'Intimação vinculada, mas não foi possível registrar o processo: ' + processoError.message;
      }
    }
    fecharModalVincularIntimacao();
    renderIntimacoesAba();
    if (state.currentPastaId === row.pasta_id && typeof carregarAndamentosCNJ === 'function') {
      carregarAndamentosCNJ(row.pasta_id);
    }
    toast(avisoProcesso || 'Intimação vinculada à pasta.', avisoProcesso ? 'error' : undefined);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Vincular pasta'; }
  }
}

async function removerVinculoIntimacao() {
  const id = document.getElementById('vincularIntimacaoId').value;
  if (!id) return;
  if (!confirm('Remover vínculo desta intimação com a pasta?')) return;

  const { data, error } = await db.rpc('vincular_intimacao_pasta', {
    p_intimacao_id: id,
    p_pasta_id: null,
  });
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    toast('Erro ao remover vínculo: ' + (error?.message || 'registro não encontrado'), 'error');
    return;
  }
  const item = state.intimacoes.find(i => mesmoIdIntimacao(i.id, id));
  if (item) item.pastaId = null;
  fecharModalVincularIntimacao();
  renderIntimacoesAba();
  if (state.currentPastaId && typeof carregarAndamentosCNJ === 'function') {
    carregarAndamentosCNJ(state.currentPastaId);
  }
  toast('Vínculo removido.');
}

function criarPrazoDaIntimacao(intim) {
  // Abre o modal via função oficial (configura pickers, permissões, etc.)
  abrirModalNovoPrazo(null);
  // Sobrescreve campos com dados da intimação
  const pasta = pastaDaIntimacao(intim);
  document.getElementById('prazoIntimacaoId').value = intim.id || '';
  document.getElementById('prazoTipo').value        = 'Manifestação';
  const diasEl = document.getElementById('prazoDiasUteis');
  if (diasEl) diasEl.value = '15';
  document.getElementById('prazoFatal').dataset.dataBase = intim.dataPublicacao || '';
  document.getElementById('prazoDescricao').value   =
    `Intimação ${intim.tipoDocumento || intim.nomeClasse || ''} — ${intim.orgao} (${formatDate(intim.dataPublicacao)})`.trim();
  if (pasta) {
    document.getElementById('prazoPastaSelect').value = pasta.id;
    document.getElementById('prazoCliente').value     = pasta.cliente || '';
  }
  preencherPrazoSugerido();
}

function criarTarefaDaIntimacao(intim) {
  // Abre o modal via função oficial (configura pickers, seletores, etc.)
  abrirModalNovaTarefa(null);
  // Sobrescreve campos com dados da intimação
  const pasta = pastaDaIntimacao(intim);
  document.getElementById('tTitulo').value     = `Intimação: ${intim.tipoDocumento || intim.nomeClasse || intim.orgao}`;
  document.getElementById('tTipo').value       = 'Diligência interna';
  document.getElementById('tPrioridade').value = 'alta';
  document.getElementById('tDescricao').value  =
    `Intimação publicada em ${formatDate(intim.dataPublicacao)}.\nÓrgão: ${intim.orgao}\nProcesso: ${intim.processo}`;
  if (pasta) document.getElementById('tarefaPastaSelect').value = pasta.id;
}

function lerIntimacao(intim) {
  const tipo = intim.tipoDocumento || intim.tipoComunicacao || 'Intimação';
  const titulo = `${tipo}${intim.nomeClasse ? ' — ' + intim.nomeClasse : ''}`;
  const meta   = `${intim.processo} · ${intim.tribunal} · Publicado em ${formatDate(intim.dataPublicacao)} · ${intim.orgao}`;

  document.getElementById('lerIntimTitulo').textContent = titulo;
  document.getElementById('lerIntimMeta').textContent   = meta;
  document.getElementById('lerIntimTexto').textContent  = textoLegivelIntimacao(intim.texto) || 'Texto não disponível.';

  const link = safeExternalUrl(linkProcesso(intim.processo, intim.tribunal)) || safeExternalUrl(intim.link) || '#';
  const linkEl = document.getElementById('lerIntimLink');
  linkEl.href = link;
  linkEl.style.display = link === '#' ? 'none' : '';

  document.getElementById('modalLerIntimacao').classList.add('open');
}

function linhaPJeParaDb(i) {
  return {
    id: String(i.id),
    empresa_id: state.empresaId,
    data_disponibilizacao: i.data_disponibilizacao,
    sigla_tribunal: i.siglaTribunal,
    tipo_comunicacao: i.tipoComunicacao,
    nome_orgao: i.nomeOrgao,
    texto: i.texto,
    numero_processo: i.numero_processo,
    numero_processo_mascara: i.numeroprocessocommascara,
    link: i.link,
    tipo_documento: i.tipoDocumento,
    nome_classe: i.nomeClasse,
    status: i.status,
    meio_completo: i.meiocompleto,
    hash: i.hash,
  };
}

async function importarIntimacoesPJe(rows) {
  if (!rows.length) return { inseridas: 0, atualizadas: 0, ignoradas_arquivadas: 0 };
  const { data, error } = await db.rpc('importar_intimacoes_pje', { p_rows: rows });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    inseridas: Number(row?.inseridas || 0),
    atualizadas: Number(row?.atualizadas || 0),
    ignoradas_arquivadas: Number(row?.ignoradas_arquivadas || 0),
  };
}

async function buscarEImportarPJe({ dataInicio, dataFim }) {
  const termos = termosBuscaPJe();
  if (!termos.length) {
    toast('Configure ao menos um nome ou OAB para busca de intimações.', 'error');
    return null;
  }

  const resumo = { inseridas: 0, atualizadas: 0, ignoradas_arquivadas: 0 };
  const erros = [];
  const idsImportados = new Set();

  for (const termo of termos) {
    let pagina = 1;
    let totalApi = Infinity;
    while ((pagina - 1) * 50 < totalApi) {
      const url = `/api/pje-proxy` +
        `?pagina=${pagina}&itensPorPagina=50` +
        `&texto=${encodeURIComponent(termo)}` +
        `&dataInicio=${dataInicio}` +
        `&dataFim=${dataFim}`;
      const res = await proxyFetch(url);
      if (!res.ok) {
        erros.push(`${termo}: HTTP ${res.status} na página ${pagina}`);
        break;
      }

      const json = await res.json();
      totalApi = json.count ?? 0;
      const items = json.items ?? [];
      const novosItems = items.filter(item => {
        const id = String(item?.id || '');
        if (!id || idsImportados.has(id)) return false;
        idsImportados.add(id);
        return true;
      });
      const rows = novosItems.map(linhaPJeParaDb);
      if (rows.length) {
        const parcial = await importarIntimacoesPJe(rows);
        resumo.inseridas += parcial.inseridas;
        resumo.atualizadas += parcial.atualizadas;
        resumo.ignoradas_arquivadas += parcial.ignoradas_arquivadas;
      }

      pagina++;
      if (items.length < 50) break;
    }
  }

  return { termos, resumo, erros };
}

async function sincronizarPJeData() {
  const de  = document.getElementById('filtroIntimacoesDe')?.value;
  const ate = document.getElementById('filtroIntimacoesAte')?.value;
  if (!de) { toast('Selecione ao menos a data inicial.', 'error'); return; }
  const btn = document.getElementById('btnBuscarData');
  if (btn) { btn.disabled = true; btn.textContent = 'Buscando…'; }
  try {
    const resultado = await buscarEImportarPJe({ dataInicio: de, dataFim: ate || de });
    if (!resultado) return;
    const { termos, resumo, erros } = resultado;
    await registrarLogSyncPJe({ origem: 'manual_data', dataInicio: de, dataFim: ate || de, nomes: termos, resumo, erros });
    if (erros.length) {
      toast(`PJe indisponível para ${erros.length} consulta(s). Registrei o log e mantive os dados atuais.`, 'error');
      return;
    }
    toast(`${resumo.inseridas} nova(s), ${resumo.atualizadas} atualizada(s), ${resumo.ignoradas_arquivadas} arquivada(s) preservada(s).`);
    await carregarDados();
    renderIntimacoesAba();
  } catch (e) {
    console.warn('[pje] Falha na busca por data:', e?.message || e);
    toast('PJe indisponível no momento. Tente novamente mais tarde.', 'error');
  }
  finally { if (btn) { btn.disabled = false; btn.textContent = '↻ Buscar por data'; } }
}

async function sincronizarPJe() {
  const hoje = new Date().toISOString().slice(0, 10);
  // Preenche os campos de data com hoje e dispara a busca
  const elDe  = document.getElementById('filtroIntimacoesDe');
  const elAte = document.getElementById('filtroIntimacoesAte');
  if (elDe)  elDe.value  = hoje;
  if (elAte) elAte.value = hoje;

  const btn = document.getElementById('btnSyncPJe');
  if (btn) { btn.disabled = true; btn.textContent = 'Sincronizando…'; }
  try {
    const resultado = await buscarEImportarPJe({ dataInicio: hoje, dataFim: hoje });
    if (!resultado) return;
    const { termos, resumo, erros } = resultado;
    await registrarLogSyncPJe({ origem: 'manual_hoje', dataInicio: hoje, dataFim: hoje, nomes: termos, resumo, erros });
    if (erros.length) {
      toast(`PJe indisponível para ${erros.length} consulta(s). Registrei o log e mantive os dados atuais.`, 'error');
      return;
    }
    toast(`${resumo.inseridas} nova(s), ${resumo.atualizadas} atualizada(s), ${resumo.ignoradas_arquivadas} arquivada(s) preservada(s).`);
    await carregarDados();
    renderIntimacoesAba();
  } catch (e) {
    console.warn('[pje] Falha na sincronização:', e?.message || e);
    toast('PJe indisponível no momento. Tente novamente mais tarde.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '↻ Sincronizar'; }
  }
}

function irParaPrazo(pastaNr) {
  document.querySelectorAll('.subtab').forEach(b => b.classList.remove('is-active'));
  document.querySelectorAll('.subtab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector('.subtab[data-subtab="prazos"]').classList.add('is-active');
  document.getElementById('subtab-prazos').classList.remove('hidden');
  document.getElementById('buscaPrazosAba').value = pastaNr;
  renderPrazosAba();
}

document.getElementById('buscaIntimacoes')?.addEventListener('input', renderIntimacoesAba);
document.getElementById('filtroIntimacoesStatus')?.addEventListener('change', renderIntimacoesAba);
document.getElementById('filtroIntimacoesVinculo')?.addEventListener('change', renderIntimacoesAba);
document.getElementById('filtroIntimacoesDe')?.addEventListener('change', renderIntimacoesAba);
document.getElementById('filtroIntimacoesAte')?.addEventListener('change', renderIntimacoesAba);
document.getElementById('buscaVincularIntimacaoPasta')?.addEventListener('input', e => renderOpcoesVinculoIntimacao(e.target.value));
