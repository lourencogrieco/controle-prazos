// ──────────────────────────────────────────────────────────────────────
// CRUD — PASTAS
// ──────────────────────────────────────────────────────────────────────
function gerarNumeroPasta(codigoTipo, areaId, ano) {
  const prefix = `${codigoTipo}/${ano}-`;
  const maxOrdem = state.pastas
    .filter(p => p.numero.startsWith(prefix) && p.areaId === areaId)
    .reduce((max, p) => {
      const ordem = parseInt(p.numero.slice(prefix.length)) || 0;
      return Math.max(max, ordem);
    }, 0);
  return `${prefix}${maxOrdem + 1}`;
}

function atualizarPreviewNumero() {
  const pastaId = document.getElementById('pastaId').value;
  if (pastaId) return;
  const areaId = document.getElementById('pAreaPasta').value;
  const codigo = document.getElementById('pTipoPasta').value;
  const ano    = document.getElementById('pAno').value;
  const prev   = document.getElementById('pastaNumeroValor');
  if (!codigo || !ano || !areaId) { prev.textContent = '—'; return; }
  prev.textContent = gerarNumeroPasta(codigo, areaId, ano);
}

function popularDropdownAreas() {
  const sel = document.getElementById('pAreaPasta');
  if (!sel) return;
  const atual = sel.value;
  sel.innerHTML = '<option value="">Selecionar área…</option>' +
    state.areas.map(a =>
      `<option value="${escAttr(a.id)}" ${a.id === atual ? 'selected' : ''}>${escHtml(a.nome)}</option>`
    ).join('');
}

function popularDropdownTipos() {
  const areaId = document.getElementById('pAreaPasta')?.value || '';
  const sel    = document.getElementById('pTipoPasta');
  if (!sel) return;
  const tiposFiltrados = areaId
    ? state.tiposPasta.filter(t => t.areaId === areaId)
    : state.tiposPasta;
  sel.innerHTML = (areaId ? '<option value="">Selecionar tipo…</option>' : '<option value="">Selecione a área primeiro…</option>') +
    tiposFiltrados.map(t =>
      `<option value="${escAttr(t.codigo)}">${escHtml(t.codigo)} — ${escHtml(t.nome)}</option>`
    ).join('');
  atualizarPreviewNumero();
}

function popularDropdownClientes() {
  // Atualiza o dropdown do picker de clientes mantendo os chips já selecionados
  const addSel = document.querySelector('#pastaClientePicker .resp-add-select');
  if (!addSel) return;
  const chipsEl  = document.querySelector('#pastaClientePicker .resp-chips');
  const selected = Array.from(chipsEl?.querySelectorAll('.resp-chip') || []).map(c => c.dataset.nome);
  addSel.innerHTML = '<option value="">＋ Adicionar cliente</option>' +
    state.clientes
      .filter(c => !selected.includes(c.nome))
      .map(c => `<option value="${escAttr(c.nome)}">${escHtml(c.nome)}</option>`).join('');
}

function adicionarNomeManualPastaCliente() {
  const input  = document.getElementById('pClienteManual');
  const nome   = (input?.value || '').trim().toUpperCase();
  if (!nome) return;
  const chipsEl = document.querySelector('#pastaClientePicker .resp-chips');
  if (!chipsEl) return;
  if (Array.from(chipsEl.querySelectorAll('.resp-chip')).some(c => c.dataset.nome === nome)) {
    input.value = ''; return;
  }
  chipsEl.insertAdjacentHTML('beforeend', _respChipHTML(nome));
  input.value = '';
}

function popularSelectsPastas(valores = {}) {
  const opts = '<option value="">— sem pasta vinculada —</option>' +
    state.pastas.map(p => `<option value="${escAttr(p.id)}">${escHtml(p.numero)} — ${escHtml(p.cliente)}</option>`).join('');
  ['prazoPastaSelect', 'tarefaPastaSelect'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const valorAtual = Object.prototype.hasOwnProperty.call(valores, id) ? valores[id] : el.value;
    el.innerHTML = opts;
    if (valorAtual && state.pastas.some(p => p.id === valorAtual)) el.value = valorAtual;
  });
}

function abrirModalNovaPasta(numero) {
  const p = numero ? state.pastas.find(x => x.numero === numero) : null;
  document.getElementById('tituloPastaModal').textContent = p ? 'Editar Pasta' : 'Nova Pasta';
  document.getElementById('pastaId').value = p?.id || '';
  document.getElementById('pAno').value    = new Date().getFullYear();

  popularDropdownAreas();

  if (p) {
    document.getElementById('pAreaPasta').value = p.areaId || '';
    popularDropdownTipos();
    document.getElementById('pTipoPasta').value = p.codigoTipo || '';
    document.getElementById('pastaNumeroValor').textContent = p.numero;
  } else {
    popularDropdownTipos();
  }

  // Picker de clientes (suporta múltiplos)
  popularRespPicker('pastaClientePicker', p?.cliente || '', state.clientes, '＋ Adicionar cliente');

  // Picker de advogados responsáveis
  popularRespPicker('pastaAdvPicker', p?.advogado || '', state.usuarios);

  if (document.getElementById('pClienteManual'))
    document.getElementById('pClienteManual').value = '';

  document.getElementById('pParteContraria').value = (p?.parteContraria !== '-') ? (p?.parteContraria || '') : '';
  document.getElementById('pCategoria').value      = p?.tipoServico || '';
  document.getElementById('pTipoAcao').value       = p?.servico || '';
  document.getElementById('pComarca').value        = p?.comarca || '';
  document.getElementById('pProcesso').value       = p?.processo || '';
  { const vc = document.getElementById('pValorCausa');
    if (p?.valorCausa && p.valorCausa !== 'R$ 0,00') vc.value = p.valorCausa;
    else vc.value = ''; }
  document.getElementById('pObs').value            = p?.descricao || '';
  document.getElementById('pDataAb').value         = p?.dataDistribuicao
    ? p.dataDistribuicao.split('/').reverse().join('-') : '';
  document.getElementById('modalNovaPasta').classList.add('open');
}

function fecharModalNovaPasta() {
  document.getElementById('modalNovaPasta').classList.remove('open');
  document.getElementById('novaPastaForm').reset();
  state.intimacaoParaVincularNovaPasta = null;
}

document.getElementById('btnNovaPasta').addEventListener('click', () => abrirModalNovaPasta(null));
document.getElementById('fecharNovaPasta').addEventListener('click', fecharModalNovaPasta);
document.getElementById('btnCancelarPasta').addEventListener('click', fecharModalNovaPasta);
document.getElementById('modalNovaPasta').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModalNovaPasta();
});

document.getElementById('pAreaPasta').addEventListener('change', () => {
  popularDropdownTipos();
  atualizarPreviewNumero();
});
document.getElementById('pTipoPasta').addEventListener('change', atualizarPreviewNumero);
document.getElementById('pAno').addEventListener('input', atualizarPreviewNumero);

async function registrarProcessoRecursalDaIntimacao(pastaId, intimacao) {
  const processo = (intimacao?.processo || '').trim();
  const grau = typeof grauProcessoIntimacao === 'function'
    ? grauProcessoIntimacao(intimacao)
    : (intimacao?.grau || 'G1');
  const recursal = typeof isGrauRecursal === 'function'
    ? isGrauRecursal(grau)
    : ['G2', 'STJ', 'STF', 'SUP'].includes(String(grau || '').toUpperCase());

  if (!pastaId || !processo || !recursal) return null;

  const { data: existentes, error: buscaError } = await db
    .from('andamentos_processo')
    .select('id')
    .eq('empresa_id', state.empresaId)
    .eq('pasta_id', pastaId)
    .eq('numero_processo', processo)
    .eq('grau', grau)
    .eq('nome', 'Processo recursal vinculado')
    .limit(1);
  if (buscaError) throw buscaError;

  const row = {
    empresa_id: state.empresaId,
    pasta_id: pastaId,
    numero_processo: processo,
    data_hora: intimacao.dataPublicacao ? `${intimacao.dataPublicacao}T12:00:00` : new Date().toISOString(),
    nome: 'Processo recursal vinculado',
    complemento: [
      `Incluído a partir da intimação ${intimacao.id || ''}`.trim(),
      (intimacao.classe || intimacao.nomeClasse) ? `Classe: ${intimacao.classe || intimacao.nomeClasse}` : '',
      intimacao.orgao ? `Órgão: ${intimacao.orgao}` : '',
      intimacao.texto || '',
    ].filter(Boolean).join('\n'),
    codigo: null,
    is_intimacao: false,
    grau,
    tribunal: intimacao.tribunal || 'intimacoes_pje',
    sincronizado_em: new Date().toISOString(),
  };

  const existenteId = existentes?.[0]?.id;
  const { error } = existenteId
    ? await db.from('andamentos_processo').update(row).eq('id', existenteId).eq('empresa_id', state.empresaId)
    : await db.from('andamentos_processo').insert(row);
  if (error) throw error;

  const pasta = state.pastas.find(p => p.id === pastaId);
  const chave = processo.replace(/\D/g, '');
  if (pasta && chave) _pastasPorProcesso.set(chave, pasta);
  return row;
}

async function aplicarProcessoDaIntimacaoNaPasta(pastaId, intimacao) {
  const processo = (intimacao?.processo || '').trim();
  const grau = typeof grauProcessoIntimacao === 'function'
    ? grauProcessoIntimacao(intimacao)
    : (intimacao?.grau || 'G1');
  const recursal = typeof isGrauRecursal === 'function'
    ? isGrauRecursal(grau)
    : ['G2', 'STJ', 'STF', 'SUP'].includes(String(grau || '').toUpperCase());

  if (recursal) return registrarProcessoRecursalDaIntimacao(pastaId, intimacao);
  if (!pastaId || !processo) return null;

  const { data: pastaRow, error: buscaError } = await db
    .from('pastas')
    .select('numero_processo')
    .eq('empresa_id', state.empresaId)
    .eq('id', pastaId)
    .maybeSingle();
  if (buscaError) throw buscaError;

  if (pastaRow?.numero_processo) {
    const pasta = state.pastas.find(p => p.id === pastaId);
    const chave = processo.replace(/\D/g, '');
    if (pasta && chave && String(pastaRow.numero_processo || '').replace(/\D/g, '') === chave) {
      pasta.processo = pastaRow.numero_processo;
      _pastasPorProcesso.set(chave, pasta);
    }
    return null;
  }

  const { error } = await db
    .from('pastas')
    .update({ numero_processo: processo })
    .eq('empresa_id', state.empresaId)
    .eq('id', pastaId);
  if (error) throw error;

  const pasta = state.pastas.find(p => p.id === pastaId);
  const chave = processo.replace(/\D/g, '');
  if (pasta) pasta.processo = processo;
  if (pasta && chave) _pastasPorProcesso.set(chave, pasta);
  return { numero_processo: processo, grau: 'G1' };
}

document.getElementById('novaPastaForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarPasta');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  try {
    const pastaId    = document.getElementById('pastaId').value;
    const areaId     = document.getElementById('pAreaPasta').value;
    const codigoTipo = document.getElementById('pTipoPasta').value;
    const ano        = document.getElementById('pAno').value;
    const areaNome   = state.areas.find(a => a.id === areaId)?.nome || '';
    const numero     = pastaId
      ? document.getElementById('pastaNumeroValor').textContent
      : gerarNumeroPasta(codigoTipo, areaId, ano);

    // Coleta clientes: chips do picker + nome digitado manualmente
    const chipsNomes  = getSelectedResps('pastaClientePicker');
    const manualNome  = (document.getElementById('pClienteManual')?.value || '').trim().toUpperCase();
    const clienteNome = [chipsNomes, manualNome].filter(Boolean).join(';') || null;
    if (!clienteNome) { toast('Informe ao menos um cliente.', 'error'); return; }

    const advogado = getSelectedResps('pastaAdvPicker');
    if (!advogado) { toast('Selecione ao menos um advogado responsável.', 'error'); return; }

    // ID do cliente principal (primeiro chip que estiver no cadastro)
    const primeiroNome  = chipsNomes.split(';')[0]?.trim();
    const clientePrinc  = state.clientes.find(c => c.nome === primeiroNome);

    const uc = v => (v || '').trim().toUpperCase();
    const intimacaoPendente = state.intimacaoParaVincularNovaPasta;
    const grauIntimacaoPendente = intimacaoPendente && typeof grauProcessoIntimacao === 'function'
      ? grauProcessoIntimacao(intimacaoPendente)
      : (intimacaoPendente?.grau || 'G1');
    const processoIntimacaoPendente = (intimacaoPendente?.processo || '').trim();
    const processoInput = document.getElementById('pProcesso')?.value.trim() || '';
    const processoPasta = processoInput || (!isGrauRecursal(grauIntimacaoPendente) ? processoIntimacaoPendente : '');
    const obj = pastaParaDb({
      id:               pastaId || uid(),
      numero,
      codigoSIA:        '-',
      cliente:          clienteNome,
      parteContraria:   uc(document.getElementById('pParteContraria')?.value) || '-',
      tipoServico:      uc(document.getElementById('pCategoria')?.value),
      servico:          uc(document.getElementById('pTipoAcao')?.value),
      advogado:         advogado,
      comarca:          uc(document.getElementById('pComarca')?.value),
      processo:         processoPasta,
      valorCausa:       document.getElementById('pValorCausa')?.value.trim() || 'R$ 0,00',
      area:             areaNome,
      descricao:        document.getElementById('pObs')?.value.trim() || '',
      dataDistribuicao: document.getElementById('pDataAb')?.value || null,
      incluidoPor:      state.meuPerfil?.nome || '',
      status:           'ativo',
    });
    obj.codigo_tipo = codigoTipo ? Number(codigoTipo) : null;
    obj.area_id     = areaId || null;
    obj.cliente_id  = clientePrinc?.id || null;

    const { error } = await db.from('pastas').upsert(obj);
    if (error) { toast('Erro ao salvar: ' + error.message, 'error'); return; }

    let avisoVinculoIntimacao = '';
    let vinculouIntimacao = false;
    let processoAplicado = false;
    if (intimacaoPendente?.id) {
      const { error: vinculoError } = await db.rpc('vincular_intimacao_pasta', {
        p_intimacao_id: intimacaoPendente.id,
        p_pasta_id: obj.id,
        p_grau: grauIntimacaoPendente,
      });
      if (vinculoError) {
        avisoVinculoIntimacao = 'Pasta criada, mas não foi possível vincular a intimação: ' + vinculoError.message;
      } else {
        vinculouIntimacao = true;
        const intim = state.intimacoes.find(i => mesmoIdIntimacao(i.id, intimacaoPendente.id));
        if (intim) { intim.pastaId = obj.id; intim.grau = grauIntimacaoPendente; }
        try {
          processoAplicado = !!(await aplicarProcessoDaIntimacaoNaPasta(obj.id, { ...intim, ...intimacaoPendente }));
        } catch (processoError) {
          console.warn('[pastas] falha ao aplicar processo da intimação:', processoError);
          avisoVinculoIntimacao = 'Pasta criada e intimação vinculada, mas não foi possível registrar o processo: ' + processoError.message;
        }
      }
      state.intimacaoParaVincularNovaPasta = null;
    }

    logAuditoria(pastaId ? 'editar' : 'criar', 'pastas', obj.id, `Pasta ${pastaId ? 'editada' : 'criada'}: ${numero} — ${clienteNome || '—'}`);
    fecharModalNovaPasta();
    toast(
      avisoVinculoIntimacao || (vinculouIntimacao
        ? (processoAplicado ? 'Pasta criada, intimação vinculada e processo registrado.' : 'Pasta criada e vinculada à intimação.')
        : 'Pasta salva com sucesso'),
      avisoVinculoIntimacao ? 'error' : undefined
    );
    await carregarDados();
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar Pasta';
  }
});

async function excluirPasta(id) {
  if (!confirm('Confirmar exclusão desta pasta?')) return;
  const p = state.pastas.find(x => x.id === id);
  const { error } = await db.from('pastas').delete()
    .eq('id', id).eq('empresa_id', state.empresaId);
  if (error) { toast('Erro ao excluir: ' + error.message, 'error'); return; }
  logAuditoria('excluir', 'pastas', id, `Pasta excluída: ${p?.numero || '—'} — ${p?.cliente || '—'}`);
  toast('Pasta excluída');
  document.getElementById('pastas-detail').classList.add('hidden');
  document.getElementById('pastas-list').classList.remove('hidden');
  await carregarDados();
}

// ──────────────────────────────────────────────────────────────────────
// PASTA LIST — lê state.pastas
// ──────────────────────────────────────────────────────────────────────
let pastaPagAtual = 1;
let pastaLinhas   = 10;
let _pastaListSeq = 0;

function pastasVisiveis() {
  const busca = (document.getElementById('buscaPasta')?.value ?? '').trim().toLowerCase();
  if (!busca) return state.pastas;
  return state.pastas.filter(p =>
    p.numero.toLowerCase().includes(busca) ||
    p.cliente.toLowerCase().includes(busca) ||
    (p.servico || '').toLowerCase().includes(busca) ||
    (p.parteContraria || '').toLowerCase().includes(busca)
  );
}

async function carregarPastasPagina() {
  const busca = postgrestIlikeTerm(document.getElementById('buscaPasta')?.value ?? '');
  const inicio = (pastaPagAtual - 1) * pastaLinhas;
  let query = db.from('pastas')
    .select('*', { count: 'exact' })
    .eq('empresa_id', state.empresaId)
    .order('created_at', { ascending: false });

  if (busca) {
    const like = `%${busca}%`;
    query = query.or([
      `numero.ilike.${like}`,
      `cliente.ilike.${like}`,
      `tipo_acao.ilike.${like}`,
      `parte_contraria.ilike.${like}`,
      `numero_processo.ilike.${like}`,
    ].join(','));
  }

  const { data, count, error } = await query.range(inicio, inicio + pastaLinhas - 1);
  if (error) throw error;
  const lista = (data || []).map(dbParaPasta);
  lista.forEach(p => _stateUpsert(state.pastas, p));
  _reconstruirIndicePastas();
  return { lista, total: count ?? lista.length };
}

async function renderPastaList() {
  const seq = ++_pastaListSeq;
  const body = document.getElementById('tabelaPastasBody');
  if (!body) return;
  body.innerHTML = `<tr><td colspan="7" class="tbl-empty">Carregando pastas…</td></tr>`;

  let lista = [];
  let total = 0;
  try {
    ({ lista, total } = await carregarPastasPagina());
  } catch (err) {
    if (seq !== _pastaListSeq) return;
    body.innerHTML = `<tr><td colspan="7" class="tbl-empty">Erro ao carregar pastas: ${escHtml(err.message)}</td></tr>`;
    return;
  }
  if (seq !== _pastaListSeq) return;

  const pages   = Math.max(1, Math.ceil(total / pastaLinhas));
  if (pastaPagAtual > pages) {
    pastaPagAtual = pages;
    renderPastaList();
    return;
  }
  const inicio  = (pastaPagAtual - 1) * pastaLinhas;

  body.innerHTML = lista.map(p => `
    <tr data-pasta="${escAttr(p.numero)}">
      <td><input type="checkbox" onclick="event.stopPropagation()"></td>
      <td><span class="pasta-link">${escHtml(p.numero)}</span></td>
      <td class="pasta-client">${escHtml(p.cliente)}</td>
      <td>${escHtml(p.parteContraria)}</td>
      <td style="font-family:'IBM Plex Mono',monospace;font-size:.72rem">${escHtml(p.processo || '—')}</td>
      <td>${escHtml(p.tipoServico)}</td>
      <td>${escHtml(p.servico)}</td>
    </tr>`).join('') || `<tr><td colspan="7" class="tbl-empty">Nenhuma pasta encontrada.</td></tr>`;

  const fim = Math.min(inicio + pastaLinhas, total);
  document.getElementById('pastasPaginacaoInfo').textContent =
    `Exibindo ${total ? inicio + 1 : 0} - ${fim} de ${total} • Página`;

  const pgSel = document.getElementById('pastaPagina');
  pgSel.innerHTML = Array.from({ length: pages }, (_, i) =>
    `<option value="${i+1}" ${i+1 === pastaPagAtual ? 'selected' : ''}>${i+1}</option>`
  ).join('');
  document.getElementById('pastaTotalPaginas').textContent = `de ${pages}`;
  document.getElementById('pastaPgAnterior').disabled = pastaPagAtual <= 1;
  document.getElementById('pastaPgProxima').disabled  = pastaPagAtual >= pages;

  document.querySelectorAll('#tabelaPastasBody tr[data-pasta]').forEach(tr => {
    tr.addEventListener('click', () => abrirPasta(tr.dataset.pasta));
  });
}

// ──────────────────────────────────────────────────────────────────────
// PASTA DETAIL
// ──────────────────────────────────────────────────────────────────────
function abrirPasta(numero) {
  const p = state.pastas.find(x => x.numero === numero);
  if (!p) return;

  state.currentPastaId = p.id;

  document.getElementById('pastas-list').classList.add('hidden');
  document.getElementById('pastas-detail').classList.remove('hidden');
  document.getElementById('pastaNumeroDetalhe').textContent = p.numero;

  const d = id => document.getElementById(id);
  d('pastaAreaBadge').textContent      = p.area || p.tipoServico || '—';
  d('dtlCliente').textContent          = p.cliente ? p.cliente.replace(/;/g, ' · ') : '—';
  d('dtlTipoServico').textContent      = p.tipoServico || '—';
  d('dtlServico').textContent          = p.servico || '—';
  d('dtlParteContraria').textContent   = (p.parteContraria && p.parteContraria !== '-') ? p.parteContraria : '—';
  d('dtlAdvogado').textContent         = p.advogado ? p.advogado.replace(/;/g, ' · ') : '—';

  if (d('dtlDescricao'))         d('dtlDescricao').value        = p.descricao || '';
  if (d('dtlDataDistribuicao'))  d('dtlDataDistribuicao').value = p.dataDistribuicao || '';
  if (d('dtlValorCausa'))        d('dtlValorCausa').value       = p.valorCausa || '';
  if (d('dtlIncluidoPor'))       d('dtlIncluidoPor').value      = p.incluidoPor || '';
  if (d('dtlAreaResp'))          d('dtlAreaResp').innerHTML     = `<option>${escHtml(p.area || '—')}</option>`;
  if (d('dtlAdvResp'))           d('dtlAdvResp').innerHTML      = `<option>${escHtml(p.advogado || '—')}</option>`;

  document.getElementById('instanciaNumero1').textContent  = p.processo || '—';
  document.getElementById('instanciaComarca1').textContent = `Comarca: ${p.comarca || '—'}`;

  document.querySelectorAll('.pasta-tab').forEach(b => b.classList.remove('is-active'));
  document.querySelectorAll('.pasta-pane').forEach(pn => pn.classList.remove('is-active'));
  document.querySelector('.pasta-tab[data-ptab="andamentos"]').classList.add('is-active');
  document.getElementById('ptab-andamentos').classList.add('is-active');

  const btnEditar = document.getElementById('pastaEditarBtn');
  if (btnEditar) btnEditar.onclick = () => abrirModalNovaPasta(p.numero);

  carregarAndamentosCNJ(p.id);
  renderPrazosNaPasta();
  renderSolicitacoesNaPasta();
  renderTarefasNaPasta();
}

// ──────────────────────────────────────────────────────────────────────
// RENDER ESPELHO — Prazos, Solicitações e Tarefas da pasta
// ──────────────────────────────────────────────────────────────────────
function renderPrazosNaPasta() {
  const id = state.currentPastaId;
  if (!id) return;
  const lista = state.prazos.filter(p => p.pastaId === id);
  const tbody = document.getElementById('ptabPrazosBody');
  const count = document.getElementById('ptabPrazosCount');
  if (!tbody) return;
  if (count) count.textContent = `${lista.length} prazo${lista.length !== 1 ? 's' : ''}`;
  tbody.innerHTML = lista.length
    ? lista.map(p => {
      const id = escAttr(p.id);
      return `<tr class="${rowClassPrazo(p.prazoFatal)}">
        <td>${escHtml(p.tipoPrazo)}</td>
        <td>${formatDate(p.prazoFatal)}</td>
        <td>${diasRestantesHtml(p.prazoFatal)}</td>
        <td style="max-width:200px;font-size:.76rem">${escHtml(p.descricao || '—')}</td>
        <td>${avatarGroup(p.responsavel)}</td>
        <td><span class="status-pill ${statusClass(p.status)}">${escHtml(p.status)}</span></td>
        <td>${podeEditarRegistro() ? `<div class="row-actions">
          <button class="btn-icon" title="Editar" onclick="event.stopPropagation();abrirModalNovoPrazo('${id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          ${podeExcluirRegistro() ? `<button class="btn-icon btn-icon--danger" title="Excluir" onclick="event.stopPropagation();excluirPrazo('${id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
          </button>` : ''}
        </div>` : ''}</td>
      </tr>`;
    }).join('')
    : `<tr><td colspan="7" class="tbl-empty">Nenhum prazo vinculado a esta pasta.</td></tr>`;
}

function renderSolicitacoesNaPasta() {
  const id = state.currentPastaId;
  if (!id) return;
  const lista = state.prazos.filter(p => p.pastaId === id);
  const pendentes  = lista.filter(p => p.status === 'Pendente' || p.status === 'Atrasado');
  const andamento  = lista.filter(p => p.status === 'Em andamento');
  const concluidos = lista.filter(p => p.status === 'Concluído');
  const empty = label => `<div class="empty-state">${label}</div>`;

  const makeCard = p => {
    const diff = p.prazoFatal ? daysUntil(p.prazoFatal) : 99;
    const daysCls = diff < 0 ? 'req-days--vencido' : diff <= 3 ? 'req-days--urgente' : diff <= 10 ? 'req-days--aviso' : 'req-days--ok';
    return `<article class="req-card${diff <= 3 ? ' req-card--urgent' : ''}" draggable="true" data-id="${escAttr(p.id)}">
      <div class="req-row-top">
        <div class="req-tags-inline">
          <span class="tag tag--area">Prazo</span>
          <span class="tag tag--type">${escHtml(p.tipoPrazo)}</span>
        </div>
        <span class="req-drag-handle">⠿</span>
      </div>
      <div class="req-row-main"><span class="req-client">${escHtml(p.cliente)}</span></div>
      <div class="req-row-foot">
        <span class="req-days ${daysCls}">${p.prazoFatal ? formatDate(p.prazoFatal) : '—'}</span>
        <div class="req-foot-right">${avatarGroup(p.responsavel)}</div>
      </div>
    </article>`;
  };

  const el = id => document.getElementById(id);
  if (el('ptabSolPendentes'))  el('ptabSolPendentes').innerHTML  = pendentes.length  ? pendentes.map(makeCard).join('')  : empty('Nenhum prazo pendente.');
  if (el('ptabSolAndamento'))  el('ptabSolAndamento').innerHTML  = andamento.length  ? andamento.map(makeCard).join('')  : empty('Nenhum em andamento.');
  if (el('ptabSolConcluido'))  el('ptabSolConcluido').innerHTML  = concluidos.length ? concluidos.map(makeCard).join('') : empty('Nenhum concluído.');
  if (el('ptabSolCountPend'))  el('ptabSolCountPend').textContent  = pendentes.length;
  if (el('ptabSolCountAnd'))   el('ptabSolCountAnd').textContent   = andamento.length;
  if (el('ptabSolCountConc'))  el('ptabSolCountConc').textContent  = concluidos.length;
}

function renderTarefasNaPasta() {
  const id = state.currentPastaId;
  if (!id) return;
  const lista      = state.tarefas.filter(t => t.pastaId === id);
  const pendentes  = lista.filter(t => t.status === 'Pendente');
  const andamento  = lista.filter(t => t.status === 'Em andamento');
  const concluidas = lista.filter(t => t.status === 'Concluída');
  const empty = label => `<div class="empty-state">${label}</div>`;

  const el = id => document.getElementById(id);
  if (el('ptabTarefasCount'))    el('ptabTarefasCount').textContent    = `${lista.length} tarefa${lista.length !== 1 ? 's' : ''}`;
  if (el('ptabTarefPendentes'))  el('ptabTarefPendentes').innerHTML    = pendentes.length  ? pendentes.map(tarefaCard).join('')  : empty('Nenhuma tarefa pendente.');
  if (el('ptabTarefAndamento'))  el('ptabTarefAndamento').innerHTML    = andamento.length  ? andamento.map(tarefaCard).join('')  : empty('Nenhuma em andamento.');
  if (el('ptabTarefConcluidas')) el('ptabTarefConcluidas').innerHTML   = concluidas.length ? concluidas.map(tarefaCard).join('') : empty('Nenhuma concluída.');
  if (el('ptabTarefCountPend'))  el('ptabTarefCountPend').textContent  = pendentes.length;
  if (el('ptabTarefCountAnd'))   el('ptabTarefCountAnd').textContent   = andamento.length;
  if (el('ptabTarefCountConc'))  el('ptabTarefCountConc').textContent  = concluidas.length;
}

function abrirModalNovoPrazoNaPasta() {
  abrirModalNovoPrazo(null);
  setTimeout(() => {
    const sel = document.getElementById('prazoPastaSelect');
    if (sel && state.currentPastaId) {
      sel.value = state.currentPastaId;
      sel.dispatchEvent(new Event('change'));
    }
  }, 50);
}

function abrirModalNovaTarefaNaPasta() {
  abrirModalNovaTarefa(null);
  setTimeout(() => {
    const sel = document.getElementById('tarefaPastaSelect');
    if (sel && state.currentPastaId) sel.value = state.currentPastaId;
  }, 50);
}

document.getElementById('btnVoltarPastas').addEventListener('click', () => {
  document.getElementById('pastas-detail').classList.add('hidden');
  document.getElementById('pastas-list').classList.remove('hidden');
});

document.querySelectorAll('.pasta-tab[data-ptab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pasta-tab').forEach(b => b.classList.remove('is-active'));
    document.querySelectorAll('.pasta-pane').forEach(pn => pn.classList.remove('is-active'));
    btn.classList.add('is-active');
    btn.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    document.getElementById(`ptab-${btn.dataset.ptab}`)?.classList.add('is-active');
    if (btn.dataset.ptab === 'documentos')    carregarDocumentos(state.currentPastaId);
    if (btn.dataset.ptab === 'prazos')        renderPrazosNaPasta();
    if (btn.dataset.ptab === 'solicitacoes')  renderSolicitacoesNaPasta();
    if (btn.dataset.ptab === 'tarefas')       { renderTarefasNaPasta(); initMobileKanbanNav(); }
  });
});

// Botão "›": ativa a última aba e só aparece quando o container tem overflow
const _tabNav = document.querySelector('.pasta-tabs');
const _tabMore = document.querySelector('.pasta-tab-more');

function _updateTabMoreVisibility() {
  if (!_tabNav || !_tabMore) return;
  _tabMore.style.display = _tabNav.scrollWidth > _tabNav.clientWidth + 2 ? '' : 'none';
}

if (_tabMore) {
  _tabMore.addEventListener('click', () => {
    const tabs = document.querySelectorAll('.pasta-tab[data-ptab]');
    tabs[tabs.length - 1]?.click();
  });
}

window.addEventListener('resize', _updateTabMoreVisibility);
_updateTabMoreVisibility();

document.getElementById('sidebarCollapseBtn').addEventListener('click', () => {
  const sidebar = document.getElementById('pastaSidebar');
  const btn     = document.getElementById('sidebarCollapseBtn');
  sidebar.classList.toggle('is-collapsed');
  btn.textContent = sidebar.classList.contains('is-collapsed') ? '›' : '‹';
});

document.getElementById('pastaPgAnterior').addEventListener('click', () => {
  if (pastaPagAtual > 1) { pastaPagAtual--; renderPastaList(); }
});
document.getElementById('pastaPgProxima').addEventListener('click', () => {
  pastaPagAtual++; renderPastaList();
});
document.getElementById('pastaPagina').addEventListener('change', e => {
  pastaPagAtual = Number(e.target.value); renderPastaList();
});
document.getElementById('pastaLinhasPorPagina').addEventListener('change', e => {
  pastaLinhas = Number(e.target.value); pastaPagAtual = 1; renderPastaList();
});
document.getElementById('buscaPasta').addEventListener('input', () => {
  pastaPagAtual = 1; renderPastaList();
});

// ── Máscara de moeda ──────────────────────────────────────────────────
{ const el = document.getElementById('pValorCausa'); if (el) formatarInputMoeda(el); }
