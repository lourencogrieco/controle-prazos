/**
 * Testes do proxy-guard — Node.js (sem framework externo)
 * Executa: node api/_lib/proxy-guard.test.mjs
 */

// ── Setup: variáveis de ambiente e mock do fetch ───────────────────────
process.env.SUPABASE_URL      = 'https://fake.supabase.co';
process.env.SUPABASE_ANON_KEY = 'fake-anon-key';
process.env.ALLOWED_ORIGIN    = 'https://meusite.vercel.app';

let _mockFetchImpl = null;
globalThis.fetch = async (url, opts) => {
  if (_mockFetchImpl) return _mockFetchImpl(url, opts);
  throw new Error('fetch não mockado para: ' + url);
};

function mockSupabase(user) {
  _mockFetchImpl = async (url) => {
    if (url.includes('/auth/v1/user')) {
      if (user) return { ok: true, json: async () => user };
      return { ok: false, json: async () => ({ error: 'invalid token' }) };
    }
    throw new Error('fetch inesperado: ' + url);
  };
}

// ── Helpers de teste ───────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

function makeReq(overrides = {}) {
  return {
    method:  overrides.method  || 'GET',
    url:     overrides.url     || 'https://fake.vercel.app/api/pje-proxy?texto=foo&dataInicio=2026-01-01',
    headers: {
      get: (key) => {
        const h = overrides.headers || {};
        return h[key.toLowerCase()] || null;
      },
    },
  };
}

// ── Importa o guard ────────────────────────────────────────────────────
const { aplicarGuard } = await import('./proxy-guard.js');

// ══════════════════════════════════════════════════════════════════════
console.log('\n1. Sem header Authorization → 401');
// ══════════════════════════════════════════════════════════════════════
{
  mockSupabase(null);
  const result = await aplicarGuard(makeReq());
  assert(result instanceof Response,          'retorna Response');
  assert(result.status === 401,               'status 401');
  const body = await result.json();
  assert(body.error.includes('Não autorizado'), 'mensagem de erro correta');
}

// ══════════════════════════════════════════════════════════════════════
console.log('\n2. Token inválido (Supabase recusa) → 401');
// ══════════════════════════════════════════════════════════════════════
{
  mockSupabase(null); // Supabase retorna !ok
  const result = await aplicarGuard(makeReq({ headers: { authorization: 'Bearer token-invalido' } }));
  assert(result instanceof Response, 'retorna Response');
  assert(result.status === 401,      'status 401');
}

// ══════════════════════════════════════════════════════════════════════
console.log('\n3. Token válido → guard ok (não é Response)');
// ══════════════════════════════════════════════════════════════════════
{
  mockSupabase({ id: 'user-abc-123', email: 'adv@escritorio.com' });
  const result = await aplicarGuard(makeReq({ headers: { authorization: 'Bearer token-valido' } }));
  assert(!(result instanceof Response), 'não retorna Response de erro');
  assert(result.ok === true,            'result.ok === true');
  assert(result.userId === 'user-abc-123', 'userId extraído corretamente');
  assert(typeof result.cors === 'object',  'cors headers presentes');
}

// ══════════════════════════════════════════════════════════════════════
console.log('\n4. CORS — origem permitida retorna a própria origem');
// ══════════════════════════════════════════════════════════════════════
{
  mockSupabase({ id: 'user-xyz', email: 'x@y.com' });
  const result = await aplicarGuard(makeReq({
    headers: {
      authorization: 'Bearer token-valido',
      origin: 'https://meusite.vercel.app',
    },
  }));
  assert(!(result instanceof Response), 'guard passou');
  assert(
    result.cors['Access-Control-Allow-Origin'] === 'https://meusite.vercel.app',
    'Access-Control-Allow-Origin espelha a origem permitida',
  );
}

// ══════════════════════════════════════════════════════════════════════
console.log('\n5. CORS — origem não autorizada retorna primeiro da lista');
// ══════════════════════════════════════════════════════════════════════
{
  mockSupabase({ id: 'user-xyz', email: 'x@y.com' });
  const result = await aplicarGuard(makeReq({
    headers: {
      authorization: 'Bearer token-valido',
      origin: 'https://site-malicioso.com',
    },
  }));
  assert(!(result instanceof Response), 'guard passou (CORS não bloqueia server-side, mas header fica correto)');
  assert(
    result.cors['Access-Control-Allow-Origin'] !== 'https://site-malicioso.com',
    'origem não autorizada não é espelhada',
  );
}

// ══════════════════════════════════════════════════════════════════════
console.log('\n6. OPTIONS (preflight) → 204 sem verificar token');
// ══════════════════════════════════════════════════════════════════════
{
  _mockFetchImpl = null; // fetch não deve ser chamado
  let fetchCalled = false;
  _mockFetchImpl = async () => { fetchCalled = true; return { ok: true, json: async () => ({}) }; };

  const result = await aplicarGuard(makeReq({ method: 'OPTIONS' }));
  assert(result instanceof Response,  'retorna Response');
  assert(result.status === 204,       'status 204');
  assert(!fetchCalled,                'Supabase não é consultado no preflight');
}

// ══════════════════════════════════════════════════════════════════════
console.log('\n7. Rate limiting — exceder limite dispara 429');
// ══════════════════════════════════════════════════════════════════════
{
  mockSupabase({ id: 'user-rate-test', email: 'rate@test.com' });
  const LIMITE = 3;
  let lastResult;
  for (let i = 0; i < LIMITE + 1; i++) {
    lastResult = await aplicarGuard(
      makeReq({ headers: { authorization: 'Bearer token-valido' } }),
      LIMITE,
    );
  }
  assert(lastResult instanceof Response, 'retorna Response após exceder limite');
  assert(lastResult.status === 429,      'status 429');
  const body = await lastResult.json();
  assert(body.error.includes('Muitas requisições'), 'mensagem 429 correta');
  assert(lastResult.headers.get('Retry-After') === '60', 'header Retry-After presente');
}

// ══════════════════════════════════════════════════════════════════════
console.log('\n8. Rate limit é por userId (usuários diferentes não interferem)');
// ══════════════════════════════════════════════════════════════════════
{
  // user-A dispara N+1 requests — user-B ainda consegue passar
  mockSupabase({ id: 'user-A', email: 'a@test.com' });
  const LIMITE = 2;
  for (let i = 0; i < LIMITE + 1; i++) {
    await aplicarGuard(makeReq({ headers: { authorization: 'Bearer token-A' } }), LIMITE);
  }

  // user-B com token diferente (mock alterna com base na chamada)
  mockSupabase({ id: 'user-B', email: 'b@test.com' });
  const resultB = await aplicarGuard(
    makeReq({ headers: { authorization: 'Bearer token-B' } }),
    LIMITE,
  );
  assert(!(resultB instanceof Response) || resultB.status !== 429,
    'user-B não é bloqueado pelo rate limit de user-A');
}

// ── Resultado final ────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Resultado: ${passed} passou | ${failed} falhou`);
if (failed > 0) process.exit(1);
