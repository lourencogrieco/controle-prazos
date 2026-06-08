/**
 * Vercel Cron — Disparo diário de notificações de prazos
 * Schedule: 0 10 * * 1-5  →  07h BRT (10h UTC) em dias úteis (Seg-Sex)
 *
 * Env vars necessárias no Vercel:
 *   CRON_SECRET       — mesmo segredo usado no pje-cron
 *   SUPABASE_URL      — URL do projeto Supabase
 *   SUPABASE_ANON_KEY — chave pública do Supabase
 */

export default async function handler(req, res) {
  // Proteção: só aceita chamadas do Vercel Cron ou autorizadas
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(500).json({ ok: false, error: 'CRON_SECRET não configurado' });
  }
  if (req.method && req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = req.headers['authorization'] ?? '';
  if (auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const supaUrl     = (process.env.SUPABASE_URL      ?? '').trim();
  const supaAnonKey = (process.env.SUPABASE_ANON_KEY ?? '').trim();

  if (!supaUrl) {
    return res.status(500).json({ ok: false, error: 'SUPABASE_URL não configurado' });
  }

  try {
    const response = await fetch(
      `${supaUrl}/functions/v1/notificar-prazos`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${supaAnonKey}`,
          'Content-Type':  'application/json',
          'X-Job-Secret':  cronSecret,
        },
        body: '{}',
      },
    );

    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

    if (!response.ok) {
      console.error('[notificar-prazos-cron] Edge Function erro:', response.status, payload);
      return res.status(502).json({ ok: false, status: response.status, ...payload });
    }

    console.log('[notificar-prazos-cron] Concluído:', payload);
    return res.status(200).json({ ok: true, ...payload });

  } catch (err) {
    console.error('[notificar-prazos-cron] Erro:', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
