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
};

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

function popularRespCheckboxes(containerId, currentRespStr, usuarios) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const selected = (currentRespStr || '').split(';').map(n => n.trim()).filter(Boolean);
  container.innerHTML = usuarios.length
    ? usuarios.map(u => `
      <label class="resp-checkbox-item">
        <input type="checkbox" value="${u.nome}" ${selected.includes(u.nome) ? 'checked' : ''}>
        <span class="avatar" style="width:20px;height:20px;font-size:.5rem;flex-shrink:0">${initials(u.nome)}</span>
        <span>${u.nome}</span>
      </label>`).join('')
    : '<span class="resp-checkboxes-empty">Nenhum usuário cadastrado.</span>';
}

function getSelectedResps(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return '';
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
    .map(cb => cb.value).join(';');
}

function currentTime() {
  return new Date().toLocaleTimeString('pt-BR');
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
