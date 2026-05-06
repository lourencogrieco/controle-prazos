// ──────────────────────────────────────────────────────────────────────
// CNJ DATAJUD — ANDAMENTOS DO TRIBUNAL
// ──────────────────────────────────────────────────────────────────────

let _andamentosLoadSeq = 0;

async function carregarAndamentosCNJ(pastaId) {
  const seq = ++_andamentosLoadSeq;
  const { data, error } = await db
    .from('andamentos_processo')
    .select('*')
    .eq('pasta_id', pastaId)
    .eq('empresa_id', state.empresaId)
    .order('data_hora', { ascending: false });

  if (error) { console.error('Erro ao carregar andamentos:', error); return; }
  if (seq !== _andamentosLoadSeq || state.currentPastaId !== pastaId) return;

  // Atualizar índice de processos com os recursais desta pasta
  if (data) {
    for (const a of data) {
      if (a.numero_processo) {
        const chave = a.numero_processo.replace(/\D/g, '');
        if (chave && !_pastasPorProcesso.has(chave)) {
          const pasta = state.pastas.find(p => p.id === pastaId);
          if (pasta) _pastasPorProcesso.set(chave, pasta);
        }
      }
    }
  }

  state.andamentosCNJ = montarAndamentosComIntimacoesVinculadas(data || [], pastaId);
  renderAndamentosNasInstancias(state.andamentosCNJ);
}

function grauDaIntimacao(intim) {
  if (typeof grauProcessoIntimacao === 'function') return grauProcessoIntimacao(intim);
  if (intim?.grau) return intim.grau;
  return detectarGrauPorProcesso(intim?.processo, intim?.tribunal);
}

// Detecta a instância pelo número CNJ (NNNNNNN-DD.AAAA.J.TT.OOOO) e/ou nome do tribunal.
// J=1→STF, J=3→STJ, J=4→Federal(TRF), J=8→Estadual; foro 0000→2ª instância.
function detectarGrauPorProcesso(processo, tribunal) {
  const trib = (tribunal || '').toUpperCase();
  if (trib.includes('STF') || trib === 'STF') return 'STF';
  if (trib.includes('STJ') || trib === 'STJ') return 'STJ';
  if (trib.startsWith('TRF') || trib.includes('TRIBUNAL REGIONAL FEDERAL')) return 'G2';

  const digits = (processo || '').replace(/\D/g, '');
  if (digits.length < 20) return 'G1';

  const segmento = digits[13];
  const foro = digits.slice(16, 20);

  if (segmento === '1') return 'STF';
  if (segmento === '3') return 'STJ';
  if (segmento === '4') return foro === '0000' ? 'G2' : 'G1'; // TRF
  // Segmento 8 = Estadual; foro 0000 = CPOSG (2ª instância/recursal)
  return foro === '0000' ? 'G2' : 'G1';
}

function textoAndamentoIntimacao(texto) {
  if (typeof textoLegivelIntimacao === 'function') return textoLegivelIntimacao(texto);
  return String(texto || '').replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function escAndamento(value) {
  const el = document.createElement('textarea');
  el.textContent = value ?? '';
  return el.innerHTML;
}

function normalizarNumeroProcesso(value) {
  return String(value || '').replace(/\D/g, '');
}

function toggleRecursalCard(cardId) {
  const wrap = document.getElementById(cardId);
  const chevron = document.getElementById(cardId + '-chevron');
  if (!wrap) return;
  const open = wrap.style.display !== 'none';
  wrap.style.display = open ? 'none' : '';
  if (chevron) chevron.style.transform = open ? '' : 'rotate(90deg)';
}

function agruparAndamentosPorProcesso(andamentos) {
  const grupos = new Map();

  (andamentos || []).forEach(andamento => {
    const numero = andamento.numero_processo || '';
    const chave = normalizarNumeroProcesso(numero) || '__sem_numero__';

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        chave,
        numero,
        andamentos: [],
      });
    }

    const grupo = grupos.get(chave);
    if (!grupo.numero && numero) grupo.numero = numero;
    grupo.andamentos.push(andamento);
  });

  return Array.from(grupos.values()).sort((a, b) => {
    const dataA = a.andamentos[0]?.data_hora || '';
    const dataB = b.andamentos[0]?.data_hora || '';
    return String(dataB).localeCompare(String(dataA));
  });
}

function montarAndamentosComIntimacoesVinculadas(andamentos, pastaId) {
  const base = [...(andamentos || [])];

  // Mapa de numero_processo normalizado → grau dos andamentos reais (CNJ)
  // para que intimações vinculadas herdem o grau correto e sejam agrupadas
  // no mesmo card do processo, em vez de criar um card duplicado.
  const grauPorProcesso = new Map();
  base.forEach(a => {
    if (a.numero_processo) {
      const chave = normalizarNumeroProcesso(a.numero_processo);
      if (chave && !grauPorProcesso.has(chave)) grauPorProcesso.set(chave, a.grau || 'G1');
    }
  });

  // Para processos ainda não presentes no mapa (sem andamentos CNJ sincronizados),
  // detectar a instância pelo próprio número CNJ em vez de assumir G1.
  const pasta = (state.pastas || []).find(p => p.id === pastaId);
  const processoPasta = normalizarNumeroProcesso(pasta?.processo);
  if (processoPasta && !grauPorProcesso.has(processoPasta)) {
    grauPorProcesso.set(processoPasta, detectarGrauPorProcesso(pasta?.processo));
  }

  const vinculadas = (state.intimacoes || [])
    .filter(i => i.pastaId === pastaId && (i.status || 'pendente') !== 'arquivada')
    .map(i => {
      const numNorm = normalizarNumeroProcesso(i.processo);
      // Prioridade: grau salvo na intimação > detecção pelo número CNJ > andamentos existentes
      // (andamentos sincronizados podem estar classificados erroneamente se o processo
      // mudou de instância após a sincronização)
      const grau = i.grau || detectarGrauPorProcesso(i.processo, i.tribunal) || grauPorProcesso.get(numNorm) || 'G1';

      return {
        id: `intimacao-${i.id}`,
        _virtualIntimacao: true,
        intimacao_id: i.id,
        empresa_id: state.empresaId,
        pasta_id: pastaId,
        numero_processo: i.processo || '',
        data_hora: i.dataPublicacao ? `${i.dataPublicacao}T12:00:00` : null,
        nome: i.tipoDocumento || i.tipoComunicacao || 'Intimação',
        _intimacao: i,
        complemento: [
          i.nomeClasse ? `Classe: ${i.nomeClasse}` : '',
          i.orgao ? `Órgão: ${i.orgao}` : '',
          textoAndamentoIntimacao(i.texto) || '',
        ].filter(Boolean).join('\n'),
        codigo: null,
        is_intimacao: true,
        grau,
        tribunal: i.tribunal || 'intimacoes_pje',
        sincronizado_em: null,
      };
    });

  return [...base, ...vinculadas]
    .sort((a, b) => String(b.data_hora || '').localeCompare(String(a.data_hora || '')));
}

function renderAndamentosNasInstancias(andamentos) {
  const body1   = document.getElementById('andamentosBody1');
  const body2   = document.getElementById('andamentosBody2');
  const body2Wrap = document.getElementById('instancia2Body');
  const count1  = document.getElementById('andamentosCount1');
  const count2  = document.getElementById('andamentosCount2');
  const infoEl  = document.getElementById('cnjSyncInfo');
  const badgeEl = document.getElementById('cnjTribunalBadge');
  const num2El  = document.getElementById('instanciaNumero2');
  if (!body1) return;

  const g1  = andamentos.filter(a => !a.grau || a.grau === 'G1' || a.grau === 'JE');
  const g2  = andamentos.filter(a => a.grau === 'G2');
  const stj = andamentos.filter(a => a.grau === 'STJ' || a.grau === 'SUP');
  const stf = andamentos.filter(a => a.grau === 'STF');

  const tribunalG1 = g1.find(a => a.tribunal && a.tribunal !== 'manual' && a.tribunal !== 'intimacoes_pje')?.tribunal || '';
  if (badgeEl) badgeEl.textContent = tribunalG1 ? tribunalG1.replace('api_publica_', '').toUpperCase() : '';

  const sinc = andamentos[0]?.sincronizado_em
    ? new Date(andamentos[0].sincronizado_em).toLocaleString('pt-BR')
    : '';
  if (infoEl) infoEl.textContent = sinc ? `Sync: ${sinc}` : '';

  const rowHtml = a => {
    const data = a.data_hora ? new Date(a.data_hora).toLocaleDateString('pt-BR') : '—';
    const isManual = a.tribunal === 'manual';
    const isVirtual = !!a._virtualIntimacao;
    const tipoBadge = a.is_intimacao
      ? '<span style="background:rgba(255,170,0,.15);color:#ffaa00;padding:2px 6px;border-radius:2px;font-size:9px;letter-spacing:.5px;text-transform:uppercase">Intimação</span>'
      : '<span style="background:var(--s2);color:var(--mu);padding:2px 6px;border-radius:2px;font-size:9px;letter-spacing:.5px;text-transform:uppercase">Movimento</span>';
    const manualBadge = isManual
      ? '<span style="background:rgba(0,200,150,.12);color:#00c896;padding:2px 6px;border-radius:2px;font-size:9px;letter-spacing:.5px;text-transform:uppercase;margin-left:4px">Manual</span>'
      : '';
    const vinculoBadge = isVirtual
      ? '<span style="background:var(--ac-soft);color:var(--ac);padding:2px 6px;border-radius:2px;font-size:9px;letter-spacing:.5px;text-transform:uppercase;margin-left:4px">Vinculada</span>'
      : '';
    const processo = a.numero_processo
      ? `<div style="font-family:'IBM Plex Mono',monospace;font-size:.72rem;color:var(--ac);margin-top:2px">${escAndamento(a.numero_processo)}</div>`
      : '';
    const snippet = a.complemento ? `<div style="font-size:.72rem;color:var(--mu);margin-top:2px">${escAndamento(a.complemento.slice(0,80))}${a.complemento.length > 80 ? '…' : ''}</div>` : '';
    return `<tr style="cursor:pointer" onclick="abrirDetalheAndamento('${a.id}')">
      <td style="white-space:nowrap;font-size:.78rem">${data}</td>
      <td>
        <div style="font-size:.82rem">${escAndamento(a.nome || '—')}</div>
        ${processo}
        ${snippet}
      </td>
      <td style="white-space:nowrap">${tipoBadge}${manualBadge}${vinculoBadge}</td>
    </tr>`;
  };

  // Versão compacta para cards colapsáveis: sem repetir processo em cada linha, mostra nome + descrição
  const rowHtmlCompacto = a => {
    const data = a.data_hora ? new Date(a.data_hora).toLocaleDateString('pt-BR') : '—';
    const isManual = a.tribunal === 'manual';
    const isVirtual = !!a._virtualIntimacao;
    const tipoBadge = a.is_intimacao
      ? '<span style="background:rgba(255,170,0,.15);color:#ffaa00;padding:2px 6px;border-radius:2px;font-size:9px;letter-spacing:.5px;text-transform:uppercase">Intimação</span>'
      : '<span style="background:var(--s2);color:var(--mu);padding:2px 6px;border-radius:2px;font-size:9px;letter-spacing:.5px;text-transform:uppercase">Movimento</span>';
    const manualBadge = isManual
      ? '<span style="background:rgba(0,200,150,.12);color:#00c896;padding:2px 6px;border-radius:2px;font-size:9px;letter-spacing:.5px;text-transform:uppercase;margin-left:4px">Manual</span>'
      : '';
    const vinculoBadge = isVirtual
      ? '<span style="background:var(--ac-soft);color:var(--ac);padding:2px 6px;border-radius:2px;font-size:9px;letter-spacing:.5px;text-transform:uppercase;margin-left:4px">Vinculada</span>'
      : '';
    const snippet = a.complemento ? `<div style="font-size:.72rem;color:var(--mu);margin-top:2px">${escAndamento(a.complemento.slice(0,80))}${a.complemento.length > 80 ? '…' : ''}</div>` : '';
    return `<tr style="cursor:pointer" onclick="abrirDetalheAndamento('${a.id}')">
      <td style="white-space:nowrap;font-size:.78rem">${data}</td>
      <td>
        <div style="font-size:.82rem">${escAndamento(a.nome || '—')}</div>
        ${snippet}
      </td>
      <td style="white-space:nowrap">${tipoBadge}${manualBadge}${vinculoBadge}</td>
    </tr>`;
  };

  const num1El  = document.getElementById('instanciaNumero1');
  const com1El  = document.getElementById('instanciaComarca1');
  const card1El = document.getElementById('instanciaCard1');

  if (g1.length) {
    // Tornar colapsável como os cards recursais
    const tableWrap = card1El ? card1El.querySelector('.andamento-table-wrap') : null;
    if (tableWrap && !tableWrap.id) tableWrap.id = 'g1-card-table';
    if (tableWrap) tableWrap.style.display = 'none';

    // Adicionar chevron e tornar header clicável
    const nameEl = card1El ? card1El.querySelector('.instancia-name') : null;
    if (nameEl && !nameEl.querySelector('.recursal-chevron')) {
      nameEl.style.display = 'flex';
      nameEl.style.alignItems = 'center';
      nameEl.style.gap = '6px';
      nameEl.insertAdjacentHTML('afterbegin', '<span class="recursal-chevron" id="g1-card-table-chevron" style="transition:transform .2s;display:inline-block">▸</span>');
    }
    const row1 = card1El ? card1El.querySelector('.instancia-row') : null;
    if (row1) {
      row1.style.cursor = 'pointer';
      row1.onclick = () => toggleRecursalCard('g1-card-table');
    }
    if (num1El) {
      num1El.style.cursor = 'pointer';
      num1El.onclick = () => toggleRecursalCard('g1-card-table');
    }
    if (com1El) {
      com1El.style.cursor = 'pointer';
      com1El.onclick = () => toggleRecursalCard('g1-card-table');
    }

    body1.innerHTML = g1.map(rowHtmlCompacto).join('');
    if (count1) count1.textContent = `${g1.length} movimentação(ões) · CNJ/DataJud + intimações vinculadas`;
  } else {
    body1.innerHTML = '<tr><td colspan="3" class="tbl-empty">Nenhum andamento de 1ª instância. Clique em "Sincronizar CNJ".</td></tr>';
    if (count1) count1.textContent = '';
    if (num1El && !g1.length) num1El.textContent = '—';
    if (com1El && !g1.length) com1El.textContent = 'Comarca: —';
  }

  if (g2.length && body2Wrap) {
    const gruposRecursais = agruparAndamentosPorProcesso(g2);
    body2Wrap.innerHTML = gruposRecursais.map((grupo, index) => {
      // Extrair classe do primeiro andamento que tenha (ex: "AGRAVO DE INSTRUMENTO")
      const classeRaw = grupo.andamentos.find(a => a._intimacao?.nomeClasse)
        ?._intimacao?.nomeClasse
        || grupo.andamentos.find(a => a.complemento && a.complemento.includes('Classe:'))
          ?.complemento?.match(/Classe:\s*([^\n]+)/)?.[1]?.trim()
        || '';
      const classeHtml = classeRaw
        ? `<span style="font-size:.72rem;color:var(--mu);margin-left:8px">${escAndamento(classeRaw)}</span>`
        : '';
      const cardId = `recursal-card-${index}`;
      return `
      <div class="instancia-card instancia-card--recursal">
        <div class="instancia-content">
          <div class="instancia-row instancia-row--recursal" style="cursor:pointer" onclick="toggleRecursalCard('${cardId}')">
            <span class="instancia-name" style="display:flex;align-items:center;gap:6px">
              <span class="recursal-chevron" id="${cardId}-chevron" style="transition:transform .2s;display:inline-block">▸</span>
              Processo recursal${gruposRecursais.length > 1 ? ` ${index + 1}` : ''}
              ${classeHtml}
            </span>
          </div>
          <p class="instancia-num" style="cursor:pointer" onclick="toggleRecursalCard('${cardId}')">${escAndamento(grupo.numero || '—')}</p>
          <div class="andamento-table-wrap" id="${cardId}" style="display:none">
            <table class="andamento-table">
              <thead>
                <tr>
                  <th style="width:110px">Data</th>
                  <th>Andamento</th>
                  <th style="width:90px">Tipo</th>
                </tr>
              </thead>
              <tbody>
                ${grupo.andamentos.map(rowHtmlCompacto).join('')}
              </tbody>
            </table>
            <p class="tbl-count">${grupo.andamentos.length} movimentação(ões) recursal(is)</p>
          </div>
        </div>
      </div>
    `;
    }).join('');
  } else {
    if (body2Wrap) {
      body2Wrap.innerHTML = `
        <div class="instancia-card">
          <div class="instancia-content">
            <div class="instancia-row instancia-row--recursal">
              <span class="instancia-name">Processo recursal</span>
            </div>
            <p class="instancia-num" id="instanciaNumero2">—</p>
            <div class="andamento-table-wrap">
              <table class="andamento-table">
                <thead>
                  <tr>
                    <th style="width:110px">Data</th>
                    <th>Andamento</th>
                    <th style="width:90px">Tipo</th>
                  </tr>
                </thead>
                <tbody id="andamentosBody2">
                  <tr><td colspan="3" class="tbl-empty">Nenhum andamento recursal encontrado.</td></tr>
                </tbody>
              </table>
              <p class="tbl-count" id="andamentosCount2"></p>
            </div>
          </div>
        </div>
      `;
    } else if (body2) {
      body2.innerHTML = '<tr><td colspan="3" class="tbl-empty">Nenhum andamento recursal encontrado.</td></tr>';
      if (count2) count2.textContent = '';
    }
  }

  if (num2El && !body2Wrap) num2El.textContent = g2.find(a => a.numero_processo)?.numero_processo || '—';

  // STJ
  _renderInstanciaSuperior(stj, 'instanciaSTJBody', 'andamentosBodySTJ', 'andamentosCountSTJ', 'instanciaNumeroSTJ', 'Recurso ao STJ', 'STJ', rowHtmlCompacto);

  // STF
  _renderInstanciaSuperior(stf, 'instanciaSTFBody', 'andamentosBodySTF', 'andamentosCountSTF', 'instanciaNumeroSTF', 'Recurso ao STF', 'STF', rowHtmlCompacto);
}

function _renderInstanciaSuperior(lista, bodyWrapId, bodyId, countId, numId, label, sigla, rowHtml) {
  const bodyWrap = document.getElementById(bodyWrapId);
  if (!bodyWrap) return;

  if (lista.length) {
    const grupos = agruparAndamentosPorProcesso(lista);
    bodyWrap.innerHTML = grupos.map((grupo, index) => `
      <div class="instancia-card instancia-card--recursal">
        <div class="instancia-content">
          <div class="instancia-row instancia-row--recursal">
            <span class="instancia-name">${label}${grupos.length > 1 ? ` ${index + 1}` : ''}</span>
          </div>
          <p class="instancia-num">${escAndamento(grupo.numero || '—')}</p>
          <div class="andamento-table-wrap">
            <table class="andamento-table">
              <thead>
                <tr>
                  <th style="width:110px">Data</th>
                  <th>Andamento</th>
                  <th style="width:90px">Tipo</th>
                </tr>
              </thead>
              <tbody>
                ${grupo.andamentos.map(rowHtml).join('')}
              </tbody>
            </table>
            <p class="tbl-count">${grupo.andamentos.length} movimentação(ões) no ${sigla}</p>
          </div>
        </div>
      </div>
    `).join('');
  } else {
    bodyWrap.innerHTML = `
      <div class="instancia-card">
        <div class="instancia-content">
          <div class="instancia-row instancia-row--recursal">
            <span class="instancia-name">${label}</span>
          </div>
          <p class="instancia-num" id="${numId}">—</p>
          <div class="andamento-table-wrap">
            <table class="andamento-table">
              <thead>
                <tr>
                  <th style="width:110px">Data</th>
                  <th>Andamento</th>
                  <th style="width:90px">Tipo</th>
                </tr>
              </thead>
              <tbody id="${bodyId}">
                <tr><td colspan="3" class="tbl-empty">Nenhum andamento no ${sigla} encontrado.</td></tr>
              </tbody>
            </table>
            <p class="tbl-count" id="${countId}"></p>
          </div>
        </div>
      </div>
    `;
  }
}

async function sincronizarAndamentos(silencioso = false) {
  const pasta = state.pastas.find(p => p.id === state.currentPastaId);
  if (!pasta) { if (!silencioso) toast('Abra uma pasta primeiro.', 'error'); return; }

  const processo = pasta.processo;
  if (!processo) {
    if (!silencioso) toast('Esta pasta não tem número de processo cadastrado. Edite a pasta e preencha o campo "Número do Processo".', 'error');
    return;
  }

  const btn = document.getElementById('btnSyncCNJ');
  if (btn) { btn.disabled = true; btn.textContent = silencioso ? 'Atualizando…' : 'Sincronizando…'; }

  try {
    const res  = await proxyFetch(`/api/cnj-proxy?numero=${encodeURIComponent(processo)}`);
    const json = await res.json();

    let movimentos, tribunal, numeroFormatado;

    if (!res.ok) {
      // DataJud não encontrou — se for TJSP tenta ESAJ diretamente
      if (json.index === 'api_publica_tjsp') {
        if (!silencioso) toast('DataJud sem dados para TJSP — consultando ESAJ…', 'info');
        const esajRes  = await fetch(`https://esaj-proxy-lhub.fly.dev/esaj?numero=${encodeURIComponent(processo)}`);
        const esajJson = await esajRes.json();
        if (!esajRes.ok) {
          if (!silencioso) toast(esajJson.error || 'Processo não encontrado no ESAJ.', 'error');
          return;
        }
        movimentos     = esajJson.movimentos;
        tribunal       = esajJson.tribunal;
        numeroFormatado = esajJson.numeroFormatado;
      } else {
        if (!silencioso) toast(json.error || 'Erro ao consultar DataJud.', 'error');
        return;
      }
    } else {
      movimentos     = json.movimentos;
      tribunal       = json.tribunal;
      numeroFormatado = json.numeroFormatado;
    }

    const rows = movimentos.map(m => ({
      empresa_id:      state.empresaId,
      pasta_id:        pasta.id,
      numero_processo: numeroFormatado || processo,
      data_hora:       m.dataHora || null,
      nome:            m.nome || null,
      complemento:     m.complemento || null,
      codigo:          m.codigo || null,
      is_intimacao:    !!m.isIntimacao,
      grau:            m.grau || 'G1',
      tribunal:        tribunal,
      sincronizado_em: new Date().toISOString(),
    }));

    if (rows.length) {
      // ESAJ não tem código — usa pasta_id+data_hora+nome como chave
      const onConflict = rows[0]?.codigo != null
        ? 'pasta_id,data_hora,codigo'
        : 'pasta_id,data_hora,nome';
      const { error } = await db
        .from('andamentos_processo')
        .upsert(rows, { onConflict, ignoreDuplicates: true });
      if (error) { if (!silencioso) toast('Erro ao salvar andamentos: ' + error.message, 'error'); return; }
    }

    // Reload from DB to show updated data
    const { data } = await db
      .from('andamentos_processo')
      .select('*')
      .eq('pasta_id', pasta.id)
      .eq('empresa_id', state.empresaId)
      .order('data_hora', { ascending: false });
    if (state.currentPastaId !== pasta.id) return;
    state.andamentosCNJ = montarAndamentosComIntimacoesVinculadas(data || [], pasta.id);
    renderAndamentosNasInstancias(state.andamentosCNJ);

    if (!silencioso) {
      const novosIntimacoes = movimentos.filter(m => m.isIntimacao);
      const msg = rows.length
        ? `${rows.length} movimentação(ões) sincronizada(s)${novosIntimacoes.length ? ` — ${novosIntimacoes.length} intimação(ões) detectada(s)` : ''}.`
        : 'Nenhuma movimentação encontrada no DataJud.';
      toast(msg);
    }
  } catch (e) {
    console.error('Erro sincronizar CNJ:', e);
    if (!silencioso) toast('Erro: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '↻ Sincronizar CNJ'; }
  }
}

// ── ANDAMENTO MANUAL ─────────────────────────────────────────────────────────

function _buildProcessoDestinoOptions(pasta, preselectGrau, preselectProcesso) {
  const sel = document.getElementById('andManualProcessoDestino');
  if (!sel) return;
  sel.innerHTML = '';

  // 1ª Instância — processo principal da pasta
  const proc1 = pasta?.processo || '';
  const opt1 = document.createElement('option');
  opt1.value = `G1|${proc1}`;
  opt1.textContent = `1ª Instância${proc1 ? ' — ' + proc1 : ''}`;
  sel.appendChild(opt1);

  // Processos recursais existentes (G2, STJ, STF) extraídos dos andamentos atuais
  const seen = new Set();
  (state.andamentosCNJ || []).forEach(a => {
    if (!a.numero_processo || a.grau === 'G1' || a.grau === 'JE') return;
    const chave = `${a.grau || 'G2'}|${a.numero_processo}`;
    if (seen.has(chave)) return;
    seen.add(chave);
    const grauLabel = { G2: '2ª Inst.', STJ: 'STJ', STF: 'STF', SUP: 'STJ' }[a.grau] || a.grau;
    const opt = document.createElement('option');
    opt.value = chave;
    opt.textContent = `${grauLabel} — ${a.numero_processo}`;
    sel.appendChild(opt);
  });

  // Opções para novo processo
  ['G2|__novo__', 'STJ|__novo__', 'STF|__novo__'].forEach(val => {
    const [g] = val.split('|');
    const label = { G2: '2ª Instância', STJ: 'STJ', STF: 'STF' }[g];
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = `+ Novo processo — ${label}`;
    sel.appendChild(opt);
  });

  // Preselecionar
  if (preselectProcesso && preselectGrau) {
    const target = `${preselectGrau}|${preselectProcesso}`;
    if ([...sel.options].some(o => o.value === target)) sel.value = target;
  }
  toggleNovoProcessoInput();
}

function toggleNovoProcessoInput() {
  const sel = document.getElementById('andManualProcessoDestino');
  const wrap = document.getElementById('andManualNovoProcessoWrap');
  if (!sel || !wrap) return;
  wrap.style.display = sel.value.includes('__novo__') ? '' : 'none';
}

function abrirAndamentoManual(grau, numeroProcesso) {
  const pasta = state.pastas.find(p => p.id === state.currentPastaId);
  if (!pasta) { toast('Abra uma pasta primeiro.', 'error'); return; }
  document.getElementById('andManualId').value      = '';
  document.getElementById('andManualPastaId').value = pasta.id;
  document.getElementById('andManualData').value    = new Date().toISOString().slice(0, 10);
  document.getElementById('andManualTipo').value    = '';
  document.getElementById('andManualDesc').value    = '';
  document.getElementById('andManualNovoProcesso').value = '';
  document.getElementById('andManualModalTitle').textContent = 'Lançar Andamento';
  document.getElementById('btnSalvarAndManual').textContent  = 'Salvar';
  _buildProcessoDestinoOptions(pasta, grau || 'G1', numeroProcesso || pasta?.processo);
  document.getElementById('modalAndamentoManual').classList.add('open');
}

document.getElementById('formAndamentoManual').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarAndManual');
  const andId   = document.getElementById('andManualId').value;
  const isEdit  = !!andId;
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    const pastaId = document.getElementById('andManualPastaId').value;
    const pasta   = state.pastas.find(p => p.id === pastaId);
    const data    = document.getElementById('andManualData').value;
    const tipo    = document.getElementById('andManualTipo').value;
    const desc    = document.getElementById('andManualDesc').value.trim();

    // Extrair grau e numero_processo do dropdown de processo destino
    const destino = document.getElementById('andManualProcessoDestino').value || 'G1|';
    const [grau, processoDestino] = destino.split('|');
    let numeroProcesso;
    if (processoDestino === '__novo__') {
      numeroProcesso = (document.getElementById('andManualNovoProcesso').value || '').trim();
      if (!numeroProcesso) { toast('Informe o número do novo processo.', 'error'); return; }
    } else {
      numeroProcesso = processoDestino || (pasta?.processo || pasta?.numero || '').trim();
    }

    if (!pasta) { toast('Pasta não encontrada. Reabra a pasta e tente novamente.', 'error'); return; }
    if (!data || !tipo || !desc) { toast('Preencha data, tipo e descrição do andamento.', 'error'); return; }

    if (isEdit) {
      const { error } = await db.from('andamentos_processo').update({
        data_hora:       data + 'T00:00:00',
        nome:            tipo,
        complemento:     desc,
        grau,
        numero_processo: numeroProcesso,
        is_intimacao:    /intima[çc]/i.test(tipo),
      }).eq('id', andId).eq('empresa_id', state.empresaId);
      if (error) { toast('Erro ao atualizar: ' + error.message, 'error'); return; }
      toast('Andamento atualizado!');
    } else {
      const row = {
        empresa_id:      state.empresaId,
        pasta_id:        pastaId,
        numero_processo: numeroProcesso,
        data_hora:       data + 'T00:00:00',
        nome:            tipo,
        complemento:     desc,
        codigo:          null,
        is_intimacao:    /intima[çc]/i.test(tipo),
        grau,
        tribunal:        'manual',
        sincronizado_em: new Date().toISOString(),
      };
      const { error } = await db.from('andamentos_processo').insert(row);
      if (error) { toast('Erro ao salvar: ' + error.message, 'error'); return; }
      toast('Andamento lançado com sucesso!');
    }

    document.getElementById('modalAndamentoManual').classList.remove('open');

    const { data: rows, error: reloadError } = await db.from('andamentos_processo')
      .select('*')
      .eq('pasta_id', pastaId)
      .eq('empresa_id', state.empresaId)
      .order('data_hora', { ascending: false });
    if (reloadError) { toast('Andamento salvo, mas a lista não recarregou: ' + reloadError.message, 'error'); return; }
    if (state.currentPastaId !== pastaId) return;
    state.andamentosCNJ = montarAndamentosComIntimacoesVinculadas(rows || [], pastaId);
    renderAndamentosNasInstancias(state.andamentosCNJ);
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = isEdit ? 'Atualizar' : 'Salvar';
  }
});

// ── DETALHE DO ANDAMENTO ─────────────────────────────────────────────────────

function podeExcluirAndamento(a) {
  if (!a || a._virtualIntimacao) return false;
  if (!(typeof podeEditarRegistro === 'function' ? podeEditarRegistro() : true)) return false;
  return !!a.pasta_id && !String(a.id || '').startsWith('intimacao-');
}

function abrirDetalheAndamento(andamentoId) {
  const a = state.andamentosCNJ.find(x => x.id === andamentoId);
  if (!a) { toast('Andamento não encontrado.', 'error'); return; }
  state.currentAndamento = a;

  const isManual = a.tribunal === 'manual';
  const isVirtual = !!a._virtualIntimacao;
  const intimacao = isVirtual
    ? (a._intimacao || state.intimacoes.find(i => String(i.id) === String(a.intimacao_id)))
    : null;
  const grauMap  = { G1: '1ª Instância', G2: '2ª Instância', STJ: 'Superior Tribunal de Justiça', STF: 'Supremo Tribunal Federal', SUP: 'Superior Tribunal de Justiça', JE: 'Juizado Especial' };
  const data     = a.data_hora ? new Date(a.data_hora).toLocaleDateString('pt-BR') : '—';

  document.getElementById('detalheAndTitulo').textContent = a.nome || 'Andamento';
  document.getElementById('detalheAndInfo').innerHTML = `
    <div>
      <div class="field-label">Data</div>
      <div style="font-size:.85rem;margin-top:4px">${escAndamento(data)}</div>
    </div>
    <div>
      <div class="field-label">Instância</div>
      <div style="font-size:.85rem;margin-top:4px">${escAndamento(grauMap[a.grau] || a.grau || '—')}</div>
    </div>
    <div>
      <div class="field-label">Tipo</div>
      <div style="font-size:.85rem;margin-top:4px">${a.is_intimacao ? 'Intimação' : 'Movimento'}${isVirtual ? ' vinculada' : ''}</div>
    </div>
    <div>
      <div class="field-label">Origem</div>
      <div style="font-size:.85rem;margin-top:4px">${escAndamento(isVirtual ? 'Intimações' : (isManual ? 'Manual' : (a.tribunal || '—').replace('api_publica_', '').toUpperCase()))}</div>
    </div>
    <div style="grid-column:1 / -1">
      <div class="field-label">Processo</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:.85rem;margin-top:4px;color:var(--ac)">${escAndamento(a.numero_processo || '—')}</div>
    </div>
  `;
  document.getElementById('detalheAndDesc').textContent = a.complemento || '(sem descrição)';

  const editBtn   = document.getElementById('btnEditarAndamento');
  const excluirBtn = document.getElementById('btnExcluirAndamento');
  const uploadBtn = document.getElementById('btnUploadDocAndamento');
  const lerIntimBtn = document.getElementById('btnLerIntimacaoAndamento');
  const prazoIntimBtn = document.getElementById('btnCriarPrazoAndamento');
  if (editBtn)    editBtn.style.display    = isManual ? '' : 'none';
  if (excluirBtn) {
    excluirBtn.style.display = podeExcluirAndamento(a) || isVirtual ? '' : 'none';
    excluirBtn.textContent = isVirtual ? 'Remover vínculo' : '✕ Excluir';
  }
  if (uploadBtn)  uploadBtn.style.display  = isVirtual ? 'none' : '';
  if (lerIntimBtn) {
    lerIntimBtn.style.display = intimacao ? '' : 'none';
    lerIntimBtn.onclick = () => {
      document.getElementById('modalDetalheAndamento').classList.remove('open');
      lerIntimacao(intimacao);
    };
  }
  if (prazoIntimBtn) {
    prazoIntimBtn.style.display = intimacao ? '' : 'none';
    prazoIntimBtn.onclick = () => {
      document.getElementById('modalDetalheAndamento').classList.remove('open');
      criarPrazoDaIntimacao(intimacao);
    };
  }

  if (isVirtual) {
    const docs = document.getElementById('detalheAndDocs');
    if (docs) docs.innerHTML = '<p class="tbl-empty">Documentos devem ser anexados pela pasta ou por um andamento lançado manualmente.</p>';
  } else {
    carregarDocumentosDetalhe(andamentoId);
  }
  document.getElementById('modalDetalheAndamento').classList.add('open');
}

async function excluirAndamentoAtual() {
  const a = state.currentAndamento;
  if (!a) return;

  if (a._virtualIntimacao) {
    const intimacaoId = a.intimacao_id || a._intimacao?.id;
    if (!intimacaoId) return;
    if (!confirm('Remover o vínculo desta intimação com a pasta?')) return;
    const { error } = await db.rpc('vincular_intimacao_pasta', {
      p_intimacao_id: String(intimacaoId),
      p_pasta_id: null,
    });
    if (error) { toast('Erro ao remover vínculo: ' + error.message, 'error'); return; }
    const intim = state.intimacoes.find(i => String(i.id) === String(intimacaoId));
    if (intim) intim.pastaId = null;
    document.getElementById('modalDetalheAndamento').classList.remove('open');
    toast('Vínculo da intimação removido.');
    if (state.currentPastaId && typeof carregarAndamentosCNJ === 'function') carregarAndamentosCNJ(state.currentPastaId);
    if (typeof renderIntimacoesAba === 'function') renderIntimacoesAba();
    return;
  }

  if (!podeExcluirAndamento(a)) return;
  if (!confirm('Excluir este andamento? Esta ação não pode ser desfeita.')) return;
  const { error } = await db.from('andamentos_processo')
    .delete()
    .eq('id', a.id)
    .eq('empresa_id', state.empresaId);
  if (error) { toast('Erro ao excluir: ' + error.message, 'error'); return; }
  document.getElementById('modalDetalheAndamento').classList.remove('open');
  toast('Andamento excluído.');
  const { data: rows, error: reloadError } = await db.from('andamentos_processo')
    .select('*')
    .eq('pasta_id', a.pasta_id)
    .eq('empresa_id', state.empresaId)
    .order('data_hora', { ascending: false });
  if (reloadError) { toast('Andamento excluído, mas a lista não recarregou: ' + reloadError.message, 'error'); return; }
  if (state.currentPastaId !== a.pasta_id) return;
  state.andamentosCNJ = montarAndamentosComIntimacoesVinculadas(rows || [], state.currentPastaId);
  renderAndamentosNasInstancias(state.andamentosCNJ);
}

function editarAndamentoAtual() {
  const a = state.currentAndamento;
  if (!a || a.tribunal !== 'manual') return;
  document.getElementById('modalDetalheAndamento').classList.remove('open');

  const pasta = state.pastas.find(p => p.id === a.pasta_id);
  document.getElementById('andManualId').value      = a.id;
  document.getElementById('andManualPastaId').value = a.pasta_id;
  document.getElementById('andManualData').value    = a.data_hora?.slice(0, 10) || '';
  document.getElementById('andManualTipo').value    = a.nome || '';
  document.getElementById('andManualDesc').value    = a.complemento || '';
  document.getElementById('andManualNovoProcesso').value = '';
  _buildProcessoDestinoOptions(pasta, a.grau || 'G1', a.numero_processo);
  document.getElementById('andManualModalTitle').textContent = 'Editar Andamento';
  document.getElementById('btnSalvarAndManual').textContent  = 'Atualizar';
  document.getElementById('modalAndamentoManual').classList.add('open');
}

async function carregarDocumentosDetalhe(andamentoId) {
  const el = document.getElementById('detalheAndDocs');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--mu);font-size:.78rem;padding:6px 0">Carregando…</div>';
  const { data } = await db.from('documentos_pasta')
    .select('*')
    .eq('andamento_id', andamentoId)
    .eq('empresa_id', state.empresaId)
    .order('created_at', { ascending: false });
  const docs = data || [];
  if (!docs.length) {
    el.innerHTML = '<div style="color:var(--mu);font-size:.78rem;padding:6px 0">Nenhum documento vinculado</div>';
    return;
  }
  el.innerHTML = docs.map(d => {
    const tamanho = d.tamanho_bytes
      ? (d.tamanho_bytes > 1048576 ? (d.tamanho_bytes / 1048576).toFixed(1) + ' MB' : Math.round(d.tamanho_bytes / 1024) + ' KB')
      : '—';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--s2);border-radius:2px;margin-bottom:6px">
      <div>
        <div style="font-size:.82rem">${d.nome}</div>
        <div style="font-size:.72rem;color:var(--mu)">${d.tipo ? d.tipo + ' · ' : ''}${tamanho}</div>
      </div>
      <div style="display:flex;align-items:center;gap:16px">
        <button class="btn-link-sm" onclick="baixarDocumento('${d.storage_path}','${d.nome}')">⬇ Baixar</button>
        <button class="btn-icon btn-icon--danger" title="Excluir documento" onclick="excluirDocumentoAndamento('${d.id}','${d.storage_path}','${state.currentAndamento?.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>`;
  }).join('');
}
