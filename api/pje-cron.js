/**
 * Vercel Cron — Sync automático de intimações PJe
 * Schedule: 0 10 * * 1-5  →  07h BRT (10h UTC) em dias úteis (Seg-Sex)
 *
 * Env vars necessárias no Vercel:
 *   CRON_SECRET       — segredo para proteger o endpoint (gere com: openssl rand -hex 32)
 *   SUPABASE_URL      — https://gcucadlnxttlxckravui.supabase.co
 *   SUPABASE_ANON_KEY — chave pública do projeto Supabase
 */

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // ── Proteção: só aceita chamadas do Vercel Cron ou com o segredo correto ──
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const supaUrl    = process.env.SUPABASE_URL      || 'https://gcucadlnxttlxckravui.supabase.co';
  const supaAnonKey = process.env.SUPABASE_ANON_KEY || '';

  // ── Permite acionar manualmente com uma janela de datas via query string ──
  const { searchParams } = new URL(req.url, 'https://placeholder.invalid');
  const dataInicio = searchParams.get('dataInicio') || null;
  const dataFim    = searchParams.get('dataFim')    || null;

  const body = dataInicio ? JSON.stringify({ dataInicio, dataFim: dataFim || dataInicio }) : '{}';

  try {
    const res = await fetch(`${supaUrl}/functions/v1/sync-intimacoes`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${supaAnonKey}`,
        'Content-Type':  'application/json',
      },
      body,
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[pje-cron] Edge Function erro:', payload);
      return new Response(JSON.stringify({ ok: false, status: res.status, ...payload }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[pje-cron] Sync concluído:', payload);
    return new Response(JSON.stringify({ ok: true, ...payload }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[pje-cron] Erro inesperado:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
