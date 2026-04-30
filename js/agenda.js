// ──────────────────────────────────────────────────────────────────────
// AGENDA
// ──────────────────────────────────────────────────────────────────────
const TIPO_COR = { 'Prazo':'prazo', 'Audiência':'audiencia', 'Reunião':'reuniao', 'Diligência':'diligencia', 'Lembrete':'lembrete' };

// agendaEventos é declarado em core.js (carregado antes deste arquivo)

let calAno = new Date().getFullYear();
let calMes = new Date().getMonth();
let calDataSelecionada = null;
let agendaFiltro = 'todos'; // 'todos' | 'minha'

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_PT  = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];

// Retorna true se o usuário atual está envolvido no evento
function _euEnvolvidoEm(e) {
  const meuNome = (state.meuPerfil?.nome || '').toLowerCase();
  if (!meuNome) return true;
  if ((e.responsavel || '').toLowerCase().includes(meuNome)) return true;
  const parts = (e.participantes || '').split(';').map(n => n.trim().toLowerCase()).filter(Boolean);
  return parts.includes(meuNome);
}

function _eventosFiltrados() {
  if (agendaFiltro === 'minha') return agendaEventos.filter(_euEnvolvidoEm);
  return agendaEventos;
}

function eventosNoDia(iso) {
  return _eventosFiltrados().filter(e => e.data === iso);
}

function eventosPorTipoNoMes(ano, mes) {
  const prefix = `${ano}-${String(mes + 1).padStart(2, '0')}`;
  const tipos  = {};
  _eventosFiltrados().filter(e => e.data.startsWith(prefix)).forEach(e => {
    tipos[e.tipo] = (tipos[e.tipo] || 0) + 1;
  });
  return tipos;
}

function renderCalendario() {
  const titulo = document.getElementById('calMonthYear');
  const grid   = document.getElementById('calGrid');
  titulo.textContent = `${MESES_PT[calMes]} ${calAno}`;

  const hoje    = new Date();
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;

  const primeiroDia     = new Date(calAno, calMes, 1).getDay();
  const diasNoMes       = new Date(calAno, calMes + 1, 0).getDate();
  const diasMesAnterior = new Date(calAno, calMes, 0).getDate();
  const cells = [];

  for (let i = primeiroDia - 1; i >= 0; i--) {
    const d = diasMesAnterior - i;
    const m = calMes === 0 ? 12 : calMes;
    const a = calMes === 0 ? calAno - 1 : calAno;
    cells.push({ dia:d, mes:m, ano:a, other:true });
  }
  for (let d = 1; d <= diasNoMes; d++) cells.push({ dia:d, mes:calMes+1, ano:calAno, other:false });
  const resto = 42 - cells.length;
  for (let d = 1; d <= resto; d++) {
    const m = calMes === 11 ? 1 : calMes + 2;
    const a = calMes === 11 ? calAno + 1 : calAno;
    cells.push({ dia:d, mes:m, ano:a, other:true });
  }

  grid.innerHTML = cells.map(c => {
    const iso      = `${c.ano}-${String(c.mes).padStart(2,'0')}-${String(c.dia).padStart(2,'0')}`;
    const evs      = eventosNoDia(iso);
    const isHoje   = iso === hojeIso;
    const isSel    = iso === calDataSelecionada;
    const isUrgente = evs.some(e => e.tipo === 'Prazo');
    const classes  = ['cal-day', c.other ? 'cal-day--other' : '', isHoje ? 'cal-day--today' : '',
      isSel ? 'cal-day--selected' : '', isUrgente && !c.other ? 'cal-day--has-urgent' : ''].filter(Boolean).join(' ');
    const maxEv  = 3;
    const visible = evs.slice(0, maxEv);
    const extra   = evs.length - maxEv;
    const evHtml  = visible.map(e =>
      `<span class="cal-ev cal-ev--${escAttr(TIPO_COR[e.tipo] || 'lembrete')}" title="${escAttr(e.titulo || '')}">${escHtml(e.titulo || '—')}</span>`
    ).join('') + (extra > 0 ? `<span class="cal-ev cal-ev--more">+${extra} mais</span>` : '');
    return `<div class="${classes}" data-date="${iso}" role="button" tabindex="0">
      <span class="cal-day-num">${c.dia}</span>
      <div class="cal-events">${evHtml}</div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.cal-day:not(.cal-day--other)').forEach(el => {
    el.addEventListener('click', () => selecionarDia(el.dataset.date));
    el.addEventListener('keydown', e => { if (e.key === 'Enter') selecionarDia(el.dataset.date); });
  });

  renderResumoMes();
  renderProximos();
}

function selecionarDia(iso) {
  calDataSelecionada = iso;
  renderCalendario();
  const [a, m, d] = iso.split('-').map(Number);
  const date = new Date(a, m - 1, d);
  const label = `${DIAS_PT[date.getDay()]}, ${d} de ${MESES_PT[m - 1]}`;
  document.getElementById('agendaDiaLabel').textContent  = `${d} de ${MESES_PT[m-1]}`;
  document.getElementById('agendaDiaTitulo').textContent = label;
  const evs   = eventosNoDia(iso);
  const lista = document.getElementById('agendaDiaLista');
  if (!evs.length) { lista.innerHTML = `<p class="agenda-aside-empty">Nenhum evento neste dia.</p>`; return; }
  lista.innerHTML = evs.map(e => {
    const parts = (e.participantes || '').split(';').map(n => n.trim()).filter(Boolean);
    const id = escAttr(e.id);
    const partHtml = parts.length
      ? `<p class="ev-meta ev-participantes">${avatarGroup(e.participantes, 5)} ${escHtml(parts.join(', '))}</p>`
      : '';
    return `<div class="ev-item" data-evento-id="${id}" role="button" tabindex="0" onclick="abrirModalEvento('${id}')" onkeydown="if(event.key==='Enter')abrirModalEvento('${id}')">
      <span class="ev-dot" style="background:${corDot(e.tipo)}"></span>
      <div class="ev-info">
        <p class="ev-titulo">${escHtml(e.titulo || '—')}</p>
        <p class="ev-meta">${escHtml(`${e.hora ? e.hora + ' · ' : ''}${e.responsavel || '—'}${e.local ? ' · ' + e.local : ''}`)}</p>
        ${partHtml}
      </div>
    </div>`;
  }).join('');
}

function renderProximos() {
  const hoje   = new Date();
  const base   = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const limite = new Date(base); limite.setDate(limite.getDate() + 7);
  const proximos = _eventosFiltrados()
    .filter(e => { const d = new Date(e.data + 'T00:00:00'); return d >= base && d <= limite; })
    .sort((a, b) => a.data.localeCompare(b.data));
  const el = document.getElementById('agendaProximos');
  if (!proximos.length) { el.innerHTML = `<p class="agenda-aside-empty">Nenhum evento nos próximos 7 dias.</p>`; return; }
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
  el.innerHTML = proximos.map(e => {
    const isHoje   = e.data === hojeIso;
    const [,m,d]   = e.data.split('-').map(Number);
    const label    = `${d}/${m}${e.hora ? ' · ' + e.hora : ''}`;
    const badgeCls = isHoje ? 'ev-date-badge--today' : (e.tipo === 'Prazo' ? 'ev-date-badge--urgent' : '');
    const parts = (e.participantes || '').split(';').map(n => n.trim()).filter(Boolean);
    const partMeta = parts.length ? ` · ${parts.length} participante${parts.length > 1 ? 's' : ''}` : '';
    const id = escAttr(e.id);
    return `<div class="ev-item" data-evento-id="${id}" role="button" tabindex="0" onclick="abrirModalEvento('${id}')" onkeydown="if(event.key==='Enter')abrirModalEvento('${id}')">
      <span class="ev-dot" style="background:${corDot(e.tipo)}"></span>
      <div class="ev-info">
        <p class="ev-titulo">${escHtml(e.titulo || '—')}</p>
        <p class="ev-meta">${escHtml(`${e.responsavel || '—'}${partMeta}`)}</p>
      </div>
      <span class="ev-date-badge ${escAttr(badgeCls)}">${escHtml(label)}</span>
    </div>`;
  }).join('');
}

function renderResumoMes() {
  const contagem = eventosPorTipoNoMes(calAno, calMes);
  const total    = Object.values(contagem).reduce((a, b) => a + b, 0) || 1;
  const ordem    = ['Prazo','Audiência','Reunião','Diligência','Lembrete'];
  const cores    = { Prazo:'#e74d3c', 'Audiência':'#1890d8', Reunião:'#1d8b60', Diligência:'#e07a17', Lembrete:'#aaa' };
  document.getElementById('agendaResumo').innerHTML = ordem
    .filter(t => contagem[t])
    .map(t => {
      const pct = Math.round((contagem[t] / total) * 100);
      return `<div class="bar-item">
        <div class="bar-label"><span>${t}</span><span>${contagem[t]} evento${contagem[t] > 1 ? 's' : ''}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${cores[t]}"></div></div>
      </div>`;
    }).join('') || `<p class="agenda-aside-empty">Nenhum evento este mês.</p>`;
}

function corDot(tipo) {
  return { Prazo:'#e74d3c', 'Audiência':'#1890d8', Reunião:'#1d8b60', Diligência:'#e07a17', Lembrete:'#aaa' }[tipo] || '#aaa';
}

// ── Abre modal de evento ───────────────────────────────────────────────
function abrirModalEvento(id) {
  const evento = id ? agendaEventos.find(e => e.id === id) : null;
  const form = document.getElementById('eventoForm');
  if (!document.getElementById('evId')) {
    form.insertAdjacentHTML('afterbegin', '<input type="hidden" id="evId">');
  }
  document.querySelector('#modalEvento .modal-head h3').textContent = evento ? 'Editar evento' : 'Novo evento';
  document.getElementById('evId').value = evento?.id || '';

  // Popula responsável dinamicamente com usuários da empresa
  const sel = document.getElementById('evResponsavel');
  const meuNome = state.meuPerfil?.nome || '';
  sel.innerHTML = state.usuarios.map(u =>
    `<option value="${escAttr(u.nome)}"${u.nome === meuNome ? ' selected' : ''}>${escHtml(u.nome)}</option>`
  ).join('');

  // Popula participantes picker
  popularRespPicker('evParticipantesPicker', evento?.participantes || '', state.usuarios, '＋ Adicionar participante');

  document.getElementById('evTitulo').value = evento?.titulo || '';
  document.getElementById('evData').value = evento?.data || calDataSelecionada || '';
  document.getElementById('evHora').value = evento?.hora || '';
  document.getElementById('evTipo').value = evento?.tipo || 'Reunião';
  document.getElementById('evResponsavel').value = evento?.responsavel || meuNome || '';
  document.getElementById('evLocal').value = evento?.local || '';
  const btnExcluir = document.getElementById('btnExcluirEvento');
  if (btnExcluir) btnExcluir.style.display = evento ? '' : 'none';
  document.getElementById('modalEvento').classList.add('open');
}

// ── Navegação ──────────────────────────────────────────────────────────
document.getElementById('calPrev').addEventListener('click', () => {
  calMes--; if (calMes < 0) { calMes = 11; calAno--; } renderCalendario();
});
document.getElementById('calNext').addEventListener('click', () => {
  calMes++; if (calMes > 11) { calMes = 0; calAno++; } renderCalendario();
});
document.getElementById('calHoje').addEventListener('click', () => {
  const h = new Date(); calAno = h.getFullYear(); calMes = h.getMonth();
  const iso = `${calAno}-${String(calMes+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`;
  calDataSelecionada = iso; renderCalendario(); selecionarDia(iso);
});

document.getElementById('btnNovoEvento').addEventListener('click', abrirModalEvento);

['modalClose','modalCancelar'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    document.getElementById('modalEvento').classList.remove('open');
  });
});
document.getElementById('modalEvento').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

async function excluirEventoAtual() {
  const id = document.getElementById('evId')?.value || '';
  if (!id) return;
  const evento = agendaEventos.find(e => e.id === id);
  const titulo = evento?.titulo || 'este compromisso';
  if (!confirm(`Excluir "${titulo}" da agenda?`)) return;

  const btn = document.getElementById('btnExcluirEvento');
  if (btn) { btn.disabled = true; btn.textContent = 'Excluindo…'; }
  try {
    const { error } = await db.from('agenda_eventos')
      .delete()
      .eq('id', id)
      .eq('empresa_id', state.empresaId);
    if (error) { toast('Erro ao excluir: ' + error.message, 'error'); return; }

    const idx = agendaEventos.findIndex(e => e.id === id);
    if (idx >= 0) agendaEventos.splice(idx, 1);
    document.getElementById('modalEvento').classList.remove('open');
    renderCalendario();
    if (calDataSelecionada) selecionarDia(calDataSelecionada);
    toast('Compromisso excluído.');
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Excluir'; }
  }
}

document.getElementById('btnExcluirEvento')?.addEventListener('click', excluirEventoAtual);

// ── Toggle Todos / Minha agenda ────────────────────────────────────────
document.getElementById('agendaFiltroToggle').addEventListener('click', e => {
  const btn = e.target.closest('.toggle-btn');
  if (!btn) return;
  agendaFiltro = btn.dataset.filtro;
  document.querySelectorAll('#agendaFiltroToggle .toggle-btn').forEach(b => b.classList.toggle('is-active', b === btn));
  renderCalendario();
  if (calDataSelecionada) selecionarDia(calDataSelecionada);
});

// ── Salvar evento ──────────────────────────────────────────────────────
document.getElementById('eventoForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    if (!state.empresaId) { toast('Sessão não iniciada. Recarregue a página.', 'error'); return; }
    const participantes = getSelectedResps('evParticipantesPicker');
    const eventoId = document.getElementById('evId')?.value || '';
    const novo = {
      id:           eventoId || uid(),
      empresa_id:   state.empresaId,
      data:         document.getElementById('evData').value,
      titulo:       document.getElementById('evTitulo').value.trim(),
      tipo:         document.getElementById('evTipo').value,
      hora:         document.getElementById('evHora').value || null,
      responsavel:  document.getElementById('evResponsavel').value,
      local:        document.getElementById('evLocal').value.trim() || null,
      participantes: participantes || null,
    };
    const payload = novo;
    const saveReq = eventoId
      ? db.from('agenda_eventos').update(payload).eq('id', eventoId).eq('empresa_id', state.empresaId)
      : db.from('agenda_eventos').insert(payload);
    const tOut    = new Promise((_, r) => setTimeout(() => r(new Error('Sem resposta do banco em 12s. Verifique as políticas RLS.')), 12000));
    const { error } = await Promise.race([saveReq, tOut]);
    if (error) {
      toast('Erro: ' + error.message, 'error');
      return;
    }
    const atualizado = { ...payload, hora: payload.hora || '', local: payload.local || '', participantes: payload.participantes || '' };
    const idx = agendaEventos.findIndex(e => e.id === atualizado.id);
    if (idx >= 0) agendaEventos[idx] = atualizado;
    else agendaEventos.push(atualizado);
    agendaEventos.sort((a, b) => a.data.localeCompare(b.data));
    document.getElementById('modalEvento').classList.remove('open');
    e.target.reset();
    renderCalendario();
    if (calDataSelecionada) selecionarDia(calDataSelecionada);
    toast(eventoId ? 'Evento atualizado!' : 'Evento salvo!');
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar evento';
  }
});

// ──────────────────────────────────────────────────────────────────────
// INIT AGENDA
// ──────────────────────────────────────────────────────────────────────
renderPipeline();
renderCalendario();

const _h   = new Date();
const _iso = `${_h.getFullYear()}-${String(_h.getMonth()+1).padStart(2,'0')}-${String(_h.getDate()).padStart(2,'0')}`;
selecionarDia(_iso);

inicializar();
