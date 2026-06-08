/**
 * Supabase Edge Function — notificar-prazos
 *
 * Roda diariamente (via Vercel Cron) e envia um digest por email
 * para cada usuário com prazos vencendo nos próximos 5 dias ou já vencidos.
 *
 * Secrets necessários no Supabase (Dashboard → Settings → Edge Functions):
 *   SUPABASE_URL               — preenchido automaticamente
 *   SUPABASE_SERVICE_ROLE_KEY  — preenchido automaticamente
 *   RESEND_API_KEY             — criar em resend.com (plano gratuito)
 *   APP_URL                    — https://legal-hub-seven.vercel.app
 *   FROM_EMAIL                 — ex: prazos@seudominio.com.br
 *                                (deve ser um domínio verificado no Resend)
 */

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Env ──────────────────────────────────────────────────────────────────
const SUPA_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPA_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const APP_URL    = (Deno.env.get("APP_URL") ?? "https://legal-hub-seven.vercel.app").replace(/\/$/, "");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "prazos@legal-hub.app";

// ── Perfis que recebem TODOS os prazos da empresa ───────────────────────
const PERFIS_ADMIN = new Set(["admin", "adm", "socio_fundador", "socio", "controller"]);

// ── Helpers de data ──────────────────────────────────────────────────────
function hojeStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function diasAte(hoje: string, prazo: string): number {
  const a = new Date(hoje  + "T00:00:00").getTime();
  const b = new Date(prazo + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

// ── Email via Resend ─────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_KEY) { console.warn("[notificar-prazos] RESEND_API_KEY não configurado"); return; }
  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[notificar-prazos] Resend erro:", res.status, body);
  }
}

// ── Template HTML ────────────────────────────────────────────────────────
interface PrazoRow {
  id:          string;
  cliente:     string;
  tipo:        string;
  prazo:       string;
  responsavel: string;
  descricao:   string | null;
  status:      string;
}

function urgencyInfo(dias: number): { label: string; cor: string; bg: string } {
  if (dias < 0)  return { label: "Vencido",  cor: "#7f1d1d", bg: "#fef2f2" };
  if (dias === 0) return { label: "Hoje!",   cor: "#7c2d12", bg: "#fff7ed" };
  if (dias <= 2)  return { label: `${dias}d`, cor: "#92400e", bg: "#fffbeb" };
  return              { label: `${dias}d`,   cor: "#1e3a5f", bg: "#eff6ff" };
}

function buildEmailHtml(prazos: PrazoRow[], nomeUsuario: string, hoje: string): string {
  const rows = prazos
    .sort((a, b) => a.prazo.localeCompare(b.prazo))
    .map(p => {
      const dias = diasAte(hoje, p.prazo);
      const { label, cor, bg } = urgencyInfo(dias);
      return `
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:10px 12px;font-size:13px;color:#374151;font-weight:600">${p.cliente || "—"}</td>
          <td style="padding:10px 12px;font-size:13px;color:#6b7280">${p.tipo || "—"}</td>
          <td style="padding:10px 12px;font-size:13px;color:#374151">${formatDate(p.prazo)}</td>
          <td style="padding:10px 12px">
            <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:700;color:${cor};background:${bg}">
              ${label}
            </span>
          </td>
          <td style="padding:10px 12px;font-size:12px;color:#9ca3af">${p.responsavel || "—"}</td>
        </tr>`;
    })
    .join("");

  const vencidos  = prazos.filter(p => diasAte(hoje, p.prazo) < 0).length;
  const urgentes  = prazos.filter(p => { const d = diasAte(hoje, p.prazo); return d >= 0 && d <= 2; }).length;
  const atencao   = prazos.filter(p => { const d = diasAte(hoje, p.prazo); return d >= 3 && d <= 5; }).length;

  const resumoBadges = [
    vencidos  > 0 ? `<span style="display:inline-block;margin:0 4px;padding:4px 12px;border-radius:9999px;background:#fef2f2;color:#7f1d1d;font-weight:700;font-size:13px">${vencidos} vencido${vencidos > 1 ? "s" : ""}</span>` : "",
    urgentes  > 0 ? `<span style="display:inline-block;margin:0 4px;padding:4px 12px;border-radius:9999px;background:#fffbeb;color:#92400e;font-weight:700;font-size:13px">${urgentes} urgente${urgentes > 1 ? "s" : ""}</span>` : "",
    atencao   > 0 ? `<span style="display:inline-block;margin:0 4px;padding:4px 12px;border-radius:9999px;background:#eff6ff;color:#1e3a5f;font-weight:700;font-size:13px">${atencao} em atenção</span>` : "",
  ].join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">

        <!-- Header -->
        <tr>
          <td style="background:#08505D;padding:24px 32px">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px">Legal Hub</p>
            <p style="margin:4px 0 0;color:#b2d8dd;font-size:13px">Controle de Prazos</p>
          </td>
        </tr>

        <!-- Saudação -->
        <tr>
          <td style="padding:28px 32px 16px">
            <p style="margin:0;font-size:16px;color:#111827">
              Olá, <strong>${nomeUsuario}</strong>
            </p>
            <p style="margin:8px 0 0;font-size:14px;color:#6b7280">
              Resumo de prazos do dia <strong>${formatDate(hoje)}</strong>:
            </p>
            <p style="margin:16px 0 0">${resumoBadges}</p>
          </td>
        </tr>

        <!-- Tabela de prazos -->
        <tr>
          <td style="padding:0 32px 24px">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              <thead>
                <tr style="background:#f9fafb">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Cliente</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Tipo</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Data Fatal</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Status</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Responsável</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center">
            <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;background:#08505D;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
              Abrir Legal Hub →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
              Você recebe este email pois é usuário do Legal Hub.<br>
              Prazos com status Concluído, Cancelado ou Atrasado não são incluídos neste relatório.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Handler principal ────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const jobSecret = req.headers.get("X-Job-Secret") ?? "";
    if (!CRON_SECRET || jobSecret !== CRON_SECRET) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const db  = createClient(SUPA_URL, SUPA_KEY);
    const hoje = hojeStr();
    const ate  = addDays(hoje, 5);

    // Busca prazos vencendo nos próximos 5 dias + vencidos.
    // Apenas status pendente/em_andamento — prazos marcados como Concluído,
    // Cancelado ou Atrasado (concluido | cancelado | atrasado) são excluídos.
    const { data: prazos, error: prazosErr } = await db
      .from("prazos_lhub")
      .select("id,empresa_id,cliente,tipo,prazo,responsavel,descricao,status")
      .in("status", ["pendente", "em_andamento"])
      .lte("prazo", ate)
      .order("prazo");

    if (prazosErr) throw new Error("prazos_lhub: " + prazosErr.message);

    if (!prazos?.length) {
      return new Response(
        JSON.stringify({ ok: true, msg: "nenhum prazo urgente hoje", emailsEnviados: 0 }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // Agrupa por empresa_id
    const porEmpresa = new Map<string, PrazoRow[]>();
    for (const p of prazos) {
      if (!porEmpresa.has(p.empresa_id)) porEmpresa.set(p.empresa_id, []);
      porEmpresa.get(p.empresa_id)!.push(p as PrazoRow);
    }

    let emailsEnviados = 0;

    for (const [empresaId, prazosDaEmpresa] of porEmpresa) {
      // Busca usuários da empresa
      const { data: usuarios } = await db
        .from("usuarios_empresa")
        .select("id,nome,perfil,email,user_id")
        .eq("empresa_id", empresaId);

      if (!usuarios?.length) continue;

      for (const usuario of usuarios) {
        // Resolve email: Auth primeiro (email verificado), usuarios_empresa.email como fallback
        let email: string | null = null;
        if (usuario.user_id) {
          const { data: authUser } = await db.auth.admin.getUserById(usuario.user_id);
          email = authUser?.user?.email ?? null;
        }
        if (!email) email = usuario.email ?? null;
        if (!email) continue;

        // Admins veem todos; outros só veem os seus
        const isAdmin = PERFIS_ADMIN.has(usuario.perfil);
        const meusPrazos = isAdmin
          ? prazosDaEmpresa
          : prazosDaEmpresa.filter(p =>
              (p.responsavel ?? "").toLowerCase().includes((usuario.nome ?? "").toLowerCase()),
            );

        if (!meusPrazos.length) continue;

        // Subject com ícone de urgência
        const vencidos = meusPrazos.filter(p => diasAte(hoje, p.prazo) < 0).length;
        const urgentes = meusPrazos.filter(p => { const d = diasAte(hoje, p.prazo); return d >= 0 && d <= 2; }).length;

        let subject: string;
        if (vencidos > 0)       subject = `⚠️ ${vencidos} prazo(s) vencido(s) — Legal Hub`;
        else if (urgentes > 0)  subject = `🔴 ${urgentes} prazo(s) urgente(s) — Legal Hub`;
        else                    subject = `📅 ${meusPrazos.length} prazo(s) vencendo em breve — Legal Hub`;

        const html = buildEmailHtml(meusPrazos, usuario.nome ?? email, hoje);
        await sendEmail(email, subject, html);
        emailsEnviados++;

        console.log(`[notificar-prazos] Enviado para ${email} — ${meusPrazos.length} prazo(s)`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, emailsEnviados, prazosTotais: prazos.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[notificar-prazos] Erro:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
