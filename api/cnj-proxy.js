export const config = { runtime: 'edge' };

const CNJ_KEY = 'cDZHYzlZa0JadVREZDJCendROXV4';
const CNJ_BASE = 'https://api-publica.datajud.cnj.jus.br';
const CORS = { 'Access-Control-Allow-Origin': '*' };

const ESTADO_MAP = {
  '01':'tjac','02':'tjal','03':'tjap','04':'tjam','05':'tjba','06':'tjce',
  '07':'tjdf','08':'tjes','09':'tjgo','10':'tjma','11':'tjmt','12':'tjms',
  '13':'tjmg','14':'tjpa','15':'tjpb','16':'tjpr','17':'tjpe','18':'tjpi',
  '19':'tjrj','20':'tjrn','21':'tjrs','22':'tjro','23':'tjrr','24':'tjsc',
  '25':'tjse','26':'tjsp','27':'tjto',
};

function getIndex(numero) {
  const d = numero.replace(/\D/g, '');
  if (d.length < 20) return null;
  const J  = d[13];
  const TT = d.substring(14, 16);
  if (J === '8') return ESTADO_MAP[TT] ? `api_publica_${ESTADO_MAP[TT]}` : null;
  if (J === '5') return `api_publica_trf${parseInt(TT)}`;
  if (J === '4') return `api_publica_trt${parseInt(TT)}`;
  if (J === '3') return 'api_publica_tst';
  if (J === '2') return 'api_publica_stj';
  if (J === '1') return 'api_publica_stf';
  return null;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const { searchParams } = new URL(req.url);
  const numero = searchParams.get('numero');
  if (!numero) {
    return new Response(JSON.stringify({ error: 'Parâmetro obrigatório: numero' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const index = getIndex(numero);
  if (!index) {
    return new Response(JSON.stringify({ error: 'Tribunal não identificado pelo número do processo' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const digits = numero.replace(/\D/g, '');

  try {
    const resp = await fetch(`${CNJ_BASE}/${index}/_search`, {
      method: 'POST',
      headers: {
        'Authorization': `APIKey ${CNJ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        size: 1,
        query: { match: { numeroProcesso: digits } },
      }),
    });

    const data = await resp.json();
    const hit = data?.hits?.hits?.[0]?._source;
    if (!hit) {
      return new Response(JSON.stringify({ error: 'Processo não encontrado no DataJud', index }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const movimentos = (hit.movimentos || []).map(m => ({
      dataHora:    m.dataHora,
      nome:        m.nome,
      complemento: (m.complementosTabelados || []).map(c => c.descricao).join('; ') || null,
      codigo:      m.codigo,
    }));

    // detecta intimações por nome ou código CNJ conhecido
    const INTIM_CODES = new Set([11010,11009,12385,12386,12387,12388,12389,12390,12391,12392,22,6006]);
    movimentos.forEach(m => {
      m.isIntimacao = INTIM_CODES.has(m.codigo)
        || /intima[çc]/i.test(m.nome)
        || /publica[çc][aã]o.*di[aá]rio/i.test(m.nome);
    });

    return new Response(JSON.stringify({ movimentos, tribunal: index, numeroFormatado: hit.numeroProcesso }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
}
