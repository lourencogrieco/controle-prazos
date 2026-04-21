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
  user:      null,
  empresaId: null,
  meuPerfil: null,
  pastas:    [],
  prazos:    [],
  tarefas:   [],
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
  const [pr, pz, tf] = await Promise.all([
    db.from('pastas').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
    db.from('prazos_lhub').select('*').eq('empresa_id', eid).order('prazo'),
    db.from('tarefas_lhub').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
  ]);
  state.pastas  = (pr.data || []).map(dbParaPasta);
  state.prazos  = (pz.data || []).map(dbParaPrazo);
  state.tarefas = (tf.data || []).map(dbParaTarefa);

  renderPastaList();
  renderAtividades();
  renderPrazosAba();
  renderTarefasAba();
}

// ──────────────────────────────────────────────────────────────────────
// CRUD — PASTAS
// ──────────────────────────────────────────────────────────────────────
function abrirModalNovaPasta(numero) {
  const p = numero ? state.pastas.find(x => x.numero === numero) : null;
  document.getElementById('tituloPastaModal').textContent = p ? 'Editar Pasta' : 'Nova Pasta';
  document.getElementById('pastaId').value        = p?.id || '';
  document.getElementById('pNr').value            = p?.numero || '';
  document.getElementById('pDataAb').value        = p?.dataDistribuicao
    ? p.dataDistribuicao.split('/').reverse().join('-') : '';
  document.getElementById('pCliente').value       = p?.cliente || '';
  document.getElementById('pParteContraria').value = (p?.parteContraria !== '-') ? (p?.parteContraria || '') : '';
  document.getElementById('pCategoria').value     = p?.tipoServico || '';
  document.getElementById('pTipoAcao').value      = p?.servico || '';
  document.getElementById('pAdvogado').value      = p?.advogado || '';
  document.getElementById('pComarca').value       = p?.comarca || '';
  document.getElementById('pProcesso').value      = p?.processo || '';
  document.getElementById('pValorCausa').value    = p?.valorCausa || '';
  document.getElementById('pArea').value          = p?.area || '';
  document.getElementById('pObs').value           = p?.descricao || '';
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

document.getElementById('novaPastaForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarPasta');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  const pastaId = document.getElementById('pastaId').value || uid();
  const obj = pastaParaDb({
    id:               pastaId,
    numero:           document.getElementById('pNr').value.trim(),
    codigoSIA:        '-',
    cliente:          document.getElementById('pCliente').value.trim(),
    parteContraria:   document.getElementById('pParteContraria').value.trim() || '-',
    tipoServico:      document.getElementById('pCategoria').value,
    servico:          document.getElementById('pTipoAcao').value.trim(),
    advogado:         document.getElementById('pAdvogado').value.trim(),
    comarca:          document.getElementById('pComarca').value.trim(),
    processo:         document.getElementById('pProcesso').value.trim(),
    valorCausa:       document.getElementById('pValorCausa').value.trim() || 'R$ 0,00',
    area:             document.getElementById('pArea').value,
    descricao:        document.getElementById('pObs').value.trim(),
    dataDistribuicao: document.getElementById('pDataAb').value || null,
    incluidoPor:      state.meuPerfil?.nome || '',
    status:           'ativo',
  });

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
// CRUD — PRAZOS (formulário de cadastro rápido no Painel)
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

// ──────────────────────────────────────────────────────────────────────
// DATA — hardcoded (demo data para pipeline, intimações, andamentos, agenda)
// ──────────────────────────────────────────────────────────────────────
const oportunidades = [
  { numero:"272-2026", lead:"Vivar Sanchez Medicina Cardiológica Ltda.", tipo:"Consultivo", tese:"Consultoria Tributária", area:"Tributário", status:"Recusado", motivoRecusa:"subir honorários para 20k", responsavel:"CB", responsavelNome:"Cinthia Benvenuto de Carvalho Ferreira", data:"2026-01-28" },
  { numero:"60-2025", lead:"Sts – Sociedade De Terceirização De Serviços Ltda.", tipo:"Consultivo", tese:"Consultoria Tributária", area:"Tributário", status:"Aguardando aceite", motivoRecusa:"subir honorários", responsavel:"CB AC", responsavelNome:"Ana Claudia de Andrade Argenta", data:"2025-01-24", envio:"automático" },
  { numero:"67-2025", lead:"Clinica De Olhos Octavio Moura Brasil Ltda.", tipo:"Consultivo", tese:"Consultoria Tributária", area:"Tributário", status:"Aguardando aceite", responsavel:"CB", responsavelNome:"Cinthia Benvenuto de Carvalho Ferreira", data:"2025-02-10" },
  { numero:"85-2025", lead:"Farma Plus Distribuidora de Medicamentos Ltda.", tipo:"Consultivo", tese:"Consultoria Tributária", area:"Tributário", status:"Aguardando aceite", motivoRecusa:"revisão de proposta", responsavel:"CB", responsavelNome:"Cinthia Benvenuto de Carvalho Ferreira", data:"2025-03-05" },
  { numero:"124-2025", lead:"Construtora Meridional S.A.", tipo:"Contencioso", tese:"Defesa Trabalhista", area:"Trabalhista", status:"Aguardando aceite", responsavel:"LG", responsavelNome:"Lourenço Grieco", data:"2025-04-12" },
];

const intimacoesData = [
  { id:"INT-2026-039", pastaNr:"37/2025-2776", cliente:"Eurofins do Brasil Análises de Alimentos Ltda.", processo:"37/2025-2776", orgao:"Vara Cível — São Paulo", dataPublicacao:"2026-04-03", prazoFatal:"2026-04-18", descricao:"Intimação para encerramento da pasta e baixa documental.", prazoVinculado:"37/2025-2776", status:"Pendente", diasUteis:false },
  { id:"INT-2026-040", pastaNr:"1002456/2026", cliente:"Banco Prime Capital", processo:"1002456-89.2026.8.26.0100", orgao:"2ª Vara Cível — Fórum Central", dataPublicacao:"2026-04-07", prazoFatal:"2026-04-22", descricao:"Citação para apresentação de contestação no prazo de 15 dias úteis.", prazoVinculado:"1002456/2026", status:"Em andamento", diasUteis:true },
  { id:"INT-2026-042", pastaNr:"57/2022-5975", cliente:"Bayer S.a.", processo:"1000909-52.2022.8.26.0067", orgao:"Comarca de Borborema", dataPublicacao:"2026-04-14", prazoFatal:"2026-05-15", descricao:"Intimação para apresentação de contestação — prazo de 30 dias úteis.", prazoVinculado:"57/2022-5975", status:"Pendente", diasUteis:true },
  { id:"INT-2026-043", pastaNr:"42/2017-5974", cliente:"Vera Maria Ritter", processo:"0005678-12.2017.8.26.0100", orgao:"TJSP — Câmara Empresarial", dataPublicacao:"2026-04-20", prazoFatal:"2026-05-20", descricao:"Intimação para contrarrazões ao recurso de apelação — prazo de 30 dias.", prazoVinculado:"42/2017-5974", status:"Pendente", diasUteis:true },
  { id:"INT-2026-044", pastaNr:"2424/2026-5973", cliente:"PAPELARIA TABAJARA LTDA.", processo:"0009001-44.2026.8.26.0100", orgao:"10ª Vara Cível — São Paulo", dataPublicacao:"2026-04-25", prazoFatal:"2026-05-12", descricao:"Juntada de documentos contábeis requisitados pelo juízo — prazo de 15 dias.", prazoVinculado:"2424/2026-5973", status:"Pendente", diasUteis:false },
];

const andamentosBase = [
  { pastaNr:"57/2022-5975", codigoSIA:"202/2022-34", cliente:"Bayer S.a.", area:"Cível e resolução de conflitos", data:"2022-09-23", andamento:"Ação principal", advogado:"Bruno F. S. Batista", tipo:"Ação principal", manual:false },
  { pastaNr:"57/2022-5975", codigoSIA:"202/2022-34", cliente:"Bayer S.a.", area:"Cível e resolução de conflitos", data:"2023-03-14", andamento:"Despacho — citação réu", advogado:"Bruno F. S. Batista", tipo:"Despacho", manual:false },
  { pastaNr:"57/2022-5975", codigoSIA:"202/2022-34", cliente:"Bayer S.a.", area:"Cível e resolução de conflitos", data:"2023-07-20", andamento:"Juntada de contestação", advogado:"Bruno F. S. Batista", tipo:"Juntada de documento", manual:false },
  { pastaNr:"57/2022-5975", codigoSIA:"202/2022-34", cliente:"Bayer S.a.", area:"Cível e resolução de conflitos", data:"2024-02-08", andamento:"Nota interna — revisão", advogado:"Bruno F. S. Batista", tipo:"Manual", manual:true },
  { pastaNr:"42/2017-5974", codigoSIA:"260/1992-1", cliente:"Vera Maria Ritter", area:"Empresarial", data:"2017-03-10", andamento:"Distribuição da ação", advogado:"Lourenço Grieco", tipo:"Ação principal", manual:false },
  { pastaNr:"42/2017-5974", codigoSIA:"260/1992-1", cliente:"Vera Maria Ritter", area:"Empresarial", data:"2018-06-22", andamento:"Sentença de 1ª instância", advogado:"Lourenço Grieco", tipo:"Sentença", manual:false },
  { pastaNr:"42/2017-5974", codigoSIA:"260/1992-1", cliente:"Vera Maria Ritter", area:"Empresarial", data:"2019-04-15", andamento:"Acórdão — provimento parcial", advogado:"Lourenço Grieco", tipo:"Acórdão", manual:false },
  { pastaNr:"14/2026-5981", codigoSIA:"-", cliente:"SANTOS BRASIL PARTICIPAÇÕES S.A.", area:"Cível e resolução de conflitos", data:"2026-01-15", andamento:"Distribuição da ação", advogado:"Lourenço Grieco", tipo:"Ação principal", manual:false },
  { pastaNr:"2424/2026-5973", codigoSIA:"261/1999-1", cliente:"PAPELARIA TABAJARA LTDA.", area:"Empresarial", data:"2026-02-05", andamento:"Distribuição da ação", advogado:"Lourenço Grieco", tipo:"Ação principal", manual:false },
  { pastaNr:"2424/2026-5973", codigoSIA:"261/1999-1", cliente:"PAPELARIA TABAJARA LTDA.", area:"Empresarial", data:"2026-03-10", andamento:"Despacho — citação", advogado:"Lourenço Grieco", tipo:"Despacho", manual:false },
  { pastaNr:"2424/2026-5973", codigoSIA:"261/1999-1", cliente:"PAPELARIA TABAJARA LTDA.", area:"Empresarial", data:"2026-04-01", andamento:"Intimação — prazo 15 dias", advogado:"Lourenço Grieco", tipo:"Intimação", manual:false },
];

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

const agendaEventos = [
  { data:"2026-04-17", titulo:"Reunião de equipe — Planejamento semanal",  tipo:"Reunião",    hora:"09:00", responsavel:"Lourenço Grieco",    local:"Sala de reuniões" },
  { data:"2026-04-18", titulo:"Prazo: Eurofins — Encerramento de pasta",   tipo:"Prazo",      hora:"",      responsavel:"Advogado",            local:"Interno" },
  { data:"2026-04-22", titulo:"Audiência — Banco Prime Capital",           tipo:"Audiência",  hora:"14:30", responsavel:"Controller",          local:"2ª Vara Cível" },
  { data:"2026-04-24", titulo:"Diligência: Grupo Orion Logística",         tipo:"Diligência", hora:"11:00", responsavel:"Estagiário",          local:"Cartório" },
  { data:"2026-04-25", titulo:"Audiência — Hospital Santa Helena",         tipo:"Audiência",  hora:"09:30", responsavel:"Sócio",               local:"3ª Vara do Trabalho" },
  { data:"2026-04-28", titulo:"Reunião com cliente — Grupo Orion",         tipo:"Reunião",    hora:"15:00", responsavel:"Lourenço Grieco",    local:"Escritório" },
  { data:"2026-04-29", titulo:"Prazo: Santos Brasil — Resposta",           tipo:"Prazo",      hora:"",      responsavel:"Lourenço Grieco",    local:"Tribunal" },
  { data:"2026-05-05", titulo:"Audiência — Bayer S.a.",                    tipo:"Audiência",  hora:"10:00", responsavel:"Bruno F. S. Batista", local:"Comarca de Borborema" },
  { data:"2026-05-12", titulo:"Prazo: Papelaria Tabajara — Manifestação",  tipo:"Prazo",      hora:"",      responsavel:"Lourenço Grieco",    local:"Tribunal" },
  { data:"2026-05-20", titulo:"Audiência — Construtora Meridional",        tipo:"Audiência",  hora:"14:00", responsavel:"Lourenço Grieco",    local:"4ª Vara Trabalhista" },
];

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
