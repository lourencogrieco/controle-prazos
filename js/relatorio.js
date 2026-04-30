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
    const termoVinculo = document.getElementById('relVinculo')?.value.trim().toLowerCase() || '';

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

    // ── Índice de vínculo por nome do cliente ────────────────────────
    const _vinculoPorCliente = {};
    state.clientes.forEach(c => { if (c.vinculo) _vinculoPorCliente[c.nome.toLowerCase()] = c.vinculo; });

    // ── Mapeamento ───────────────────────────────────────────────────
    let resultado = (rows || []).map(a => {
      const p   = a.pastas || {};
      const data = a.data_hora ? a.data_hora.slice(0, 10) : '';
      const clienteNome = p.cliente || '—';
      return {
        id:        a.id,
        pastaNr:   p.numero    || '—',
        codigoSIA: p.codigo_lhub || '—',
        cliente:   clienteNome,
        vinculo:   _vinculoPorCliente[clienteNome.toLowerCase()] || '',
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
      if (tipo === 'vinculo' && termoVinculo && !a.vinculo.toLowerCase().includes(termoVinculo))   return false;
      return true;
    });

    // ── Render ───────────────────────────────────────────────────────
    document.getElementById('relEmptyState').classList.add('hidden');
    document.getElementById('relResultado').classList.remove('hidden');
    document.getElementById('btnExportarPdf').disabled   = false;
    document.getElementById('btnExportarExcel').disabled = false;

    const tipoLabel  = { pasta: 'Por pasta', cliente: 'Por cliente', processo: 'Por número de processo', vinculo: 'Por vínculo' }[tipo];
    const termoLabel = tipo === 'pasta' ? termoPasta : tipo === 'cliente' ? termoCliente : tipo === 'processo' ? termoProc : termoVinculo;
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
            <td><span class="table-link">${escHtml(a.pastaNr)}</span></td>
            <td>${escHtml(a.codigoSIA)}</td>
            <td>${escHtml(a.cliente)}</td>
            <td>${escHtml(a.vinculo || '—')}</td>
            <td>${escHtml(a.area)}</td>
            <td>${formatDate(a.data)}</td>
            <td title="${escAttr(a.complemento)}">${escHtml(a.andamento)}</td>
            <td>${escHtml(a.advogado)}</td>
            <td><span class="tag ${a.manual ? 'tag--manual' : 'tag--area'}">${escHtml(a.tipo)}</span></td>
          </tr>`).join('')
      : `<tr><td colspan="9" class="tbl-empty">Nenhum andamento encontrado com os filtros aplicados.</td></tr>`;

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
    document.getElementById('filterIdentVinculo').classList.add('hidden');
    const key = radio.value.charAt(0).toUpperCase() + radio.value.slice(1);
    document.getElementById(`filterIdent${key}`).classList.remove('hidden');
    if (key === 'Vinculo') popularDatalistVinculos();
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
  document.getElementById('filterIdentVinculo').classList.add('hidden');
  ['relNumeroPasta','relCliente','relProcesso','relVinculo','relDataInicio','relDataFim'].forEach(id => {
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
  const headers = ['N° da pasta','Código LHub','Cliente','Vínculo','Área','Data','Andamento','Advogado','Tipo'];
  const csv = [headers.join(';'), ...rows.map(tr =>
    [...tr.querySelectorAll('td')].map(td => `"${td.textContent.trim()}"`).join(';')
  )].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csv);
  a.download = `relatorio_legal_hub_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
});

document.getElementById('btnExportarPdf').addEventListener('click', () => {
  const empresa = escHtml(state.meuPerfil?.empresa_nome || 'Escritório');
  const thead   = document.getElementById('relTabela')?.querySelector('thead');
  const tbody   = document.getElementById('relTabelaBody');
  if (!thead || !tbody) return;
  const rows = tbody.querySelectorAll('tr:not(.tbl-empty)');
  if (!rows.length) { toast('Nenhum dado para exportar.', 'error'); return; }

  const headers = [...thead.querySelectorAll('th')].map(th => `<th>${escHtml(th.textContent.trim())}</th>`).join('');
  const bodyRows = [...rows].map(tr =>
    `<tr>${[...tr.querySelectorAll('td')].map(td =>
      `<td>${escHtml(td.textContent.trim().replace(/\s+/g, ' '))}</td>`
    ).join('')}</tr>`
  ).join('');

  const count = escHtml(document.getElementById('relCount')?.textContent || '');
  const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="UTF-8"><title>Relatório de Andamentos</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #222; margin: 20px; }
  h1 { font-size: 14px; margin: 0 0 4px; }
  .sub { font-size: 10px; color: #666; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f0f0f0; text-align: left; padding: 5px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; border-bottom: 2px solid #ccc; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: top; font-size: 10px; }
  tr:last-child td { border-bottom: none; }
  @media print { body { margin: 10px; } @page { margin: 15mm; } }
</style></head>
<body>
<h1>Relatório de Andamentos</h1>
<p class="sub">${empresa} · Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} · ${count}</p>
<table><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table>
<script>window.print();<\/script>
</body></html>`;

  const w = window.open('', '_blank', 'width=1000,height=700');
  if (w) { w.document.write(html); w.document.close(); }
});
