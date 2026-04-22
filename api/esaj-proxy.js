export const config = { runtime: 'edge' };

export default async function handler(req) {
  const CORS = { 'Access-Control-Allow-Origin': '*' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const { searchParams } = new URL(req.url);
  const numero = searchParams.get('numero');

  if (!numero) {
    return new Response(JSON.stringify({ error: 'Parâmetro obrigatório: numero' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const d = numero.replace(/\D/g, '');
  if (d.length < 20) {
    return new Response(JSON.stringify({ error: 'Número inválido (mínimo 20 dígitos)' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const foro = d.slice(16, 20);
  const isG2  = foro === '0000';
  const formatted   = d.slice(0,7) + '-' + d.slice(7,9) + '.' + d.slice(9,13) + '.' + d.slice(13,14) + '.' + d.slice(14,16) + '.' + d.slice(16,20);
  const numDigitoAno = d.slice(0,7) + '-' + d.slice(7,9) + '.' + d.slice(9,13);

  const HDRS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9',
  };

  try {
    const base = isG2
      ? 'https://esaj.tjsp.jus.br/cposg'
      : 'https://esaj.tjsp.jus.br/cpopg';

    const url = base + '/search.do?cbPesquisa=NUMPROC' +
      '&numeroDigitoAnoUnificado=' + encodeURIComponent(numDigitoAno) +
      '&foroNumeroUnificado=' + (isG2 ? '0000' : foro) +
      '&dePesquisaNuUnificado=' + encodeURIComponent(formatted) +
      '&tipoNuProcesso=UNIFICADO';

    const resp = await fetch(url, { headers: HDRS, redirect: 'follow' });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'ESAJ retornou status ' + resp.status }), {
        status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const html = await resp.text();

    if (/captcha/i.test(html)) {
      return new Response(JSON.stringify({ error: 'ESAJ bloqueou com CAPTCHA — tente novamente mais tarde' }), {
        status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const movimentos = parseMovimentos(html, isG2 ? 'G2' : 'G1');

    if (!movimentos.length) {
      const naoEncontrado = /n[aã]o\s+(localizado|encontrado)|nenhum\s+processo/i.test(html);
      return new Response(JSON.stringify({
        error: naoEncontrado
          ? 'Processo não encontrado no ESAJ TJSP'
          : 'Movimentações não localizadas — ESAJ pode ter bloqueado a requisição',
      }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      movimentos,
      tribunal: 'esaj_tjsp',
      numeroFormatado: formatted,
      fonte: 'esaj',
    }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
}

function parseMovimentos(html, grau) {
  const movimentos = [];

  // Tenta localizar a tabela de movimentações por vários seletores conhecidos do ESAJ TJSP
  const tablePatterns = [
    /id="tabelaTodasMovimentacoes"[^>]*>([\s\S]*?)<\/table>/i,
    /id="tabelaUltimasMovimentacoes"[^>]*>([\s\S]*?)<\/table>/i,
    /id="tabMovimentacoes"[^>]*>([\s\S]*?)<\/table>/i,
    /class="[^"]*secaoAndamento[^"]*"[^>]*>([\s\S]*?)<\/(?:table|section|div)>/i,
  ];

  let tableHtml = '';
  for (let i = 0; i < tablePatterns.length; i++) {
    const m = html.match(tablePatterns[i]);
    if (m) { tableHtml = m[1]; break; }
  }

  if (!tableHtml) return movimentos;

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowM;
  while ((rowM = rowRe.exec(tableHtml)) !== null) {
    const row = rowM[1];

    // Data: DD/MM/YYYY
    const dateM = row.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!dateM) continue;
    const parts = dateM[1].split('/');
    const dataHora = parts[2] + '-' + parts[1] + '-' + parts[0] + 'T00:00:00';

    // Descrição: célula com classe contendo "descricao" ou "Movimentacao"
    const descM = row.match(/class="[^"]*(?:descri|movimenta)[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
    if (!descM) continue;

    const nome = descM[1]
      .replace(/<br\s*\/?>/gi, ' — ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    if (!nome || nome.length < 3) continue;

    movimentos.push({
      dataHora,
      nome,
      complemento: null,
      codigo: null,
      grau,
      isIntimacao: /intima[çc]/i.test(nome) || /publica[çc][aã]o.*di[aá]rio/i.test(nome),
    });
  }

  return movimentos;
}
