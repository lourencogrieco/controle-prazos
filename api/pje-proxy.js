export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const { pagina = 1, itensPorPagina = 50, texto, dataInicio, dataFim } = req.query;

  if (!texto || !dataInicio) {
    res.status(400).json({ error: 'Parâmetros obrigatórios: texto, dataInicio' });
    return;
  }

  const url = `https://comunica.pje.jus.br/api/v1/comunicacao` +
    `?pagina=${pagina}&itensPorPagina=${itensPorPagina}` +
    `&texto=${encodeURIComponent(texto)}` +
    `&dataDisponibilizacaoInicio=${dataInicio}` +
    `&dataDisponibilizacaoFim=${dataFim || dataInicio}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Referer': 'https://comunica.pje.jus.br/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch { res.status(502).json({ error: 'PJe retornou resposta inválida', raw: text.slice(0, 200) }); return; }

    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
