// ──────────────────────────────────────────────────────────────────────
// Proxy Guard — autenticação JWT + rate limiting para Vercel Edge
//
// Usado por: pje-proxy, cnj-proxy, esaj-proxy
//
// Variáveis de ambiente esperadas no Vercel:
//   SUPABASE_URL      — URL do projeto Supabase
//   SUPABASE_ANON_KEY — chave pública (anon) do Supabase
//   ALLOWED_ORIGIN    — origem permitida (ex: https://meusite.vercel.app)
//                       Use '*' apenas em desenvolvimento local
// ──────────────────────────────────────────────────────────────────────

const SUPABASE_URL      = (process.env.SUPABASE_URL      || 'https://gcucadlnxttlxckravui.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
const ALLOWED_ORIGIN    = (process.env.ALLOWED_ORIGIN    || '').trim();
const IS_PRODUCTION     = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

// Rate limit: requisições por usuário por minuto (por instância Edge).
// Como Edge Functions são stateless entre invocações frias, esse contador
// reseta em cold starts — mas ainda protege contra rajadas rápidas dentro
// de uma mesma instância.
const DEFAULT_MAX_REQS = 30;
const _rateLimitStore  = new Map(); // userId → [timestamp, ...]

// ── JWT ────────────────────────────────────────────────────────────────

/**
 * Verifica o access token do usuário consultando o Supabase Auth.
 * Retorna o objeto user do Supabase em caso de sucesso, ou null.
 */
async function verificarJWT(req) {
  const auth = (req.headers.get('authorization') || '').trim();
  if (!auth.startsWith('Bearer ')) return null;

  const token = auth.slice(7).trim();
  if (!token) return null;

  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    if (!resp.ok) return null;
    const user = await resp.json();
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

// ── Rate Limiting ──────────────────────────────────────────────────────

/**
 * Janela deslizante de 1 minuto por userId.
 * Retorna true se a requisição é permitida, false se o limite foi atingido.
 */
function verificarRateLimit(userId, maxReqs) {
  const now       = Date.now();
  const windowMs  = 60_000;
  const prev      = _rateLimitStore.get(userId) || [];
  const recentes  = prev.filter(t => now - t < windowMs);

  if (recentes.length >= maxReqs) {
    _rateLimitStore.set(userId, recentes);
    return false;
  }

  recentes.push(now);
  _rateLimitStore.set(userId, recentes);
  return true;
}

// ── CORS ───────────────────────────────────────────────────────────────

/**
 * Retorna os headers CORS adequados.
 * Se ALLOWED_ORIGIN for '*', permite qualquer origem (dev/fallback).
 * Caso contrário, só permite a(s) origem(ns) listadas (separadas por vírgula).
 */
function buildCorsHeaders(req) {
  const origin  = (req.headers.get('origin') || '').trim();
  let allowedOrigin;

  if (ALLOWED_ORIGIN === '*') {
    allowedOrigin = '*';
  } else if (!ALLOWED_ORIGIN) {
    allowedOrigin = IS_PRODUCTION ? 'null' : (origin || '*');
  } else {
    const lista = ALLOWED_ORIGIN.split(',').map(s => s.trim());
    allowedOrigin = lista.includes(origin) ? origin : 'null';
  }

  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}

// ── Guard principal ────────────────────────────────────────────────────

/**
 * Aplica autenticação JWT + rate limiting.
 *
 * @param {Request} req        - Request do Vercel Edge
 * @param {number}  maxReqs    - Limite de requisições/min por usuário
 * @returns {Response | { ok: true, userId: string, cors: object }}
 *   Retorna uma Response de erro (401/429) ou o objeto guard em caso de sucesso.
 *
 * Uso nos proxies:
 *   const guard = await aplicarGuard(req);
 *   if (guard instanceof Response) return guard;
 *   const { cors } = guard;
 */
export async function aplicarGuard(req, maxReqs = DEFAULT_MAX_REQS) {
  const cors = buildCorsHeaders(req);

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  // Autenticação JWT
  const user = await verificarJWT(req);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Não autorizado. Faça login para continuar.' }),
      { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  // Rate limiting
  if (!verificarRateLimit(user.id, maxReqs)) {
    return new Response(
      JSON.stringify({ error: 'Muitas requisições. Aguarde um momento e tente novamente.' }),
      { status: 429, headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': '60' } },
    );
  }

  return { ok: true, userId: user.id, cors };
}
