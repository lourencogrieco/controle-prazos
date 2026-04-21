import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
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

  if (cfgErr || !configs?.length) {
    return new Response(JSON.stringify({ ok: false, msg: "sem config" }), { status: 200 });
  }

  let total_inseridas = 0;

  for (const cfg of configs) {
    const nomes: string[] = cfg.nomes ?? [];

    for (const nome of nomes) {
      let pagina = 1;
      let totalApi = Infinity;

      while ((pagina - 1) * 50 < totalApi) {
        const url =
          `https://comunica.pje.jus.br/api/v1/comunicacao` +
          `?pagina=${pagina}&itensPorPagina=50` +
          `&texto=${encodeURIComponent(nome)}` +
          `&dataDisponibilizacaoInicio=${dataInicio}` +
          `&dataDisponibilizacaoFim=${dataFim}`;

        const res = await fetch(url, {
          headers: {
            "Accept": "application/json",
            "Referer": "https://comunica.pje.jus.br/",
            "User-Agent": "Mozilla/5.0",
          },
        });

        if (!res.ok) break;

        const json = await res.json();
        totalApi = json.count ?? 0;
        const items = json.items ?? [];

        const rows = items.map((i: Record<string, unknown>) => ({
          id: i.id,
          empresa_id: cfg.empresa_id,
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
          const { error } = await db
            .from("intimacoes_pje")
            .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
          if (!error) total_inseridas += rows.length;
        }

        pagina++;
        if (items.length < 50) break;
      }
    }

    await db
      .from("pje_config")
      .update({ ultima_sync: new Date().toISOString() })
      .eq("id", cfg.id);
  }

  return new Response(
    JSON.stringify({ ok: true, total_inseridas }),
    { headers: { "Content-Type": "application/json" } },
  );
});
