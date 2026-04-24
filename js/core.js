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
