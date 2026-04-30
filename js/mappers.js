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
    prazoDataBase: row.prazo_data_base || null,
    prazoDiasUteis: row.prazo_dias_uteis || null,
    prazoRegra: row.prazo_regra || '',
    prazoCalculado: !!row.prazo_calculado,
    prazoMetadados: row.prazo_metadados || {},
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
    pastaId:          row.pasta_id || null,
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
    arquivadaEm:      row.arquivada_em || null,
    meioCompleto:     row.meio_completo || '',
    grau:             row.grau || null,
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

function dbParaCobranca(row) {
  return {
    id:            row.id,
    clienteId:     row.cliente_id || null,
    clienteNome:   row.cliente_nome || '',
    descricao:     row.descricao || '',
    valor:         Number(row.valor) || 0,
    vencimento:    row.data_vencimento || null,
    categoria:     row.categoria || '',
    recorrencia:   row.recorrencia || 'nenhuma',
    observacoes:   row.observacoes || '',
    status:        row.status || 'pendente',
    dataPagamento: row.data_pagamento || null,
    valorPago:     Number(row.valor_pago) || 0,
    grupoId:       row.grupo_id || null,
    parcelaNum:    row.parcela_num || null,
    parcelaTotal:  row.parcela_total || null,
  };
}

function dbParaContaPagar(row) {
  return {
    id:            row.id,
    descricao:     row.descricao || '',
    tipo:          row.tipo || '',
    valor:         Number(row.valor) || 0,
    vencimento:    row.data_vencimento || null,
    recorrencia:   row.recorrencia || 'nenhuma',
    observacoes:   row.observacoes || '',
    status:        row.status || 'pendente',
    dataPagamento: row.data_pagamento || null,
    valorPago:     Number(row.valor_pago) || 0,
    grupoId:       row.grupo_id || null,
    parcelaNum:    row.parcela_num || null,
    parcelaTotal:  row.parcela_total || null,
  };
}

function dbParaDespesa(row) {
  return {
    id:          row.id,
    clienteId:   row.cliente_id || null,
    clienteNome: row.cliente_nome || '',
    descricao:   row.descricao || '',
    data:        row.data || null,
    valor:       Number(row.valor) || 0,
    categoria:   row.categoria || '',
    observacoes: row.observacoes || '',
    status:      row.status || 'pendente',
  };
}

function dbParaOportunidade(row) {
  return {
    id:           row.id,
    titulo:       row.titulo,
    lead:         row.lead || '',
    area:         row.area || '',
    tipo:         row.tipo || '',
    tese:         row.tese || '',
    valor:        Number(row.valor) || 0,
    status:       row.status || 'oportunidade',
    responsavel:  row.responsavel || '',
    observacoes:  row.observacoes || '',
    data:         row.data || null,
    motivoRecusa: row.motivo_recusa || '',
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

function dbParaModeloDocumento(row) {
  return {
    id: row.id,
    nome: row.nome || '',
    categoria: row.categoria || '',
    descricao: row.descricao || '',
    conteudo: row.conteudo || '',
    createdAt: row.created_at || null,
  };
}

// ──────────────────────────────────────────────────────────────────────
// CARREGAR DADOS
// ──────────────────────────────────────────────────────────────────────
async function carregarDados() {
  const eid = state.empresaId;

  if (eid) {
    await db.rpc('limpar_intimacoes_arquivadas', { p_dias: 14 })
      .then(({ error }) => {
        if (error) console.warn('Limpeza de intimações arquivadas indisponível:', error.message);
      });
  }

  // Chaves de cache por empresa
  const cacheKeyAreas  = `lhub_areas_${eid}`;
  const cacheKeyTipos  = `lhub_tipos_${eid}`;

  // Queries que sempre vão ao banco (dados dinâmicos)
  // Áreas e tipos vão ao banco só se cache expirou
  const cachedAreas = _cacheGet(cacheKeyAreas);
  const cachedTipos = _cacheGet(cacheKeyTipos);

  const queries = [
    db.from('pastas').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
    db.from('prazos_lhub').select('*').eq('empresa_id', eid).order('prazo'),
    db.from('tarefas_lhub').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
    cachedTipos ? Promise.resolve({ data: null }) : db.from('tipos_pasta').select('*').eq('empresa_id', eid).order('codigo'),
    db.from('clientes_lhub').select('*').eq('empresa_id', eid).order('nome'),
    cachedAreas ? Promise.resolve({ data: null }) : db.from('areas_juridicas').select('*').eq('empresa_id', eid).order('ordem'),
    db.from('intimacoes_pje').select('*').eq('empresa_id', eid).order('data_disponibilizacao', { ascending: false }).limit(200),
    db.from('pje_config').select('*').eq('empresa_id', eid).maybeSingle(),
    db.from('agenda_eventos').select('*').eq('empresa_id', eid).order('data'),
    db.from('usuarios_empresa').select('id,nome,perfil,area_id').eq('empresa_id', eid).order('nome'),
    db.from('honorarios').select('*').eq('empresa_id', eid).order('vencimento'),
    db.from('cobrancas').select('*').eq('empresa_id', eid).order('data_vencimento'),
    db.from('contas_pagar').select('*').eq('empresa_id', eid).order('data_vencimento'),
    db.from('despesas').select('*').eq('empresa_id', eid).order('data', { ascending: false }),
    db.from('oportunidades_crm').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
    db.from('modelos_documentos').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
    db.from('pje_sync_logs').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }).limit(20),
    db.from('andamentos_processo').select('numero_processo,pasta_id').eq('empresa_id', eid),
  ];

  const [pr, pz, tf, tp, cl, ar, it, cfg, ev, us, hon, cob, ctp, dep, opo, mod, pjeLogs, andProc] = await Promise.all(queries);

  state.pastas     = (pr.data || []).map(dbParaPasta);
  _reconstruirIndicePastas(andProc.data);

  // Mapa de pastas por ID para enriquecer prazos (O(1) em vez de find)
  const _pastasPorId = new Map(state.pastas.map(p => [p.id, p]));
  state.prazos     = (pz.data || []).map(dbParaPrazo);
  state.prazos.forEach(p => {
    const pa = _pastasPorId.get(p.pastaId);
    if (pa) { p.pastaNr = pa.numero; p.processo = pa.processo; p.comarca = pa.comarca; }
  });

  state.tarefas    = (tf.data || []).map(dbParaTarefa);

  // Tipos e áreas: usa cache se disponível, senão salva no cache
  if (cachedTipos) {
    state.tiposPasta = cachedTipos;
  } else if (tp.data) {
    state.tiposPasta = tp.data.map(dbParaTipoPasta);
    _cacheSet(cacheKeyTipos, state.tiposPasta);
  }

  state.clientes   = (cl.data || []).map(dbParaCliente);

  if (cachedAreas) {
    state.areas = cachedAreas;
  } else if (ar.data) {
    state.areas = ar.data.map(dbParaArea);
    _cacheSet(cacheKeyAreas, state.areas);
  }
  state.intimacoes = (it.data || []).map(dbParaIntimacao);
  state.pjeConfig  = cfg.data || null;
  state.pjeSyncLogs = pjeLogs.data || [];
  state.usuarios   = (us.data || []);
  state.honorarios  = (hon.data || []).map(dbParaHonorario);
  state.cobrancas   = (cob.data || []).map(dbParaCobranca);
  state.contasPagar = (ctp.data || []).map(dbParaContaPagar);
  state.despesas    = (dep.data || []).map(dbParaDespesa);
  state.oportunidades = (opo.data || []).map(dbParaOportunidade);
  state.modelosDocumentos = (mod.data || []).map(dbParaModeloDocumento);
  // Carrega eventos da agenda no array local
  agendaEventos.length = 0;
  (ev.data || []).forEach(e => agendaEventos.push({
    id:            e.id,
    data:          e.data,
    titulo:        e.titulo,
    tipo:          e.tipo,
    hora:          e.hora || '',
    responsavel:   e.responsavel || '',
    local:         e.local || '',
    participantes: e.participantes || '',
  }));

  renderDashboard();
  renderNavBadges();
  renderPastaList();
  renderAtividades();
  renderPrazosAba();
  renderTarefasAba();
  renderIntimacoesAba();
  renderCalendario();
  renderFinanceiro();
  popularSelectsPastas();
}
