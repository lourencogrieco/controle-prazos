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

function _reconstruirIndicePastas() {
  _pastasPorProcesso.clear();
  for (const p of state.pastas) {
    if (p.processo) {
      _pastasPorProcesso.set(p.processo.replace(/\D/g, ''), p);
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
    ${shown.map(n => `<span class="avatar" title="${n}" style="width:24px;height:24px;font-size:.55rem">${initials(n)}</span>`).join('')}
    ${extra > 0 ? `<span class="avatar avatar--more" style="width:24px;height:24px;font-size:.6rem">+${extra}</span>` : ''}
  </div>`;
}

function _respChipHTML(nome) {
  return `<span class="resp-chip" data-nome="${nome}">
    <span class="avatar" style="width:18px;height:18px;font-size:.48rem;flex-shrink:0">${initials(nome)}</span>
    <span class="resp-chip-name">${nome}</span>
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

  addEl.innerHTML = `<option value="">${placeholder || '＋ Adicionar responsável'}</option>` +
    usuarios.filter(u => !selected.includes(u.nome))
      .map(u => `<option value="${u.nome}">${u.nome}</option>`).join('');

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
