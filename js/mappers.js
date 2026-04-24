// ──────────────────────────────────────────────────────────────────────
// MAPPERS
// ──────────────────────────────────────────────────────────────────────
function dbParaPasta(row) {
  return {
    id:               row.id,
    areaId:           row.area_id || null,
    numero:           row.numero,
    codigoSIA:        row.codigo_lhub || '-',
    clienteId:        row.cliente_id || null,
    cliente:          row.cliente,
    parteContraria:   row.parte_contraria || '-',
    tipoServico:      row.categoria,
    servico:          row.tipo_acao || '',
    area:             row.area || '',
    advogado:         row.responsavel || '',
    descricao:        row.observacoes || '',
    dataDistribuicao: row.data_abertura ? formatDate(row.data_abertura) : '',
    valorCausa:       row.valor_causa || 'R$ 0,00',
    incluidoPor:      row.incluido_por || '',
    processo:         row.numero_processo || '',
    comarca:          row.comarca || '',
    status:           row.status || 'ativo',
  };
}

function pastaParaDb(p) {
  return {
    id:              p.id,
    empresa_id:      state.empresaId,
    numero:          p.numero,
    codigo_lhub:     p.codigoSIA || '-',
    cliente:         p.cliente.toUpperCase(),
    parte_contraria: p.parteContraria || null,
    categoria:       p.tipoServico,
    tipo_acao:       p.servico || null,
    area:            p.area || null,
    responsavel:     p.advogado || null,
    observacoes:     p.descricao || null,
    data_abertura:   p.dataDistribuicao || null,
    valor_causa:     p.valorCausa || null,
    incluido_por:    p.incluidoPor || null,
    numero_processo: p.processo || null,
    comarca:         p.comarca || null,
    status:          p.status || 'ativo',
  };
}

function dbParaPrazo(row) {
  return {
    id:          row.id,
    pastaId:     row.pasta_id || null,
    pastaNr:     '',
    cliente:     row.cliente || '',
    processo:    '',
    comarca:     '',
    tipoPrazo:   row.tipo || '',
    prazoFatal:  row.prazo,
    descricao:   row.descricao || '',
    intimacaoId: row.intimacao_id || null,
    responsavel: row.responsavel || '',
    status:      row.status === 'concluido'    ? 'Concluído'
               : row.status === 'atrasado'    ? 'Atrasado'
               : row.status === 'em_andamento'? 'Em andamento'
               : row.status === 'cancelado'   ? 'Cancelado'
               : 'Pendente',
    codigoSIA:   '-',
  };
}

function dbParaIntimacao(row) {
  return {
    id:               row.id,
    dataPublicacao:   row.data_disponibilizacao,
    tribunal:         row.sigla_tribunal || '',
    tipoComunicacao:  row.tipo_comunicacao || 'Intimação',
    orgao:            row.nome_orgao || '',
    texto:            row.texto || '',
    processo:         row.numero_processo_mascara || row.numero_processo || '',
    link:             row.link || '',
    tipoDocumento:    row.tipo_documento || '',
    nomeClasse:       row.nome_classe || '',
    status:           row.status_lhub || (row.lida ? 'cumprida' : 'pendente'),
    meioCompleto:     row.meio_completo || '',
  };
}

function dbParaArea(row) {
  return { id: row.id, nome: row.nome, ordem: row.ordem ?? 99 };
}

function dbParaTipoPasta(row) {
  return { id: row.id, codigo: row.codigo, nome: row.nome, areaId: row.area_id };
}

function dbParaCliente(row) {
  return {
    id:          row.id,
    nome:        row.nome,
    tipo:        row.tipo || 'PJ',
    cpfCnpj:     row.cpf_cnpj || '',
    email:       row.email || '',
    telefone:    row.telefone || '',
    rua:         row.rua || '',
    numero:      row.numero || '',
    complemento: row.complemento || '',
    bairro:      row.bairro || '',
    cep:         row.cep || '',
    cidade:      row.cidade || '',
    estado:      row.estado || '',
  };
}

function dbParaTarefa(row) {
  return {
    id:          row.id,
    pastaId:     row.pasta_id || null,
    titulo:      row.titulo,
    tipo:        row.tipo || 'Outro',
    prioridade:  row.prioridade === 'alta'    ? 'Alta'
               : row.prioridade === 'urgente' ? 'Urgente'
               : row.prioridade === 'baixa'   ? 'Baixa'
               : 'Normal',
    descricao:   row.descricao || '',
    responsavel: row.responsavel || '',
    dataLimite:  row.prazo || null,
    status:      row.status === 'concluida'    ? 'Concluída'
               : row.status === 'em_andamento' ? 'Em andamento'
               : 'Pendente',
  };
}

function dbParaHonorario(row) {
  return {
    id:            row.id,
    pastaId:       row.pasta_id || null,
    descricao:     row.descricao,
    valor:         Number(row.valor) || 0,
    vencimento:    row.vencimento || null,
    status:        row.status || 'pendente',
    dataPagamento: row.data_pagamento || null,
    observacao:    row.observacao || '',
  };
}

// ──────────────────────────────────────────────────────────────────────
// CARREGAR DADOS
// ──────────────────────────────────────────────────────────────────────
async function carregarDados() {
  const eid = state.empresaId;
  const [pr, pz, tf, tp, cl, ar, it, cfg, ev, us, hon] = await Promise.all([
    db.from('pastas').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
    db.from('prazos_lhub').select('*').eq('empresa_id', eid).order('prazo'),
    db.from('tarefas_lhub').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
    db.from('tipos_pasta').select('*').eq('empresa_id', eid).order('codigo'),
    db.from('clientes_lhub').select('*').eq('empresa_id', eid).order('nome'),
    db.from('areas_juridicas').select('*').eq('empresa_id', eid).order('ordem'),
    db.from('intimacoes_pje').select('*').eq('empresa_id', eid).order('data_disponibilizacao', { ascending: false }).limit(200),
    db.from('pje_config').select('*').eq('empresa_id', eid).maybeSingle(),
    db.from('agenda_eventos').select('*').eq('empresa_id', eid).order('data'),
    db.from('usuarios_empresa').select('id,nome,perfil,area_id').eq('empresa_id', eid).order('nome'),
    db.from('honorarios').select('*').eq('empresa_id', eid).order('vencimento'),
  ]);
  state.pastas     = (pr.data || []).map(dbParaPasta);
  state.prazos     = (pz.data || []).map(dbParaPrazo);
  state.prazos.forEach(p => {
    const pa = state.pastas.find(x => x.id === p.pastaId);
    if (pa) { p.pastaNr = pa.numero; p.processo = pa.processo; p.comarca = pa.comarca; }
  });
  state.tarefas    = (tf.data || []).map(dbParaTarefa);
  state.tiposPasta = (tp.data || []).map(dbParaTipoPasta);
  state.clientes   = (cl.data || []).map(dbParaCliente);
  state.areas      = (ar.data || []).map(dbParaArea);
  state.intimacoes = (it.data || []).map(dbParaIntimacao);
  state.pjeConfig  = cfg.data || null;
  state.usuarios   = (us.data || []);
  state.honorarios = (hon.data || []).map(dbParaHonorario);
  // Carrega eventos da agenda no array local
  agendaEventos.length = 0;
  (ev.data || []).forEach(e => agendaEventos.push({
    id: e.id, data: e.data, titulo: e.titulo,
    tipo: e.tipo, hora: e.hora || '', responsavel: e.responsavel || '', local: e.local || '',
  }));

  renderDashboard();
  renderPastaList();
  renderAtividades();
  renderPrazosAba();
  renderTarefasAba();
  renderIntimacoesAba();
  renderCalendario();
  renderFinanceiro();
  popularSelectsPastas();
}
