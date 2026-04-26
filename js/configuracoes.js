// ──────────────────────────────────────────────────────────────────────
// CRUD — ÁREAS JURÍDICAS
// ──────────────────────────────────────────────────────────────────────
function renderListaAreas() {
  const el = document.getElementById('listaAreas');
  if (!state.areas.length) {
    el.innerHTML = '<p style="color:var(--mu);font-size:var(--text-sm)">Nenhuma área cadastrada.</p>';
    return;
  }
  el.innerHTML = `<table style="width:100%;border-collapse:collapse">
    <tbody>${state.areas.map(a => `
      <tr>
        <td style="padding:6px 8px;font-size:.875rem;font-weight:600">${escHtml(a.nome)}</td>
        <td style="padding:6px 4px;text-align:right">
          <button onclick="excluirArea('${escAttr(a.id)}')" style="background:none;border:none;color:var(--mu);cursor:pointer;font-size:.9rem" title="Excluir">✕</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function abrirModalAreas() {
  renderListaAreas();
  document.getElementById('modalAreas').classList.add('open');
}

function fecharModalAreas() {
  document.getElementById('modalAreas').classList.remove('open');
  document.getElementById('novaAreaForm').reset();
  popularDropdownAreas();
}

document.getElementById('btnGerenciarAreas').addEventListener('click', abrirModalAreas);
document.getElementById('fecharAreas').addEventListener('click', fecharModalAreas);
document.getElementById('modalAreas').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModalAreas();
});

document.getElementById('novaAreaForm').addEventListener('submit', async e => {
  e.preventDefault();
  const nome = document.getElementById('areaNome').value.trim();
  if (state.areas.some(a => a.nome.toLowerCase() === nome.toLowerCase())) {
    toast('Área já existe', 'error'); return;
  }
  const obj = { id: uid(), empresa_id: state.empresaId, nome, ordem: state.areas.length + 1 };
  const { error } = await db.from('areas_juridicas').insert(obj);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  _cacheInvalidar(`lhub_areas_${state.empresaId}`);
  toast('Área adicionada');
  e.target.reset();
  state.areas.push(dbParaArea(obj));
  renderListaAreas();
  popularDropdownAreas();
  // Atualiza select de área no modal de tipos
  const tipoAreaSel = document.getElementById('tipoArea');
  if (tipoAreaSel) popularSelectAreaTipos();
});

async function excluirArea(id) {
  const usada = state.tiposPasta.some(t => t.areaId === id);
  if (usada) { toast('Remova os tipos desta área antes de excluí-la', 'error'); return; }
  if (!confirm('Excluir esta área?')) return;
  const { error } = await db.from('areas_juridicas').delete().eq('id', id).eq('empresa_id', state.empresaId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  _cacheInvalidar(`lhub_areas_${state.empresaId}`);
  state.areas = state.areas.filter(a => a.id !== id);
  renderListaAreas();
  popularDropdownAreas();
  toast('Área excluída');
}

// ──────────────────────────────────────────────────────────────────────
// CRUD — TIPOS DE PASTA
// ──────────────────────────────────────────────────────────────────────
function popularSelectAreaTipos() {
  const sel = document.getElementById('tipoArea');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecionar área…</option>' +
    state.areas.map(a => `<option value="${escAttr(a.id)}">${escHtml(a.nome)}</option>`).join('');
}

function renderListaTipos() {
  const el = document.getElementById('listaTiposPasta');
  if (!state.tiposPasta.length) {
    el.innerHTML = '<p style="color:var(--mu);font-size:var(--text-sm)">Nenhum tipo cadastrado.</p>';
    return;
  }
  const areaNome = id => state.areas.find(a => a.id === id)?.nome || '—';
  el.innerHTML = `<table style="width:100%;border-collapse:collapse">
    <thead><tr>
      <th style="text-align:left;padding:4px 8px;font-size:.7rem;color:var(--mu);font-family:'IBM Plex Mono',monospace;text-transform:uppercase;border-bottom:1px solid var(--br)">Área</th>
      <th style="text-align:left;padding:4px 8px;font-size:.7rem;color:var(--mu);font-family:'IBM Plex Mono',monospace;text-transform:uppercase;border-bottom:1px solid var(--br)">Cód.</th>
      <th style="text-align:left;padding:4px 8px;font-size:.7rem;color:var(--mu);font-family:'IBM Plex Mono',monospace;text-transform:uppercase;border-bottom:1px solid var(--br)">Nome</th>
      <th style="width:36px;border-bottom:1px solid var(--br)"></th>
    </tr></thead>
    <tbody>${state.tiposPasta.map(t => `
      <tr>
        <td style="padding:6px 8px;font-size:.78rem;color:var(--mu)">${escHtml(areaNome(t.areaId))}</td>
        <td style="padding:6px 8px;font-weight:700;font-family:'IBM Plex Mono',monospace;font-size:.82rem">${escHtml(t.codigo)}</td>
        <td style="padding:6px 8px;font-size:.875rem">${escHtml(t.nome)}</td>
        <td style="padding:6px 8px">
          <button onclick="excluirTipoPasta('${escAttr(t.id)}')" style="background:none;border:none;color:var(--mu);cursor:pointer;font-size:.9rem" title="Excluir">✕</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function abrirModalTiposPasta() {
  popularSelectAreaTipos();
  renderListaTipos();
  document.getElementById('modalTiposPasta').classList.add('open');
}

function fecharModalTiposPasta() {
  document.getElementById('modalTiposPasta').classList.remove('open');
  document.getElementById('novoTipoForm').reset();
}

document.getElementById('btnGerenciarTipos').addEventListener('click', abrirModalTiposPasta);
document.getElementById('fecharTiposPasta').addEventListener('click', fecharModalTiposPasta);
document.getElementById('modalTiposPasta').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModalTiposPasta();
});

document.getElementById('novoTipoForm').addEventListener('submit', async e => {
  e.preventDefault();
  const areaId = document.getElementById('tipoArea').value;
  const codigo = Number(document.getElementById('tipoCodigo').value);
  const nome   = document.getElementById('tipoNome').value.trim();

  if (state.tiposPasta.some(t => t.areaId === areaId && t.codigo === codigo)) {
    toast(`Código ${codigo} já existe nesta área`, 'error'); return;
  }

  const obj = { id: uid(), empresa_id: state.empresaId, codigo, nome, area_id: areaId };
  const { error } = await db.from('tipos_pasta').insert(obj);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  _cacheInvalidar(`lhub_tipos_${state.empresaId}`);
  toast('Tipo adicionado');
  e.target.reset();
  state.tiposPasta.push({ id: obj.id, codigo, nome, areaId });
  state.tiposPasta.sort((a, b) => a.codigo - b.codigo);
  renderListaTipos();
});

async function excluirTipoPasta(id) {
  if (!confirm('Excluir este tipo de pasta?')) return;
  const { error } = await db.from('tipos_pasta').delete().eq('id', id).eq('empresa_id', state.empresaId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  _cacheInvalidar(`lhub_tipos_${state.empresaId}`);
  state.tiposPasta = state.tiposPasta.filter(t => t.id !== id);
  renderListaTipos();
  popularDropdownTipos();
  toast('Tipo excluído');
}

// ──────────────────────────────────────────────────────────────────────
// CRUD — CLIENTES
// ──────────────────────────────────────────────────────────────────────
function abrirModalNovoCliente(contexto, cliente) {
  const g = id => document.getElementById(id);
  g('clienteId').value   = cliente?.id || '';
  g('cNome').value       = cliente?.nome || '';
  const radio = document.querySelector(`input[name="cTipo"][value="${cliente?.tipo || 'PJ'}"]`);
  if (radio) radio.checked = true;
  g('cCpfCnpj').value    = cliente?.cpfCnpj || '';
  g('cTelefone').value   = cliente?.telefone || '';
  g('cEmail').value      = cliente?.email || '';
  if (g('cRua'))         g('cRua').value         = cliente?.rua || '';
  if (g('cNumero'))      g('cNumero').value       = cliente?.numero || '';
  if (g('cComplemento')) g('cComplemento').value  = cliente?.complemento || '';
  if (g('cBairro'))      g('cBairro').value       = cliente?.bairro || '';
  if (g('cCep'))         g('cCep').value          = cliente?.cep || '';
  if (g('cCidade'))      g('cCidade').value       = cliente?.cidade || '';
  if (g('cEstado'))      g('cEstado').value       = cliente?.estado || '';
  g('tituloClienteModal').textContent = cliente ? 'Editar Cliente' : 'Novo Cliente';
  g('_clienteContexto').value = contexto || '';
  g('modalNovoCliente').classList.add('open');
}

function fecharModalNovoCliente() {
  document.getElementById('modalNovoCliente').classList.remove('open');
  document.getElementById('novoClienteForm').reset();
}

document.getElementById('btnNovoClientePasta').addEventListener('click', () => abrirModalNovoCliente('pasta'));
document.getElementById('fecharNovoCliente').addEventListener('click', fecharModalNovoCliente);
document.getElementById('btnCancelarCliente').addEventListener('click', fecharModalNovoCliente);
document.getElementById('modalNovoCliente').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModalNovoCliente();
});

document.getElementById('novoClienteForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarCliente');
  btn.disabled = true; btn.textContent = 'Salvando…';

  try {
    const g = id => document.getElementById(id);
    const existingId = g('clienteId')?.value || '';
    const tipoChecked = document.querySelector('input[name="cTipo"]:checked');
    if (!tipoChecked) { toast('Selecione o tipo (PF ou PJ).', 'error'); return; }
    const obj = {
      id:          existingId || uid(),
      empresa_id:  state.empresaId,
      nome:        g('cNome').value.trim().toUpperCase(),
      tipo:        tipoChecked.value,
      cpf_cnpj:    g('cCpfCnpj')?.value?.trim() || null,
      telefone:    g('cTelefone')?.value?.trim() || null,
      email:       g('cEmail')?.value?.trim() || null,
      rua:         g('cRua')?.value?.trim() || null,
      numero:      g('cNumero')?.value?.trim() || null,
      complemento: g('cComplemento')?.value?.trim() || null,
      bairro:      g('cBairro')?.value?.trim() || null,
      cep:         g('cCep')?.value?.trim() || null,
      cidade:      g('cCidade')?.value?.trim() || null,
      estado:      g('cEstado')?.value || null,
    };

    const { error } = await salvarRegistroEmpresa('clientes_lhub', obj, existingId, 'Sem resposta do banco em 12s. Verifique as políticas RLS da tabela clientes_lhub.');
    if (error) { toast('Erro: ' + error.message, 'error'); return; }

    if (existingId) {
      const idx = state.clientes.findIndex(c => c.id === existingId);
      if (idx !== -1) state.clientes[idx] = dbParaCliente(obj);
    } else {
      state.clientes.push(dbParaCliente(obj));
    }
    state.clientes.sort((a, b) => a.nome.localeCompare(b.nome));
    popularDropdownClientes();
    if (document.getElementById('listaClientes')) renderListaClientes();

    const ctx = g('_clienteContexto')?.value;
    fecharModalNovoCliente();
    toast(existingId ? 'Cliente atualizado' : 'Cliente cadastrado');

    if (ctx === 'pasta') {
      // Adiciona o novo cliente como chip no picker da pasta
      const chipsEl = document.querySelector('#pastaClientePicker .resp-chips');
      if (chipsEl && !Array.from(chipsEl.querySelectorAll('.resp-chip')).some(c => c.dataset.nome === obj.nome)) {
        chipsEl.insertAdjacentHTML('beforeend', _respChipHTML(obj.nome));
      }
      // Remove do dropdown para evitar duplicata
      const addSel = document.querySelector('#pastaClientePicker .resp-add-select');
      addSel?.querySelector(`option[value="${CSS.escape(obj.nome)}"]`)?.remove();
    } else if (ctx === 'gerenciar') {
      abrirModalGerenciarClientes();
    }
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
    console.error('[cliente] exception:', err);
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar Cliente';
  }
});

// ──────────────────────────────────────────────────────────────────────
// GERENCIAR CLIENTES
// ──────────────────────────────────────────────────────────────────────
let clientesPagAtual = 1;
let clientesLinhas = 10;
let _clientesListSeq = 0;

async function carregarClientesPagina() {
  const busca = postgrestIlikeTerm(document.getElementById('buscaClientesGerenciar')?.value || '');
  const inicio = (clientesPagAtual - 1) * clientesLinhas;
  let query = db.from('clientes_lhub')
    .select('*', { count: 'exact' })
    .eq('empresa_id', state.empresaId)
    .order('nome');

  if (busca) {
    const like = `%${busca}%`;
    query = query.or([
      `nome.ilike.${like}`,
      `cpf_cnpj.ilike.${like}`,
      `telefone.ilike.${like}`,
      `cidade.ilike.${like}`,
      `email.ilike.${like}`,
    ].join(','));
  }

  const { data, count, error } = await query.range(inicio, inicio + clientesLinhas - 1);
  if (error) throw error;
  const lista = (data || []).map(dbParaCliente);
  lista.forEach(c => _stateUpsert(state.clientes, c));
  state.clientes.sort((a, b) => a.nome.localeCompare(b.nome));
  return { lista, total: count ?? lista.length };
}

async function renderListaClientes() {
  const seq = ++_clientesListSeq;
  const el = document.getElementById('listaClientes');
  if (!el) return;
  el.innerHTML = '<p style="color:var(--mu);font-size:var(--text-sm);padding:8px 0">Carregando clientes…</p>';

  let clientes = [];
  let total = 0;
  try {
    ({ lista: clientes, total } = await carregarClientesPagina());
  } catch (err) {
    if (seq !== _clientesListSeq) return;
    el.innerHTML = `<p style="color:var(--danger);font-size:var(--text-sm);padding:8px 0">Erro ao carregar clientes: ${escHtml(err.message)}</p>`;
    return;
  }
  if (seq !== _clientesListSeq) return;

  const pages = Math.max(1, Math.ceil(total / clientesLinhas));
  if (clientesPagAtual > pages) {
    clientesPagAtual = pages;
    renderListaClientes();
    return;
  }
  const inicio = (clientesPagAtual - 1) * clientesLinhas;
  const fim = Math.min(inicio + clientesLinhas, total);
  const info = document.getElementById('clientesPaginacaoInfo');
  if (info) info.textContent = total ? `Exibindo ${inicio + 1} - ${fim} de ${total}` : '0 registros';
  const pgSel = document.getElementById('clientesPagina');
  if (pgSel) {
    pgSel.innerHTML = Array.from({ length: pages }, (_, i) =>
      `<option value="${i + 1}" ${i + 1 === clientesPagAtual ? 'selected' : ''}>${i + 1}</option>`
    ).join('');
  }
  const totalPg = document.getElementById('clientesTotalPaginas');
  if (totalPg) totalPg.textContent = `de ${pages}`;
  const btnAnt = document.getElementById('clientesPgAnterior');
  const btnProx = document.getElementById('clientesPgProxima');
  if (btnAnt) btnAnt.disabled = clientesPagAtual <= 1;
  if (btnProx) btnProx.disabled = clientesPagAtual >= pages;

  if (!clientes.length) {
    el.innerHTML = '<p style="color:var(--mu);font-size:var(--text-sm);padding:8px 0">Nenhum cliente cadastrado.</p>';
    return;
  }
  el.innerHTML = `<table style="width:100%;border-collapse:collapse">
    <thead><tr>
      <th style="text-align:left;padding:5px 8px;font-size:.68rem;color:var(--mu);font-family:'IBM Plex Mono',monospace;text-transform:uppercase;border-bottom:1px solid var(--br)">Nome</th>
      <th style="text-align:left;padding:5px 8px;font-size:.68rem;color:var(--mu);font-family:'IBM Plex Mono',monospace;text-transform:uppercase;border-bottom:1px solid var(--br)">Tipo</th>
      <th style="text-align:left;padding:5px 8px;font-size:.68rem;color:var(--mu);font-family:'IBM Plex Mono',monospace;text-transform:uppercase;border-bottom:1px solid var(--br)">Telefone</th>
      <th style="text-align:left;padding:5px 8px;font-size:.68rem;color:var(--mu);font-family:'IBM Plex Mono',monospace;text-transform:uppercase;border-bottom:1px solid var(--br)">Cidade</th>
      <th style="width:72px;border-bottom:1px solid var(--br)"></th>
    </tr></thead>
    <tbody>${clientes.map(c => `
      <tr>
        <td style="padding:6px 8px;font-size:.82rem;font-weight:600">${escHtml(c.nome)}</td>
        <td style="padding:6px 8px;font-size:.78rem;color:var(--mu)">${escHtml(c.tipo)}</td>
        <td style="padding:6px 8px;font-size:.78rem;color:var(--mu)">${escHtml(c.telefone || '—')}</td>
        <td style="padding:6px 8px;font-size:.78rem;color:var(--mu)">${escHtml(c.cidade || '—')}</td>
        <td style="padding:6px 8px;display:flex;gap:6px">
          <button onclick="editarCliente('${escAttr(c.id)}')" style="background:none;border:none;color:var(--mu);cursor:pointer;font-size:.85rem" title="Editar">✎</button>
          <button onclick="excluirCliente('${escAttr(c.id)}')" style="background:none;border:none;color:var(--mu);cursor:pointer;font-size:.85rem" title="Excluir">✕</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function editarCliente(id) {
  const c = state.clientes.find(x => x.id === id);
  if (!c) return;
  document.getElementById('modalGerenciarClientes').classList.remove('open');
  abrirModalNovoCliente('gerenciar', c);
}

async function excluirCliente(id) {
  if (!confirm('Excluir este cliente?')) return;
  const { error } = await db.from('clientes_lhub').delete().eq('id', id).eq('empresa_id', state.empresaId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  state.clientes = state.clientes.filter(c => c.id !== id);
  popularDropdownClientes();
  renderListaClientes();
  toast('Cliente excluído');
}

function abrirModalGerenciarClientes() {
  renderListaClientes();
  document.getElementById('modalGerenciarClientes').classList.add('open');
}

function fecharModalGerenciarClientes() {
  document.getElementById('modalGerenciarClientes').classList.remove('open');
}
document.getElementById('modalGerenciarClientes').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModalGerenciarClientes();
});
document.getElementById('buscaClientesGerenciar')?.addEventListener('input', () => {
  clientesPagAtual = 1;
  renderListaClientes();
});
document.getElementById('clientesLinhasPorPagina')?.addEventListener('change', e => {
  clientesLinhas = Number(e.target.value) || 10;
  clientesPagAtual = 1;
  renderListaClientes();
});
document.getElementById('clientesPagina')?.addEventListener('change', e => {
  clientesPagAtual = Number(e.target.value) || 1;
  renderListaClientes();
});
document.getElementById('clientesPgAnterior')?.addEventListener('click', () => {
  if (clientesPagAtual > 1) {
    clientesPagAtual--;
    renderListaClientes();
  }
});
document.getElementById('clientesPgProxima')?.addEventListener('click', () => {
  clientesPagAtual++;
  renderListaClientes();
});

// ──────────────────────────────────────────────────────────────────────
// PERSONALIZAÇÃO / TEMA
// ──────────────────────────────────────────────────────────────────────
const TEMA_KEY_LEGADO = 'lhub_tema';
const TEMA_PADRAO = {
  primary: '#08505D',
  accent: '#BCC2C5',
  logoUrl: 'logo.svg',
};

function temaStorageKey() {
  return state.empresaId ? `lhub_tema_${state.empresaId}` : TEMA_KEY_LEGADO;
}

function normalizarHex(hex, fallback) {
  return /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : fallback;
}

function lerTemaSalvo() {
  try {
    const chave = temaStorageKey();
    const raw = localStorage.getItem(chave)
      || (state.empresaId ? localStorage.getItem(TEMA_KEY_LEGADO) : null);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function salvarTemaSalvo(tema) {
  localStorage.setItem(temaStorageKey(), JSON.stringify(tema));
  if (state.empresaId) localStorage.removeItem(TEMA_KEY_LEGADO);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return { r, g, b };
}

function lighten(hex, pct) {
  const { r, g, b } = hexToRgb(hex);
  const f = pct / 100;
  return `rgb(${Math.round(r+(255-r)*f)},${Math.round(g+(255-g)*f)},${Math.round(b+(255-b)*f)})`;
}

function aplicarTema(tema = {}) {
  const root = document.documentElement;
  const primary = normalizarHex(tema.primary, TEMA_PADRAO.primary);
  const accent = normalizarHex(tema.accent, TEMA_PADRAO.accent);

  root.style.setProperty('--navy',     primary);
  root.style.setProperty('--navy-mid', primary);
  root.style.setProperty('--ac',       primary);
  root.style.setProperty('--ac-soft',  lighten(primary, 88));
  root.style.setProperty('--gold',      accent);
  root.style.setProperty('--gold-soft', lighten(accent, 82));

  const logoUrl = tema.logoUrl && tema.logoUrl !== 'logo.png' ? tema.logoUrl : TEMA_PADRAO.logoUrl;
  const img = document.getElementById('brandLogo');
  const fallback = document.getElementById('brandLogoFallback');
  if (img) { img.src = logoUrl; img.style.display = ''; }
  if (fallback) fallback.style.display = 'none';
}

function aplicarTemaSalvo() {
  aplicarTema(lerTemaSalvo());
}

aplicarTemaSalvo();

function abrirModalConfig() {
  const t = lerTemaSalvo();
  const primary = normalizarHex(t.primary, TEMA_PADRAO.primary);
  const accent  = normalizarHex(t.accent,  TEMA_PADRAO.accent);
  const logoUrl = t.logoUrl && t.logoUrl !== 'logo.png' ? t.logoUrl : '';
  document.getElementById('cfgColorPrimary').value              = primary;
  document.getElementById('cfgColorAccent').value               = accent;
  document.getElementById('cfgLogoUrl').value                   = logoUrl;
  document.getElementById('prevPrimary').style.background       = primary;
  document.getElementById('prevAccent').style.background        = accent;
  document.getElementById('cfgLogoPreviewWrap').style.background = primary;
  document.getElementById('cfgLogoPreview').src                 = logoUrl || TEMA_PADRAO.logoUrl;
  document.getElementById('modalConfig').classList.add('open');
}

document.getElementById('cfgClose').addEventListener('click', () => {
  document.getElementById('modalConfig').classList.remove('open');
});
document.getElementById('cfgColorPrimary').addEventListener('input', e => {
  document.getElementById('prevPrimary').style.background       = e.target.value;
  document.getElementById('cfgLogoPreviewWrap').style.background = e.target.value;
});
document.getElementById('cfgColorAccent').addEventListener('input', e => {
  document.getElementById('prevAccent').style.background = e.target.value;
});
document.getElementById('cfgLogoUrl').addEventListener('input', e => {
  const img = document.getElementById('cfgLogoPreview');
  img.src = e.target.value || TEMA_PADRAO.logoUrl;
  img.style.display = '';
});
document.getElementById('cfgSalvar').addEventListener('click', () => {
  const tema = {
    primary: document.getElementById('cfgColorPrimary').value,
    accent:  document.getElementById('cfgColorAccent').value,
    logoUrl: document.getElementById('cfgLogoUrl').value.trim() || null,
  };
  salvarTemaSalvo(tema);
  aplicarTema(tema);
  document.getElementById('modalConfig').classList.remove('open');
  toast('Configurações salvas');
});
document.getElementById('cfgReset').addEventListener('click', () => {
  localStorage.removeItem(temaStorageKey());
  if (state.empresaId) localStorage.removeItem(TEMA_KEY_LEGADO);
  aplicarTema({});
  document.getElementById('cfgColorPrimary').value              = TEMA_PADRAO.primary;
  document.getElementById('cfgColorAccent').value               = TEMA_PADRAO.accent;
  document.getElementById('cfgLogoUrl').value                   = '';
  document.getElementById('prevPrimary').style.background       = TEMA_PADRAO.primary;
  document.getElementById('prevAccent').style.background        = TEMA_PADRAO.accent;
  document.getElementById('cfgLogoPreviewWrap').style.background = TEMA_PADRAO.primary;
  document.getElementById('cfgLogoPreview').src = TEMA_PADRAO.logoUrl;
  document.getElementById('modalConfig').classList.remove('open');
  toast('Tema restaurado para o padrão');
});

// ──────────────────────────────────────────────────────────────────────
// CONFIGURAÇÕES (view)
// ──────────────────────────────────────────────────────────────────────
async function renderConfiguracoes() {
  // Preenche áreas no select do modal
  const selArea = document.getElementById('convArea');
  if (selArea && state.areas?.length) {
    selArea.innerHTML = '<option value="">— Todas as áreas —</option>' +
      state.areas.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
  }

  // PJe nomes
  const ta = document.getElementById('cfgPjeNomes');
  if (ta && state.pjeConfig?.nomes) ta.value = state.pjeConfig.nomes.join('\n');

  // Usuários
  const { data: usuarios } = await db
    .from('usuarios_empresa')
    .select('id, nome, perfil')
    .eq('empresa_id', state.empresaId)
    .order('nome');

  const tbody = document.getElementById('tbodyUsuarios');
  if (!tbody) return;
  if (!usuarios?.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--mu);padding:20px">Nenhum usuário</td></tr>`;
    return;
  }
  tbody.innerHTML = usuarios.map(u => {
    const perfil    = PERFIS_LABEL[u.perfil] || u.perfil || '—';
    const areaNome  = state.areas.find(a => a.id === u.area_id)?.nome || '—';
    const id = escAttr(u.id);
    return `<tr>
      <td>${escHtml(u.nome || '—')}</td>
      <td><span class="badge-perfil badge-perfil--${escAttr(u.perfil || '')}">${escHtml(perfil)}</span></td>
      <td style="font-size:.78rem;color:var(--mu)">${escHtml(areaNome)}</td>
      <td><button class="btn-icon-sm" onclick="editarPerfil('${id}')">✎</button></td>
    </tr>`;
  }).join('');

  // Carrega audit log (admins/socios apenas)
  renderModelosDocumentos();
  renderAuditLog();
}

async function salvarPjeConfig() {
  const ta = document.getElementById('cfgPjeNomes');
  const nomes = ta.value.split('\n').map(n => n.trim()).filter(Boolean);
  if (!nomes.length) { toast('Informe ao menos um nome.', 'error'); return; }
  const payload = {
    empresa_id: state.empresaId,
    nomes,
    ativo: true,
  };
  const { error } = await db.from('pje_config')
    .upsert(payload, { onConflict: 'empresa_id' });
  if (error) { toast('Erro ao salvar: ' + error.message, 'error'); return; }
  state.pjeConfig = { ...(state.pjeConfig || {}), ...payload };
  toast('Configuração PJe salva!');
}

function abrirModalConvidarUsuario() {
  document.getElementById('modalConvidarUsuario').classList.add('open');
}
function fecharModalConvidarUsuario() {
  document.getElementById('modalConvidarUsuario').classList.remove('open');
  document.getElementById('convNome').value = '';
  document.getElementById('convEmail').value = '';
}

async function convidarUsuario() {
  const nome   = document.getElementById('convNome').value.trim();
  const email  = document.getElementById('convEmail').value.trim();
  const perfil = document.getElementById('convPerfil').value;
  const areaId = document.getElementById('convArea').value || null;
  if (!nome || !email) { toast('Preencha nome e e-mail.', 'error'); return; }

  // Cria registro na usuarios_empresa (sem auth — admin vincula depois)
  const { error } = await db.from('usuarios_empresa').insert({
    empresa_id: state.empresaId,
    nome,
    email,
    perfil,
    area_id: areaId,
  });
  if (error) { toast('Erro ao convidar: ' + error.message, 'error'); return; }
  toast(`${nome} adicionado! Peça para ele criar conta com o e-mail ${email}.`);
  fecharModalConvidarUsuario();
  renderConfiguracoes();
}

function editarPerfil(userId, perfilAtual, nome) {
  const usuario = state.usuarios.find(u => u.id === userId);
  document.getElementById('editPerfilUserId').value = userId;
  document.getElementById('editPerfilNome').textContent = nome || usuario?.nome || userId;
  document.getElementById('editPerfilSelect').value = perfilAtual || usuario?.perfil || 'advogado';
  document.getElementById('modalEditarPerfil').classList.add('open');
}

async function salvarEdicaoPerfil() {
  const userId = document.getElementById('editPerfilUserId').value;
  const perfil = document.getElementById('editPerfilSelect').value;
  if (!userId || userId === 'undefined') {
    toast('ID do usuário inválido — recarregue a página.', 'error');
    return;
  }
  const { error } = await db.rpc('update_user_perfil', { p_id: userId, p_perfil: perfil });
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  document.getElementById('modalEditarPerfil').classList.remove('open');
  toast('Perfil atualizado!');
  renderConfiguracoes();
}

// ──────────────────────────────────────────────────────────────────────
// LOG DE AUDITORIA — visível apenas para perfis admin/socio
// ──────────────────────────────────────────────────────────────────────
const PERFIS_PODE_VER_AUDIT = new Set(['socio_fundador', 'socio', 'controller', 'coordenador']);

async function renderAuditLog() {
  const container = document.getElementById('auditLogContainer');
  if (!container) return;

  const perfil = state.meuPerfil?.perfil || '';
  if (!PERFIS_PODE_VER_AUDIT.has(perfil)) {
    container.closest('.cfg-card').style.display = 'none';
    return;
  }
  container.closest('.cfg-card').style.display = '';

  container.innerHTML = '<p style="color:var(--mu);font-size:.8rem;padding:8px 0">Carregando…</p>';

  const { data, error } = await db
    .from('audit_log')
    .select('acao,tabela,descricao,usuario_nome,criado_em')
    .eq('empresa_id', state.empresaId)
    .order('criado_em', { ascending: false })
    .limit(100);

  if (error) {
    container.innerHTML = `<p style="color:var(--danger);font-size:.8rem">${escHtml(error.message)}</p>`;
    return;
  }
  if (!data?.length) {
    container.innerHTML = '<p style="color:var(--mu);font-size:.8rem;padding:8px 0">Nenhum registro ainda.</p>';
    return;
  }

  const acaoBadge = a => {
    const map = { criar: ['#dcfce7','#166534','Criar'], editar: ['#dbeafe','#1e3a8a','Editar'], excluir: ['#fee2e2','#7f1d1d','Excluir'] };
    const [bg, cor, label] = map[a] || ['#f3f4f6','#374151', a];
    return `<span style="display:inline-block;padding:1px 7px;border-radius:9999px;font-size:.68rem;font-weight:700;background:${bg};color:${cor}">${escHtml(label)}</span>`;
  };

  const tabelaLabel = t => ({ prazos_lhub: 'Prazo', tarefas_lhub: 'Tarefa', pastas: 'Pasta' }[t] || t);

  container.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:.8rem">
      <thead>
        <tr style="border-bottom:1px solid var(--br)">
          <th style="padding:6px 8px;text-align:left;color:var(--mu);font-size:.68rem;text-transform:uppercase">Quando</th>
          <th style="padding:6px 8px;text-align:left;color:var(--mu);font-size:.68rem;text-transform:uppercase">Usuário</th>
          <th style="padding:6px 8px;text-align:left;color:var(--mu);font-size:.68rem;text-transform:uppercase">Ação</th>
          <th style="padding:6px 8px;text-align:left;color:var(--mu);font-size:.68rem;text-transform:uppercase">Módulo</th>
          <th style="padding:6px 8px;text-align:left;color:var(--mu);font-size:.68rem;text-transform:uppercase">Descrição</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(r => {
          const dt = new Date(r.criado_em);
          const quando = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          return `<tr style="border-bottom:1px solid var(--br)">
            <td style="padding:7px 8px;white-space:nowrap;font-family:'IBM Plex Mono',monospace;color:var(--mu)">${escHtml(quando)}</td>
            <td style="padding:7px 8px;font-weight:600">${escHtml(r.usuario_nome || '—')}</td>
            <td style="padding:7px 8px">${acaoBadge(r.acao)}</td>
            <td style="padding:7px 8px;color:var(--mu)">${escHtml(tabelaLabel(r.tabela))}</td>
            <td style="padding:7px 8px;color:var(--fg)">${escHtml(r.descricao || '—')}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ──────────────────────────────────────────────────────────────────────
// MODELOS DE DOCUMENTOS
// ──────────────────────────────────────────────────────────────────────
const MODELO_VARIAVEIS = [
  { grupo: 'Cliente', chave: 'cliente.nome', label: 'Nome' },
  { grupo: 'Cliente', chave: 'cliente.cpf_cnpj', label: 'CPF/CNPJ' },
  { grupo: 'Cliente', chave: 'cliente.email', label: 'E-mail' },
  { grupo: 'Cliente', chave: 'cliente.telefone', label: 'Telefone' },
  { grupo: 'Cliente', chave: 'cliente.endereco', label: 'Endereço completo' },
  { grupo: 'Cliente', chave: 'cliente.cidade', label: 'Cidade' },
  { grupo: 'Cliente', chave: 'cliente.estado', label: 'Estado' },
  { grupo: 'Pasta', chave: 'pasta.numero', label: 'Número da pasta' },
  { grupo: 'Pasta', chave: 'pasta.processo', label: 'Processo' },
  { grupo: 'Pasta', chave: 'pasta.comarca', label: 'Comarca' },
  { grupo: 'Pasta', chave: 'pasta.parte_contraria', label: 'Parte contrária' },
  { grupo: 'Pasta', chave: 'pasta.valor_causa', label: 'Valor da causa' },
];

function modeloEscapeHtml(v) {
  return escHtml(v);
}

function renderModeloVariaveisDisponiveis() {
  const wrap = document.getElementById('modeloVariaveisDisponiveis');
  if (!wrap) return;
  const grupos = [...new Set(MODELO_VARIAVEIS.map(v => v.grupo))];
  wrap.innerHTML = '<strong>Variáveis disponíveis</strong>' + grupos.map(grupo => `
    <div class="modelo-var-group">
      <span class="modelo-var-group-title">${escHtml(grupo)}</span>
      <div class="modelo-var-buttons">
        ${MODELO_VARIAVEIS.filter(v => v.grupo === grupo).map(v => `
          <button type="button" class="modelo-var-chip" onclick="inserirVariavelModelo('${escAttr(v.chave)}')" title="{{${escAttr(v.chave)}}}">
            ${escHtml(v.label)}
          </button>`).join('')}
      </div>
    </div>`).join('');
}

function inserirVariavelModelo(chave) {
  const campo = document.getElementById('modeloConteudo');
  if (!campo) return;
  const token = `{{${chave}}}`;
  const ini = campo.selectionStart ?? campo.value.length;
  const fim = campo.selectionEnd ?? campo.value.length;
  campo.value = `${campo.value.slice(0, ini)}${token}${campo.value.slice(fim)}`;
  const pos = ini + token.length;
  campo.focus();
  campo.setSelectionRange(pos, pos);
  atualizarVariaveisDetectadasModelo();
}

function atualizarVariaveisDetectadasModelo() {
  const lista = document.getElementById('modeloVariaveisDetectadas');
  const campo = document.getElementById('modeloConteudo');
  if (!lista || !campo) return;
  const conhecidas = new Set(MODELO_VARIAVEIS.map(v => v.chave));
  const variaveis = extrairVariaveisModelo(campo.value);
  lista.innerHTML = variaveis.length ? variaveis.map(v => `
    <span class="modelo-detectada ${conhecidas.has(v) ? 'modelo-detectada--ok' : 'modelo-detectada--manual'}">
      {{${modeloEscapeHtml(v)}}}
      <small>${conhecidas.has(v) ? 'auto' : 'manual'}</small>
    </span>`).join('') : '<em>Nenhuma variável detectada.</em>';
}

function renderModelosDocumentos() {
  const tbody = document.getElementById('tbodyModelosDocumentos');
  if (!tbody) return;
  const modelos = state.modelosDocumentos || [];
  tbody.innerHTML = modelos.length ? modelos.map(m => {
    const id = escAttr(m.id);
    return `
    <tr>
      <td><strong>${escHtml(m.nome)}</strong></td>
      <td>${m.categoria ? `<span class="modelo-cat">${escHtml(m.categoria)}</span>` : '—'}</td>
      <td style="max-width:360px;color:var(--mu)">${escHtml(m.descricao || '—')}</td>
      <td>
        <div class="row-actions" style="justify-content:flex-start">
          <button class="btn-link-sm" onclick="abrirModalGerarDocumento('${id}')">Gerar</button>
          <button class="btn-link-sm" onclick="abrirModalModeloDocumento('${id}')">Editar</button>
          <button class="btn-link-sm btn-link-danger" onclick="excluirModeloDocumento('${id}')">Excluir</button>
        </div>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="4" class="tbl-empty">Nenhum modelo cadastrado.</td></tr>';
}

function abrirModalModeloDocumento(id) {
  const m = id ? state.modelosDocumentos.find(x => x.id === id) : null;
  renderModeloVariaveisDisponiveis();
  document.getElementById('modeloModalTitulo').textContent = m ? 'Editar modelo' : 'Novo modelo';
  document.getElementById('modeloId').value = m?.id || '';
  document.getElementById('modeloNome').value = m?.nome || '';
  document.getElementById('modeloCategoria').value = m?.categoria || '';
  document.getElementById('modeloDescricao').value = m?.descricao || '';
  document.getElementById('modeloConteudo').value = m?.conteudo || '';
  atualizarVariaveisDetectadasModelo();
  document.getElementById('modalModeloDocumento').classList.add('open');
}

function fecharModalModeloDocumento() {
  document.getElementById('modalModeloDocumento').classList.remove('open');
  document.getElementById('formModeloDocumento').reset();
}

document.getElementById('formModeloDocumento')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarModelo');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    const id = document.getElementById('modeloId').value;
    const obj = {
      id: id || uid(),
      empresa_id: state.empresaId,
      nome: document.getElementById('modeloNome').value.trim(),
      categoria: document.getElementById('modeloCategoria').value.trim() || null,
      descricao: document.getElementById('modeloDescricao').value.trim() || null,
      conteudo: document.getElementById('modeloConteudo').value,
      updated_at: new Date().toISOString(),
    };
    const { error } = await salvarRegistroEmpresa('modelos_documentos', obj, id, 'Sem resposta ao salvar modelo em 12s');
    if (error) { toast('Erro ao salvar modelo: ' + error.message, 'error'); return; }
    _stateUpsert(state.modelosDocumentos, dbParaModeloDocumento(obj));
    fecharModalModeloDocumento();
    renderModelosDocumentos();
    toast('Modelo salvo!');
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar modelo';
  }
});

document.getElementById('modeloConteudo')?.addEventListener('input', atualizarVariaveisDetectadasModelo);

async function excluirModeloDocumento(id) {
  if (!confirm('Excluir este modelo?')) return;
  const { error } = await db.from('modelos_documentos').delete().eq('id', id).eq('empresa_id', state.empresaId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  _stateRemove(state.modelosDocumentos, id);
  renderModelosDocumentos();
  toast('Modelo excluído.');
}

function montarEnderecoCliente(c) {
  return [c.rua, c.numero, c.complemento, c.bairro, c.cidade, c.estado, c.cep].filter(Boolean).join(', ');
}

function modeloContexto(cliente, pasta, extras = {}) {
  return {
    'cliente.nome': cliente?.nome || '',
    'cliente.cpf_cnpj': cliente?.cpfCnpj || '',
    'cliente.email': cliente?.email || '',
    'cliente.telefone': cliente?.telefone || '',
    'cliente.endereco': montarEnderecoCliente(cliente || {}),
    'cliente.cidade': cliente?.cidade || '',
    'cliente.estado': cliente?.estado || '',
    'pasta.numero': pasta?.numero || '',
    'pasta.processo': pasta?.processo || '',
    'pasta.comarca': pasta?.comarca || '',
    'pasta.parte_contraria': pasta?.parteContraria || '',
    'pasta.valor_causa': pasta?.valorCausa || '',
    ...extras,
  };
}

function extrairVariaveisModelo(texto) {
  return [...new Set([...String(texto || '').matchAll(/{{\s*([^}]+?)\s*}}/g)].map(m => m[1].trim()))];
}

function preencherModelo(texto, ctx) {
  return String(texto || '').replace(/{{\s*([^}]+?)\s*}}/g, (_, key) => ctx[key.trim()] ?? '');
}

function abrirModalGerarDocumento(modeloId) {
  const modelo = state.modelosDocumentos.find(m => m.id === modeloId);
  if (!modelo) return;
  document.getElementById('gerarModeloId').value = modeloId;
  document.getElementById('gerarDocTitulo').textContent = `Gerar: ${modelo.nome}`;
  document.getElementById('gerarClienteSelect').innerHTML =
    '<option value="">— Selecionar cliente —</option>' + state.clientes.map(c => `<option value="${escAttr(c.id)}">${escHtml(c.nome)}</option>`).join('');
  document.getElementById('gerarPastaSelect').innerHTML =
    '<option value="">— Sem processo —</option>' + state.pastas.map(p => `<option value="${escAttr(p.id)}">${escHtml(p.numero)} — ${escHtml(p.cliente)}</option>`).join('');
  renderCamposExtrasModelo(modelo);
  document.getElementById('modalGerarDocumento').classList.add('open');
  atualizarDocumentoGerado();
}

function fecharModalGerarDocumento() {
  document.getElementById('modalGerarDocumento').classList.remove('open');
  document.getElementById('gerarDocumentoResultado').value = '';
}

function renderCamposExtrasModelo(modelo) {
  const wrap = document.getElementById('gerarCamposExtras');
  const conhecidos = new Set(Object.keys(modeloContexto({}, {})));
  const extras = extrairVariaveisModelo(modelo.conteudo).filter(v => !conhecidos.has(v));
  wrap.innerHTML = extras.map(v => `
    <label class="field modelo-extra-field">
      <span class="field-label">{{${modeloEscapeHtml(v)}}}</span>
      <input type="text" data-modelo-var="${escAttr(v)}" placeholder="Preencher ${escAttr(v)}">
    </label>`).join('');
  wrap.querySelectorAll('input').forEach(i => i.addEventListener('input', atualizarDocumentoGerado));
}

function atualizarDocumentoGerado() {
  const modelo = state.modelosDocumentos.find(m => m.id === document.getElementById('gerarModeloId').value);
  if (!modelo) return;
  const cliente = state.clientes.find(c => c.id === document.getElementById('gerarClienteSelect').value) || null;
  const pasta = state.pastas.find(p => p.id === document.getElementById('gerarPastaSelect').value) || null;
  const extras = {};
  document.querySelectorAll('[data-modelo-var]').forEach(i => { extras[i.dataset.modeloVar] = i.value; });
  document.getElementById('gerarDocumentoResultado').value = preencherModelo(modelo.conteudo, modeloContexto(cliente, pasta, extras));
}

document.getElementById('gerarClienteSelect')?.addEventListener('change', atualizarDocumentoGerado);
document.getElementById('gerarPastaSelect')?.addEventListener('change', () => {
  const pasta = state.pastas.find(p => p.id === document.getElementById('gerarPastaSelect').value);
  const clienteSelect = document.getElementById('gerarClienteSelect');
  if (pasta?.clienteId && clienteSelect) clienteSelect.value = pasta.clienteId;
  atualizarDocumentoGerado();
});

async function copiarDocumentoGerado() {
  await navigator.clipboard.writeText(document.getElementById('gerarDocumentoResultado').value || '');
  toast('Documento copiado.');
}

function baixarDocumentoGerado() {
  const blob = new Blob([document.getElementById('gerarDocumentoResultado').value || ''], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'documento_preenchido.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
