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
  user:        null,
  empresaId:   null,
  meuPerfil:   null,
  pastas:      [],
  prazos:      [],
  tarefas:     [],
  tiposPasta:  [],
  clientes:    [],
  areas:       [],
};

// ──────────────────────────────────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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

// ──────────────────────────────────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────────────────────────────────
async function inicializar() {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    await onLogin(session.user);
  } else {
    mostrarLogin();
  }
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN'  && session) await onLogin(session.user);
    if (event === 'SIGNED_OUT') mostrarLogin();
  });
}

async function onLogin(user) {
  state.user = user;
  const { data } = await db
    .from('usuarios_empresa')
    .select('empresa_id, nome, perfil')
    .eq('user_id', user.id)
    .single();

  if (!data) {
    toast('Usuário sem empresa vinculada. Contate o administrador.', 'error');
    await db.auth.signOut();
    return;
  }
  state.empresaId = data.empresa_id;
  state.meuPerfil = data;

  const nome = (data.nome || user.email || 'Usuário').toUpperCase();
  const perfil = (data.perfil || '').toUpperCase();
  document.querySelector('.user-info strong').textContent = nome;
  document.querySelector('.user-info span').textContent   = perfil;
  document.querySelector('.sys-tag').textContent =
    `Login: ${nome}  |  Perfil: ${perfil}`;

  esconderLogin();
  await carregarDados();
}

function mostrarLogin() {
  document.getElementById('loginOverlay').classList.remove('hidden');
}

function esconderLogin() {
  document.getElementById('loginOverlay').classList.add('hidden');
}

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnEntrar');
  const err = document.getElementById('loginError');
  btn.disabled = true;
  btn.textContent = 'Entrando…';
  err.classList.add('hidden');
  try {
    const { error } = await db.auth.signInWithPassword({
      email:    document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginSenha').value,
    });
    if (error) throw error;
  } catch (er) {
    err.textContent = er.message.includes('Invalid') ? 'E-mail ou senha incorretos.' : er.message;
    err.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

// ──────────────────────────────────────────────────────────────────────
// MAPPERS
// ──────────────────────────────────────────────────────────────────────
function dbParaPasta(row) {
  return {
    id:               row.id,
    areaId:           row.area_id || null,
    numero:           row.numero,
    codigoSIA:        row.codigo_lhub || '-',
    cliente:          row.cliente,
    parteContraria:   row.parte_contraria || '-',
    tipoServico:      row.categoria,
    servico:          row.tipo_acao || '',
    area:             row.area || '',
    advogado:         row.responsavel || '',
    descricao:        row.observacoes || '',
    dataDistribuicao: row.data_abertura ? formatDate(row.data_abertura) : '',
    valorCausa:       row.valor_causa || 'R$ 0,00',
    incluidoPor:      row.incluido_por || '',
    processo:         row.numero_processo || '',
    comarca:          row.comarca || '',
    status:           row.status || 'ativo',
  };
}

function pastaParaDb(p) {
  return {
    id:              p.id,
    empresa_id:      state.empresaId,
    numero:          p.numero,
    codigo_lhub:     p.codigoSIA || '-',
    cliente:         p.cliente.toUpperCase(),
    parte_contraria: p.parteContraria || null,
    categoria:       p.tipoServico,
    tipo_acao:       p.servico || null,
    area:            p.area || null,
    responsavel:     p.advogado || null,
    observacoes:     p.descricao || null,
    data_abertura:   p.dataDistribuicao || null,
    valor_causa:     p.valorCausa || null,
    incluido_por:    p.incluidoPor || null,
    numero_processo: p.processo || null,
    comarca:         p.comarca || null,
    status:          p.status || 'ativo',
  };
}

function dbParaPrazo(row) {
  return {
    id:          row.id,
    pastaNr:     row.pasta_id || '',
    cliente:     row.cliente || '',
    processo:    '',
    comarca:     '',
    tipoPrazo:   row.tipo || '',
    prazoFatal:  row.prazo,
    descricao:   row.descricao || '',
    intimacaoId: null,
    responsavel: row.responsavel || '',
    status:      row.status === 'concluido' ? 'Concluído'
               : row.status === 'atrasado'  ? 'Atrasado'
               : 'Pendente',
    codigoSIA:   '-',
  };
}

function dbParaArea(row) {
  return { id: row.id, nome: row.nome, ordem: row.ordem ?? 99 };
}

function dbParaTipoPasta(row) {
  return { id: row.id, codigo: row.codigo, nome: row.nome, areaId: row.area_id };
}

function dbParaCliente(row) {
  return {
    id:       row.id,
    nome:     row.nome,
    tipo:     row.tipo || 'PJ',
    cpfCnpj:  row.cpf_cnpj || '',
    email:    row.email || '',
    telefone: row.telefone || '',
    endereco: row.endereco || '',
  };
}

function dbParaTarefa(row) {
  return {
    id:          row.id,
    titulo:      row.titulo,
    tipo:        row.tipo || 'Outro',
    prioridade:  row.prioridade === 'alta'    ? 'Alta'
               : row.prioridade === 'urgente' ? 'Urgente'
               : row.prioridade === 'baixa'   ? 'Baixa'
               : 'Normal',
    descricao:   row.descricao || '',
    responsavel: row.responsavel || '',
    dataLimite:  row.prazo || null,
    status:      row.status === 'concluida'    ? 'Concluída'
               : row.status === 'em_andamento' ? 'Em andamento'
               : 'Pendente',
  };
}

// ──────────────────────────────────────────────────────────────────────
// CARREGAR DADOS
// ──────────────────────────────────────────────────────────────────────
async function carregarDados() {
  const eid = state.empresaId;
  const [pr, pz, tf, tp, cl, ar] = await Promise.all([
    db.from('pastas').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
    db.from('prazos_lhub').select('*').eq('empresa_id', eid).order('prazo'),
    db.from('tarefas_lhub').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
    db.from('tipos_pasta').select('*').eq('empresa_id', eid).order('codigo'),
    db.from('clientes_lhub').select('*').eq('empresa_id', eid).order('nome'),
    db.from('areas_juridicas').select('*').eq('empresa_id', eid).order('ordem'),
  ]);
  state.pastas     = (pr.data || []).map(dbParaPasta);
  state.prazos     = (pz.data || []).map(dbParaPrazo);
  state.tarefas    = (tf.data || []).map(dbParaTarefa);
  state.tiposPasta = (tp.data || []).map(dbParaTipoPasta);
  state.clientes   = (cl.data || []).map(dbParaCliente);
  state.areas      = (ar.data || []).map(dbParaArea);

  renderDashboard();
  renderPastaList();
  renderAtividades();
  renderPrazosAba();
  renderTarefasAba();
  popularSelectsPastas();
}

// ──────────────────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────────────────
function renderDashboard() {
  const agora = new Date();
  const em7dias = new Date(agora); em7dias.setDate(em7dias.getDate() + 7);

  const tarefasPendentes = state.tarefas.filter(t => t.status === 'Pendente').length;
  const prazosSemana     = state.prazos.filter(p => {
    if (p.status === 'Concluído') return false;
    const d = daysUntil(p.prazoFatal);
    return d >= 0 && d <= 7;
  }).length;
  const prazosVencidos   = state.prazos.filter(p =>
    p.status !== 'Concluído' && daysUntil(p.prazoFatal) < 0
  ).length;
  const pastasAtivas     = state.pastas.filter(p => p.status === 'ativo').length;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('dashTarefasPendentes', tarefasPendentes);
  set('dashTarefasLabel',     `Tarefa${tarefasPendentes !== 1 ? 's' : ''} a fazer`);
  set('dashPrazosSemana',     prazosSemana);
  set('dashPrazosVencidos',   prazosVencidos);
  set('dashPastasAtivas',     pastasAtivas);
  set('dashClientes',         state.clientes.length);

  // Próximos prazos (até 5)
  const proximos = state.prazos
    .filter(p => p.status !== 'Concluído' && daysUntil(p.prazoFatal) >= 0)
    .sort((a, b) => a.prazoFatal.localeCompare(b.prazoFatal))
    .slice(0, 5);

  const cont = document.getElementById('dashProximosPrazos');
  if (cont) {
    cont.innerHTML = proximos.length
      ? proximos.map(p => {
          const diff = daysUntil(p.prazoFatal);
          const cls  = diff <= 3 ? 'color:#c0392b;font-weight:700' : diff <= 7 ? 'color:#e07a17;font-weight:600' : '';
          return `<div style="display:flex;align-items:center;gap:10px;font-size:var(--text-sm)">
            <span style="font-family:'IBM Plex Mono',monospace;font-size:.7rem;${cls}">${formatDate(p.prazoFatal)}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.cliente || p.pastaNr}</span>
            <span style="color:var(--mu);font-size:.72rem">${p.tipoPrazo}</span>
            <span style="${cls}">${diff === 0 ? 'Hoje' : diff + 'd'}</span>
          </div>`;
        }).join('')
      : '<div style="color:var(--mu);font-size:var(--text-sm)">Nenhum prazo próximo.</div>';
  }
}

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
  document.getElementById('modalNovaPasta').classList.remove('hidden');
}

function fecharModalNovaPasta() {
  document.getElementById('modalNovaPasta').classList.add('hidden');
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
  const opt = e.target.options[e.target.selectedIndex];
  if (opt.dataset.nome) document.getElementById('pCliente').value = opt.dataset.nome;
});

document.getElementById('novaPastaForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarPasta');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  const pastaId    = document.getElementById('pastaId').value;
  const areaId     = document.getElementById('pAreaPasta').value;
  const codigoTipo = document.getElementById('pTipoPasta').value;
  const ano        = document.getElementById('pAno').value;
  const areaNome   = state.areas.find(a => a.id === areaId)?.nome || '';
  const numero     = pastaId
    ? document.getElementById('pastaNumeroValor').textContent
    : gerarNumeroPasta(codigoTipo, areaId, ano);

  const obj = pastaParaDb({
    id:               pastaId || uid(),
    numero,
    codigoSIA:        '-',
    cliente:          document.getElementById('pCliente').value.trim(),
    parteContraria:   document.getElementById('pParteContraria').value.trim() || '-',
    tipoServico:      document.getElementById('pCategoria').value,
    servico:          document.getElementById('pTipoAcao').value.trim(),
    advogado:         document.getElementById('pAdvogado').value.trim(),
    comarca:          document.getElementById('pComarca').value.trim(),
    processo:         document.getElementById('pProcesso').value.trim(),
    valorCausa:       document.getElementById('pValorCausa').value.trim() || 'R$ 0,00',
    area:             areaNome,
    descricao:        document.getElementById('pObs').value.trim(),
    dataDistribuicao: document.getElementById('pDataAb').value || null,
    incluidoPor:      state.meuPerfil?.nome || '',
    status:           'ativo',
  });
  obj.codigo_tipo = codigoTipo ? Number(codigoTipo) : null;
  obj.area_id     = areaId || null;
  obj.cliente_id  = document.getElementById('pClienteSelect').value || null;

  const { error } = await db.from('pastas').upsert(obj);
  btn.disabled = false;
  btn.textContent = 'Salvar Pasta';
  if (error) { toast('Erro ao salvar: ' + error.message, 'error'); return; }
  fecharModalNovaPasta();
  toast('Pasta salva com sucesso');
  await carregarDados();
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
// CRUD — PRAZOS (formulário rápido do Painel + modal completo)
// ──────────────────────────────────────────────────────────────────────
document.getElementById('prazoForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!state.empresaId) { toast('Faça login primeiro', 'error'); return; }
  const obj = {
    id:          uid(),
    empresa_id:  state.empresaId,
    pasta_id:    document.getElementById('processo').value.trim() || null,
    cliente:     document.getElementById('cliente').value.trim(),
    tipo:        document.getElementById('tipo').value,
    prazo:       document.getElementById('dataFatal').value,
    responsavel: document.getElementById('responsavel').value,
    descricao:   document.getElementById('descricao').value.trim() || null,
    status:      document.getElementById('status').value === 'Concluído' ? 'concluido' : 'pendente',
  };
  const { error } = await db.from('prazos_lhub').insert(obj);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  e.target.reset();
  toast('Prazo cadastrado');
  await carregarDados();
});

// Modal completo de prazo
function abrirModalNovoPrazo(id) {
  const p = id ? state.prazos.find(x => x.id === id) : null;
  document.getElementById('prazoId').value           = p?.id || '';
  document.getElementById('prazoPastaSelect').value  = p?.pastaNr || '';
  document.getElementById('prazoCliente').value      = p?.cliente || '';
  document.getElementById('prazoTipo').value         = p?.tipoPrazo || '';
  document.getElementById('prazoFatal').value        = p?.prazoFatal || '';
  document.getElementById('prazoResponsavel').value  = p?.responsavel || '';
  document.getElementById('prazoStatus').value       = p?.status === 'Concluído' ? 'concluido'
    : p?.status === 'Em andamento' ? 'em_andamento' : 'pendente';
  document.getElementById('prazoDescricao').value    = p?.descricao || '';
  popularSelectsPastas();
  document.getElementById('modalNovoPrazo').classList.remove('hidden');
}

function fecharModalNovoPrazo() {
  document.getElementById('modalNovoPrazo').classList.add('hidden');
  document.getElementById('novoPrazoForm').reset();
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
  if (pasta) document.getElementById('prazoCliente').value = pasta.cliente;
});

document.getElementById('novoPrazoForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarPrazo');
  btn.disabled = true; btn.textContent = 'Salvando…';

  const prazoId = document.getElementById('prazoId').value;
  const obj = {
    id:          prazoId || uid(),
    empresa_id:  state.empresaId,
    pasta_id:    document.getElementById('prazoPastaSelect').value || null,
    cliente:     document.getElementById('prazoCliente').value.trim(),
    tipo:        document.getElementById('prazoTipo').value,
    prazo:       document.getElementById('prazoFatal').value,
    responsavel: document.getElementById('prazoResponsavel').value.trim(),
    status:      document.getElementById('prazoStatus').value,
    descricao:   document.getElementById('prazoDescricao').value.trim() || null,
  };

  const { error } = await db.from('prazos_lhub').upsert(obj);
  btn.disabled = false; btn.textContent = 'Salvar Prazo';
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  fecharModalNovoPrazo();
  toast('Prazo salvo');
  await carregarDados();
});

async function excluirPrazo(id) {
  if (!confirm('Confirmar exclusão deste prazo?')) return;
  const { error } = await db.from('prazos_lhub').delete().eq('id', id).eq('empresa_id', state.empresaId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  toast('Prazo excluído');
  await carregarDados();
}

// ──────────────────────────────────────────────────────────────────────
// CRUD — TAREFAS (modal completo)
// ──────────────────────────────────────────────────────────────────────
function abrirModalNovaTarefa(id) {
  const t = id ? state.tarefas.find(x => x.id === id) : null;
  document.getElementById('tarefaId').value          = t?.id || '';
  document.getElementById('tTitulo').value           = t?.titulo || '';
  document.getElementById('tTipo').value             = t?.tipo || 'Outro';
  document.getElementById('tPrioridade').value       = t?.prioridade?.toLowerCase() || 'normal';
  document.getElementById('tarefaPastaSelect').value = '';
  document.getElementById('tPrazo').value            = t?.dataLimite || '';
  document.getElementById('tResponsavel').value      = t?.responsavel || '';
  document.getElementById('tDescricao').value        = t?.descricao || '';
  popularSelectsPastas();
  document.getElementById('modalNovaTarefa').classList.remove('hidden');
}

function fecharModalNovaTarefa() {
  document.getElementById('modalNovaTarefa').classList.add('hidden');
  document.getElementById('novaTarefaForm').reset();
}

document.getElementById('btnNovaTarefa').addEventListener('click', () => abrirModalNovaTarefa(null));
document.getElementById('fecharNovaTarefa').addEventListener('click', fecharModalNovaTarefa);
document.getElementById('btnCancelarTarefa').addEventListener('click', fecharModalNovaTarefa);
document.getElementById('modalNovaTarefa').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModalNovaTarefa();
});

document.getElementById('novaTarefaForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarTarefa');
  btn.disabled = true; btn.textContent = 'Salvando…';

  const tarefaId = document.getElementById('tarefaId').value;
  const obj = {
    id:          tarefaId || uid(),
    empresa_id:  state.empresaId,
    pasta_id:    document.getElementById('tarefaPastaSelect').value || null,
    titulo:      document.getElementById('tTitulo').value.trim(),
    tipo:        document.getElementById('tTipo').value,
    prioridade:  document.getElementById('tPrioridade').value,
    responsavel: document.getElementById('tResponsavel').value.trim(),
    prazo:       document.getElementById('tPrazo').value || null,
    descricao:   document.getElementById('tDescricao').value.trim() || null,
    status:      tarefaId
      ? (state.tarefas.find(t => t.id === tarefaId)?.status === 'Concluída' ? 'concluida'
        : state.tarefas.find(t => t.id === tarefaId)?.status === 'Em andamento' ? 'em_andamento'
        : 'pendente')
      : 'pendente',
  };

  const { error } = await db.from('tarefas_lhub').upsert(obj);
  btn.disabled = false; btn.textContent = 'Salvar Tarefa';
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  fecharModalNovaTarefa();
  toast('Tarefa salva');
  await carregarDados();
});

async function excluirTarefa(id) {
  if (!confirm('Confirmar exclusão desta tarefa?')) return;
  const { error } = await db.from('tarefas_lhub').delete().eq('id', id).eq('empresa_id', state.empresaId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  toast('Tarefa excluída');
  await carregarDados();
}

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
        <td style="padding:6px 8px;font-size:.875rem;font-weight:600">${a.nome}</td>
        <td style="padding:6px 4px;text-align:right">
          <button onclick="excluirArea('${a.id}')" style="background:none;border:none;color:var(--mu);cursor:pointer;font-size:.9rem" title="Excluir">✕</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function abrirModalAreas() {
  renderListaAreas();
  document.getElementById('modalAreas').classList.remove('hidden');
}

function fecharModalAreas() {
  document.getElementById('modalAreas').classList.add('hidden');
  document.getElementById('novaAreaForm').reset();
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
    state.areas.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
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
        <td style="padding:6px 8px;font-size:.78rem;color:var(--mu)">${areaNome(t.areaId)}</td>
        <td style="padding:6px 8px;font-weight:700;font-family:'IBM Plex Mono',monospace;font-size:.82rem">${t.codigo}</td>
        <td style="padding:6px 8px;font-size:.875rem">${t.nome}</td>
        <td style="padding:6px 8px">
          <button onclick="excluirTipoPasta('${t.id}')" style="background:none;border:none;color:var(--mu);cursor:pointer;font-size:.9rem" title="Excluir">✕</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function abrirModalTiposPasta() {
  popularSelectAreaTipos();
  renderListaTipos();
  document.getElementById('modalTiposPasta').classList.remove('hidden');
}

function fecharModalTiposPasta() {
  document.getElementById('modalTiposPasta').classList.add('hidden');
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
  state.tiposPasta = state.tiposPasta.filter(t => t.id !== id);
  renderListaTipos();
  popularDropdownTipos();
  toast('Tipo excluído');
}

// ──────────────────────────────────────────────────────────────────────
// CRUD — CLIENTES
// ──────────────────────────────────────────────────────────────────────
function abrirModalNovoCliente(contexto) {
  // contexto: 'pasta' (abre e volta p/ modal de pasta ao fechar)
  document.getElementById('clienteId').value    = '';
  document.getElementById('cNome').value         = '';
  document.querySelector('input[name="cTipo"][value="PJ"]').checked = true;
  document.getElementById('cCpfCnpj').value      = '';
  document.getElementById('cTelefone').value     = '';
  document.getElementById('cEmail').value        = '';
  document.getElementById('cEndereco').value     = '';
  document.getElementById('tituloClienteModal').textContent = 'Novo Cliente';
  document.getElementById('_clienteContexto').value = contexto || '';
  document.getElementById('modalNovoCliente').classList.remove('hidden');
}

function fecharModalNovoCliente() {
  document.getElementById('modalNovoCliente').classList.add('hidden');
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

  const obj = {
    id:        uid(),
    empresa_id: state.empresaId,
    nome:       document.getElementById('cNome').value.trim().toUpperCase(),
    tipo:       document.querySelector('input[name="cTipo"]:checked').value,
    cpf_cnpj:   document.getElementById('cCpfCnpj').value.trim() || null,
    telefone:   document.getElementById('cTelefone').value.trim() || null,
    email:      document.getElementById('cEmail').value.trim() || null,
    endereco:   document.getElementById('cEndereco').value.trim() || null,
  };

  const { error } = await db.from('clientes_lhub').insert(obj);
  btn.disabled = false; btn.textContent = 'Salvar Cliente';
  if (error) { toast('Erro: ' + error.message, 'error'); return; }

  state.clientes.push(dbParaCliente(obj));
  state.clientes.sort((a, b) => a.nome.localeCompare(b.nome));
  popularDropdownClientes();

  const ctx = document.getElementById('_clienteContexto')?.value;
  fecharModalNovoCliente();
  toast('Cliente cadastrado');

  if (ctx === 'pasta') {
    // seleciona o novo cliente no dropdown da pasta
    document.getElementById('pClienteSelect').value = obj.id;
    document.getElementById('pCliente').value = obj.nome;
  }
});

// ──────────────────────────────────────────────────────────────────────
// DATA — hardcoded (demo data para pipeline, intimações, andamentos, agenda)
// ──────────────────────────────────────────────────────────────────────
const oportunidades = [];

const intimacoesData = [];

const andamentosBase = [];

// ──────────────────────────────────────────────────────────────────────
// CARD RENDERERS
// ──────────────────────────────────────────────────────────────────────
function atividadeCard(item) {
  const diff    = item.dataFatal ? daysUntil(item.dataFatal) : 99;
  const urgent  = item.prioridade === 'Urgente' || diff <= 1;
  const done    = item.status === 'Concluído' || item.status === 'Concluída';
  const classes = ['req-card', urgent ? 'req-card--urgent' : '', done ? 'req-card--done' : ''].filter(Boolean).join(' ');

  return `
    <article class="${classes}">
      <div class="req-body">
        <div class="req-tags">
          <span class="tag tag--area">${item.area || item.tipo || 'Tarefa'}</span>
          ${urgent ? '<span class="tag tag--urgent">Urgente</span>' : ''}
          <span class="tag tag--type">${item.tipo}</span>
        </div>
        <p class="req-number">${item.processo || item.titulo || ''}</p>
        <p class="req-meta"><strong>Cliente:</strong> ${item.cliente}</p>
        <p class="req-description">${item.descricao}</p>
        ${item.dataFatal ? `<p class="req-date">${formatDate(item.dataFatal)}</p>` : ''}
      </div>
      <div class="req-foot">
        <div class="req-avatars">
          <span class="avatar">${initials(item.responsavel || '?')}</span>
        </div>
        <div class="req-owner">${item.solicitante ? 'Solicitado por ' + item.solicitante : item.responsavel || ''}</div>
      </div>
    </article>`;
}

function oportunidadeCard(item) {
  const recusado = item.status === 'Recusado';
  const classes  = ['req-card', recusado ? 'req-card--refused' : ''].filter(Boolean).join(' ');
  const tagClass = item.area === 'Tributário' ? 'tag--area' : 'tag--type';
  return `
    <article class="${classes}">
      <div class="req-body">
        <div class="req-tags">
          <span class="tag ${tagClass}">${item.area}</span>
          ${recusado ? '<span class="tag tag--refused">Recusado</span>' : ''}
        </div>
        <p class="req-number">${item.numero}</p>
        <p class="req-meta"><strong>Lead:</strong> ${item.lead}</p>
        <p class="req-meta"><strong>Tipo:</strong> ${item.tipo}</p>
        <p class="req-meta"><strong>Tese:</strong> ${item.tese}</p>
        ${item.motivoRecusa ? `<p class="req-refusal">Motivo da recusa: ${item.motivoRecusa}</p>` : ''}
        ${!recusado && item.envio ? `<p class="req-date">Enviado ${item.envio}mente em ${formatDate(item.data)}</p>` : ''}
      </div>
      <div class="req-foot">
        <div class="req-avatars">
          ${item.responsavel.split(' ').map(r => `<span class="avatar">${r}</span>`).join('')}
        </div>
        <div class="req-owner">${recusado
          ? `Recusado em ${formatDate(item.data)}<br>por ${item.responsavelNome}`
          : `Enviado em ${formatDate(item.data)}<br>por ${item.responsavelNome}`}</div>
      </div>
    </article>`;
}

// ──────────────────────────────────────────────────────────────────────
// RENDER ATIVIDADES (painel Minhas Atividades — usa state.prazos como fonte viva)
// ──────────────────────────────────────────────────────────────────────
function filteredAtividades() {
  const busca = (document.getElementById('buscaPainel')?.value ?? '').toLowerCase();
  const resp  = document.getElementById('filtroResponsavel')?.value ?? '';
  // Converte prazos do DB para formato de atividade para o kanban
  const lista = state.prazos.map(p => ({
    cliente:     p.cliente,
    processo:    p.pastaNr,
    tipo:        p.tipoPrazo,
    area:        'Prazo',
    dataFatal:   p.prazoFatal,
    responsavel: p.responsavel,
    status:      p.status,
    descricao:   p.descricao,
    solicitante: null,
    prioridade:  daysUntil(p.prazoFatal) <= 3 ? 'Urgente' : 'Normal',
  }));
  return lista.filter(item => {
    const match = !busca ||
      (item.cliente || '').toLowerCase().includes(busca) ||
      (item.processo || '').toLowerCase().includes(busca) ||
      (item.tipo || '').toLowerCase().includes(busca);
    return match && (!resp || item.responsavel === resp);
  });
}

function renderAtividades() {
  const lista      = filteredAtividades();
  const pendentes  = lista.filter(i => i.status === 'Pendente');
  const andamento  = lista.filter(i => i.status === 'Em andamento');
  const concluidos = lista.filter(i => i.status === 'Concluído' || i.status === 'Concluída');
  const empty = label => `<div class="empty-state">${label}</div>`;

  document.getElementById('colunaPendentes').innerHTML  = pendentes.length  ? pendentes.map(atividadeCard).join('')  : empty('Nenhuma nova solicitação.');
  document.getElementById('colunaAndamento').innerHTML  = andamento.length  ? andamento.map(atividadeCard).join('')  : empty('Nenhuma atividade em andamento.');
  document.getElementById('colunaConcluidos').innerHTML = concluidos.length ? concluidos.map(atividadeCard).join('') : empty('Nenhuma atividade concluída.');

  document.getElementById('countNovas').textContent      = pendentes.length;
  document.getElementById('countAndamento').textContent  = andamento.length;
  document.getElementById('countConcluidos').textContent = concluidos.length;
  document.getElementById('countCancelados').textContent = '0';

  const total    = lista.length || 1;
  const urgentes = lista.filter(i => i.status !== 'Concluído' && i.status !== 'Concluída' &&
    (i.prioridade === 'Urgente' || daysUntil(i.dataFatal) <= 1)).length;
  const pct      = Math.round((concluidos.length / total) * 100);

  document.getElementById('metricPendentes').textContent  = String(lista.filter(i => i.status !== 'Concluído' && i.status !== 'Concluída').length).padStart(2, '0');
  document.getElementById('metricUrgentes').textContent   = String(urgentes).padStart(2, '0');
  document.getElementById('metricConcluidos').textContent = String(concluidos.length).padStart(2, '0');
  document.getElementById('progressBar').style.width      = `${pct}%`;
  document.getElementById('progressLabel').textContent    = `${pct}% completo`;

  renderTabela(lista);
}

function renderTabela(lista) {
  document.getElementById('tabelaPrazos').innerHTML = lista.map(item => `
    <tr>
      <td><a href="#" class="table-link">${item.processo || '—'}</a></td>
      <td>${item.cliente}</td>
      <td>${item.tipo}</td>
      <td>${item.dataFatal ? formatDate(item.dataFatal) : '—'}</td>
      <td>${item.responsavel}</td>
      <td><span class="status-pill ${statusClass(item.status)}">${item.status}</span></td>
    </tr>`).join('');
}

// ──────────────────────────────────────────────────────────────────────
// RENDER PIPELINE
// ──────────────────────────────────────────────────────────────────────
function filteredOportunidades() {
  const busca = (document.getElementById('buscaPipeline')?.value ?? '').toLowerCase();
  if (!busca) return oportunidades;
  return oportunidades.filter(item =>
    item.lead.toLowerCase().includes(busca) ||
    item.numero.toLowerCase().includes(busca) ||
    item.area.toLowerCase().includes(busca)
  );
}

function renderPipeline() {
  const lista    = filteredOportunidades();
  const recusado = lista.filter(i => i.status === 'Recusado');
  const aceite   = lista.filter(i => i.status === 'Aguardando aceite');
  const empty = label => `<div class="empty-state">${label}</div>`;

  document.getElementById('colunaOportunidades').innerHTML = recusado.length ? recusado.map(oportunidadeCard).join('') : empty('Nenhuma oportunidade.');
  document.getElementById('colunaAceite').innerHTML        = aceite.length   ? aceite.map(oportunidadeCard).join('')   : empty('Nenhum aguardando aceite.');
  document.getElementById('countOportunidades').textContent = recusado.length;
  document.getElementById('countAceite').textContent        = aceite.length;
  document.getElementById('countValidacao').textContent     = '0';
  document.getElementById('countAssinado').textContent      = '0';
}

// ──────────────────────────────────────────────────────────────────────
// SUBTAB SWITCHING
// ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.subtab[data-subtab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.subtab').forEach(b => b.classList.remove('is-active'));
    document.querySelectorAll('.subtab-panel').forEach(p => p.classList.add('hidden'));
    btn.classList.add('is-active');
    document.getElementById(`subtab-${btn.dataset.subtab}`)?.classList.remove('hidden');
    if (btn.dataset.subtab === 'prazos')     renderPrazosAba();
    if (btn.dataset.subtab === 'tarefas')    renderTarefasAba();
    if (btn.dataset.subtab === 'intimacoes') renderIntimacoesAba();
  });
});

// ──────────────────────────────────────────────────────────────────────
// TOP NAV TABS
// ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-tab[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.view;
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('is-active'));
    const view = document.getElementById(`view-${target}`);
    if (view) view.classList.add('is-active');
    if (target === 'pipeline')   renderPipeline();
    if (target === 'atividades') renderAtividades();
  });
});

// ──────────────────────────────────────────────────────────────────────
// SEARCH & FILTER LISTENERS
// ──────────────────────────────────────────────────────────────────────
document.getElementById('buscaPainel')?.addEventListener('input', renderAtividades);
document.getElementById('filtroResponsavel')?.addEventListener('change', renderAtividades);
document.getElementById('buscaPipeline')?.addEventListener('input', renderPipeline);

// ──────────────────────────────────────────────────────────────────────
// DASHBOARD CLOCK
// ──────────────────────────────────────────────────────────────────────
function updateClock() {
  const t = currentTime();
  document.querySelectorAll('.dash-time').forEach(el => {
    el.textContent = `Atualizado às ${t}`;
  });
}
setInterval(updateClock, 1000);
updateClock();

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

function renderPrazosAba() {
  const busca = (document.getElementById('buscaPrazosAba')?.value ?? '').toLowerCase();
  const st    = document.getElementById('filtroPrazosStatus')?.value ?? '';
  const resp  = document.getElementById('filtroPrazosResponsavel')?.value ?? '';

  const lista = state.prazos.filter(p => {
    const m = !busca ||
      (p.pastaNr || '').toLowerCase().includes(busca) ||
      (p.processo || '').toLowerCase().includes(busca) ||
      (p.cliente || '').toLowerCase().includes(busca);
    return m && (!st || p.status === st) && (!resp || p.responsavel === resp);
  });

  document.getElementById('prazosInfo').textContent = `${lista.length} registro${lista.length !== 1 ? 's' : ''}`;
  document.getElementById('tabelaPrazosAba').innerHTML = lista.length
    ? lista.map(p => `<tr class="${rowClassPrazo(p.prazoFatal)}">
        <td><span class="table-link">${p.pastaNr || '—'}</span></td>
        <td>${p.cliente}</td>
        <td style="font-family:'IBM Plex Mono',monospace;font-size:.72rem">${p.processo || '—'}</td>
        <td>${p.comarca || '—'}</td>
        <td>${p.tipoPrazo}</td>
        <td>${formatDate(p.prazoFatal)}</td>
        <td>${diasRestantesHtml(p.prazoFatal)}</td>
        <td style="max-width:200px;font-size:.76rem">${p.descricao}</td>
        <td>—</td>
        <td>${p.responsavel}</td>
        <td><span class="status-pill ${statusClass(p.status)}">${p.status}</span></td>
      </tr>`).join('')
    : `<tr><td colspan="11" class="tbl-empty">Nenhum prazo cadastrado.</td></tr>`;
}

function irParaIntimacao(id) {
  document.querySelectorAll('.subtab').forEach(b => b.classList.remove('is-active'));
  document.querySelectorAll('.subtab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector('.subtab[data-subtab="intimacoes"]').classList.add('is-active');
  document.getElementById('subtab-intimacoes').classList.remove('hidden');
  document.getElementById('buscaIntimacoes').value = id;
  renderIntimacoesAba();
}

document.getElementById('buscaPrazosAba')?.addEventListener('input', renderPrazosAba);
document.getElementById('filtroPrazosStatus')?.addEventListener('change', renderPrazosAba);
document.getElementById('filtroPrazosResponsavel')?.addEventListener('change', renderPrazosAba);

// ──────────────────────────────────────────────────────────────────────
// RENDER TAREFAS ABA — lê state.tarefas
// ──────────────────────────────────────────────────────────────────────
const TIPO_TAG_TAREFA = {
  'Contato com cliente':     { cls:'tag--area',         label:'Cliente' },
  'Contato com órgão':       { cls:'tag--type',         label:'Órgão' },
  'Pesquisa jurídica':       { cls:'tag--encerramento', label:'Pesquisa' },
  'Elaboração de documento': { cls:'tag--area',         label:'Documento' },
  'Diligência interna':      { cls:'tag--urgent',       label:'Diligência' },
  'Reunião':                 { cls:'tag--reuniao-t',    label:'Reunião' },
  'Outro':                   { cls:'tag--lembrete',     label:'Outro' },
};

function tarefaCard(t) {
  const diff     = t.dataLimite ? daysUntil(t.dataLimite) : null;
  const urgente  = diff !== null && diff <= 3;
  const priorCls = t.prioridade === 'Alta' ? 'tarefa-card--alta'
                 : t.prioridade === 'Média' ? 'tarefa-card--media'
                 : 'tarefa-card--normal';
  const tagInfo  = TIPO_TAG_TAREFA[t.tipo] ?? { cls:'tag--lembrete', label: t.tipo };
  const av       = initials(t.responsavel);
  return `<article class="tarefa-card ${priorCls}">
    <div class="tarefa-tags">
      <span class="tag ${tagInfo.cls}">${tagInfo.label}</span>
      ${t.prioridade === 'Alta' || t.prioridade === 'Urgente' ? '<span class="tag tag--urgent">Alta</span>' : ''}
    </div>
    <p class="tarefa-titulo">${t.titulo}</p>
    <p class="tarefa-desc">${t.descricao}</p>
    <div class="tarefa-footer">
      <div class="tarefa-resp">
        <span class="avatar" style="width:24px;height:24px;font-size:.58rem">${av}</span>
        ${t.responsavel}
      </div>
      <span class="tarefa-prazo ${urgente ? 'tarefa-prazo--urgente' : ''}">⏱ ${t.dataLimite ? formatDate(t.dataLimite) : '—'}</span>
    </div>
  </article>`;
}

function renderTarefasAba() {
  const busca  = (document.getElementById('buscaTarefas')?.value ?? '').toLowerCase();
  const tipo   = document.getElementById('filtroTarefasTipo')?.value ?? '';
  const status = document.getElementById('filtroTarefasStatus')?.value ?? '';

  const lista = state.tarefas.filter(t => {
    const m = !busca || t.titulo.toLowerCase().includes(busca) || t.descricao.toLowerCase().includes(busca);
    return m && (!tipo || t.tipo === tipo) && (!status || t.status === status);
  });

  const pendentes  = lista.filter(t => t.status === 'Pendente');
  const andamento  = lista.filter(t => t.status === 'Em andamento');
  const concluidas = lista.filter(t => t.status === 'Concluída');

  document.getElementById('colTarefasPendentes').innerHTML  = pendentes.length  ? pendentes.map(tarefaCard).join('')  : '<div class="empty-state">Nenhuma tarefa pendente.</div>';
  document.getElementById('colTarefasAndamento').innerHTML  = andamento.length  ? andamento.map(tarefaCard).join('')  : '<div class="empty-state">Nenhuma em andamento.</div>';
  document.getElementById('colTarefasConcluidas').innerHTML = concluidas.length ? concluidas.map(tarefaCard).join('') : '<div class="empty-state">Nenhuma concluída.</div>';

  document.getElementById('countTarefasPendentes').textContent  = pendentes.length;
  document.getElementById('countTarefasAndamento').textContent  = andamento.length;
  document.getElementById('countTarefasConcluidas').textContent = concluidas.length;
}

document.getElementById('buscaTarefas')?.addEventListener('input', renderTarefasAba);
document.getElementById('filtroTarefasTipo')?.addEventListener('change', renderTarefasAba);
document.getElementById('filtroTarefasStatus')?.addEventListener('change', renderTarefasAba);

// ──────────────────────────────────────────────────────────────────────
// RENDER INTIMAÇÕES ABA
// ──────────────────────────────────────────────────────────────────────
function renderIntimacoesAba() {
  const busca  = (document.getElementById('buscaIntimacoes')?.value ?? '').toLowerCase();
  const status = document.getElementById('filtroIntimacoesStatus')?.value ?? '';

  const lista = intimacoesData.filter(i => {
    const m = !busca || i.id.toLowerCase().includes(busca) ||
      i.processo.toLowerCase().includes(busca) ||
      i.pastaNr.toLowerCase().includes(busca) ||
      i.cliente.toLowerCase().includes(busca);
    return m && (!status || i.status === status);
  });

  document.getElementById('intimacoesInfo').textContent = `${lista.length} registro${lista.length !== 1 ? 's' : ''}`;
  document.getElementById('tabelaIntimacoes').innerHTML = lista.length
    ? lista.map(i => {
        const prazoLink = i.prazoVinculado
          ? `<a href="#" class="int-prazo-link" onclick="irParaPrazo('${i.prazoVinculado}')">${i.prazoVinculado}</a>`
          : '—';
        return `<tr class="${rowClassPrazo(i.prazoFatal)}">
          <td class="int-id">${i.id}</td>
          <td><span class="table-link">${i.pastaNr}</span></td>
          <td>${i.cliente}</td>
          <td style="font-family:'IBM Plex Mono',monospace;font-size:.7rem">${i.processo}</td>
          <td>${i.orgao}</td>
          <td>${formatDate(i.dataPublicacao)}</td>
          <td>${formatDate(i.prazoFatal)}${i.diasUteis ? ' <span style="color:var(--mu);font-size:.65rem">(d.u.)</span>' : ''}</td>
          <td>${diasRestantesHtml(i.prazoFatal)}</td>
          <td style="max-width:180px;font-size:.76rem">${i.descricao}</td>
          <td>${prazoLink}</td>
          <td><span class="status-pill ${statusClass(i.status === 'Cumprida' ? 'Concluído' : i.status)}">${i.status}</span></td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="11" class="tbl-empty">Nenhuma intimação encontrada.</td></tr>`;
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

// ──────────────────────────────────────────────────────────────────────
// RELATÓRIOS
// ──────────────────────────────────────────────────────────────────────
function gerarRelatorio() {
  const tipo       = document.querySelector('input[name="relTipo"]:checked')?.value ?? 'pasta';
  const excManuais = document.getElementById('relExcluirManuais').checked;
  const tiposSel   = [...document.querySelectorAll('.rel-and-tipo:checked')].map(c => c.value);
  const dataInicio = document.getElementById('relDataInicio').value;
  const dataFim    = document.getElementById('relDataFim').value;
  const area       = document.getElementById('relArea').value;
  const resp       = document.getElementById('relResponsavel').value;
  const termoPasta   = document.getElementById('relNumeroPasta').value.trim().toLowerCase();
  const termoCliente = document.getElementById('relCliente').value.trim().toLowerCase();
  const termoProc    = document.getElementById('relProcesso').value.trim().toLowerCase();

  let resultado = andamentosBase.filter(a => {
    if (excManuais && a.manual)                                           return false;
    if (tiposSel.length && !tiposSel.includes(a.tipo))                   return false;
    if (dataInicio && a.data < dataInicio)                               return false;
    if (dataFim    && a.data > dataFim)                                  return false;
    if (area  && a.area !== area)                                        return false;
    if (resp  && !a.advogado.toLowerCase().includes(resp.toLowerCase())) return false;
    if (tipo === 'pasta'   && termoPasta   && !a.pastaNr.toLowerCase().includes(termoPasta))   return false;
    if (tipo === 'cliente' && termoCliente && !a.cliente.toLowerCase().includes(termoCliente)) return false;
    if (tipo === 'processo') {
      const pasta = state.pastas.find(p => p.numero === a.pastaNr);
      if (termoProc && !(pasta?.processo ?? '').toLowerCase().includes(termoProc)) return false;
    }
    return true;
  });

  resultado.sort((a, b) => b.data.localeCompare(a.data));

  document.getElementById('relEmptyState').classList.add('hidden');
  document.getElementById('relResultado').classList.remove('hidden');
  document.getElementById('btnExportarPdf').disabled   = false;
  document.getElementById('btnExportarExcel').disabled = false;

  const tipoLabel  = { pasta:'Por pasta', cliente:'Por cliente', processo:'Por número de processo' }[tipo];
  const termoLabel = tipo === 'pasta' ? termoPasta : tipo === 'cliente' ? termoCliente : termoProc;
  document.getElementById('relResultadoKicker').textContent = tipoLabel;
  document.getElementById('relResultadoTitulo').textContent = termoLabel || 'Todos os registros';

  const pastasUnicas = new Set(resultado.map(a => a.pastaNr));
  document.getElementById('relStatPastas').textContent     = pastasUnicas.size;
  document.getElementById('relStatAndamentos').textContent = resultado.length;
  document.getElementById('relStatPrazo').textContent      = dataInicio && dataFim
    ? `${formatDate(dataInicio)} — ${formatDate(dataFim)}`
    : dataInicio ? `a partir de ${formatDate(dataInicio)}`
    : dataFim   ? `até ${formatDate(dataFim)}`
    : 'Todo o período';

  document.getElementById('relTabelaBody').innerHTML = resultado.length
    ? resultado.map(a => `
        <tr>
          <td><span class="table-link">${a.pastaNr}</span></td>
          <td>${a.codigoSIA}</td>
          <td>${a.cliente}</td>
          <td>${a.area}</td>
          <td>${formatDate(a.data)}</td>
          <td>${a.andamento}</td>
          <td>${a.advogado}</td>
          <td><span class="tag ${a.manual ? 'tag--manual' : 'tag--area'}">${a.tipo}</span></td>
        </tr>`).join('')
    : `<tr><td colspan="8" class="tbl-empty">Nenhum andamento encontrado com os filtros aplicados.</td></tr>`;

  document.getElementById('relCount').textContent =
    `${resultado.length} registro${resultado.length !== 1 ? 's' : ''} encontrado${resultado.length !== 1 ? 's' : ''}`;
}

document.querySelectorAll('input[name="relTipo"]').forEach(radio => {
  radio.addEventListener('change', () => {
    document.getElementById('filterIdentPasta').classList.add('hidden');
    document.getElementById('filterIdentCliente').classList.add('hidden');
    document.getElementById('filterIdentProcesso').classList.add('hidden');
    document.getElementById(`filterIdent${radio.value.charAt(0).toUpperCase() + radio.value.slice(1)}`).classList.remove('hidden');
  });
});

document.getElementById('relTodosAndamentos').addEventListener('change', e => {
  document.querySelectorAll('.rel-and-tipo').forEach(c => { c.checked = e.target.checked; });
});

document.getElementById('relExcluirManuais').addEventListener('change', e => {
  if (e.target.checked) {
    document.querySelectorAll('.rel-and-tipo').forEach(c => {
      if (c.value === 'Manual') c.checked = false;
    });
  }
});

document.getElementById('btnGerarRelatorio').addEventListener('click', gerarRelatorio);

document.getElementById('btnLimparFiltros').addEventListener('click', () => {
  document.querySelectorAll('input[name="relTipo"]')[0].checked = true;
  document.getElementById('filterIdentPasta').classList.remove('hidden');
  document.getElementById('filterIdentCliente').classList.add('hidden');
  document.getElementById('filterIdentProcesso').classList.add('hidden');
  ['relNumeroPasta','relCliente','relProcesso','relDataInicio','relDataFim'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('relArea').value = '';
  document.getElementById('relResponsavel').value = '';
  document.getElementById('relTodosAndamentos').checked = true;
  document.getElementById('relExcluirManuais').checked  = false;
  document.querySelectorAll('.rel-and-tipo').forEach(c => { c.checked = true; });
  document.getElementById('relEmptyState').classList.remove('hidden');
  document.getElementById('relResultado').classList.add('hidden');
  document.getElementById('btnExportarPdf').disabled   = true;
  document.getElementById('btnExportarExcel').disabled = true;
});

document.getElementById('btnExportarExcel').addEventListener('click', () => {
  const rows = [...document.querySelectorAll('#relTabelaBody tr')];
  if (!rows.length) return;
  const headers = ['N° da pasta','Código LHub','Cliente','Área','Data','Andamento','Advogado','Tipo'];
  const csv = [headers.join(';'), ...rows.map(tr =>
    [...tr.querySelectorAll('td')].map(td => `"${td.textContent.trim()}"`).join(';')
  )].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csv);
  a.download = `relatorio_legal_hub_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
});

// ──────────────────────────────────────────────────────────────────────
// AGENDA
// ──────────────────────────────────────────────────────────────────────
const TIPO_COR = { 'Prazo':'prazo', 'Audiência':'audiencia', 'Reunião':'reuniao', 'Diligência':'diligencia', 'Lembrete':'lembrete' };

const agendaEventos = [];

let calAno = 2026;
let calMes = 3;
let calDataSelecionada = null;
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_PT  = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];

function eventosNoDia(iso)     { return agendaEventos.filter(e => e.data === iso); }
function eventosPorTipoNoMes(ano, mes) {
  const prefix = `${ano}-${String(mes + 1).padStart(2, '0')}`;
  const tipos  = {};
  agendaEventos.filter(e => e.data.startsWith(prefix)).forEach(e => {
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
    const maxEv    = 3;
    const visible  = evs.slice(0, maxEv);
    const extra    = evs.length - maxEv;
    const evHtml   = visible.map(e =>
      `<span class="cal-ev cal-ev--${TIPO_COR[e.tipo] || 'lembrete'}" title="${e.titulo}">${e.titulo}</span>`
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
  const evs  = eventosNoDia(iso);
  const lista = document.getElementById('agendaDiaLista');
  if (!evs.length) { lista.innerHTML = `<p class="agenda-aside-empty">Nenhum evento neste dia.</p>`; return; }
  lista.innerHTML = evs.map(e => `
    <div class="ev-item">
      <span class="ev-dot" style="background:${corDot(e.tipo)}"></span>
      <div class="ev-info">
        <p class="ev-titulo">${e.titulo}</p>
        <p class="ev-meta">${e.hora ? e.hora + ' · ' : ''}${e.responsavel}${e.local ? ' · ' + e.local : ''}</p>
      </div>
    </div>`).join('');
}

function renderProximos() {
  const hoje   = new Date();
  const base   = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const limite = new Date(base); limite.setDate(limite.getDate() + 7);
  const proximos = agendaEventos
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
    return `<div class="ev-item">
      <span class="ev-dot" style="background:${corDot(e.tipo)}"></span>
      <div class="ev-info">
        <p class="ev-titulo">${e.titulo}</p>
        <p class="ev-meta">${e.responsavel}</p>
      </div>
      <span class="ev-date-badge ${badgeCls}">${label}</span>
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

document.getElementById('btnNovoEvento').addEventListener('click', () => {
  document.getElementById('modalEvento').classList.remove('hidden');
  if (calDataSelecionada) document.getElementById('evData').value = calDataSelecionada;
});
['modalClose','modalCancelar'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    document.getElementById('modalEvento').classList.add('hidden');
  });
});
document.getElementById('modalEvento').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
});
document.getElementById('eventoForm').addEventListener('submit', e => {
  e.preventDefault();
  agendaEventos.push({
    data:        document.getElementById('evData').value,
    titulo:      document.getElementById('evTitulo').value.trim(),
    tipo:        document.getElementById('evTipo').value,
    hora:        document.getElementById('evHora').value,
    responsavel: document.getElementById('evResponsavel').value,
    local:       document.getElementById('evLocal').value.trim(),
  });
  agendaEventos.sort((a, b) => a.data.localeCompare(b.data));
  document.getElementById('modalEvento').classList.add('hidden');
  e.target.reset();
  renderCalendario();
  if (calDataSelecionada) selecionarDia(calDataSelecionada);
});

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
      <td>${p.tipoServico}</td>
      <td>${p.servico}</td>
    </tr>`).join('') || `<tr><td colspan="6" class="tbl-empty">Nenhuma pasta encontrada.</td></tr>`;

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

  document.getElementById('pastas-list').classList.add('hidden');
  document.getElementById('pastas-detail').classList.remove('hidden');
  document.getElementById('pastaNumeroDetalhe').textContent = p.numero;

  document.getElementById('pastaAreaBadge').textContent    = p.area || p.tipoServico;
  document.getElementById('pCliente').textContent          = p.cliente;
  document.getElementById('pCodigoSIA').textContent        = p.codigoSIA;
  document.getElementById('pTipoServico').textContent      = p.tipoServico;
  document.getElementById('pServico').textContent          = p.servico;
  document.getElementById('pParteContraria').textContent   = p.parteContraria;
  document.getElementById('pAdvogado').textContent         = p.advogado;

  document.getElementById('pDescricao').value        = p.descricao;
  document.getElementById('pDataDistribuicao').value = p.dataDistribuicao;
  document.getElementById('pDataContrato').value     = '00/00/0000';
  document.getElementById('pValorCausa').value       = p.valorCausa;
  document.getElementById('pIncluidoPor').value      = p.incluidoPor;
  document.getElementById('pAreaResp').innerHTML     = `<option>${p.area || '—'}</option>`;
  document.getElementById('pAdvResp').innerHTML      = `<option>${p.advogado}</option>`;

  document.getElementById('instanciaNumero1').textContent  = p.processo || '—';
  document.getElementById('instanciaComarca1').textContent = `Comarca: ${p.comarca || '—'}`;

  document.querySelectorAll('.pasta-tab').forEach(b => b.classList.remove('is-active'));
  document.querySelectorAll('.pasta-pane').forEach(pn => pn.classList.remove('is-active'));
  document.querySelector('.pasta-tab[data-ptab="andamentos"]').classList.add('is-active');
  document.getElementById('ptab-andamentos').classList.add('is-active');

  // Botão editar pasta
  const btnEditar = document.getElementById('btnEditarPasta');
  if (btnEditar) {
    btnEditar.onclick = () => abrirModalNovaPasta(p.numero);
  }
  // Botão excluir pasta
  const btnExcluir = document.getElementById('btnExcluirPasta');
  if (btnExcluir) {
    btnExcluir.onclick = () => excluirPasta(p.id);
  }
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

// ──────────────────────────────────────────────────────────────────────
// PERSONALIZAÇÃO / TEMA
// ──────────────────────────────────────────────────────────────────────
const TEMA_KEY = 'lhub_tema';

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

function aplicarTema(tema) {
  const root = document.documentElement;
  if (tema.primary) {
    root.style.setProperty('--navy',     tema.primary);
    root.style.setProperty('--navy-mid', tema.primary);
    root.style.setProperty('--ac',       tema.primary);
    root.style.setProperty('--ac-soft',  lighten(tema.primary, 88));
  }
  if (tema.accent) {
    root.style.setProperty('--gold',      tema.accent);
    root.style.setProperty('--gold-soft', lighten(tema.accent, 82));
  }
  if (tema.logoUrl) {
    const img = document.getElementById('brandLogo');
    if (img) { img.src = tema.logoUrl; img.style.display = ''; }
  }
}

const _temaSalvo = JSON.parse(localStorage.getItem(TEMA_KEY) || 'null');
if (_temaSalvo) aplicarTema(_temaSalvo);

document.querySelector('.hdr-btn[title="Configurações"]').addEventListener('click', () => {
  const t = JSON.parse(localStorage.getItem(TEMA_KEY) || '{}');
  const primary = t.primary || '#08505D';
  const accent  = t.accent  || '#BCC2C5';
  document.getElementById('cfgColorPrimary').value              = primary;
  document.getElementById('cfgColorAccent').value               = accent;
  document.getElementById('cfgLogoUrl').value                   = t.logoUrl || '';
  document.getElementById('prevPrimary').style.background       = primary;
  document.getElementById('prevAccent').style.background        = accent;
  if (t.logoUrl) document.getElementById('cfgLogoPreview').src  = t.logoUrl;
  document.getElementById('modalConfig').classList.remove('hidden');
});

document.getElementById('cfgClose').addEventListener('click', () => {
  document.getElementById('modalConfig').classList.add('hidden');
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
  img.src = e.target.value || 'logo.png';
  img.style.display = '';
});
document.getElementById('cfgSalvar').addEventListener('click', () => {
  const tema = {
    primary: document.getElementById('cfgColorPrimary').value,
    accent:  document.getElementById('cfgColorAccent').value,
    logoUrl: document.getElementById('cfgLogoUrl').value.trim() || null,
  };
  localStorage.setItem(TEMA_KEY, JSON.stringify(tema));
  aplicarTema(tema);
  document.getElementById('modalConfig').classList.add('hidden');
  toast('Configurações salvas');
});
document.getElementById('cfgReset').addEventListener('click', () => {
  localStorage.removeItem(TEMA_KEY);
  const root = document.documentElement;
  ['--navy','--navy-mid','--ac','--ac-soft','--gold','--gold-soft'].forEach(v => root.style.removeProperty(v));
  document.getElementById('cfgColorPrimary').value              = '#08505D';
  document.getElementById('cfgColorAccent').value               = '#BCC2C5';
  document.getElementById('cfgLogoUrl').value                   = '';
  document.getElementById('prevPrimary').style.background       = '#08505D';
  document.getElementById('prevAccent').style.background        = '#BCC2C5';
  const img = document.getElementById('brandLogo');
  if (img) { img.src = 'logo.svg'; img.style.display = ''; }
  document.getElementById('cfgLogoPreviewWrap').style.background = '#08505D';
  document.getElementById('cfgLogoPreview').src = 'logo.svg';
  document.getElementById('modalConfig').classList.add('hidden');
  toast('Tema restaurado para o padrão');
});

// ──────────────────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────────────────
renderPipeline();
renderCalendario();

const _h   = new Date();
const _iso = `${_h.getFullYear()}-${String(_h.getMonth()+1).padStart(2,'0')}-${String(_h.getDate()).padStart(2,'0')}`;
selecionarDia(_iso);

inicializar();
