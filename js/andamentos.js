// ──────────────────────────────────────────────────────────────────────
// CNJ DATAJUD — ANDAMENTOS DO TRIBUNAL
// ──────────────────────────────────────────────────────────────────────

async function carregarAndamentosCNJ(pastaId) {
  const { data, error } = await db
    .from('andamentos_processo')
    .select('*')
    .eq('pasta_id', pastaId)
    .eq('empresa_id', state.empresaId)
    .order('data_hora', { ascending: false });

  if (error) { console.error('Erro ao carregar andamentos:', error); return; }

  state.andamentosCNJ = data || [];
  renderAndamentosNasInstancias(state.andamentosCNJ);
}

function renderAndamentosNasInstancias(andamentos) {
  const body1   = document.getElementById('andamentosBody1');
  const body2   = document.getElementById('andamentosBody2');
  const count1  = document.getElementById('andamentosCount1');
  const count2  = document.getElementById('andamentosCount2');
  const infoEl  = document.getElementById('cnjSyncInfo');
  const badgeEl = document.getElementById('cnjTribunalBadge');
  if (!body1) return;

  const g1 = andamentos.filter(a => !a.grau || a.grau === 'G1' || a.grau === 'JE');
  const g2 = andamentos.filter(a => a.grau === 'G2' || a.grau === 'SUP');

  const tribunal = andamentos[0]?.tribunal || '';
  if (badgeEl) badgeEl.textContent = tribunal.replace('api_publica_', '').toUpperCase();

  const sinc = andamentos[0]?.sincronizado_em
    ? new Date(andamentos[0].sincronizado_em).toLocaleString('pt-BR')
    : '';
  if (infoEl) infoEl.textContent = sinc ? `Sync: ${sinc}` : '';

  const rowHtml = a => {
    const data = a.data_hora ? new Date(a.data_hora).toLocaleDateString('pt-BR') : '—';
    const isManual = a.tribunal === 'manual';
    const tipoBadge = a.is_intimacao
      ? '<span style="background:rgba(255,170,0,.15);color:#ffaa00;padding:2px 6px;border-radius:2px;font-size:9px;letter-spacing:.5px;text-transform:uppercase">Intimação</span>'
      : '<span style="background:var(--s2);color:var(--mu);padding:2px 6px;border-radius:2px;font-size:9px;letter-spacing:.5px;text-transform:uppercase">Movimento</span>';
    const manualBadge = isManual
      ? '<span style="background:rgba(0,200,150,.12);color:#00c896;padding:2px 6px;border-radius:2px;font-size:9px;letter-spacing:.5px;text-transform:uppercase;margin-left:4px">Manual</span>'
      : '';
    const snippet = a.complemento ? `<div style="font-size:.72rem;color:var(--mu);margin-top:2px">${a.complemento.slice(0,80)}${a.complemento.length > 80 ? '…' : ''}</div>` : '';
    return `<tr style="cursor:pointer" onclick="abrirDetalheAndamento('${a.id}')">
      <td style="white-space:nowrap;font-size:.78rem">${data}</td>
      <td>
        <div style="font-size:.82rem">${a.nome || '—'}</div>
        ${snippet}
      </td>
      <td style="white-space:nowrap">${tipoBadge}${manualBadge}</td>
    </tr>`;
  };

  if (g1.length) {
    body1.innerHTML = g1.map(rowHtml).join('');
    if (count1) count1.textContent = `${g1.length} movimentação(ões) · CNJ DataJud`;
  } else {
    body1.innerHTML = '<tr><td colspan="3" class="tbl-empty">Nenhum andamento de 1ª instância. Clique em "Sincronizar CNJ".</td></tr>';
    if (count1) count1.textContent = '';
  }

  if (g2.length) {
    body2.innerHTML = g2.map(rowHtml).join('');
    if (count2) count2.textContent = `${g2.length} movimentação(ões) recursal(is)`;
  } else {
    body2.innerHTML = '<tr><td colspan="3" class="tbl-empty">Nenhum andamento recursal encontrado.</td></tr>';
    if (count2) count2.textContent = '';
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
    state.andamentosCNJ = data || [];
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

function abrirAndamentoManual() {
  const pasta = state.pastas.find(p => p.id === state.currentPastaId);
  if (!pasta) { toast('Abra uma pasta primeiro.', 'error'); return; }
  document.getElementById('andManualId').value      = '';
  document.getElementById('andManualPastaId').value = pasta.id;
  document.getElementById('andManualData').value    = new Date().toISOString().slice(0, 10);
  document.getElementById('andManualTipo').value    = '';
  document.getElementById('andManualDesc').value    = '';
  document.getElementById('andManualGrau').value    = 'G1';
  document.getElementById('andManualModalTitle').textContent = 'Lançar Andamento';
  document.getElementById('btnSalvarAndManual').textContent  = 'Salvar';
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
    const grau    = document.getElementById('andManualGrau').value;

    if (isEdit) {
      const { error } = await db.from('andamentos_processo').update({
        data_hora:    data + 'T00:00:00',
        nome:         tipo,
        complemento:  desc,
        grau,
        is_intimacao: /intima[çc]/i.test(tipo),
      }).eq('id', andId).eq('empresa_id', state.empresaId);
      if (error) { toast('Erro ao atualizar: ' + error.message, 'error'); return; }
      toast('Andamento atualizado!');
    } else {
      const row = {
        id:              uid(),
        empresa_id:      state.empresaId,
        pasta_id:        pastaId,
        numero_processo: pasta?.processo || null,
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

    const { data: rows } = await db.from('andamentos_processo')
      .select('*')
      .eq('pasta_id', pastaId)
      .eq('empresa_id', state.empresaId)
      .order('data_hora', { ascending: false });
    state.andamentosCNJ = rows || [];
    renderAndamentosNasInstancias(state.andamentosCNJ);
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = isEdit ? 'Atualizar' : 'Salvar';
  }
});

// ── DETALHE DO ANDAMENTO ─────────────────────────────────────────────────────

function abrirDetalheAndamento(andamentoId) {
  const a = state.andamentosCNJ.find(x => x.id === andamentoId);
  if (!a) { toast('Andamento não encontrado.', 'error'); return; }
  state.currentAndamento = a;

  const isManual = a.tribunal === 'manual';
  const grauMap  = { G1: '1ª Instância', G2: '2ª Instância', SUP: 'Superior', JE: 'Juizado Especial' };
  const data     = a.data_hora ? new Date(a.data_hora).toLocaleDateString('pt-BR') : '—';

  document.getElementById('detalheAndTitulo').textContent = a.nome || 'Andamento';
  document.getElementById('detalheAndInfo').innerHTML = `
    <div>
      <div class="field-label">Data</div>
      <div style="font-size:.85rem;margin-top:4px">${data}</div>
    </div>
    <div>
      <div class="field-label">Instância</div>
      <div style="font-size:.85rem;margin-top:4px">${grauMap[a.grau] || a.grau || '—'}</div>
    </div>
    <div>
      <div class="field-label">Tipo</div>
      <div style="font-size:.85rem;margin-top:4px">${a.is_intimacao ? 'Intimação' : 'Movimento'}</div>
    </div>
    <div>
      <div class="field-label">Origem</div>
      <div style="font-size:.85rem;margin-top:4px">${isManual ? 'Manual' : (a.tribunal || '—').replace('api_publica_', '').toUpperCase()}</div>
    </div>
  `;
  document.getElementById('detalheAndDesc').textContent = a.complemento || '(sem descrição)';

  const editBtn   = document.getElementById('btnEditarAndamento');
  const excluirBtn = document.getElementById('btnExcluirAndamento');
  if (editBtn)    editBtn.style.display    = isManual ? '' : 'none';
  if (excluirBtn) excluirBtn.style.display = isManual ? '' : 'none';

  carregarDocumentosDetalhe(andamentoId);
  document.getElementById('modalDetalheAndamento').classList.add('open');
}

async function excluirAndamentoAtual() {
  const a = state.currentAndamento;
  if (!a || a.tribunal !== 'manual') return;
  if (!confirm('Excluir este andamento? Esta ação não pode ser desfeita.')) return;
  const { error } = await db.from('andamentos_processo')
    .delete()
    .eq('id', a.id)
    .eq('empresa_id', state.empresaId);
  if (error) { toast('Erro ao excluir: ' + error.message, 'error'); return; }
  document.getElementById('modalDetalheAndamento').classList.remove('open');
  toast('Andamento excluído.');
  const { data: rows } = await db.from('andamentos_processo')
    .select('*')
    .eq('pasta_id', a.pasta_id)
    .eq('empresa_id', state.empresaId)
    .order('data_hora', { ascending: false });
  state.andamentosCNJ = rows || [];
  renderAndamentosNasInstancias(state.andamentosCNJ);
}

function editarAndamentoAtual() {
  const a = state.currentAndamento;
  if (!a || a.tribunal !== 'manual') return;
  document.getElementById('modalDetalheAndamento').classList.remove('open');

  document.getElementById('andManualId').value      = a.id;
  document.getElementById('andManualPastaId').value = a.pasta_id;
  document.getElementById('andManualData').value    = a.data_hora?.slice(0, 10) || '';
  document.getElementById('andManualTipo').value    = a.nome || '';
  document.getElementById('andManualDesc').value    = a.complemento || '';
  document.getElementById('andManualGrau').value    = a.grau || 'G1';
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
