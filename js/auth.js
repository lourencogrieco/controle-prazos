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

// ──────────────────────────────────────────────────────────────────────
// PERFIS E PERMISSÕES
// ──────────────────────────────────────────────────────────────────────
const PERFIS_LABEL = {
  estagiario:     'Estagiário',
  advogado:       'Advogado',
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
  advogado:       { painel:1, agenda:1, atividades:1, pastas:1, relatorios:1, pipeline:1, financeiro:0, configuracoes:0 },
  estagiario:     { painel:1, agenda:1, atividades:1, pastas:1, relatorios:1, pipeline:0, financeiro:0, configuracoes:0 },
  financeiro:     { painel:1, agenda:1, atividades:1, pastas:1, relatorios:1, pipeline:1, financeiro:1, configuracoes:0 },
  controller:     { painel:1, agenda:1, atividades:1, pastas:1, relatorios:1, pipeline:0, financeiro:0, configuracoes:0 },
};

function podeAcessar(view) {
  const p = state.meuPerfil?.perfil || 'estagiario';
  return !!(PERMISSOES[p] || PERMISSOES.estagiario)[view];
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
  const { data } = await db
    .from('usuarios_empresa')
    .select('empresa_id, nome, perfil, area_id')
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
  const perfilLabel = (PERFIS_LABEL[data.perfil] || data.perfil || '').toUpperCase();
  document.querySelector('.user-info strong').textContent = nome;
  document.querySelector('.user-info span').textContent   = perfilLabel;

  esconderLogin();
  await carregarDados();
  aplicarPermissoes();
}

function mostrarLogin() {
  document.getElementById('loginOverlay').classList.remove('hidden');
}

async function fazerLogout() {
  await db.auth.signOut();
  state.user = null;
  state.meuPerfil = null;
  state.empresaId = null;
  mostrarLogin();
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
