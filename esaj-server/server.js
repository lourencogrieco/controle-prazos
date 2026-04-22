import http from 'node:http';

const PORT = process.env.PORT || 3000;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Busca andamentos no ESAJ TJSP ────────────────────────────────────────────
async function fetchEsaj(numero) {
  const d = numero.replace(/\D/g, '');
  if (d.length < 20) throw new Error('Número inválido');

  const foro = d.slice(16, 20);
  const isG2 = foro === '0000';
  const formatted    = d.slice(0,7)+'-'+d.slice(7,9)+'.'+d.slice(9,13)+'.'+d.slice(13,14)+'.'+d.slice(14,16)+'.'+d.slice(16,20);
  const numDigitoAno = d.slice(0,7)+'-'+d.slice(7,9)+'.'+d.slice(9,13);
  const base = isG2 ? 'https://esaj.tjsp.jus.br/cposg' : 'https://esaj.tjsp.jus.br/cpopg';

  // Passo 1 — obtém cookies de sessão do ESAJ
  const homeResp = await fetch(base + '/open.do', {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    redirect: 'follow',
  });

  // Consolida cookies de sessão
  const rawCookies = homeResp.headers.getSetCookie
    ? homeResp.headers.getSetCookie()
    : (homeResp.headers.get('set-cookie') || '').split(/,(?=[^ ])/).filter(Boolean);
  const cookieStr = rawCookies.map(c => c.split(';')[0]).join('; ');

  // Passo 2 — busca o processo com sessão estabelecida
  const searchUrl = base + '/search.do?cbPesquisa=NUMPROC' +
    '&numeroDigitoAnoUnificado=' + encodeURIComponent(numDigitoAno) +
    '&foroNumeroUnificado=' + (isG2 ? '0000' : foro) +
    '&dePesquisaNuUnificado=' + encodeURIComponent(formatted) +
    '&tipoNuProcesso=UNIFICADO';

  const resp = await fetch(searchUrl, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer': base + '/open.do',
      'Cookie': cookieStr,
    },
    redirect: 'follow',
  });

  if (!resp.ok) throw new Error('ESAJ retornou status ' + resp.status);
  return { html: await resp.text(), isG2, formatted };
}

// ── Parser HTML → movimentos ─────────────────────────────────────────────────
function parseMovimentos(html, grau) {
  const movimentos = [];

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
    const dateM = row.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!dateM) continue;
    const parts = dateM[1].split('/');
    const dataHora = parts[2] + '-' + parts[1] + '-' + parts[0] + 'T00:00:00';

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

// ── Servidor HTTP ─────────────────────────────────────────────────────────────
http.createServer(async (req, res) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' });
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/esaj') {
    res.writeHead(404, CORS);
    return res.end(JSON.stringify({ error: 'Rota não encontrada. Use /esaj?numero=...' }));
  }

  const numero = url.searchParams.get('numero');
  if (!numero) {
    res.writeHead(400, CORS);
    return res.end(JSON.stringify({ error: 'Parâmetro obrigatório: numero' }));
  }

  try {
    const { html, isG2, formatted } = await fetchEsaj(numero);

    if (/captcha/i.test(html)) {
      res.writeHead(429, CORS);
      return res.end(JSON.stringify({ error: 'ESAJ exigiu CAPTCHA' }));
    }

    const movimentos = parseMovimentos(html, isG2 ? 'G2' : 'G1');

    if (!movimentos.length) {
      const naoEncontrado = /n[aã]o\s+(localizado|encontrado)|nenhum\s+processo/i.test(html);
      res.writeHead(404, CORS);
      return res.end(JSON.stringify({
        error: naoEncontrado ? 'Processo não encontrado no ESAJ' : 'Movimentações não localizadas',
      }));
    }

    res.writeHead(200, CORS);
    res.end(JSON.stringify({
      movimentos,
      tribunal: 'esaj_tjsp',
      numeroFormatado: formatted,
      fonte: 'esaj',
    }));
  } catch (err) {
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: err.message }));
  }
}).listen(PORT, () => console.log('esaj-server rodando na porta ' + PORT));
