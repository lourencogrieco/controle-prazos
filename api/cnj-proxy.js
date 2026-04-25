import { aplicarGuard } from './_lib/proxy-guard.js';

export const config = { runtime: 'edge' };

const DATAJUD_API_KEY = (process.env.DATAJUD_API_KEY || '').trim();

export default async function handler(req) {
  const guard = await aplicarGuard(req, 20);
  if (guard instanceof Response) return guard;
  const { cors } = guard;

  if (!DATAJUD_API_KEY) {
    return new Response(JSON.stringify({ error: 'Integração DataJud não configurada.' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(req.url);
  const numero = searchParams.get('numero');
  if (!numero) {
    return new Response(JSON.stringify({ error: 'Parâmetro obrigatório: numero' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const ESTADO_MAP = {
    '01':'tjac','02':'tjal','03':'tjap','04':'tjam','05':'tjba','06':'tjce',
    '07':'tjdf','08':'tjes','09':'tjgo','10':'tjma','11':'tjmt','12':'tjms',
    '13':'tjmg','14':'tjpa','15':'tjpb','16':'tjpr','17':'tjpe','18':'tjpi',
    '19':'tjrj','20':'tjrn','21':'tjrs','22':'tjro','23':'tjrr','24':'tjsc',
    '25':'tjse','26':'tjsp','27':'tjto',
  };

  const INTIM_CODES = [11010,11009,12385,12386,12387,12388,12389,12390,12391,12392,22,6006];

  const d = numero.replace(/\D/g, '');
  if (d.length < 20) {
    return new Response(JSON.stringify({ error: 'Número de processo inválido (mínimo 20 dígitos)' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const J  = d[13];
  const TT = d.substring(14, 16);

  let index = null;
  if (J === '8') index = ESTADO_MAP[TT] ? `api_publica_${ESTADO_MAP[TT]}` : null;
  else if (J === '5') index = `api_publica_trf${Number(TT)}`;
  else if (J === '4') index = `api_publica_trt${Number(TT)}`;
  else if (J === '3') index = 'api_publica_tst';
  else if (J === '2') index = 'api_publica_stj';
  else if (J === '1') index = 'api_publica_stf';

  if (!index) {
    return new Response(JSON.stringify({ error: 'Tribunal não identificado pelo número do processo' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const resp = await fetch(`https://api-publica.datajud.cnj.jus.br/${index}/_search`, {
      method: 'POST',
      headers: {
        'Authorization': `APIKey ${DATAJUD_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        size: 5,
        query: {
          bool: {
            should: [
              { match: { numeroProcesso: `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9,13)}.${d.slice(13,14)}.${d.slice(14,16)}.${d.slice(16,20)}` } },
              { match: { numeroProcesso: d } },
            ],
            minimum_should_match: 1,
          },
        },
      }),
    });

    const data = await resp.json();
    const hits = (data && data.hits && data.hits.hits) ? data.hits.hits : [];

    if (!hits.length) {
      const isTJSP = index === 'api_publica_tjsp';
      const msg = isTJSP
        ? 'Processo não encontrado no DataJud. O TJSP usa o sistema ESAJ, que tem integração parcial com o DataJud — verifique diretamente no ESAJ.'
        : 'Processo não encontrado no DataJud.';
      return new Response(JSON.stringify({ error: msg, index }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let numeroFormatado = '';
    const todosMovimentos = [];

    for (let h = 0; h < hits.length; h++) {
      const src = hits[h]._source;
      if (!src) continue;
      if (!numeroFormatado) numeroFormatado = src.numeroProcesso || '';

      const grauRaw = src.grau ? String(src.grau).toUpperCase() : '';
      const grau = (grauRaw === 'G2' || grauRaw === 'SEGUNDO_GRAU') ? 'G2'
                 : (grauRaw === 'SUP' || grauRaw === 'SUPERIOR')     ? 'SUP'
                 : 'G1';

      const movs = src.movimentos || [];
      for (let m = 0; m < movs.length; m++) {
        const mv    = movs[m];
        const nome  = mv.nome || '';
        const codigo = mv.codigo || 0;
        const isIntimacao = INTIM_CODES.indexOf(codigo) !== -1
          || /intima[çc]/i.test(nome)
          || /publica[çc][aã]o.*di[aá]rio/i.test(nome);

        const comps = mv.complementosTabelados || [];
        let complemento = '';
        for (let c = 0; c < comps.length; c++) {
          if (comps[c].descricao) complemento += (complemento ? '; ' : '') + comps[c].descricao;
        }

        todosMovimentos.push({
          dataHora:   mv.dataHora || null,
          nome,
          complemento: complemento || null,
          codigo,
          grau,
          isIntimacao,
        });
      }
    }

    todosMovimentos.sort(function(a, b) {
      const da = a.dataHora || '';
      const db = b.dataHora || '';
      return da < db ? 1 : da > db ? -1 : 0;
    });

    return new Response(JSON.stringify({
      movimentos: todosMovimentos,
      tribunal:   index,
      numeroFormatado,
    }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}
