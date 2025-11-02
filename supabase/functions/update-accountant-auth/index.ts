import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsAllowMethods = "POST, OPTIONS";
const allowedOriginsRaw = Deno.env.get("ALLOWED_ORIGINS") ?? "*"; // e.g.: https://app.example.com,https://staging.example.com
const allowedOrigins = allowedOriginsRaw.split(",").map((s) => s.trim()).filter(Boolean);

function isOriginAllowed(origin: string): boolean {
  if (!origin) return allowedOrigins.includes("*");
  return allowedOrigins.includes("*") || allowedOrigins.includes(origin);
}

function makeCorsHeaders(origin: string): Record<string, string> {
  const allowOrigin = isOriginAllowed(origin)
    ? origin || "*"
    : allowedOrigins.includes("*")
      ? "*"
      : allowedOrigins[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": corsAllowMethods,
    "Content-Type": "application/json",
  };
}

const UpdateAuthSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
  redirectTo: z.string().url().optional(),
});

serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const corsHeaders = makeCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    if (!isOriginAllowed(origin)) {
      return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403, headers: corsHeaders });
    }
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const log = (event: string, data: Record<string, unknown> = {}) => {
    try { console.log(JSON.stringify({ request_id: requestId, event, ...data })); } catch (_) {}
  };
  log("request_received", { path: new URL(req.url).pathname, origin });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SERVICE_ROLE_KEY secret" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
    if (!token) {
      log("auth_missing_token", {});
      return new Response(JSON.stringify({ error: "No auth token provided" }), { status: 401, headers: corsHeaders });
    }

    const { data: caller, error: getUserError } = await supabaseAdmin.auth.getUser(token);
    if (getUserError || !caller?.user?.id) {
      log("auth_invalid_token", { error: getUserError?.message });
      return new Response(JSON.stringify({ error: getUserError?.message || "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const callerId = caller.user.id;
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("is_admin", { _uid: callerId });
    if (roleError) {
      log("role_check_error", { error: roleError.message });
      return new Response(JSON.stringify({ error: roleError.message }), { status: 500, headers: corsHeaders });
    }
    if (!isAdmin) {
      log("role_forbidden", { caller_id: callerId });
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const parsed = UpdateAuthSchema.safeParse(await req.json());
    if (!parsed.success) {
      log("payload_validation_failed", { issues: parsed.error.issues });
      return new Response(JSON.stringify({ error: "Invalid payload", issues: parsed.error.issues }), { status: 400, headers: corsHeaders });
    }
    const { user_id, email, password, redirectTo } = parsed.data;
    const redirectTarget = redirectTo ?? `${new URL(req.url).origin}/auth`;

    // Checar profile atual para idempotência de e-mail
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", user_id)
      .maybeSingle();
    if (profErr) {
      log("profiles_query_error", { error: profErr.message });
      return new Response(JSON.stringify({ error: profErr.message }), { status: 500, headers: corsHeaders });
    }
    if (!profile?.id) {
      log("profile_not_found", { user_id });
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });
    }

    let updatedEmail = false;
    let updatedPassword = false;
    let confirmationSent = false;

    if (email && email !== profile.email) {
      const { error: updAuthEmailErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, { email } as any);
      if (updAuthEmailErr) {
        log("auth_email_update_error", { error: updAuthEmailErr.message });
        return new Response(JSON.stringify({ error: updAuthEmailErr.message }), { status: 400, headers: corsHeaders });
      }

      const { error: updProfileEmailErr } = await supabaseAdmin
        .from("profiles")
        .update({ email })
        .eq("id", user_id);
      if (updProfileEmailErr) {
        log("profile_email_update_warning", { error: updProfileEmailErr.message });
      }

      const { error: sendError } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTarget },
      } as any);
      confirmationSent = !sendError;
      updatedEmail = true;
      log("email_updated", { user_id });
    }

    if (password && password.trim().length > 0) {
      const { error: updPassErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password } as any);
      if (updPassErr) {
        log("auth_password_update_error", { error: updPassErr.message });
        return new Response(JSON.stringify({ error: updPassErr.message }), { status: 400, headers: corsHeaders });
      }
      updatedPassword = true;
      log("password_updated", { user_id });
    }

    if (!updatedEmail && !updatedPassword) {
      log("no_changes", { user_id });
      return new Response(JSON.stringify({ success: true, no_op: true }), { status: 200, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ success: true, updated_email: updatedEmail, updated_password: updatedPassword, confirmation_sent: confirmationSent }),
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log(JSON.stringify({ event: "exception", error: message }));
    const origin = req.headers.get("Origin") ?? "";
    const corsHeaders = makeCorsHeaders(origin);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});