// ──────────────────────────────────────────────────────────────────────
// REAL-TIME — Supabase Realtime subscriptions
// Mantém state sincronizado entre múltiplos usuários sem recarregar a página.
// Carregado após todos os outros módulos para que as funções de render
// já estejam definidas.
// ──────────────────────────────────────────────────────────────────────

let _realtimeChannel = null;

// Debounce simples: evita renders em cascata quando chegam vários eventos seguidos
const _rtDebounce = {};
function _rtRender(key, fn, delay = 120) {
  clearTimeout(_rtDebounce[key]);
  _rtDebounce[key] = setTimeout(fn, delay);
}

function _iniciarRealtime() {
  if (_realtimeChannel) _pararRealtime();
  const eid = state.empresaId;
  if (!eid) return;

  _realtimeChannel = db.channel(`lhub_rt_${eid}`)

    // ── Prazos ────────────────────────────────────────────────────────
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'prazos_lhub',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        _stateUpsert(state.prazos, _enrichPrazo(dbParaPrazo(novo)));
      } else if (eventType === 'DELETE') {
        _stateRemove(state.prazos, antigo.id);
      }
      _rtRender('prazos', () => {
        if (typeof atualizarViewsPrazoAposMudanca === 'function') atualizarViewsPrazoAposMudanca();
        else { renderPrazosAba(); renderDashboard(); renderNavBadges(); }
      });
    })

    // ── Tarefas ───────────────────────────────────────────────────────
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'tarefas_lhub',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        _stateUpsert(state.tarefas, dbParaTarefa(novo));
      } else if (eventType === 'DELETE') {
        _stateRemove(state.tarefas, antigo.id);
      }
      _rtRender('tarefas', () => { renderTarefasAba(); renderDashboard(); });
    })

    // ── Oportunidades (Pipeline CRM) ───────────────────────────────────
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'oportunidades_crm',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        _stateUpsert(state.oportunidades, dbParaOportunidade(novo));
      } else if (eventType === 'DELETE') {
        _stateRemove(state.oportunidades, antigo.id);
      }
      _rtRender('pipeline', renderPipeline);
    })

    // ── Pastas ────────────────────────────────────────────────────────
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'pastas',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        _stateUpsert(state.pastas, dbParaPasta(novo));
      } else if (eventType === 'DELETE') {
        _stateRemove(state.pastas, antigo.id);
      }
      _reconstruirIndicePastas();
      _rtRender('pastas', () => { renderPastaList(); renderDashboard(); popularSelectsPastas(); });
    })

    // ── Clientes ──────────────────────────────────────────────────────
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'clientes_lhub',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        _stateUpsert(state.clientes, dbParaCliente(novo));
        state.clientes.sort((a, b) => a.nome.localeCompare(b.nome));
      } else if (eventType === 'DELETE') {
        _stateRemove(state.clientes, antigo.id);
      }
      _rtRender('clientes', () => {
        if (typeof renderClientesLista === 'function') renderClientesLista();
        if (typeof popularDropdownClientes === 'function') popularDropdownClientes();
        if (typeof popularSelectsPastas === 'function') popularSelectsPastas();
      });
    })

    // ── Financeiro ────────────────────────────────────────────────────
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'cobrancas',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        _stateUpsert(state.cobrancas, dbParaCobranca(novo));
        if (novo?.cliente_nome) garantirClienteCadastro(novo.cliente_nome).catch(err => console.warn('[clientes] cobrança realtime:', err.message));
      } else if (eventType === 'DELETE') {
        _stateRemove(state.cobrancas, antigo.id);
      }
      _rtRender('financeiro', () => { renderFinanceiro(); renderDashboard(); });
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'contas_pagar',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        _stateUpsert(state.contasPagar, dbParaContaPagar(novo));
      } else if (eventType === 'DELETE') {
        _stateRemove(state.contasPagar, antigo.id);
      }
      _rtRender('financeiro', () => { renderFinanceiro(); renderDashboard(); });
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'despesas',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        _stateUpsert(state.despesas, dbParaDespesa(novo));
        if (novo?.cliente_nome) garantirClienteCadastro(novo.cliente_nome).catch(err => console.warn('[clientes] despesa realtime:', err.message));
      } else if (eventType === 'DELETE') {
        _stateRemove(state.despesas, antigo.id);
      }
      _rtRender('financeiro', () => { renderFinanceiro(); renderDashboard(); });
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'honorarios',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        _stateUpsert(state.honorarios, dbParaHonorario(novo));
      } else if (eventType === 'DELETE') {
        _stateRemove(state.honorarios, antigo.id);
      }
      _rtRender('financeiro', () => { renderFinanceiro(); renderDashboard(); });
    })

    // ── Intimações / PJe ──────────────────────────────────────────────
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'intimacoes_pje',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        _stateUpsert(state.intimacoes, dbParaIntimacao(novo));
      } else if (eventType === 'DELETE') {
        _stateRemove(state.intimacoes, antigo.id);
      }
      _rtRender('intimacoes', () => { renderIntimacoesAba(); renderNavBadges(); renderDashboard(); });
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'pje_sync_logs',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        _stateUpsert(state.pjeSyncLogs, novo);
        state.pjeSyncLogs = state.pjeSyncLogs
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 20);
      } else if (eventType === 'DELETE') {
        _stateRemove(state.pjeSyncLogs, antigo.id);
      }
      _rtRender('pjeLogs', () => { if (typeof renderIntimacoesAba === 'function') renderIntimacoesAba(); });
    })

    // ── Agenda e usuários ─────────────────────────────────────────────
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'agenda_eventos',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        _stateUpsert(agendaEventos, {
          id: novo.id,
          data: novo.data,
          titulo: novo.titulo,
          tipo: novo.tipo,
          hora: novo.hora || '',
          responsavel: novo.responsavel || '',
          local: novo.local || '',
          participantes: novo.participantes || '',
        });
      } else if (eventType === 'DELETE') {
        _stateRemove(agendaEventos, antigo.id);
      }
      _rtRender('agenda', () => { renderCalendario(); renderDashboard(); });
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'usuarios_empresa',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        _stateUpsert(state.usuarios, novo);
        state.usuarios.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
      } else if (eventType === 'DELETE') {
        _stateRemove(state.usuarios, antigo.id);
      }
      _rtRender('usuarios', () => {
        if (typeof renderConfiguracoes === 'function') renderConfiguracoes();
        if (typeof popularSelectsPastas === 'function') popularSelectsPastas();
      });
    })

    // ── Andamentos ───────────────────────────────────────────────────
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'andamentos_processo',
      filter: `empresa_id=eq.${eid}`,
    }, ({ eventType, new: novo, old: antigo }) => {
      const pastaId = (eventType === 'DELETE' ? antigo?.pasta_id : novo?.pasta_id) || null;
      if (pastaId && pastaId === state.currentPastaId && typeof carregarAndamentosCNJ === 'function') {
        _rtRender('andamentos', () => carregarAndamentosCNJ(pastaId));
      }
      if (novo?.numero_processo && novo?.pasta_id) {
        const pasta = state.pastas.find(p => p.id === novo.pasta_id);
        const chave = novo.numero_processo.replace(/\D/g, '');
        if (pasta && chave) _pastasPorProcesso.set(chave, pasta);
      }
    })

    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        console.log('[realtime] conectado — empresa', eid);
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[realtime] erro no canal — tentando reconectar em 10s');
        setTimeout(_iniciarRealtime, 10000);
      } else if (status === 'TIMED_OUT') {
        console.warn('[realtime] timeout — tentando reconectar em 5s');
        setTimeout(_iniciarRealtime, 5000);
      }
    });
}

function _pararRealtime() {
  if (_realtimeChannel) {
    db.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
    console.log('[realtime] desconectado');
  }
}

// Inicializa nav mobile do kanban após todos os módulos estarem carregados
setTimeout(initMobileKanbanNav, 300);
