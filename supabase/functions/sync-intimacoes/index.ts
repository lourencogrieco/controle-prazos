import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

// Timeout em ms para cada chamada à API do PJe
const PJE_TIMEOUT_MS = 10_000;

async function fetchPje(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PJE_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "Referer": "https://comunica.pje.jus.br/",
        "User-Agent": "Mozilla/5.0",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    const db = createClient(SUPA_URL, SUPA_KEY);
    const hoje = new Date().toISOString().slice(0, 10);
    let dataInicio = hoje, dataFim = hoje;
    try {
      const body = await req.json();
      if (body.dataInicio) dataInicio = body.dataInicio;
      if (body.dataFim)    dataFim    = body.dataFim;
    } catch { /* sem body, usa hoje */ }

    const { data: configs, error: cfgErr } = await db
      .from("pje_config")
      .select("*")
      .eq("ativo", true);

    if (cfgErr) {
      console.error("[sync-intimacoes] Erro ao buscar pje_config:", cfgErr.message);
      return new Response(
        JSON.stringify({ ok: false, msg: "erro ao buscar configurações", detail: cfgErr.message }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    if (!configs?.length) {
      return new Response(
        JSON.stringify({ ok: true, msg: "nenhuma empresa com PJe configurado", total_inseridas: 0 }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    let total_inseridas = 0;
    let total_atualizadas = 0;
    let total_ignoradas_arquivadas = 0;
    const resultados: Record<string, unknown>[] = [];

    for (const cfg of configs) {
      const nomes: string[] = cfg.nomes ?? [];
      const empresaResult: { empresa_id: string; nomes: Record<string, unknown> } = {
        empresa_id: cfg.empresa_id,
        nomes: {},
      };
      let empresaInseridas = 0;
      let empresaAtualizadas = 0;
      let empresaIgnoradasArquivadas = 0;
      let empresaComErro = false;
      const empresaErros: string[] = [];

      for (const nome of nomes) {
        let pagina = 1;
        let totalApi = Infinity;
        let nomeInseridas = 0;
        let nomeAtualizadas = 0;
        let nomeIgnoradasArquivadas = 0;
        const nomeErros: string[] = [];

        while ((pagina - 1) * 50 < totalApi) {
          const url =
            `https://comunicaapi.pje.jus.br/api/v1/comunicacao` +
            `?pagina=${pagina}&itensPorPagina=50` +
            `&texto=${encodeURIComponent(nome)}` +
            `&dataDisponibilizacaoInicio=${dataInicio}` +
            `&dataDisponibilizacaoFim=${dataFim}`;

          let res: Response;
          try {
            res = await fetchPje(url);
          } catch (fetchErr) {
            const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
            const detail = msg.includes("AbortError") || msg.includes("abort")
              ? `timeout (>${PJE_TIMEOUT_MS}ms) — página ${pagina}`
              : `network error — ${msg}`;
            console.error(`[sync-intimacoes] ${nome} p${pagina}: ${detail}`);
            nomeErros.push(detail);
            empresaErros.push(`${nome}: ${detail}`);
            empresaComErro = true;
            break;
          }

          if (!res.ok) {
            const detail = `HTTP ${res.status} — página ${pagina}`;
            console.error(`[sync-intimacoes] ${nome}: ${detail}`);
            nomeErros.push(detail);
            empresaErros.push(`${nome}: ${detail}`);
            empresaComErro = true;
            // 429 = rate limit — para o loop completamente para este nome
            if (res.status === 429) break;
            // Outros erros: tenta próxima página até 3 falhas seguidas
            if (nomeErros.length >= 3) break;
            pagina++;
            continue;
          }

          let json: { count?: number; items?: Record<string, unknown>[] };
          try {
            json = await res.json();
          } catch {
            const detail = `JSON inválido — página ${pagina}`;
            console.error(`[sync-intimacoes] ${nome}: ${detail}`);
            nomeErros.push(detail);
            empresaErros.push(`${nome}: ${detail}`);
            break;
          }

          totalApi = json.count ?? 0;
          const items = json.items ?? [];

          if (items.length) {
            const rows = items.map((i) => ({
              id:                       i.id,
              empresa_id:               cfg.empresa_id,
              data_disponibilizacao:    i.data_disponibilizacao,
              sigla_tribunal:           i.siglaTribunal,
              tipo_comunicacao:         i.tipoComunicacao,
              nome_orgao:               i.nomeOrgao,
              texto:                    i.texto,
              numero_processo:          i.numero_processo,
              numero_processo_mascara:  i.numeroprocessocommascara,
              link:                     i.link,
              tipo_documento:           i.tipoDocumento,
              nome_classe:              i.nomeClasse,
              status:                   i.status,
              meio_completo:            i.meiocompleto,
              hash:                     i.hash,
            }));

            const { data: importResult, error: importErr } = await db.rpc(
              "importar_intimacoes_pje",
              { p_rows: rows },
            );

            if (importErr) {
              const detail = `importacao falhou: ${importErr.message}`;
              console.error(`[sync-intimacoes] ${nome} p${pagina}: ${detail}`);
              nomeErros.push(detail);
              empresaErros.push(`${nome}: ${detail}`);
              empresaComErro = true;
            } else {
              const stats = Array.isArray(importResult) ? importResult[0] : importResult;
              nomeInseridas += Number(stats?.inseridas ?? 0);
              nomeAtualizadas += Number(stats?.atualizadas ?? 0);
              nomeIgnoradasArquivadas += Number(stats?.ignoradas_arquivadas ?? 0);
            }
          }

          pagina++;
          if (items.length < 50) break;
        }

        empresaInseridas += nomeInseridas;
        empresaAtualizadas += nomeAtualizadas;
        empresaIgnoradasArquivadas += nomeIgnoradasArquivadas;
        total_inseridas  += nomeInseridas;
        total_atualizadas += nomeAtualizadas;
        total_ignoradas_arquivadas += nomeIgnoradasArquivadas;
        empresaResult.nomes[nome] = {
          inseridas: nomeInseridas,
          atualizadas: nomeAtualizadas,
          ignoradas_arquivadas: nomeIgnoradasArquivadas,
          ...(nomeErros.length ? { erros: nomeErros } : {}),
        };
      }

      // Só atualiza ultima_sync se ao menos um nome sincronizou sem erros críticos
      if (!empresaComErro || empresaInseridas > 0) {
        await db
          .from("pje_config")
          .update({ ultima_sync: new Date().toISOString() })
          .eq("id", cfg.id);
      }

      await db.from("pje_sync_logs").insert({
        empresa_id: cfg.empresa_id,
        origem: "cron",
        data_inicio: dataInicio,
        data_fim: dataFim,
        nomes,
        inseridas: empresaInseridas,
        atualizadas: empresaAtualizadas,
        ignoradas_arquivadas: empresaIgnoradasArquivadas,
        erros: empresaErros,
        ok: empresaErros.length === 0,
      }).then(({ error }) => {
        if (error) console.warn(`[sync-intimacoes] falha ao registrar log ${cfg.empresa_id}: ${error.message}`);
      });

      resultados.push({
        ...empresaResult,
        total_inseridas: empresaInseridas,
        total_atualizadas: empresaAtualizadas,
        total_ignoradas_arquivadas: empresaIgnoradasArquivadas,
      });
    }

    console.log(
      `[sync-intimacoes] Concluído — inseridas: ${total_inseridas}, atualizadas: ${total_atualizadas}, ignoradas_arquivadas: ${total_ignoradas_arquivadas}`,
    );
    return new Response(
      JSON.stringify({
        ok: true,
        total_inseridas,
        total_atualizadas,
        total_ignoradas_arquivadas,
        resultados,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error("[sync-intimacoes] Erro inesperado:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
