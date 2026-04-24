// ──────────────────────────────────────────────────────────────────────
// FINANCEIRO
// ──────────────────────────────────────────────────────────────────────

function formatCurrency(val) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function _statusHon(h) {
  // Auto-atrasado: pendente com vencimento no passado
  if (h.status === 'pendente' && h.vencimento) {
    const hoje = new Date().toISOString().slice(0, 10);
    if (h.vencimento < hoje) return 'atrasado';
  }
  return h.status;
}

function _badgeHon(status) {
  if (status === 'pago')     return '<span class="status-pill status-pill--done">Pago</span>';
  if (status === 'atrasado') return '<span class="status-pill status-pill--danger">Atrasado</span>';
  return '<span class="status-pill status-pill--warn">Pendente</span>';
}

function renderFinanceiro() {
  const busca    = (document.getElementById('buscaFinanceiro')?.value ?? '').toLowerCase();
  const filtroSt = document.getElementById('filtroFinStatus')?.value ?? '';
  const filtroMs = document.getElementById('filtroFinMes')?.value ?? '';

  const hoje     = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);

  const lista = (state.honorarios || []).filter(h => {
    const st = _statusHon(h);
    if (filtroSt && st !== filtroSt) return false;
    if (filtroMs && h.vencimento && !h.vencimento.startsWith(filtroMs)) return false;
    if (busca) {
      const pasta = state.pastas.find(p => p.id === h.pastaId);
      const texto = `${pasta?.numero || ''} ${pasta?.cliente || ''} ${h.descricao}`.toLowerCase();
      if (!texto.includes(busca)) return false;
    }
    return true;
  });

  // ── Cards ─────────────────────────────────────────────────────────
  const todos = state.honorarios || [];

  const aReceber = todos
    .filter(h => _statusHon(h) === 'pendente')
    .reduce((s, h) => s + Number(h.valor), 0);

  const atrasado = todos
    .filter(h => _statusHon(h) === 'atrasado')
    .reduce((s, h) => s + Number(h.valor), 0);

  const recebidoMes = todos
    .filter(h => h.status === 'pago' && (h.dataPagamento || '').startsWith(mesAtual))
    .reduce((s, h) => s + Number(h.valor), 0);

  const vencendoMes = todos
    .filter(h => _statusHon(h) !== 'pago' && (h.vencimento || '').startsWith(mesAtual))
    .reduce((s, h) => s + Number(h.valor), 0);

  document.getElementById('finTotalReceber').textContent   = formatCurrency(aReceber);
  document.getElementById('finTotalAtrasado').textContent  = formatCurrency(atrasado);
  document.getElementById('finTotalRecebido').textContent  = formatCurrency(recebidoMes);
  document.getElementById('finVencendoMes').textContent    = formatCurrency(vencendoMes);

  // ── Tabela ────────────────────────────────────────────────────────
  document.getElementById('finTabelaBody').innerHTML = lista.length
    ? lista.map(h => {
        const pasta = state.pastas.find(p => p.id === h.pastaId);
        const st    = _statusHon(h);
        return `<tr>
          <td style="font-family:'IBM Plex Mono',monospace;font-size:.72rem">${pasta?.numero || '—'}</td>
          <td style="font-size:.78rem;text-transform:uppercase">${pasta?.cliente || '—'}</td>
          <td style="font-size:.78rem">${h.descricao}</td>
          <td style="font-family:'IBM Plex Mono',monospace;font-weight:600">${formatCurrency(h.valor)}</td>
          <td style="white-space:nowrap">${h.vencimento ? formatDate(h.vencimento) : '—'}</td>
          <td>${_badgeHon(st)}</td>
          <td style="white-space:nowrap">${h.dataPagamento ? formatDate(h.dataPagamento) : '—'}</td>
          <td style="white-space:nowrap">
            <button class="btn-link-sm" onclick="abrirModalHonorario('${h.id}')">Editar</button>
            <button class="btn-link-sm" style="color:var(--red);margin-left:6px" onclick="excluirHonorario('${h.id}')">Excluir</button>
          </td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="8" class="tbl-empty">Nenhum lançamento encontrado.</td></tr>`;

  document.getElementById('finCount').textContent =
    `${lista.length} lançamento${lista.length !== 1 ? 's' : ''}`;
}

// ── Modal ─────────────────────────────────────────────────────────────

function abrirModalHonorario(id) {
  const h = id ? (state.honorarios || []).find(x => x.id === id) : null;
  document.getElementById('honId').value = h?.id || '';
  document.getElementById('honDescricao').value     = h?.descricao || '';
  document.getElementById('honValor').value         = h?.valor || '';
  document.getElementById('honVencimento').value    = h?.vencimento || '';
  document.getElementById('honStatus').value        = h?.status || 'pendente';
  document.getElementById('honDataPagamento').value = h?.dataPagamento || '';
  document.getElementById('honObservacao').value    = h?.observacao || '';

  // Pasta select
  const sel = document.getElementById('honPastaSelect');
  sel.innerHTML = '<option value="">— sem pasta vinculada —</option>' +
    state.pastas.map(p => `<option value="${p.id}"${p.id === h?.pastaId ? ' selected' : ''}>${p.numero} · ${p.cliente}</option>`).join('');
  if (h?.pastaId) sel.value = h.pastaId;

  _toggleDataPgto();
  document.getElementById('modalHonorarioTitulo').textContent = h ? 'Editar lançamento' : 'Novo lançamento';
  document.getElementById('btnSalvarHonorario').textContent   = 'Salvar';
  document.getElementById('modalNovoHonorario').classList.add('open');
}

function fecharModalHonorario() {
  document.getElementById('modalNovoHonorario').classList.remove('open');
  document.getElementById('formHonorario').reset();
}

function _toggleDataPgto() {
  const st    = document.getElementById('honStatus').value;
  const field = document.getElementById('honDataPgtoField');
  if (field) field.style.display = st === 'pago' ? '' : 'none';
}

document.getElementById('honStatus')?.addEventListener('change', _toggleDataPgto);

document.getElementById('formHonorario').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarHonorario');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    const id = document.getElementById('honId').value;
    const obj = {
      id:             id || uid(),
      empresa_id:     state.empresaId,
      pasta_id:       document.getElementById('honPastaSelect').value || null,
      descricao:      document.getElementById('honDescricao').value.trim(),
      valor:          parseFloat(document.getElementById('honValor').value) || 0,
      vencimento:     document.getElementById('honVencimento').value || null,
      status:         document.getElementById('honStatus').value,
      data_pagamento: document.getElementById('honDataPagamento').value || null,
      observacao:     document.getElementById('honObservacao').value.trim() || null,
    };

    const saveReq = db.from('honorarios').upsert(obj).select();
    const tOut    = new Promise((_, r) => setTimeout(() => r(new Error('Sem resposta em 12s')), 12000));
    const { data, error } = await Promise.race([saveReq, tOut]);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    if (!data?.length) { toast('Não foi possível salvar. Verifique as permissões.', 'error'); return; }

    fecharModalHonorario();
    toast(id ? 'Lançamento atualizado!' : 'Lançamento criado!');
    await carregarDados();
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
});

async function excluirHonorario(id) {
  if (!confirm('Excluir este lançamento?')) return;
  const { error } = await db.from('honorarios').delete().eq('id', id);
  if (error) { toast('Erro ao excluir: ' + error.message, 'error'); return; }
  toast('Lançamento excluído.');
  await carregarDados();
}

// ── Filtros ───────────────────────────────────────────────────────────
document.getElementById('buscaFinanceiro')?.addEventListener('input', renderFinanceiro);
document.getElementById('filtroFinStatus')?.addEventListener('change', renderFinanceiro);
document.getElementById('filtroFinMes')?.addEventListener('change', renderFinanceiro);
