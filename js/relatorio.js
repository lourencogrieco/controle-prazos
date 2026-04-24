// ──────────────────────────────────────────────────────────────────────
// RELATÓRIOS
// ──────────────────────────────────────────────────────────────────────

function _tipoAndamento(a) {
  if (a.tribunal === 'manual') return 'Manual';
  if (a.is_intimacao)          return 'Intimação';
  const n = (a.nome || '').toLowerCase();
  if (/sentença|senten[çc]/i.test(n))                          return 'Sentença';
  if (/acórdão|acordão|acordao/i.test(n))                     return 'Acórdão';
  if (/decisão interlocut|decisao interlocut/i.test(n))        return 'Decisão interlocutória';
  if (/despacho/i.test(n))                                     return 'Despacho';
  if (/juntada/i.test(n))                                      return 'Juntada de documento';
  if (/publicação|publicacao|diário|diario/i.test(n))          return 'Publicação';
  if (/audiência|audiencia/i.test(n))                          return 'Audiência';
  if (/recurso|agravo|apelação|apelacao|embargos/i.test(n))    return 'Recurso';
  if (/distribuição|distribuicao|inicial|ajuizamento/i.test(n)) return 'Ação principal';
  return a.nome || 'Outro';
}

async function gerarRelatorio() {
  const btn = document.getElementById('btnGerarRelatorio');
  btn.disabled = true;
  btn.textContent = 'Carregando…';

  try {
    const tipo         = document.querySelector('input[name="relTipo"]:checked')?.value ?? 'pasta';
    const excManuais   = document.getElementById('relExcluirManuais').checked;
    const tiposSel     = [...document.querySelectorAll('.rel-and-tipo:checked')].map(c => c.value);
    const dataInicio   = document.getElementById('relDataInicio').value;
    const dataFim      = document.getElementById('relDataFim').value;
    const area         = document.getElementById('relArea').value;
    const resp         = document.getElementById('relResponsavel').value.trim().toLowerCase();
    const termoPasta   = document.getElementById('relNumeroPasta').value.trim().toLowerCase();
    const termoCliente = document.getElementById('relCliente').value.trim().toLowerCase();
    const termoProc    = document.getElementById('relProcesso').value.trim().toLowerCase();

    // ── Busca no banco ───────────────────────────────────────────────
    let query = db
      .from('andamentos_processo')
      .select('*, pastas(numero, cliente, area, advogado, codigo_lhub, processo)')
      .eq('empresa_id', state.empresaId)
      .order('data_hora', { ascending: false });

    if (dataInicio) query = query.gte('data_hora', dataInicio + 'T00:00:00');
    if (dataFim)    query = query.lte('data_hora', dataFim    + 'T23:59:59');

    const { data: rows, error } = await query;
    if (error) { toast('Erro ao buscar andamentos: ' + error.message, 'error'); return; }

    // ── Mapeamento ───────────────────────────────────────────────────
    let resultado = (rows || []).map(a => {
      const p   = a.pastas || {};
      const data = a.data_hora ? a.data_hora.slice(0, 10) : '';
      return {
        id:        a.id,
        pastaNr:   p.numero    || '—',
        codigoSIA: p.codigo_lhub || '—',
        cliente:   p.cliente   || '—',
        area:      p.area      || '—',
        advogado:  p.advogado  || '—',
        processo:  p.processo  || '',
        data,
        andamento: a.nome      || '—',
        complemento: a.complemento || '',
        tipo:      _tipoAndamento(a),
        manual:    a.tribunal === 'manual',
      };
    });

    // ── Filtros em memória ───────────────────────────────────────────
    resultado = resultado.filter(a => {
      if (excManuais && a.manual)                                            return false;
      if (tiposSel.length && !tiposSel.includes(a.tipo))                    return false;
      if (area && a.area !== area)                                           return false;
      if (resp && !a.advogado.toLowerCase().includes(resp))                  return false;
      if (tipo === 'pasta'   && termoPasta   && !a.pastaNr.toLowerCase().includes(termoPasta))     return false;
      if (tipo === 'cliente' && termoCliente && !a.cliente.toLowerCase().includes(termoCliente))   return false;
      if (tipo === 'processo' && termoProc   && !a.processo.toLowerCase().includes(termoProc))     return false;
      return true;
    });

    // ── Render ───────────────────────────────────────────────────────
    document.getElementById('relEmptyState').classList.add('hidden');
    document.getElementById('relResultado').classList.remove('hidden');
    document.getElementById('btnExportarPdf').disabled   = false;
    document.getElementById('btnExportarExcel').disabled = false;

    const tipoLabel  = { pasta: 'Por pasta', cliente: 'Por cliente', processo: 'Por número de processo' }[tipo];
    const termoLabel = tipo === 'pasta' ? termoPasta : tipo === 'cliente' ? termoCliente : termoProc;
    document.getElementById('relResultadoKicker').textContent = tipoLabel;
    document.getElementById('relResultadoTitulo').textContent = termoLabel || 'Todos os registros';

    const pastasUnicas = new Set(resultado.map(a => a.pastaNr));
    document.getElementById('relStatPastas').textContent     = pastasUnicas.size;
    document.getElementById('relStatAndamentos').textContent = resultado.length;
    document.getElementById('relStatPrazo').textContent      = dataInicio && dataFim
      ? `${formatDate(dataInicio)} — ${formatDate(dataFim)}`
      : dataInicio ? `a partir de ${formatDate(dataInicio)}`
      : dataFim    ? `até ${formatDate(dataFim)}`
      : 'Todo o período';

    document.getElementById('relTabelaBody').innerHTML = resultado.length
      ? resultado.map(a => `
          <tr>
            <td><span class="table-link">${a.pastaNr}</span></td>
            <td>${a.codigoSIA}</td>
            <td>${a.cliente}</td>
            <td>${a.area}</td>
            <td>${formatDate(a.data)}</td>
            <td title="${a.complemento}">${a.andamento}</td>
            <td>${a.advogado}</td>
            <td><span class="tag ${a.manual ? 'tag--manual' : 'tag--area'}">${a.tipo}</span></td>
          </tr>`).join('')
      : `<tr><td colspan="8" class="tbl-empty">Nenhum andamento encontrado com os filtros aplicados.</td></tr>`;

    document.getElementById('relCount').textContent =
      `${resultado.length} registro${resultado.length !== 1 ? 's' : ''} encontrado${resultado.length !== 1 ? 's' : ''}`;

  } catch (e) {
    console.error('Erro ao gerar relatório:', e);
    toast('Erro inesperado: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Gerar relatório';
  }
}

document.querySelectorAll('input[name="relTipo"]').forEach(radio => {
  radio.addEventListener('change', () => {
    document.getElementById('filterIdentPasta').classList.add('hidden');
    document.getElementById('filterIdentCliente').classList.add('hidden');
    document.getElementById('filterIdentProcesso').classList.add('hidden');
    document.getElementById(`filterIdent${radio.value.charAt(0).toUpperCase() + radio.value.slice(1)}`).classList.remove('hidden');
  });
});

document.getElementById('relTodosAndamentos').addEventListener('change', e => {
  document.querySelectorAll('.rel-and-tipo').forEach(c => { c.checked = e.target.checked; });
});

document.getElementById('relExcluirManuais').addEventListener('change', e => {
  if (e.target.checked) {
    document.querySelectorAll('.rel-and-tipo').forEach(c => {
      if (c.value === 'Manual') c.checked = false;
    });
  }
});

document.getElementById('btnGerarRelatorio').addEventListener('click', gerarRelatorio);

document.getElementById('btnLimparFiltros').addEventListener('click', () => {
  document.querySelectorAll('input[name="relTipo"]')[0].checked = true;
  document.getElementById('filterIdentPasta').classList.remove('hidden');
  document.getElementById('filterIdentCliente').classList.add('hidden');
  document.getElementById('filterIdentProcesso').classList.add('hidden');
  ['relNumeroPasta','relCliente','relProcesso','relDataInicio','relDataFim'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('relArea').value = '';
  document.getElementById('relResponsavel').value = '';
  document.getElementById('relTodosAndamentos').checked = true;
  document.getElementById('relExcluirManuais').checked  = false;
  document.querySelectorAll('.rel-and-tipo').forEach(c => { c.checked = true; });
  document.getElementById('relEmptyState').classList.remove('hidden');
  document.getElementById('relResultado').classList.add('hidden');
  document.getElementById('btnExportarPdf').disabled   = true;
  document.getElementById('btnExportarExcel').disabled = true;
});

document.getElementById('btnExportarExcel').addEventListener('click', () => {
  const rows = [...document.querySelectorAll('#relTabelaBody tr')];
  if (!rows.length) return;
  const headers = ['N° da pasta','Código LHub','Cliente','Área','Data','Andamento','Advogado','Tipo'];
  const csv = [headers.join(';'), ...rows.map(tr =>
    [...tr.querySelectorAll('td')].map(td => `"${td.textContent.trim()}"`).join(';')
  )].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csv);
  a.download = `relatorio_legal_hub_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
});
