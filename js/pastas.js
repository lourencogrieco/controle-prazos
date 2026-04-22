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
      `<option value="${a.id}" ${a.id === atual ? 'selected' : ''}>${a.nome}</option>`
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
      `<option value="${t.codigo}">${t.codigo} — ${t.nome}</option>`
    ).join('');
  atualizarPreviewNumero();
}

function popularDropdownClientes() {
  const sel = document.getElementById('pClienteSelect');
  const atual = sel.value;
  sel.innerHTML = '<option value="">— digitar manualmente —</option>' +
    state.clientes.map(c =>
      `<option value="${c.id}" data-nome="${c.nome}" ${c.id === atual ? 'selected' : ''}>${c.nome}</option>`
    ).join('');
}

function popularSelectsPastas() {
  const opts = '<option value="">— sem pasta vinculada —</option>' +
    state.pastas.map(p => `<option value="${p.id}">${p.numero} — ${p.cliente}</option>`).join('');
  ['prazoPastaSelect', 'tarefaPastaSelect'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
}

function abrirModalNovaPasta(numero) {
  const p = numero ? state.pastas.find(x => x.numero === numero) : null;
  document.getElementById('tituloPastaModal').textContent = p ? 'Editar Pasta' : 'Nova Pasta';
  document.getElementById('pastaId').value = p?.id || '';
  document.getElementById('pAno').value    = new Date().getFullYear();

  popularDropdownAreas();
  popularDropdownClientes();

  if (p) {
    document.getElementById('pAreaPasta').value = p.areaId || '';
    popularDropdownTipos();
    document.getElementById('pTipoPasta').value = p.codigoTipo || '';
    document.getElementById('pastaNumeroValor').textContent = p.numero;
  } else {
    popularDropdownTipos();
  }

  document.getElementById('pCliente').value        = p?.cliente || '';
  document.getElementById('pClienteSelect').value  = p?.clienteId || '';
  document.getElementById('pParteContraria').value = (p?.parteContraria !== '-') ? (p?.parteContraria || '') : '';
  document.getElementById('pCategoria').value      = p?.tipoServico || '';
  document.getElementById('pTipoAcao').value       = p?.servico || '';
  document.getElementById('pAdvogado').value       = p?.advogado || '';
  document.getElementById('pComarca').value        = p?.comarca || '';
  document.getElementById('pProcesso').value       = p?.processo || '';
  document.getElementById('pValorCausa').value     = p?.valorCausa || '';
  document.getElementById('pObs').value            = p?.descricao || '';
  document.getElementById('pDataAb').value         = p?.dataDistribuicao
    ? p.dataDistribuicao.split('/').reverse().join('-') : '';
  document.getElementById('modalNovaPasta').classList.add('open');
}

function fecharModalNovaPasta() {
  document.getElementById('modalNovaPasta').classList.remove('open');
  document.getElementById('novaPastaForm').reset();
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

document.getElementById('pClienteSelect').addEventListener('change', e => {
  const sel = e.target;
  const clienteId = sel.value;
  const pCliente = document.getElementById('pCliente');
  if (clienteId) {
    const optText = sel.options[sel.selectedIndex].text;
    const c = state.clientes.find(x => x.id === clienteId);
    pCliente.value = c?.nome || optText || '';
    pCliente.removeAttribute('required');
  } else {
    pCliente.value = '';
    pCliente.setAttribute('required', '');
  }
});

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

    const selectedClienteId = document.getElementById('pClienteSelect')?.value || '';
    const selectedCliente   = state.clientes.find(c => c.id === selectedClienteId);
    const clienteNome = selectedCliente?.nome
      || document.getElementById('pCliente')?.value.trim()
      || 'N/A';
    const obj = pastaParaDb({
      id:               pastaId || uid(),
      numero,
      codigoSIA:        '-',
      cliente:          clienteNome,
      parteContraria:   document.getElementById('pParteContraria')?.value.trim() || '-',
      tipoServico:      document.getElementById('pCategoria').value,
      servico:          document.getElementById('pTipoAcao')?.value.trim() || '',
      advogado:         document.getElementById('pAdvogado')?.value.trim() || '',
      comarca:          document.getElementById('pComarca')?.value.trim() || '',
      processo:         document.getElementById('pProcesso')?.value.trim() || '',
      valorCausa:       document.getElementById('pValorCausa')?.value.trim() || 'R$ 0,00',
      area:             areaNome,
      descricao:        document.getElementById('pObs')?.value.trim() || '',
      dataDistribuicao: document.getElementById('pDataAb')?.value || null,
      incluidoPor:      state.meuPerfil?.nome || '',
      status:           'ativo',
    });
    obj.codigo_tipo = codigoTipo ? Number(codigoTipo) : null;
    obj.area_id     = areaId || null;
    obj.cliente_id  = document.getElementById('pClienteSelect')?.value || null;

    const { error } = await db.from('pastas').upsert(obj);
    if (error) { toast('Erro ao salvar: ' + error.message, 'error'); return; }
    fecharModalNovaPasta();
    toast('Pasta salva com sucesso');
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
  const { error } = await db.from('pastas').delete()
    .eq('id', id).eq('empresa_id', state.empresaId);
  if (error) { toast('Erro ao excluir: ' + error.message, 'error'); return; }
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

function renderPastaList() {
  const lista   = pastasVisiveis();
  const total   = lista.length;
  const pages   = Math.max(1, Math.ceil(total / pastaLinhas));
  pastaPagAtual = Math.min(pastaPagAtual, pages);
  const inicio  = (pastaPagAtual - 1) * pastaLinhas;
  const slice   = lista.slice(inicio, inicio + pastaLinhas);

  document.getElementById('tabelaPastasBody').innerHTML = slice.map(p => `
    <tr data-pasta="${p.numero}">
      <td><input type="checkbox" onclick="event.stopPropagation()"></td>
      <td><span class="pasta-link">${p.numero}</span></td>
      <td class="pasta-client">${p.cliente}</td>
      <td>${p.parteContraria}</td>
      <td style="font-family:'IBM Plex Mono',monospace;font-size:.72rem">${p.processo || '—'}</td>
      <td>${p.tipoServico}</td>
      <td>${p.servico}</td>
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
  d('dtlCliente').textContent          = p.cliente || '—';
  d('dtlTipoServico').textContent      = p.tipoServico || '—';
  d('dtlServico').textContent          = p.servico || '—';
  d('dtlParteContraria').textContent   = (p.parteContraria && p.parteContraria !== '-') ? p.parteContraria : '—';
  d('dtlAdvogado').textContent         = p.advogado || '—';

  if (d('dtlDescricao'))         d('dtlDescricao').value        = p.descricao || '';
  if (d('dtlDataDistribuicao'))  d('dtlDataDistribuicao').value = p.dataDistribuicao || '';
  if (d('dtlValorCausa'))        d('dtlValorCausa').value       = p.valorCausa || '';
  if (d('dtlIncluidoPor'))       d('dtlIncluidoPor').value      = p.incluidoPor || '';
  if (d('dtlAreaResp'))          d('dtlAreaResp').innerHTML     = `<option>${p.area || '—'}</option>`;
  if (d('dtlAdvResp'))           d('dtlAdvResp').innerHTML      = `<option>${p.advogado || '—'}</option>`;

  document.getElementById('instanciaNumero1').textContent  = p.processo || '—';
  document.getElementById('instanciaComarca1').textContent = `Comarca: ${p.comarca || '—'}`;

  document.querySelectorAll('.pasta-tab').forEach(b => b.classList.remove('is-active'));
  document.querySelectorAll('.pasta-pane').forEach(pn => pn.classList.remove('is-active'));
  document.querySelector('.pasta-tab[data-ptab="andamentos"]').classList.add('is-active');
  document.getElementById('ptab-andamentos').classList.add('is-active');

  const btnEditar = document.getElementById('pastaEditarBtn');
  if (btnEditar) btnEditar.onclick = () => abrirModalNovaPasta(p.numero);

  carregarAndamentosCNJ(p.id);
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
    document.getElementById(`ptab-${btn.dataset.ptab}`)?.classList.add('is-active');
    if (btn.dataset.ptab === 'documentos') carregarDocumentos(state.currentPastaId);
  });
});

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
