// ──────────────────────────────────────────────────────────────────────
// CRUD — PRAZOS (formulário rápido do Painel + modal completo)
// ──────────────────────────────────────────────────────────────────────
document.getElementById('prazoForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!state.empresaId) { toast('Faça login primeiro', 'error'); return; }
  const obj = {
    id:          uid(),
    empresa_id:  state.empresaId,
    pasta_id:    document.getElementById('processo').value.trim() || null,
    cliente:     document.getElementById('cliente').value.trim(),
    tipo:        document.getElementById('tipo').value,
    prazo:       document.getElementById('dataFatal').value,
    responsavel: document.getElementById('responsavel').value,
    descricao:   document.getElementById('descricao').value.trim() || null,
    status:      document.getElementById('status').value === 'Concluído' ? 'concluido' : 'pendente',
  };
  const { error } = await db.from('prazos_lhub').insert(obj);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  e.target.reset();
  toast('Prazo cadastrado');
  await carregarDados();
});

// Preenche datalist de responsáveis filtrando pelo area_id da pasta
function popularResponsaveisDatalist(areaId) {
  const dl = document.getElementById('prazoResponsavelList');
  if (!dl) return;
  const lista = areaId
    ? state.usuarios.filter(u => u.area_id === areaId || !u.area_id)
    : state.usuarios;
  dl.innerHTML = lista.map(u => `<option value="${u.nome}"></option>`).join('');
}

// Modal completo de prazo
function abrirModalNovoPrazo(id) {
  const p = id ? state.prazos.find(x => x.id === id) : null;
  document.getElementById('prazoId').value           = p?.id || '';
  document.getElementById('prazoIntimacaoId').value  = p?.intimacaoId || '';
  document.getElementById('prazoPastaSelect').value  = p?.pastaId || '';
  document.getElementById('prazoCliente').value      = p?.cliente || '';
  document.getElementById('prazoTipo').value         = p?.tipoPrazo || '';
  document.getElementById('prazoFatal').value        = p?.prazoFatal || '';
  document.getElementById('prazoResponsavel').value  = p?.responsavel || '';
  document.getElementById('prazoStatus').value       = p?.status === 'Concluído' ? 'concluido'
    : p?.status === 'Em andamento' ? 'em_andamento' : 'pendente';
  document.getElementById('prazoDescricao').value    = p?.descricao || '';
  popularSelectsPastas();
  popularResponsaveisDatalist(null);
  document.getElementById('modalNovoPrazo').classList.add('open');
}

function fecharModalNovoPrazo() {
  document.getElementById('modalNovoPrazo').classList.remove('open');
  document.getElementById('novoPrazoForm').reset();
}

document.getElementById('btnNovoPrazo').addEventListener('click', () => abrirModalNovoPrazo(null));
document.getElementById('fecharNovoPrazo').addEventListener('click', fecharModalNovoPrazo);
document.getElementById('btnCancelarPrazo').addEventListener('click', fecharModalNovoPrazo);
document.getElementById('modalNovoPrazo').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModalNovoPrazo();
});

document.getElementById('prazoPastaSelect').addEventListener('change', e => {
  const pastaId = e.target.value;
  const pasta   = state.pastas.find(p => p.id === pastaId);
  if (pasta) {
    document.getElementById('prazoCliente').value = pasta.cliente;
    popularResponsaveisDatalist(pasta.areaId);
  } else {
    popularResponsaveisDatalist(null);
  }
});

document.getElementById('novoPrazoForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarPrazo');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    if (!state.empresaId) { toast('Sessão não iniciada. Recarregue a página.', 'error'); return; }
    const prazoId = document.getElementById('prazoId').value;
    const tipo    = document.getElementById('prazoTipo').value;
    const prazo   = document.getElementById('prazoFatal').value;
    if (!tipo)  { toast('Selecione o tipo de prazo.', 'error'); return; }
    if (!prazo) { toast('Informe a data fatal.', 'error'); return; }

    const obj = {
      id:           prazoId || uid(),
      empresa_id:   state.empresaId,
      pasta_id:     document.getElementById('prazoPastaSelect').value || null,
      cliente:      document.getElementById('prazoCliente').value.trim() || null,
      tipo,
      prazo,
      responsavel:  document.getElementById('prazoResponsavel').value.trim() || null,
      status:       document.getElementById('prazoStatus').value || 'pendente',
      descricao:    document.getElementById('prazoDescricao').value.trim() || null,
      intimacao_id: document.getElementById('prazoIntimacaoId')?.value || null,
    };

    const saveReq  = db.from('prazos_lhub').upsert(obj).select();
    const tOut     = new Promise((_, r) => setTimeout(() => r(new Error('Sem resposta do banco em 12s. Verifique as políticas RLS.')), 12000));
    const { data, error } = await Promise.race([saveReq, tOut]);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    if (!data?.length) { toast('Prazo não salvo: falta política INSERT no Supabase (execute o SQL de RLS).', 'error'); return; }
    fecharModalNovoPrazo();
    toast('Prazo salvo!');
    await carregarDados();
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
    console.error('[prazo] exception:', err);
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar Prazo';
  }
});

async function excluirPrazo(id) {
  if (!confirm('Confirmar exclusão deste prazo?')) return;
  const { error } = await db.from('prazos_lhub').delete().eq('id', id).eq('empresa_id', state.empresaId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  toast('Prazo excluído');
  await carregarDados();
}

// ──────────────────────────────────────────────────────────────────────
// RENDER PRAZOS ABA — lê state.prazos
// ──────────────────────────────────────────────────────────────────────
function diasRestantesHtml(iso) {
  const diff = daysUntil(iso);
  if (diff < 0)   return `<span class="dias-vencido">Vencido (${Math.abs(diff)}d)</span>`;
  if (diff === 0) return `<span class="dias-urgente">Hoje!</span>`;
  if (diff <= 3)  return `<span class="dias-urgente">${diff}d</span>`;
  if (diff <= 10) return `<span class="dias-aviso">${diff}d</span>`;
  return `<span class="dias-ok">${diff}d</span>`;
}

function rowClassPrazo(iso) {
  const d = daysUntil(iso);
  if (d < 0)  return 'row-vencido';
  if (d <= 3) return 'row-urgente';
  return '';
}

function renderPrazosAba() {
  const busca = (document.getElementById('buscaPrazosAba')?.value ?? '').toLowerCase();
  const st    = document.getElementById('filtroPrazosStatus')?.value ?? '';
  const resp  = document.getElementById('filtroPrazosResponsavel')?.value ?? '';

  const lista = state.prazos.filter(p => {
    const m = !busca ||
      (p.pastaNr || '').toLowerCase().includes(busca) ||
      (p.processo || '').toLowerCase().includes(busca) ||
      (p.cliente || '').toLowerCase().includes(busca);
    return m && (!st || p.status === st) && (!resp || p.responsavel === resp);
  });

  document.getElementById('prazosInfo').textContent = `${lista.length} registro${lista.length !== 1 ? 's' : ''}`;
  document.getElementById('tabelaPrazosAba').innerHTML = lista.length
    ? lista.map(p => {
        // 1. link direto por ID
      let intimData = p.intimacaoId
        ? (state.intimacoes.find(i => i.id === p.intimacaoId)?.dataPublicacao || null)
        : null;
      // 2. fallback: extrai data do padrão "(DD/MM/YYYY)" no final da descrição
      if (!intimData && p.descricao) {
        const dm = p.descricao.match(/\((\d{2}\/\d{2}\/\d{4})\)\s*$/);
        if (dm) {
          const [dd, mm, yyyy] = dm[1].split('/');
          intimData = yyyy + '-' + mm + '-' + dd;
        }
      }
        const pastaLink = p.pastaNr
          ? `<a href="#" class="table-link" onclick="event.preventDefault();navegarPara('pastas');setTimeout(()=>abrirPasta('${p.pastaNr}'),100)">${p.pastaNr}</a>`
          : '—';
        return `<tr class="${rowClassPrazo(p.prazoFatal)}">
          <td>${pastaLink}</td>
          <td>${p.cliente}</td>
          <td style="font-family:'IBM Plex Mono',monospace;font-size:.72rem">${p.processo || '—'}</td>
          <td>${p.comarca || '—'}</td>
          <td>${p.tipoPrazo}</td>
          <td>${formatDate(p.prazoFatal)}</td>
          <td>${diasRestantesHtml(p.prazoFatal)}</td>
          <td style="max-width:200px;font-size:.76rem">${p.descricao}</td>
          <td>${intimData ? formatDate(intimData) : '—'}</td>
          <td>${p.responsavel}</td>
          <td><span class="status-pill ${statusClass(p.status)}">${p.status}</span></td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="11" class="tbl-empty">Nenhum prazo cadastrado.</td></tr>`;
}

function irParaIntimacao(id) {
  document.querySelectorAll('.subtab').forEach(b => b.classList.remove('is-active'));
  document.querySelectorAll('.subtab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector('.subtab[data-subtab="intimacoes"]').classList.add('is-active');
  document.getElementById('subtab-intimacoes').classList.remove('hidden');
  document.getElementById('buscaIntimacoes').value = id;
  renderIntimacoesAba();
}

document.getElementById('buscaPrazosAba')?.addEventListener('input', renderPrazosAba);
document.getElementById('filtroPrazosStatus')?.addEventListener('change', renderPrazosAba);
document.getElementById('filtroPrazosResponsavel')?.addEventListener('change', renderPrazosAba);
