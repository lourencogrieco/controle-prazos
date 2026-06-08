"use strict";

// ──────────────────────────────────────────────────────────────────────
// SUPABASE
// ──────────────────────────────────────────────────────────────────────
const SUPA_URL = 'https://gcucadlnxttlxckravui.supabase.co';
const SUPA_KEY = 'sb_publishable_5i0somnwIAvyLNImLSWYxg_yogC3bCb';
const db = supabase.createClient(SUPA_URL, SUPA_KEY);

// ──────────────────────────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────────────────────────
const state = {
  user:             null,
  empresaId:        null,
  meuPerfil:        null,
  pastas:           [],
  prazos:           [],
  tarefas:          [],
  tiposPasta:       [],
  clientes:         [],
  areas:            [],
  intimacoes:       [],
  pjeConfig:        null,
  pjeSyncLogs:      [],
  andamentosCNJ:    [],
  currentPastaId:   null,
  currentAndamento: null,
  usuarios:         [],
  honorarios:       [],
  cobrancas:        [],
  contasPagar:      [],
  despesas:         [],
  oportunidades:    [],
  modelosDocumentos: [],
  intimacaoParaVincularNovaPasta: null,
};

// Declarado aqui (core.js é carregado antes de agenda.js) para que
// carregarDados() em mappers.js possa acessar sem ReferenceError.
const agendaEventos = [];

// ──────────────────────────────────────────────────────────────────────
// PROXY FETCH — fetch autenticado para os proxies da API
// Injeta automaticamente o token Supabase do usuário logado.
// Use no lugar de fetch() ao chamar /api/pje-proxy, /api/cnj-proxy, etc.
// ──────────────────────────────────────────────────────────────────────
async function proxyFetch(url, options = {}) {
  const { data: { session } } = await db.auth.getSession();
  const token = session?.access_token || '';
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`,
    },
  });
}

// ──────────────────────────────────────────────────────────────────────
// ÍNDICE EM MEMÓRIA — busca O(1) de pasta por número de processo
// Reconstruído sempre que state.pastas é recarregado.
// ──────────────────────────────────────────────────────────────────────
const _pastasPorProcesso = new Map();

function _reconstruirIndicePastas(andamentosProcessos) {
  _pastasPorProcesso.clear();
  // Indexar pelo processo principal da pasta
  for (const p of state.pastas) {
    if (p.processo) {
      _pastasPorProcesso.set(p.processo.replace(/\D/g, ''), p);
    }
  }
  // Indexar também pelos processos recursais dos andamentos (CNJ)
  // para que intimações de processos recursais encontrem a pasta correta
  if (andamentosProcessos) {
    const pastaPorId = new Map(state.pastas.map(p => [p.id, p]));
    for (const row of andamentosProcessos) {
      if (row.numero_processo && row.pasta_id) {
        const chave = row.numero_processo.replace(/\D/g, '');
        if (chave && !_pastasPorProcesso.has(chave)) {
          const pasta = pastaPorId.get(row.pasta_id);
          if (pasta) _pastasPorProcesso.set(chave, pasta);
        }
      }
    }
  }
}

function _pastaPorProcesso(numeroProcesso) {
  if (!numeroProcesso) return null;
  return _pastasPorProcesso.get(numeroProcesso.replace(/\D/g, '')) || null;
}

// ──────────────────────────────────────────────────────────────────────
// CACHE localStorage — dados estáticos por empresa (TTL: 60 min)
// ──────────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000;

function _cacheSet(chave, dados) {
  try {
    localStorage.setItem(chave, JSON.stringify({ ts: Date.now(), dados }));
  } catch { /* quota exceeded — ignora silenciosamente */ }
}

function _cacheGet(chave) {
  try {
    const raw = localStorage.getItem(chave);
    if (!raw) return null;
    const { ts, dados } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(chave); return null; }
    return dados;
  } catch { return null; }
}

function _cacheInvalidar(chave) {
  try { localStorage.removeItem(chave); } catch { /* ignora */ }
}

// ──────────────────────────────────────────────────────────────────────
// AUDIT LOG — fire-and-forget, não bloqueia o fluxo principal
// ──────────────────────────────────────────────────────────────────────
function logAuditoria(acao, tabela, registroId, descricao) {
  if (!state.empresaId || !state.user) return;
  const row = {
    empresa_id:   state.empresaId,
    user_id:      state.user.id,
    usuario_nome: state.meuPerfil?.nome || state.user.email || '—',
    acao,
    tabela,
    registro_id:  registroId || null,
    descricao:    descricao  || null,
  };
  db.from('audit_log').insert(row).then(({ error }) => {
    if (error) console.warn('[audit_log] falha ao registrar:', error.message);
  });
}

// ──────────────────────────────────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────────────────────────────────
function uid() {
  return crypto.randomUUID();
}

async function salvarRegistroEmpresa(tabela, obj, existingId, timeoutMsg = 'Sem resposta do banco em 12s') {
  const req = existingId
    ? db.from(tabela).update(obj).eq('id', existingId).eq('empresa_id', state.empresaId)
    : db.from(tabela).insert(obj);
  const tOut = new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutMsg)), 12000));
  return Promise.race([req, tOut]);
}

function normalizarNomeCliente(nome) {
  return String(nome || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function separarNomesClientes(valor) {
  return [...new Set(String(valor || '')
    .split(';')
    .map(normalizarNomeCliente)
    .filter(Boolean))];
}

function inferirTipoCliente(nome) {
  const texto = normalizarNomeCliente(nome);
  const marcadoresPJ = [
    ' LTDA', ' LTDA.', ' S/A', ' S.A', ' EIRELI', ' EPP', ' ME ',
    'ASSOCIACAO', 'ASSOCIAÇÃO', 'EMPRESA', 'COMERCIO', 'COMÉRCIO',
    'INDUSTRIA', 'INDÚSTRIA', 'SERVICOS', 'SERVIÇOS', 'SOCIEDADE',
    'INSTITUTO', 'FUNDACAO', 'FUNDAÇÃO', 'COOPERATIVA', 'MUNICIPIO',
    'MUNICÍPIO', 'ESTADO DE ', 'UNIÃO', 'UNIAO',
  ];
  const padded = ` ${texto} `;
  return marcadoresPJ.some(m => padded.includes(m)) ? 'PJ' : 'PF';
}

function encontrarClientePorNome(nome) {
  const alvo = normalizarNomeCliente(nome);
  if (!alvo) return null;
  return (state.clientes || []).find(c => normalizarNomeCliente(c.nome) === alvo) || null;
}

async function garantirClienteCadastro(nome, opcoes = {}) {
  const nomeNormalizado = normalizarNomeCliente(nome);
  if (!nomeNormalizado || !state.empresaId) return null;

  const existenteLocal = encontrarClientePorNome(nomeNormalizado);
  if (existenteLocal) return existenteLocal;

  const { data: encontrados, error: buscaError } = await db
    .from('clientes_lhub')
    .select('*')
    .eq('empresa_id', state.empresaId)
    .ilike('nome', nomeNormalizado)
    .limit(1);
  if (buscaError) throw buscaError;

  if (encontrados?.length) {
    const cliente = dbParaCliente(encontrados[0]);
    _stateUpsert(state.clientes, cliente);
    state.clientes.sort((a, b) => a.nome.localeCompare(b.nome));
    return cliente;
  }

  const row = {
    id: uid(),
    empresa_id: state.empresaId,
    nome: nomeNormalizado,
    tipo: opcoes.tipo || inferirTipoCliente(nomeNormalizado),
  };
  const { data, error } = await db
    .from('clientes_lhub')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;

  const cliente = dbParaCliente(data || row);
  _stateUpsert(state.clientes, cliente);
  state.clientes.sort((a, b) => a.nome.localeCompare(b.nome));
  if (typeof popularDropdownClientes === 'function') popularDropdownClientes();
  if (typeof popularDatalistVinculos === 'function') popularDatalistVinculos();
  return cliente;
}

async function garantirClientesCadastro(valor, opcoes = {}) {
  const nomes = separarNomesClientes(valor);
  const clientes = [];
  for (const nome of nomes) {
    clientes.push(await garantirClienteCadastro(nome, opcoes));
  }
  return clientes.filter(Boolean);
}

async function sincronizarClientesDerivados(fontes = {}) {
  if (!state.empresaId) return;

  const processar = async (item, tabela, campoNome) => {
    try {
      const nomes = separarNomesClientes(item?.[campoNome]);
      if (!nomes.length) return;
      const clientes = [];
      for (const nome of nomes) {
        clientes.push(await garantirClienteCadastro(nome));
      }
      const principal = clientes.find(Boolean);
      if (!principal || item.clienteId) return;
      const { error } = await db
        .from(tabela)
        .update({ cliente_id: principal.id })
        .eq('id', item.id)
        .eq('empresa_id', state.empresaId);
      if (error) throw error;
      item.clienteId = principal.id;
    } catch (err) {
      console.warn('[clientes] não foi possível vincular cliente derivado:', tabela, item.id, err.message);
    }
  };

  for (const pasta of fontes.pastas || []) {
    await processar(pasta, 'pastas', 'cliente');
  }
  for (const cobranca of fontes.cobrancas || []) {
    await garantirClientesCadastro(cobranca.clienteNome);
  }
  for (const despesa of fontes.despesas || []) {
    await garantirClientesCadastro(despesa.clienteNome);
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

function daysUntil(iso) {
  const today = new Date();
  const base  = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return Math.ceil((new Date(y, m - 1, d) - base) / 86400000);
}

function initials(name) {
  return (name || '').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function escHtml(value) {
  const span = document.createElement('span');
  span.textContent = value ?? '';
  return span.innerHTML;
}

function escAttr(value) {
  return escHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeExternalUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function postgrestIlikeTerm(value) {
  return String(value || '').trim().replace(/[,%]/g, ' ');
}

function statusClass(s) {
  if (s === 'Concluído' || s === 'Concluída') return 'concluido';
  if (s === 'Em andamento') return 'andamento';
  return 'pendente';
}

function avatarGroup(responsavelStr, maxShow = 3) {
  const names = (responsavelStr || '').split(';').map(n => n.trim()).filter(Boolean);
  if (!names.length) return '';
  const shown = names.slice(0, maxShow);
  const extra = names.length - maxShow;
  return `<div class="avatar-group">
    ${shown.map(n => `<span class="avatar" title="${escAttr(n)}" style="width:24px;height:24px;font-size:.55rem">${escHtml(initials(n))}</span>`).join('')}
    ${extra > 0 ? `<span class="avatar avatar--more" style="width:24px;height:24px;font-size:.6rem">+${extra}</span>` : ''}
  </div>`;
}

function _respChipHTML(nome) {
  return `<span class="resp-chip" data-nome="${escAttr(nome)}">
    <span class="avatar" style="width:18px;height:18px;font-size:.48rem;flex-shrink:0">${escHtml(initials(nome))}</span>
    <span class="resp-chip-name">${escHtml(nome)}</span>
    <button type="button" class="resp-chip-remove" title="Remover">×</button>
  </span>`;
}

function popularRespPicker(pickerId, currentRespStr, usuarios, placeholder) {
  const picker = document.getElementById(pickerId);
  if (!picker) return;
  const selected = (currentRespStr || '').split(';').map(n => n.trim()).filter(Boolean);
  const chipsEl = picker.querySelector('.resp-chips');
  const addEl   = picker.querySelector('.resp-add-select');

  chipsEl.innerHTML = selected.map(_respChipHTML).join('');

  addEl.innerHTML = `<option value="">${escHtml(placeholder || '＋ Adicionar responsável')}</option>` +
    usuarios.filter(u => !selected.includes(u.nome))
      .map(u => `<option value="${escAttr(u.nome)}">${escHtml(u.nome)}</option>`).join('');

  addEl.onchange = () => {
    const nome = addEl.value;
    if (!nome) return;
    chipsEl.insertAdjacentHTML('beforeend', _respChipHTML(nome));
    addEl.querySelector(`option[value="${CSS.escape(nome)}"]`)?.remove();
    addEl.value = '';
  };

  chipsEl.onclick = e => {
    const btn = e.target.closest('.resp-chip-remove');
    if (!btn) return;
    const chip = btn.closest('.resp-chip');
    const nome = chip.dataset.nome;
    chip.remove();
    if (usuarios.find(u => u.nome === nome)) {
      const opt = Object.assign(document.createElement('option'), { value: nome, textContent: nome });
      addEl.appendChild(opt);
    }
  };
}

function getSelectedResps(pickerId) {
  const picker = document.getElementById(pickerId);
  if (!picker) return '';
  return Array.from(picker.querySelectorAll('.resp-chip'))
    .map(c => c.dataset.nome).join(';');
}

function currentTime() {
  return new Date().toLocaleTimeString('pt-BR');
}

// ── Máscara de moeda R$ x.xxx,xx ─────────────────────────────────────

function formatarInputMoeda(el) {
  el.addEventListener('input', _mascaraMoeda);
  el.addEventListener('focus', function () {
    if (!this.value) this.value = 'R$ ';
    const len = this.value.length;
    setTimeout(() => this.setSelectionRange(len, len), 0);
  });
  el.addEventListener('blur', function () {
    if (this.value === 'R$ ' || this.value === 'R$') this.value = '';
  });
}

function _mascaraMoeda(e) {
  let v = e.target.value.replace(/\D/g, '');
  if (!v) { e.target.value = ''; return; }
  v = v.replace(/^0+/, '') || '0';
  const cents = v.padStart(3, '0');
  const intPart = cents.slice(0, -2);
  const decPart = cents.slice(-2);
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + decPart;
  e.target.value = 'R$ ' + formatted;
}

function setarValorMoeda(el, num) {
  if (!num && num !== 0) { el.value = ''; return; }
  const cents = Math.round(Number(num) * 100).toString().padStart(3, '0');
  const intPart = cents.slice(0, -2);
  const decPart = cents.slice(-2);
  el.value = 'R$ ' + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + decPart;
}

function lerValorMoeda(el) {
  const raw = (el.value || '').replace(/\D/g, '');
  if (!raw) return null;
  return parseInt(raw, 10) / 100;
}

// ── State helpers (local updates sem recarregar tudo) ─────────────────

function _stateUpsert(array, novo) {
  const idx = array.findIndex(x => x.id === novo.id);
  if (idx >= 0) array[idx] = novo; else array.unshift(novo);
}

function _stateRemove(array, id) {
  const idx = array.findIndex(x => x.id === id);
  if (idx >= 0) array.splice(idx, 1);
}

function _enrichPrazo(p) {
  const pa = state.pastas.find(x => x.id === p.pastaId);
  if (pa) { p.pastaNr = pa.numero; p.processo = pa.processo; p.comarca = pa.comarca; }
  return p;
}

// ── MOBILE KANBAN NAV ──────────────────────────────────────────────────
// Cria seletor de colunas (pills) acima de cada board em telas ≤ 900px.
// Seguro chamar múltiplas vezes — ignora boards já configurados.
function initMobileKanbanNav() {
  if (window.innerWidth > 900) return;
  document.querySelectorAll('.board, .board--3col').forEach(board => {
    if (board.previousElementSibling?.classList.contains('kanban-mob-nav')) return;
    const cols = Array.from(board.querySelectorAll(':scope > .board-col'));
    if (cols.length < 2) return;

    const nav = document.createElement('div');
    nav.className = 'kanban-mob-nav';

    cols.forEach((col, i) => {
      const label    = col.querySelector('.board-col-head span:first-child')?.textContent.trim() || `Col ${i + 1}`;
      const countEl  = col.querySelector('.col-count');
      const count    = countEl?.textContent?.trim() || '0';
      const btn      = document.createElement('button');
      btn.type       = 'button';
      btn.className  = 'kanban-mob-btn' + (i === 0 ? ' is-active' : '');
      btn.innerHTML  = `${label}<span class="kanban-mob-count">${count}</span>`;
      // guarda referência para atualizar o count dinamicamente
      col._mobNavBtn = btn;
      btn.addEventListener('click', () => {
        const left = col.offsetLeft - board.offsetLeft;
        board.scrollTo({ left, behavior: 'smooth' });
      });
      nav.appendChild(btn);
    });

    board.parentNode.insertBefore(nav, board);

    // Atualiza pill ativa ao rolar
    let _t;
    board.addEventListener('scroll', () => {
      clearTimeout(_t);
      _t = setTimeout(() => {
        const mid = board.scrollLeft + board.offsetWidth / 2;
        cols.forEach((col, i) => {
          const start = col.offsetLeft - board.offsetLeft;
          nav.children[i]?.classList.toggle('is-active', mid >= start && mid < start + col.offsetWidth);
        });
      }, 40);
    }, { passive: true });
  });
}

// Atualiza contadores das pills do kanban mobile após re-render das colunas
function updateMobileKanbanCounts() {
  if (window.innerWidth > 900) return;
  document.querySelectorAll('.board, .board--3col').forEach(board => {
    const nav = board.previousElementSibling;
    if (!nav?.classList.contains('kanban-mob-nav')) return;
    const cols = board.querySelectorAll(':scope > .board-col');
    cols.forEach((col, i) => {
      const count = col.querySelector('.col-count')?.textContent?.trim() || '0';
      const pill  = nav.children[i]?.querySelector('.kanban-mob-count');
      if (pill) pill.textContent = count;
    });
  });
}

function toast(msg, tipo = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast--${tipo}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast--show'));
  setTimeout(() => {
    el.classList.remove('toast--show');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  }, 2500);
}

// ── EXPORT CSV ────────────────────────────────────────────────────────
// Gera e faz download de um CSV a partir de um array de objetos.
// headers: array de { label, key } — define colunas e ordem.
function exportarCSV(dados, headers, nomeArquivo) {
  if (!dados.length) { toast('Nenhum dado para exportar.', 'error'); return; }
  const sep  = ';';
  const bom  = '﻿'; // UTF-8 BOM para Excel abrir corretamente
  const esc  = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = headers.map(h => esc(h.label)).join(sep);
  const rows = dados.map(d => headers.map(h => esc(d[h.key] ?? '')).join(sep));
  const csv  = bom + [head, ...rows].join('\n');
  const a    = Object.assign(document.createElement('a'), {
    href:     'data:text/csv;charset=utf-8,' + encodeURIComponent(csv),
    download: nomeArquivo,
  });
  a.click();
}

// ── TOUCH KANBAN DRAG ─────────────────────────────────────────────────
// Sistema genérico de drag-and-drop por toque para qualquer kanban.
// Usage: registerTouchKanban(containerSelector, statusMap, onDropFn, idAttr?)
//   statusMap  : { [colId]: status }
//   onDropFn   : async (id, novoStatus) => void
//   idAttr     : atributo do card que guarda o ID (default: 'data-id')
const _tdk = {
  ghost: null, dragId: null, srcCard: null, activeCol: null,
  container: null, ghostW: 0, ghostH: 0,
  statusMap: null, onDrop: null, idAttr: 'data-id', timer: null,
  startX: 0, startY: 0,
};

function _tdkReset() {
  clearTimeout(_tdk.timer);
  if (_tdk.ghost)     { _tdk.ghost.remove(); _tdk.ghost = null; }
  if (_tdk.srcCard)   _tdk.srcCard.classList.remove('is-dragging');
  if (_tdk.activeCol) _tdk.activeCol.classList.remove('drag-over');
  Object.assign(_tdk, {
    ghost: null, dragId: null, srcCard: null, activeCol: null,
    container: null, statusMap: null, onDrop: null, idAttr: 'data-id', timer: null,
    startX: 0, startY: 0,
  });
}

document.addEventListener('touchmove', e => {
  if (!_tdk.ghost) return;
  e.preventDefault();
  const t = e.touches[0];
  _tdk.ghost.style.top  = (t.clientY - _tdk.ghostH / 2) + 'px';
  _tdk.ghost.style.left = (t.clientX - _tdk.ghostW  / 2) + 'px';
  _tdk.ghost.style.display = 'none';
  const el = document.elementFromPoint(t.clientX, t.clientY);
  _tdk.ghost.style.display = '';
  const col      = el?.closest('.board-col-body');
  const validCol = col && _tdk.container?.contains(col) ? col : null;
  if (validCol !== _tdk.activeCol) {
    _tdk.activeCol?.classList.remove('drag-over');
    _tdk.activeCol = validCol;
    _tdk.activeCol?.classList.add('drag-over');
  }
}, { passive: false });

document.addEventListener('touchend', async () => {
  const { dragId, activeCol, statusMap, onDrop } = _tdk;
  _tdkReset();
  if (!dragId || !activeCol || !statusMap || !onDrop) return;
  const novoStatus = statusMap[activeCol.id];
  if (novoStatus) await onDrop(dragId, novoStatus);
});

document.addEventListener('touchcancel', _tdkReset);

function registerTouchKanban(containerSelector, statusMap, onDrop, idAttr = 'data-id') {
  const container = document.querySelector(containerSelector);
  if (!container || container._tkBound) return;
  container._tkBound = true;

  // Cancela drag pendente só se o dedo se mover mais de 12px (finger tremor tolerado)
  container.addEventListener('touchmove', e => {
    if (!_tdk.timer) return;
    const t  = e.touches[0];
    const dx = Math.abs(t.clientX - _tdk.startX);
    const dy = Math.abs(t.clientY - _tdk.startY);
    if (dx > 12 || dy > 12) { clearTimeout(_tdk.timer); _tdk.timer = null; }
  }, { passive: true });

  container.addEventListener('touchstart', e => {
    const card = e.target.closest(`[${idAttr}]`);
    if (!card || !card.closest('.board-col-body')) return;
    if (e.target.closest('button, select, a, input')) return;
    if (_tdk.dragId || _tdk.timer) return;

    const startX = e.touches[0].clientX;
    const startY = e.touches[0].clientY;
    const rect   = card.getBoundingClientRect();
    _tdk.startX  = startX;
    _tdk.startY  = startY;

    _tdk.timer = setTimeout(() => {
      _tdk.timer     = null;
      _tdk.dragId    = card.getAttribute(idAttr);
      _tdk.srcCard   = card;
      _tdk.container = container;
      _tdk.statusMap = statusMap;
      _tdk.onDrop    = onDrop;
      _tdk.idAttr    = idAttr;
      _tdk.ghostW    = rect.width;
      _tdk.ghostH    = rect.height;

      const ghost = card.cloneNode(true);
      Object.assign(ghost.style, {
        position: 'fixed', pointerEvents: 'none', zIndex: '9999',
        width:    rect.width + 'px',
        top:      (startY - rect.height / 2) + 'px',
        left:     (startX - rect.width  / 2) + 'px',
        opacity:  '0.85', transition: 'none', borderRadius: '8px',
        transform: 'rotate(2deg) scale(1.03)',
        boxShadow: '0 10px 28px rgba(0,0,0,.25)',
      });
      document.body.appendChild(ghost);
      _tdk.ghost = ghost;
      card.classList.add('is-dragging');
    }, 180);
  }, { passive: true });
}
