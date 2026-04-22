// ──────────────────────────────────────────────────────────────────────
// RELATÓRIOS
// ──────────────────────────────────────────────────────────────────────
function gerarRelatorio() {
  const tipo       = document.querySelector('input[name="relTipo"]:checked')?.value ?? 'pasta';
  const excManuais = document.getElementById('relExcluirManuais').checked;
  const tiposSel   = [...document.querySelectorAll('.rel-and-tipo:checked')].map(c => c.value);
  const dataInicio = document.getElementById('relDataInicio').value;
  const dataFim    = document.getElementById('relDataFim').value;
  const area       = document.getElementById('relArea').value;
  const resp       = document.getElementById('relResponsavel').value;
  const termoPasta   = document.getElementById('relNumeroPasta').value.trim().toLowerCase();
  const termoCliente = document.getElementById('relCliente').value.trim().toLowerCase();
  const termoProc    = document.getElementById('relProcesso').value.trim().toLowerCase();

  let resultado = andamentosBase.filter(a => {
    if (excManuais && a.manual)                                           return false;
    if (tiposSel.length && !tiposSel.includes(a.tipo))                   return false;
    if (dataInicio && a.data < dataInicio)                               return false;
    if (dataFim    && a.data > dataFim)                                  return false;
    if (area  && a.area !== area)                                        return false;
    if (resp  && !a.advogado.toLowerCase().includes(resp.toLowerCase())) return false;
    if (tipo === 'pasta'   && termoPasta   && !a.pastaNr.toLowerCase().includes(termoPasta))   return false;
    if (tipo === 'cliente' && termoCliente && !a.cliente.toLowerCase().includes(termoCliente)) return false;
    if (tipo === 'processo') {
      const pasta = state.pastas.find(p => p.numero === a.pastaNr);
      if (termoProc && !(pasta?.processo ?? '').toLowerCase().includes(termoProc)) return false;
    }
    return true;
  });

  resultado.sort((a, b) => b.data.localeCompare(a.data));

  document.getElementById('relEmptyState').classList.add('hidden');
  document.getElementById('relResultado').classList.remove('hidden');
  document.getElementById('btnExportarPdf').disabled   = false;
  document.getElementById('btnExportarExcel').disabled = false;

  const tipoLabel  = { pasta:'Por pasta', cliente:'Por cliente', processo:'Por número de processo' }[tipo];
  const termoLabel = tipo === 'pasta' ? termoPasta : tipo === 'cliente' ? termoCliente : termoProc;
  document.getElementById('relResultadoKicker').textContent = tipoLabel;
  document.getElementById('relResultadoTitulo').textContent = termoLabel || 'Todos os registros';

  const pastasUnicas = new Set(resultado.map(a => a.pastaNr));
  document.getElementById('relStatPastas').textContent     = pastasUnicas.size;
  document.getElementById('relStatAndamentos').textContent = resultado.length;
  document.getElementById('relStatPrazo').textContent      = dataInicio && dataFim
    ? `${formatDate(dataInicio)} — ${formatDate(dataFim)}`
    : dataInicio ? `a partir de ${formatDate(dataInicio)}`
    : dataFim   ? `até ${formatDate(dataFim)}`
    : 'Todo o período';

  document.getElementById('relTabelaBody').innerHTML = resultado.length
    ? resultado.map(a => `
        <tr>
          <td><span class="table-link">${a.pastaNr}</span></td>
          <td>${a.codigoSIA}</td>
          <td>${a.cliente}</td>
          <td>${a.area}</td>
          <td>${formatDate(a.data)}</td>
          <td>${a.andamento}</td>
          <td>${a.advogado}</td>
          <td><span class="tag ${a.manual ? 'tag--manual' : 'tag--area'}">${a.tipo}</span></td>
        </tr>`).join('')
    : `<tr><td colspan="8" class="tbl-empty">Nenhum andamento encontrado com os filtros aplicados.</td></tr>`;

  document.getElementById('relCount').textContent =
    `${resultado.length} registro${resultado.length !== 1 ? 's' : ''} encontrado${resultado.length !== 1 ? 's' : ''}`;
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
