/**
 * Vercel Cron — Sync automático de intimações PJe
 * Schedule: 0 10 * * 1-5  →  07h BRT (10h UTC) em dias úteis (Seg-Sex)
 *
 * Env vars necessárias no Vercel:
 *   CRON_SECRET       — segredo para proteger o endpoint
 *   SUPABASE_URL      — https://gcucadlnxttlxckravui.supabase.co
 *   SUPABASE_ANON_KEY — chave pública do projeto Supabase
 */

export default async function handler(req, res) {
  // ── Proteção: só aceita chamadas autorizadas ──────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers['authorization'] ?? '';
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }

  const supaUrl     = (process.env.SUPABASE_URL      ?? 'https://gcucadlnxttlxckravui.supabase.co').trim();
  const supaAnonKey = (process.env.SUPABASE_ANON_KEY ?? '').trim();

  // Permite acionar manualmente com datas específicas
  const dataInicio = req.query?.dataInicio ?? null;
  const dataFim    = req.query?.dataFim    ?? null;
  const body       = dataInicio
    ? JSON.stringify({ dataInicio, dataFim: dataFim || dataInicio })
    : '{}';

  try {
    const response = await fetch(
      `${supaUrl}/functions/v1/sync-intimacoes`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${supaAnonKey}`,
          'Content-Type':  'application/json',
        },
        body,
      }
    );

    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

    if (!response.ok) {
      console.error('[pje-cron] Edge Function erro:', response.status, payload);
      return res.status(502).json({ ok: false, status: response.status, ...payload });
    }

    console.log('[pje-cron] Sync concluído:', payload);
    return res.status(200).json({ ok: true, ...payload });

  } catch (err) {
    console.error('[pje-cron] Erro:', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
