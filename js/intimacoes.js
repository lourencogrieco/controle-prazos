// ──────────────────────────────────────────────────────────────────────
// RENDER INTIMAÇÕES ABA
// ──────────────────────────────────────────────────────────────────────

// Gera link direto para o processo no portal do tribunal
// TJSP: foro 0000 = 2º grau (cposg) | foro != 0000 = 1º grau (cpopg)
function linkProcesso(processo, tribunal) {
  if (!processo) return null;
  const digits = processo.replace(/\D/g, '');
  if (digits.length < 20) return null;
  const foroStr  = digits.slice(16);          // OOOO (4 dígitos)
  const foroNum  = parseInt(foroStr, 10);
  const trib     = (tribunal || '').toLowerCase();
  const segundo  = foroNum === 0;             // foro 0000 = 2ª instância

  if (trib.includes('tjsp')) {
    if (segundo) {
      // Extracts NNNNNNN-DD.AAAA from NNNNNNN-DD.AAAA.J.TT.OOOO
      const numDigitoAno = processo.split('.').slice(0, 2).join('.');
      return `https://esaj.tjsp.jus.br/cposg/search.do?cbPesquisa=NUMPROC` +
        `&numeroDigitoAnoUnificado=${encodeURIComponent(numDigitoAno)}` +
        `&foroNumeroUnificado=0000` +
        `&dePesquisaNuUnificado=${encodeURIComponent(processo)}` +
        `&tipoNuProcesso=UNIFICADO`;
    }
    return `https://esaj.tjsp.jus.br/cpopg/search.do?cbPesquisa=NUMPROC` +
      `&foroNumeroUnificado=${foroStr}` +
      `&dadosConsulta.valorConsultaNuUnificado=${encodeURIComponent(processo)}` +
      `&dadosConsulta.tipoNuProcesso=UNIFICADO`;
  }
  if (trib.includes('tjmg')) {
    return `https://processo.tjmg.jus.br/cpopg2/open.do?processo.numero=${encodeURIComponent(processo)}`;
  }
  if (trib.includes('tjrj')) {
    return `https://www4.tjrj.jus.br/consultaProcessoWebV2/consultaMov.do?numProcesso=${encodeURIComponent(processo)}`;
  }
  if (trib.includes('tjrs')) {
    return `https://www.tjrs.jus.br/site_php/consulta/consulta_processo.php?NUMPROC=${encodeURIComponent(processo)}`;
  }
  if (trib.includes('stj')) {
    return `https://processo.stj.jus.br/SCON/pesquisar.jsp?b=ACOR&livre=${encodeURIComponent(processo)}`;
  }
  if (trib.includes('trf')) {
    return `https://eproc.trf1.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica&num_processo=${encodeURIComponent(processo)}`;
  }
  return null;
}

// Encontra pasta vinculada: primeiro por vínculo manual, depois por CNJ.
function pastaDaIntimacao(intim) {
  if (!intim) return null;
  if (intim.pastaId) {
    const manual = state.pastas.find(p => p.id === intim.pastaId);
    if (manual) return manual;
  }
  return _pastaPorProcesso(intim.processo);
}

const INTIM_STATUS_LABEL = {
  pendente:       'Pendente',
  cumprida:       'Cumprida',
  prazo_agendado: 'Prazo agendado',
  arquivada:      'Arquivada',
};
const INTIM_STATUS_CLASS = {
  pendente:       'status-pill--warn',
  cumprida:       'status-pill--done',
  prazo_agendado: 'status-pill--info',
  arquivada:      'status-pill--muted',
};

function renderIntimacoesAba() {
  const busca  = (document.getElementById('buscaIntimacoes')?.value ?? '').toLowerCase();
  const status = document.getElementById('filtroIntimacoesStatus')?.value ?? '';
  const de     = document.getElementById('filtroIntimacoesDe')?.value ?? '';
  const ate    = document.getElementById('filtroIntimacoesAte')?.value ?? '';

  const lista = state.intimacoes.filter(i => {
    const st = i.status || 'pendente';
    if (!status && st === 'arquivada') return false;
    const m = !busca ||
      i.processo.toLowerCase().includes(busca) ||
      i.orgao.toLowerCase().includes(busca) ||
      i.tribunal.toLowerCase().includes(busca) ||
      i.nomeClasse.toLowerCase().includes(busca) ||
      i.tipoDocumento.toLowerCase().includes(busca);
    const dataOk = (!de || i.dataPublicacao >= de) && (!ate || i.dataPublicacao <= ate);
    return m && (!status || st === status) && dataOk;
  });

  const cfg = state.pjeConfig;
  const ultimaSync = cfg?.ultima_sync
    ? `Última sync: ${new Date(cfg.ultima_sync).toLocaleString('pt-BR')}`
    : 'Nenhuma sincronização realizada';

  document.getElementById('intimacoesInfo').textContent =
    `${lista.length} registro${lista.length !== 1 ? 's' : ''} · ${ultimaSync}`;

  document.getElementById('tabelaIntimacoes').innerHTML = lista.length
    ? lista.map(i => {
        const st   = i.status || 'pendente';
        const lbl  = INTIM_STATUS_LABEL[st] || st;
        const cls  = INTIM_STATUS_CLASS[st] || 'status-pill--warn';
        const opts = Object.entries(INTIM_STATUS_LABEL)
          .map(([v, t]) => `<option value="${v}"${v === st ? ' selected' : ''}>${t}</option>`)
          .join('');
        const iJson = JSON.stringify(i).replace(/'/g, '&#39;');
        const pasta = pastaDaIntimacao(i);
        const pastaCell = pasta
          ? `<a class="int-link" href="#" onclick="event.preventDefault();navegarPara('pastas');setTimeout(()=>abrirPasta('${pasta.numero}'),100)">${pasta.numero}</a>`
          : `<button class="btn-link-sm" onclick='abrirModalVincularIntimacao(${iJson})' title="Vincular esta intimação a uma pasta">Vincular</button>`;
        const linkDireto = linkProcesso(i.processo, i.tribunal);
        return `<tr style="cursor:default">
          <td style="font-family:'IBM Plex Mono',monospace;font-size:.7rem;white-space:nowrap">
            <button class="btn-link-sm" onclick='lerIntimacao(${iJson})' title="Ler intimação" style="font-family:inherit;text-align:left">${i.processo}</button>
          </td>
          <td style="font-size:.75rem">${pastaCell}</td>
          <td><span class="badge-tribunal">${i.tribunal}</span></td>
          <td style="font-size:.75rem;max-width:160px">${i.orgao}</td>
          <td style="white-space:nowrap">${formatDate(i.dataPublicacao)}</td>
          <td style="font-size:.75rem">${i.tipoDocumento || i.nomeClasse || '—'}</td>
          <td style="font-size:.75rem">${i.nomeClasse || '—'}</td>
          <td>
            <select class="intim-status-sel" data-id="${i.id}" style="font-size:.72rem;padding:3px 6px;background:var(--bg);border:1px solid var(--br);border-radius:2px;color:inherit;cursor:pointer">
              ${opts}
            </select>
          </td>
          <td style="white-space:nowrap">
            <button class="btn-link-sm" onclick='lerIntimacao(${iJson})' title="Ler texto">Ler</button>
            <button class="btn-link-sm" onclick='abrirModalVincularIntimacao(${iJson})' title="Vincular pasta" style="margin-left:6px">Vincular</button>
            <button class="btn-link-sm" onclick='criarPrazoDaIntimacao(${iJson})' title="Criar prazo" style="margin-left:6px">+ Prazo</button>
            <button class="btn-link-sm" onclick='criarTarefaDaIntimacao(${iJson})' title="Criar tarefa" style="margin-left:4px">+ Tarefa</button>
          </td>
          <td>${linkDireto
            ? `<a href="${linkDireto}" target="_blank" class="int-link">Ver ↗</a>`
            : (i.link ? `<a href="${i.link}" target="_blank" class="int-link">Ver ↗</a>` : '—')}
          </td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="10" class="tbl-empty">Nenhuma intimação encontrada para o período selecionado.</td></tr>`;

  // Bind status dropdowns
  document.querySelectorAll('.intim-status-sel').forEach(sel => {
    sel.addEventListener('change', e => {
      alterarStatusIntimacao(sel.dataset.id, e.target.value, sel);
    });
  });
}

async function alterarStatusIntimacao(id, novoStatus, selectEl) {
  const item = state.intimacoes.find(i => i.id === id);
  const statusAnterior = item?.status || 'pendente';
  if (selectEl) selectEl.disabled = true;

  const { data, error } = await db.from('intimacoes_pje')
    .update({ status_lhub: novoStatus, lida: novoStatus !== 'pendente' })
    .eq('id', id)
    .eq('empresa_id', state.empresaId)
    .select('id,status_lhub,lida')
    .maybeSingle();

  if (selectEl) selectEl.disabled = false;
  if (error || !data) {
    if (selectEl) selectEl.value = statusAnterior;
    toast('Erro ao atualizar status: ' + (error?.message || 'registro não encontrado'), 'error');
    return;
  }

  if (item) item.status = data.status_lhub || (data.lida ? 'cumprida' : 'pendente');
  renderIntimacoesAba();
  renderDashboard();
  toast(novoStatus === 'arquivada' ? 'Intimação arquivada e removida do acompanhamento.' : 'Status atualizado!');
}

function abrirModalVincularIntimacao(intim) {
  document.getElementById('vincularIntimacaoId').value = intim.id || '';
  document.getElementById('vincularIntimacaoProcesso').textContent = intim.processo || '—';
  document.getElementById('vincularIntimacaoMeta').textContent =
    `${intim.tribunal || 'Tribunal'} · ${formatDate(intim.dataPublicacao)} · ${intim.orgao || '—'}`;

  const select = document.getElementById('vincularIntimacaoPasta');
  const atual = pastaDaIntimacao(intim);
  select.innerHTML = '<option value="">— Selecionar pasta —</option>' + state.pastas
    .filter(p => p.status !== 'arquivado')
    .map(p => `<option value="${p.id}"${p.id === atual?.id ? ' selected' : ''}>${p.numero} — ${p.cliente || '—'}${p.processo ? ' · ' + p.processo : ''}</option>`)
    .join('');

  document.getElementById('modalVincularIntimacao').classList.add('open');
}

function fecharModalVincularIntimacao() {
  document.getElementById('modalVincularIntimacao').classList.remove('open');
  document.getElementById('vincularIntimacaoId').value = '';
  document.getElementById('vincularIntimacaoPasta').value = '';
}

async function salvarVinculoIntimacao() {
  const id = document.getElementById('vincularIntimacaoId').value;
  const pastaId = document.getElementById('vincularIntimacaoPasta').value;
  if (!id || !pastaId) { toast('Selecione uma pasta para vincular.', 'error'); return; }

  const btn = document.getElementById('btnSalvarVinculoIntimacao');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
  try {
    const { data, error } = await db.from('intimacoes_pje')
      .update({ pasta_id: pastaId })
      .eq('id', id)
      .eq('empresa_id', state.empresaId)
      .select('id,pasta_id')
      .maybeSingle();

    if (error || !data) {
      toast('Erro ao vincular pasta: ' + (error?.message || 'registro não encontrado'), 'error');
      return;
    }

    const item = state.intimacoes.find(i => i.id === id);
    if (item) item.pastaId = data.pasta_id;
    fecharModalVincularIntimacao();
    renderIntimacoesAba();
    toast('Intimação vinculada à pasta.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Vincular pasta'; }
  }
}

async function removerVinculoIntimacao() {
  const id = document.getElementById('vincularIntimacaoId').value;
  if (!id) return;
  if (!confirm('Remover vínculo desta intimação com a pasta?')) return;

  const { data, error } = await db.from('intimacoes_pje')
    .update({ pasta_id: null })
    .eq('id', id)
    .eq('empresa_id', state.empresaId)
    .select('id,pasta_id')
    .maybeSingle();

  if (error || !data) {
    toast('Erro ao remover vínculo: ' + (error?.message || 'registro não encontrado'), 'error');
    return;
  }
  const item = state.intimacoes.find(i => i.id === id);
  if (item) item.pastaId = null;
  fecharModalVincularIntimacao();
  renderIntimacoesAba();
  toast('Vínculo removido.');
}

function criarPrazoDaIntimacao(intim) {
  // Abre o modal via função oficial (configura pickers, permissões, etc.)
  abrirModalNovoPrazo(null);
  // Sobrescreve campos com dados da intimação
  const pasta = pastaDaIntimacao(intim);
  document.getElementById('prazoIntimacaoId').value = intim.id || '';
  document.getElementById('prazoTipo').value        = 'Manifestação';
  document.getElementById('prazoFatal').dataset.dataBase = intim.dataPublicacao || '';
  document.getElementById('prazoDescricao').value   =
    `Intimação ${intim.tipoDocumento || intim.nomeClasse || ''} — ${intim.orgao} (${formatDate(intim.dataPublicacao)})`.trim();
  if (pasta) {
    document.getElementById('prazoPastaSelect').value = pasta.id;
    document.getElementById('prazoCliente').value     = pasta.cliente || '';
  }
  preencherPrazoSugerido();
}

function criarTarefaDaIntimacao(intim) {
  // Abre o modal via função oficial (configura pickers, seletores, etc.)
  abrirModalNovaTarefa(null);
  // Sobrescreve campos com dados da intimação
  const pasta = pastaDaIntimacao(intim);
  document.getElementById('tTitulo').value     = `Intimação: ${intim.tipoDocumento || intim.nomeClasse || intim.orgao}`;
  document.getElementById('tTipo').value       = 'Diligência interna';
  document.getElementById('tPrioridade').value = 'alta';
  document.getElementById('tDescricao').value  =
    `Intimação publicada em ${formatDate(intim.dataPublicacao)}.\nÓrgão: ${intim.orgao}\nProcesso: ${intim.processo}`;
  if (pasta) document.getElementById('tarefaPastaSelect').value = pasta.id;
}

function lerIntimacao(intim) {
  const tipo = intim.tipoDocumento || intim.tipoComunicacao || 'Intimação';
  const titulo = `${tipo}${intim.nomeClasse ? ' — ' + intim.nomeClasse : ''}`;
  const meta   = `${intim.processo} · ${intim.tribunal} · Publicado em ${formatDate(intim.dataPublicacao)} · ${intim.orgao}`;

  document.getElementById('lerIntimTitulo').textContent = titulo;
  document.getElementById('lerIntimMeta').textContent   = meta;
  document.getElementById('lerIntimTexto').textContent  = intim.texto || 'Texto não disponível.';

  const link = linkProcesso(intim.processo, intim.tribunal) || intim.link || '#';
  const linkEl = document.getElementById('lerIntimLink');
  linkEl.href = link;
  linkEl.style.display = link === '#' ? 'none' : '';

  document.getElementById('modalLerIntimacao').classList.add('open');
}

async function sincronizarPJeData() {
  const de  = document.getElementById('filtroIntimacoesDe')?.value;
  const ate = document.getElementById('filtroIntimacoesAte')?.value;
  if (!de) { toast('Selecione ao menos a data inicial.', 'error'); return; }
  const btn = document.getElementById('btnBuscarData');
  if (btn) { btn.disabled = true; btn.textContent = 'Buscando…'; }
  try {
    const nomes = state.pjeConfig?.nomes ?? [];
    if (!nomes.length) { toast('Nenhum nome configurado para busca de intimações.', 'error'); return; }

    let total = 0;
    for (const nome of nomes) {
      let pagina = 1;
      let totalApi = Infinity;
      while ((pagina - 1) * 50 < totalApi) {
        const url = `/api/pje-proxy` +
          `?pagina=${pagina}&itensPorPagina=50` +
          `&texto=${encodeURIComponent(nome)}` +
          `&dataInicio=${de}` +
          `&dataFim=${ate || de}`;
        const res = await proxyFetch(url);
        if (!res.ok) break;
        const json = await res.json();
        totalApi = json.count ?? 0;
        const items = json.items ?? [];
        const rows = items.map(i => ({
          id: String(i.id),
          empresa_id: state.empresaId,
          data_disponibilizacao: i.data_disponibilizacao,
          sigla_tribunal: i.siglaTribunal,
          tipo_comunicacao: i.tipoComunicacao,
          nome_orgao: i.nomeOrgao,
          texto: i.texto,
          numero_processo: i.numero_processo,
          numero_processo_mascara: i.numeroprocessocommascara,
          link: i.link,
          tipo_documento: i.tipoDocumento,
          nome_classe: i.nomeClasse,
          status: i.status,
          meio_completo: i.meiocompleto,
          hash: i.hash,
        }));
        if (rows.length) {
          const { error } = await db.from('intimacoes_pje').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
          if (error) console.error('Upsert intimacoes erro:', error);
          else total += rows.length;
        }
        pagina++;
        if (items.length < 50) break;
      }
    }
    toast(`${total} intimação(ões) importada(s)!`);
    await carregarDados();
    renderIntimacoesAba();
  } catch (e) { console.error('Erro ao buscar PJe:', e); toast('Erro: ' + e.message, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '↻ Buscar por data'; } }
}

async function sincronizarPJe() {
  const hoje = new Date().toISOString().slice(0, 10);
  // Preenche os campos de data com hoje e dispara a busca
  const elDe  = document.getElementById('filtroIntimacoesDe');
  const elAte = document.getElementById('filtroIntimacoesAte');
  if (elDe)  elDe.value  = hoje;
  if (elAte) elAte.value = hoje;

  const btn = document.getElementById('btnSyncPJe');
  if (btn) { btn.disabled = true; btn.textContent = 'Sincronizando…'; }
  try {
    const nomes = state.pjeConfig?.nomes ?? [];
    if (!nomes.length) { toast('Nenhum nome configurado para busca de intimações.', 'error'); return; }

    let total = 0;
    for (const nome of nomes) {
      let pagina = 1;
      let totalApi = Infinity;
      while ((pagina - 1) * 50 < totalApi) {
        const url = `/api/pje-proxy?pagina=${pagina}&itensPorPagina=50` +
          `&texto=${encodeURIComponent(nome)}&dataInicio=${hoje}&dataFim=${hoje}`;
        const res = await proxyFetch(url);
        if (!res.ok) break;
        const json = await res.json();
        totalApi = json.count ?? 0;
        const items = json.items ?? [];
        const rows = items.map(i => ({
          id: String(i.id), empresa_id: state.empresaId,
          data_disponibilizacao: i.data_disponibilizacao,
          sigla_tribunal: i.siglaTribunal, tipo_comunicacao: i.tipoComunicacao,
          nome_orgao: i.nomeOrgao, texto: i.texto,
          numero_processo: i.numero_processo,
          numero_processo_mascara: i.numeroprocessocommascara,
          link: i.link, tipo_documento: i.tipoDocumento,
          nome_classe: i.nomeClasse, status: i.status,
          meio_completo: i.meiocompleto, hash: i.hash,
        }));
        if (rows.length) {
          const { error } = await db.from('intimacoes_pje').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
          if (!error) total += rows.length;
        }
        pagina++;
        if (items.length < 50) break;
      }
    }
    toast(`${total} intimação(ões) de hoje importada(s)!`);
    await carregarDados();
    renderIntimacoesAba();
  } catch (e) {
    console.error('Erro sincronizar PJe:', e);
    toast('Erro ao sincronizar: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '↻ Sincronizar'; }
  }
}

function irParaPrazo(pastaNr) {
  document.querySelectorAll('.subtab').forEach(b => b.classList.remove('is-active'));
  document.querySelectorAll('.subtab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector('.subtab[data-subtab="prazos"]').classList.add('is-active');
  document.getElementById('subtab-prazos').classList.remove('hidden');
  document.getElementById('buscaPrazosAba').value = pastaNr;
  renderPrazosAba();
}

document.getElementById('buscaIntimacoes')?.addEventListener('input', renderIntimacoesAba);
document.getElementById('filtroIntimacoesStatus')?.addEventListener('change', renderIntimacoesAba);
document.getElementById('filtroIntimacoesDe')?.addEventListener('change', renderIntimacoesAba);
document.getElementById('filtroIntimacoesAte')?.addEventListener('change', renderIntimacoesAba);
