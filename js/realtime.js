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
      _rtRender('prazos', () => { renderPrazosAba(); renderDashboard(); renderNavBadges(); });
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
