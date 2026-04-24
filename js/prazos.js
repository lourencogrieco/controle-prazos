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
  const { data, error } = await db.from('prazos_lhub').insert(obj).select();
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  const novo = dbParaPrazo(data[0]); _enrichPrazo(novo);
  _stateUpsert(state.prazos, novo);
  logAuditoria('criar', 'prazos_lhub', obj.id, `Prazo criado: ${obj.tipo} — ${obj.cliente || '—'}`);
  e.target.reset();
  toast('Prazo cadastrado');
  renderPrazosAba(); renderDashboard(); renderNavBadges();
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
  document.querySelector('#modalNovoPrazo .modal-head h3').textContent = p ? 'Editar Prazo' : 'Novo Prazo';
  document.getElementById('prazoId').value           = p?.id || '';
  document.getElementById('prazoIntimacaoId').value  = p?.intimacaoId || '';
  document.getElementById('prazoPastaSelect').value  = p?.pastaId || '';
  document.getElementById('prazoCliente').value      = p?.cliente || '';
  document.getElementById('prazoTipo').value         = p?.tipoPrazo || '';
  document.getElementById('prazoFatal').value        = p?.prazoFatal || '';
  document.getElementById('prazoStatus').value       = p?.status === 'Concluído' ? 'concluido'
    : p?.status === 'Em andamento' ? 'em_andamento' : 'pendente';
  document.getElementById('prazoDescricao').value    = p?.descricao || '';
  popularSelectsPastas();
  popularRespPicker('prazoRespPicker', p?.responsavel || '', state.usuarios);

  // Controle de permissão para data fatal
  const podData = podeAlterarDataPrazo();
  document.getElementById('prazoFatal').disabled = !podData;
  document.getElementById('prazoTipo').disabled  = !podData;
  document.getElementById('prazoAvisoPermissao').style.display = (!podData && p) ? '' : 'none';

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
  }
});

document.getElementById('novoPrazoForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarPrazo');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    if (!state.empresaId) { toast('Sessão não iniciada. Recarregue a página.', 'error'); return; }
    const prazoId = document.getElementById('prazoId').value;
    const podData = podeAlterarDataPrazo();

    // Se está editando e não tem permissão, usa os valores originais do state
    const prazoOriginal = prazoId ? state.prazos.find(x => x.id === prazoId) : null;
    const tipo = podData
      ? document.getElementById('prazoTipo').value
      : (prazoOriginal?.tipoPrazo || document.getElementById('prazoTipo').value);
    const prazo = podData
      ? document.getElementById('prazoFatal').value
      : (prazoOriginal?.prazoFatal || document.getElementById('prazoFatal').value);

    if (!tipo)  { toast('Selecione o tipo de prazo.', 'error'); return; }
    if (!prazo) { toast('Informe a data fatal.', 'error'); return; }

    const obj = {
      id:           prazoId || uid(),
      empresa_id:   state.empresaId,
      pasta_id:     document.getElementById('prazoPastaSelect').value || null,
      cliente:      document.getElementById('prazoCliente').value.trim() || null,
      tipo,
      prazo,
      responsavel:  getSelectedResps('prazoRespPicker') || null,
      status:       document.getElementById('prazoStatus').value || 'pendente',
      descricao:    document.getElementById('prazoDescricao').value.trim() || null,
      intimacao_id: document.getElementById('prazoIntimacaoId')?.value || null,
    };

    const saveReq  = db.from('prazos_lhub').upsert(obj).select();
    const tOut     = new Promise((_, r) => setTimeout(() => r(new Error('Sem resposta do banco em 12s. Verifique as políticas RLS.')), 12000));
    const { data, error } = await Promise.race([saveReq, tOut]);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    if (!data?.length) { toast('Prazo não salvo: falta política INSERT no Supabase (execute o SQL de RLS).', 'error'); return; }
    const novo = dbParaPrazo(data[0]); _enrichPrazo(novo);
    _stateUpsert(state.prazos, novo);
    logAuditoria(prazoId ? 'editar' : 'criar', 'prazos_lhub', obj.id, `Prazo ${prazoId ? 'editado' : 'criado'}: ${obj.tipo} — ${obj.cliente || '—'}`);
    fecharModalNovoPrazo();
    toast('Prazo salvo!');
    renderPrazosAba(); renderDashboard(); renderNavBadges();
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
    console.error('[prazo] exception:', err);
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar Prazo';
  }
});

async function excluirPrazo(id) {
  if (!confirm('Confirmar exclusão deste prazo?')) return;
  const p = state.prazos.find(x => x.id === id);
  const { error } = await db.from('prazos_lhub').delete().eq('id', id).eq('empresa_id', state.empresaId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  logAuditoria('excluir', 'prazos_lhub', id, `Prazo excluído: ${p?.tipoPrazo || '—'} — ${p?.cliente || '—'}`);
  _stateRemove(state.prazos, id);
  toast('Prazo excluído');
  renderPrazosAba(); renderDashboard(); renderNavBadges();
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

// ── Estado de paginação ───────────────────────────────────────────────
let prazoPagAtual = 1;
let prazoLinhas   = 10;

function _prazosPaginacaoAtualizar(total) {
  const pages  = Math.max(1, Math.ceil(total / prazoLinhas));
  prazoPagAtual = Math.min(prazoPagAtual, pages);

  const inicio = (prazoPagAtual - 1) * prazoLinhas + 1;
  const fim    = Math.min(prazoPagAtual * prazoLinhas, total);
  document.getElementById('prazosInfo').textContent =
    total ? `Exibindo ${inicio}–${fim} de ${total}` : '0 registros';

  const pgSel = document.getElementById('prazosPagina');
  if (pgSel) {
    pgSel.innerHTML = Array.from({ length: pages }, (_, i) =>
      `<option value="${i + 1}" ${i + 1 === prazoPagAtual ? 'selected' : ''}>${i + 1}</option>`
    ).join('');
  }
  const totalEl = document.getElementById('prazosTotalPaginas');
  if (totalEl) totalEl.textContent = `de ${pages}`;

  const btnAnt = document.getElementById('prazosPgAnterior');
  const btnPrx = document.getElementById('prazosPgProxima');
  if (btnAnt) btnAnt.disabled = prazoPagAtual <= 1;
  if (btnPrx) btnPrx.disabled = prazoPagAtual >= pages;
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
    const respMatch = !resp || (p.responsavel || '').split(';').map(n => n.trim()).includes(resp);
    return m && (!st || p.status === st) && respMatch;
  });

  _prazosPaginacaoAtualizar(lista.length);
  const inicio = (prazoPagAtual - 1) * prazoLinhas;
  const slice  = lista.slice(inicio, inicio + prazoLinhas);

  document.getElementById('tabelaPrazosAba').innerHTML = slice.length
    ? slice.map(p => {
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
        const acoes = podeEditarRegistro() ? `
          <div class="row-actions">
            ${podeEditarRegistro() ? `<button class="btn-icon" title="Editar" onclick="event.stopPropagation();abrirModalNovoPrazo('${p.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg></button>` : ''}
            ${podeExcluirRegistro() ? `<button class="btn-icon btn-icon--danger" title="Excluir" onclick="event.stopPropagation();excluirPrazo('${p.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
              </svg></button>` : ''}
          </div>` : '';
        return `<tr class="${rowClassPrazo(p.prazoFatal)}" data-prazo-id="${p.id}">
          <td>${pastaLink}</td>
          <td>${p.cliente}</td>
          <td style="font-family:'IBM Plex Mono',monospace;font-size:.72rem">${p.processo || '—'}</td>
          <td>${p.comarca || '—'}</td>
          <td>${p.tipoPrazo}</td>
          <td>${formatDate(p.prazoFatal)}</td>
          <td>${diasRestantesHtml(p.prazoFatal)}</td>
          <td style="max-width:200px;font-size:.76rem">${p.descricao}</td>
          <td>${intimData ? formatDate(intimData) : '—'}</td>
          <td>${avatarGroup(p.responsavel)}</td>
          <td><span class="status-pill ${statusClass(p.status)}">${p.status}</span></td>
          <td>${acoes}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="12" class="tbl-empty">Nenhum prazo cadastrado.</td></tr>`;
}

function irParaIntimacao(id) {
  document.querySelectorAll('.subtab').forEach(b => b.classList.remove('is-active'));
  document.querySelectorAll('.subtab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector('.subtab[data-subtab="intimacoes"]').classList.add('is-active');
  document.getElementById('subtab-intimacoes').classList.remove('hidden');
  document.getElementById('buscaIntimacoes').value = id;
  renderIntimacoesAba();
}

document.getElementById('buscaPrazosAba')?.addEventListener('input', () => { prazoPagAtual = 1; renderPrazosAba(); });
document.getElementById('filtroPrazosStatus')?.addEventListener('change', () => { prazoPagAtual = 1; renderPrazosAba(); });
document.getElementById('filtroPrazosResponsavel')?.addEventListener('change', () => { prazoPagAtual = 1; renderPrazosAba(); });

document.getElementById('prazosLinhas')?.addEventListener('change', e => {
  prazoLinhas   = Number(e.target.value);
  prazoPagAtual = 1;
  renderPrazosAba();
});
document.getElementById('prazosPagina')?.addEventListener('change', e => {
  prazoPagAtual = Number(e.target.value);
  renderPrazosAba();
});
document.getElementById('prazosPgAnterior')?.addEventListener('click', () => {
  if (prazoPagAtual > 1) { prazoPagAtual--; renderPrazosAba(); }
});
document.getElementById('prazosPgProxima')?.addEventListener('click', () => {
  prazoPagAtual++;
  renderPrazosAba();
});
