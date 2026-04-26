// ──────────────────────────────────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────────────────────────────────
let _criandoConta = false;

async function inicializar() {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    await onLogin(session.user);
  } else {
    mostrarLogin();
  }
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN'  && session && !_criandoConta) await onLogin(session.user);
    if (event === 'SIGNED_OUT') mostrarLogin();
  });
}

// ──────────────────────────────────────────────────────────────────────
// PERFIS E PERMISSÕES
// ──────────────────────────────────────────────────────────────────────
const PERFIS_LABEL = {
  estagiario:     'Estagiário',
  advogado:       'Advogado',
  coordenador:    'Coordenador',
  socio:          'Sócio',
  socio_fundador: 'Sócio Fundador',
  financeiro:     'Financeiro',
  controller:     'Controller',
  admin:          'Admin',
  adm:            'Admin',
};

const PERMISSOES = {
  admin:          { painel:1, agenda:1, atividades:1, pastas:1, relatorios:1, pipeline:1, financeiro:1, configuracoes:1 },
  adm:            { painel:1, agenda:1, atividades:1, pastas:1, relatorios:1, pipeline:1, financeiro:1, configuracoes:1 },
  socio_fundador: { painel:1, agenda:1, atividades:1, pastas:1, relatorios:1, pipeline:1, financeiro:1, configuracoes:1 },
  socio:          { painel:1, agenda:1, atividades:1, pastas:1, relatorios:1, pipeline:1, financeiro:1, configuracoes:0 },
  coordenador:    { painel:1, agenda:1, atividades:1, pastas:1, relatorios:1, pipeline:1, financeiro:0, configuracoes:0 },
  advogado:       { painel:1, agenda:1, atividades:1, pastas:1, relatorios:1, pipeline:1, financeiro:0, configuracoes:0 },
  estagiario:     { painel:1, agenda:1, atividades:1, pastas:1, relatorios:1, pipeline:0, financeiro:0, configuracoes:0 },
  financeiro:     { painel:1, agenda:1, atividades:1, pastas:1, relatorios:1, pipeline:1, financeiro:1, configuracoes:0 },
  controller:     { painel:1, agenda:1, atividades:1, pastas:1, relatorios:1, pipeline:0, financeiro:0, configuracoes:0 },
};

// Perfis com visibilidade de dados gerenciais (produtividade, auditoria)
const PERFIS_GESTAO = ['socio', 'socio_fundador', 'controller', 'coordenador'];

function podeAcessar(view) {
  const p = state.meuPerfil?.perfil || 'estagiario';
  return !!(PERMISSOES[p] || PERMISSOES.estagiario)[view];
}

// ── Permissões de CRUD ─────────────────────────────────────────────────
function podeAlterarDataPrazo() {
  return ['socio','socio_fundador','controller','coordenador'].includes(state.meuPerfil?.perfil || '');
}
function podeEditarRegistro() {
  return ['socio','socio_fundador','admin','adm','controller','coordenador','advogado'].includes(state.meuPerfil?.perfil || '');
}
function podeExcluirRegistro() {
  return ['socio','socio_fundador','admin','adm'].includes(state.meuPerfil?.perfil || '');
}

function aplicarPermissoes() {
  const p = state.meuPerfil?.perfil || 'estagiario';
  const mapa = PERMISSOES[p] || PERMISSOES.estagiario;

  document.querySelectorAll('.nav-tab[data-view]').forEach(btn => {
    btn.style.display = mapa[btn.dataset.view] ? '' : 'none';
  });

  const btnCfg = document.querySelector('.hdr-btn[title="Configurações"]');
  if (btnCfg) btnCfg.style.display = mapa.configuracoes ? '' : 'none';

  const viewAtiva = document.querySelector('.view.is-active')?.id?.replace('view-', '');
  if (viewAtiva && !mapa[viewAtiva]) {
    const primeira = Object.keys(mapa).find(v => mapa[v]);
    if (primeira) navegarPara(primeira);
  }
}

async function onLogin(user) {
  state.user = user;
  const { data, error } = await db
    .from('usuarios_empresa')
    .select('empresa_id, nome, perfil, area_id')
    .eq('user_id', user.id)
    .maybeSingle(); // .single() retornava 406 quando 0 linhas (PGRST116)

  if (error) {
    toast('Erro ao carregar perfil: ' + error.message, 'error');
    await db.auth.signOut({ scope: 'local' });
    mostrarLogin();
    return;
  }

  if (!data) {
    toast('Usuário sem empresa vinculada. Contate o administrador.', 'error');
    await db.auth.signOut();
    return;
  }
  state.empresaId = data.empresa_id;
  state.meuPerfil = data;
  if (typeof aplicarTemaSalvo === 'function') aplicarTemaSalvo();

  const nome = (data.nome || user.email || 'Usuário').toUpperCase();
  const perfilLabel = (PERFIS_LABEL[data.perfil] || data.perfil || '').toUpperCase();
  document.querySelector('.user-info strong').textContent = nome;
  document.querySelector('.user-info span').textContent   = perfilLabel;

  // Avatar com iniciais do usuário no header
  const partes = nome.trim().split(/\s+/);
  const iniciais = partes.length >= 2
    ? partes[0][0] + partes[partes.length - 1][0]
    : partes[0].slice(0, 2);
  const avatarEl = document.getElementById('hdrUserAvatar');
  if (avatarEl) { avatarEl.textContent = iniciais; avatarEl.title = nome; }

  esconderLogin();
  await carregarDados();
  aplicarPermissoes();
  _iniciarRealtime();
  _iniciarIdleTimer();
}

function mostrarLogin() {
  document.getElementById('loginOverlay').classList.remove('hidden');
  document.getElementById('btnEntrar').disabled = false;
  document.getElementById('btnEntrar').textContent = 'Entrar';
  if (typeof setAuthMode === 'function') setAuthMode('login');
}

async function fazerLogout() {
  _pararRealtime();
  _pararIdleTimer();
  _pararAuthActivityListeners();
  try {
    await db.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.warn('[auth] falha ao encerrar sessão remota:', err.message);
  }
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-') || k.includes('supabase.auth'))
      .forEach(k => localStorage.removeItem(k));
  } catch { /* ignora limpeza local indisponível */ }
  state.user = null;
  state.meuPerfil = null;
  state.empresaId = null;
  state.pastas = [];
  state.prazos = [];
  state.tarefas = [];
  state.clientes = [];
  state.intimacoes = [];
  agendaEventos.length = 0;
  mostrarLogin();
  toast('Sessão encerrada.');
}

// ── IDLE TIMEOUT ────────────────────────────────────────────────────────
// Encerra sessão após 4h de inatividade; avisa com toast nos últimos 5min.
const IDLE_TIMEOUT_MS  = 4 * 60 * 60 * 1000;   // 4 horas
const IDLE_WARN_MS     = IDLE_TIMEOUT_MS - 5 * 60 * 1000; // aviso 5min antes

let _idleTimer      = null;
let _idleWarnTimer  = null;
let _idleWarnShown  = false;
let _authActivityBound = false;
const _authActivityEvents = ['mousemove', 'keydown', 'touchstart', 'click'];

function _resetIdleTimer() {
  clearTimeout(_idleTimer);
  clearTimeout(_idleWarnTimer);
  _idleWarnShown = false;

  _idleWarnTimer = setTimeout(() => {
    if (!state.user) return;
    _idleWarnShown = true;
    toast('Sua sessão encerrará em 5 minutos por inatividade.', 'error');
  }, IDLE_WARN_MS);

  _idleTimer = setTimeout(async () => {
    if (!state.user) return;
    toast('Sessão encerrada por inatividade.', 'error');
    await fazerLogout();
  }, IDLE_TIMEOUT_MS);
}

function _pararIdleTimer() {
  clearTimeout(_idleTimer);
  clearTimeout(_idleWarnTimer);
}

function _pararAuthActivityListeners() {
  if (!_authActivityBound) return;
  _authActivityEvents.forEach(ev => {
    document.removeEventListener(ev, _resetIdleTimer);
  });
  _authActivityBound = false;
}

function _iniciarIdleTimer() {
  _resetIdleTimer();
  if (_authActivityBound) return;
  _authActivityEvents.forEach(ev => {
    document.addEventListener(ev, _resetIdleTimer, { passive: true });
  });
  _authActivityBound = true;
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

function setAuthMode(modo) {
  const isSignup = modo === 'signup';
  document.getElementById('loginForm')?.classList.toggle('hidden', isSignup);
  document.getElementById('signupForm')?.classList.toggle('hidden', !isSignup);
  const btn = document.getElementById('btnAuthToggle');
  if (btn) btn.textContent = isSignup ? 'Já tenho conta' : 'Criar nova conta';
  const err = document.getElementById('loginError');
  if (err) err.classList.add('hidden');
}

document.getElementById('btnAuthToggle')?.addEventListener('click', () => {
  const signupAberto = !document.getElementById('signupForm')?.classList.contains('hidden');
  setAuthMode(signupAberto ? 'login' : 'signup');
});

document.getElementById('signupForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnCriarConta');
  const err = document.getElementById('loginError');
  btn.disabled = true;
  btn.textContent = 'Criando…';
  err.classList.add('hidden');
  try {
    const nome = document.getElementById('signupNome').value.trim();
    const empresa = document.getElementById('signupEmpresa').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const senha = document.getElementById('signupSenha').value;
    if (!nome || !empresa || !email || !senha) throw new Error('Preencha todos os campos.');

    _criandoConta = true;
    let { data: signUpData, error: signUpError } = await db.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, empresa } },
    });
    if (signUpError) {
      const jaExiste = /already|registered|exists|user/i.test(signUpError.message || '');
      if (!jaExiste) throw signUpError;
      const loginExistente = await db.auth.signInWithPassword({ email, password: senha });
      if (loginExistente.error) {
        throw new Error('Este e-mail já existe. Use "Já tenho conta" ou informe a senha correta para concluir o vínculo da empresa.');
      }
      signUpData = loginExistente.data;
    }

    const userId = signUpData?.user?.id;
    if (!userId) throw new Error('Conta criada. Confirme o e-mail e faça login.');

    if (!signUpData.session) {
      const loginNovo = await db.auth.signInWithPassword({ email, password: senha });
      if (loginNovo.error) {
        throw new Error('Conta criada. Confirme o e-mail e depois entre com sua senha para concluir o cadastro da empresa.');
      }
      signUpData = loginNovo.data;
    }

    const { error: rpcError } = await db.rpc('criar_empresa_e_usuario', {
      p_nome_usuario: nome,
      p_nome_empresa: empresa,
    });
    if (rpcError) {
      throw new Error('Conta autenticada, mas não foi possível cadastrar a empresa: ' + rpcError.message);
    }

    toast('Conta e empresa cadastradas. Você já pode usar o sistema.');
    if (signUpData.session?.user) await onLogin(signUpData.session.user);
    else await db.auth.signOut({ scope: 'local' });
    setAuthMode('login');
    document.getElementById('loginEmail').value = email;
  } catch (er) {
    err.textContent = er.message;
    err.classList.remove('hidden');
  } finally {
    _criandoConta = false;
    btn.disabled = false;
    btn.textContent = 'Criar conta';
  }
});

document.getElementById('btnLogout')?.addEventListener('click', fazerLogout);
