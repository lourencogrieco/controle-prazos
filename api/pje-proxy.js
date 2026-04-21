export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const pagina = searchParams.get('pagina') || '1';
  const itensPorPagina = searchParams.get('itensPorPagina') || '50';
  const texto = searchParams.get('texto');
  const dataInicio = searchParams.get('dataInicio');
  const dataFim = searchParams.get('dataFim') || dataInicio;

  const cors = { 'Access-Control-Allow-Origin': '*' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (!texto || !dataInicio) {
    return new Response(JSON.stringify({ error: 'Parâmetros obrigatórios: texto, dataInicio' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao` +
    `?pagina=${pagina}&itensPorPagina=${itensPorPagina}` +
    `&texto=${encodeURIComponent(texto)}` +
    `&dataDisponibilizacaoInicio=${dataInicio}` +
    `&dataDisponibilizacaoFim=${dataFim}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Origin': 'https://comunicaapi.pje.jus.br',
        'Referer': 'https://comunicaapi.pje.jus.br/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ error: 'PJe retornou HTML (bloqueado)', status: response.status, raw: text.slice(0, 300) }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}
