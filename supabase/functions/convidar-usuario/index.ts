import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = (Deno.env.get("APP_URL") ?? "https://legal-hub-seven.vercel.app").replace(/\/$/, "");
const PERFIS_GESTORES = ["admin", "adm", "socio_fundador", "socio", "controller", "coordenador"];
const PERFIS_VALIDOS = ["estagiario", "advogado", "coordenador", "socio", "socio_fundador", "financeiro", "controller", "admin", "adm"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resposta(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return resposta(405, { error: "Método não permitido." });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return resposta(401, { error: "Faça login para enviar convites." });

  const admin = createClient(SUPA_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const usuario = authData.user;
  if (authError || !usuario) return resposta(401, { error: "Sessão inválida ou expirada." });

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return resposta(400, { error: "Dados do convite inválidos." }); }

  const empresaId = String(payload.empresa_id ?? "").trim();
  const nome = String(payload.nome ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const perfil = String(payload.perfil ?? "").trim();
  const areaId = payload.area_id ? String(payload.area_id).trim() : null;

  if (!empresaId || !nome || !/^\S+@\S+\.\S+$/.test(email) || !PERFIS_VALIDOS.includes(perfil)) {
    return resposta(400, { error: "Preencha nome, e-mail e perfil válidos." });
  }

  const { data: gestor, error: gestorError } = await admin
    .from("usuarios_empresa")
    .select("perfil")
    .eq("empresa_id", empresaId)
    .eq("user_id", usuario.id)
    .maybeSingle();

  if (gestorError || !gestor || !PERFIS_GESTORES.includes(gestor.perfil)) {
    return resposta(403, { error: "Você não tem permissão para convidar usuários desta empresa." });
  }

  if (areaId) {
    const { data: area } = await admin
      .from("areas_juridicas")
      .select("id")
      .eq("id", areaId)
      .eq("empresa_id", empresaId)
      .maybeSingle();
    if (!area) return resposta(400, { error: "A área selecionada não pertence a esta empresa." });
  }

  const { data: conviteAtual } = await admin
    .from("convites_empresa")
    .select("id")
    .eq("empresa_id", empresaId)
    .ilike("email", email)
    .is("usado_em", null)
    .maybeSingle();

  const convite = {
    empresa_id: empresaId,
    nome,
    email,
    perfil,
    area_id: areaId,
    criado_por: usuario.id,
    created_at: new Date().toISOString(),
  };

  const salvar = conviteAtual
    ? admin.from("convites_empresa").update(convite).eq("id", conviteAtual.id)
    : admin.from("convites_empresa").insert(convite);
  const { error: conviteError } = await salvar;
  if (conviteError) return resposta(400, { error: conviteError.message });

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome },
    redirectTo: APP_URL,
  });

  if (inviteError) {
    console.error("[convidar-usuario] Auth invite:", inviteError.message);
    return resposta(inviteError.status || 502, {
      error: `O convite foi registrado, mas o e-mail não pôde ser enviado: ${inviteError.message}`,
    });
  }

  return resposta(200, { ok: true, message: `Convite enviado para ${email}.` });
});
