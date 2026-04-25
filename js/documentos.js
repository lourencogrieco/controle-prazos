// ── DOCUMENTOS ───────────────────────────────────────────────────────────────

function abrirUploadDoc() {
  if (!state.currentPastaId) { toast('Abra uma pasta primeiro.', 'error'); return; }
  document.getElementById('docPastaId').value     = state.currentPastaId;
  document.getElementById('docAndamentoId').value = '';
  document.getElementById('docNome').value        = '';
  document.getElementById('docTipo').value        = '';
  document.getElementById('docDescricao').value   = '';
  document.getElementById('docArquivo').value     = '';
  document.getElementById('modalUploadDoc').classList.add('open');
}

function abrirUploadDocAndamento() {
  const a = state.currentAndamento;
  if (!a) return;
  document.getElementById('docPastaId').value     = a.pasta_id;
  document.getElementById('docAndamentoId').value = a.id;
  document.getElementById('docNome').value        = '';
  document.getElementById('docTipo').value        = '';
  document.getElementById('docDescricao').value   = '';
  document.getElementById('docArquivo').value     = '';
  document.getElementById('modalUploadDoc').classList.add('open');
}

async function carregarDocumentos(pastaId) {
  if (!pastaId) return;
  // Aba geral exibe apenas docs sem vínculo a andamento (andamento_id IS NULL)
  // Docs vinculados a andamentos ficam apenas no detalhe do andamento
  const { data } = await db.from('documentos_pasta')
    .select('*')
    .eq('pasta_id', pastaId)
    .eq('empresa_id', state.empresaId)
    .is('andamento_id', null)
    .order('created_at', { ascending: false });
  renderDocumentos(data || []);
}

function renderDocumentos(docs) {
  const tbody = document.getElementById('tabelaDocumentosBody');
  if (!tbody) return;
  if (!docs.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="tbl-empty">Nenhum documento encontrado</td></tr>';
    return;
  }
  tbody.innerHTML = docs.map(d => {
    const tamanho = d.tamanho_bytes
      ? (d.tamanho_bytes > 1048576
        ? (d.tamanho_bytes / 1048576).toFixed(1) + ' MB'
        : Math.round(d.tamanho_bytes / 1024) + ' KB')
      : '—';
    return `<tr>
      <td>${d.nome}</td>
      <td>${d.tipo || '—'}</td>
      <td>${d.criado_por || '—'}</td>
      <td>—</td>
      <td>${tamanho}</td>
      <td>${formatDate(d.created_at?.slice(0,10))}</td>
      <td style="display:flex;align-items:center;gap:16px">
        <button class="btn-link-sm" onclick="baixarDocumento('${d.storage_path}','${d.nome}')">⬇ Baixar</button>
        <button class="btn-icon btn-icon--danger" title="Excluir documento" onclick="excluirDocumento('${d.id}','${d.storage_path}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        </button>
      </td>
    </tr>`;
  }).join('');
}

document.getElementById('formUploadDoc').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarDoc');
  btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    const pastaId     = document.getElementById('docPastaId').value;
    const andamentoId = document.getElementById('docAndamentoId').value || null;
    const arquivo     = document.getElementById('docArquivo').files[0];
    const nome        = document.getElementById('docNome').value.trim();
    const tipo        = document.getElementById('docTipo').value;
    const descricao   = document.getElementById('docDescricao').value.trim();

    if (!arquivo) { toast('Selecione um arquivo.', 'error'); return; }

    const ext  = arquivo.name.split('.').pop();
    const path = `${state.empresaId}/${pastaId}/${uid()}.${ext}`;
    const { error: upErr } = await db.storage.from('documentos').upload(path, arquivo);
    if (upErr) { toast('Erro no upload: ' + upErr.message, 'error'); return; }

    const { error: dbErr } = await db.from('documentos_pasta').insert({
      id:            uid(),
      empresa_id:    state.empresaId,
      pasta_id:      pastaId,
      andamento_id:  andamentoId,
      nome,
      tipo:          tipo || null,
      descricao:     descricao || null,
      storage_path:  path,
      tamanho_bytes: arquivo.size,
      criado_por:    state.meuPerfil?.nome || '',
    });
    if (dbErr) { toast('Erro ao salvar metadados: ' + dbErr.message, 'error'); return; }

    document.getElementById('modalUploadDoc').classList.remove('open');
    toast('Documento enviado com sucesso!');
    if (andamentoId) {
      await carregarDocumentosDetalhe(andamentoId);
    } else {
      await carregarDocumentos(pastaId);
    }
  } catch (err) {
    toast('Erro inesperado: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Enviar';
  }
});

async function baixarDocumento(path, nome) {
  const { data, error } = await db.storage.from('documentos').download(path);
  if (error) { toast('Erro ao baixar: ' + error.message, 'error'); return; }
  const url = URL.createObjectURL(data);
  const a   = document.createElement('a');
  a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function excluirDocumento(id, path) {
  if (!confirm('Excluir este documento?')) return;
  await db.storage.from('documentos').remove([path]);
  await db.from('documentos_pasta')
    .delete()
    .eq('id', id)
    .eq('empresa_id', state.empresaId);
  toast('Documento excluído.');
  await carregarDocumentos(state.currentPastaId);
}

// Exclui documento vinculado a um andamento e recarrega a lista do detalhe
async function excluirDocumentoAndamento(id, path, andamentoId) {
  if (!confirm('Excluir este documento?')) return;
  await db.storage.from('documentos').remove([path]);
  await db.from('documentos_pasta')
    .delete()
    .eq('id', id)
    .eq('empresa_id', state.empresaId);
  toast('Documento excluído.');
  if (andamentoId) await carregarDocumentosDetalhe(andamentoId);
}
