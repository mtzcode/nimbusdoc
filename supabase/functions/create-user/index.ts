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

const CreateUserSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  full_name: z.string().min(1).max(120),
  role: z.enum(["admin", "user", "accountant"]).default("admin"),
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
    const requestId = crypto.randomUUID();
    const log = (event: string, data: Record<string, unknown> = {}) => {
      try {
        console.log(JSON.stringify({ request_id: requestId, event, ...data }));
      } catch (_) {}
    };
    log("request_received", { path: new URL(req.url).pathname, origin });

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

    const parsed = CreateUserSchema.safeParse(await req.json());
    if (!parsed.success) {
      log("payload_validation_failed", { issues: parsed.error.issues });
      return new Response(JSON.stringify({ error: "Invalid payload", issues: parsed.error.issues }), { status: 400, headers: corsHeaders });
    }
    const { email, password, full_name, role, redirectTo } = parsed.data;
    const redirectTarget = redirectTo ?? `${new URL(req.url).origin}/auth`;

    // Idempotência: verificar se já existe profile com este email
    const { data: existingProfile, error: findErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("email", email)
      .maybeSingle();
    if (findErr) {
      log("profiles_query_error", { error: findErr.message });
      return new Response(JSON.stringify({ error: findErr.message }), { status: 500, headers: corsHeaders });
    }

    if (existingProfile?.id) {
      // Já existe: atualizar nome e garantir papel sem duplicar
      const userId = existingProfile.id;
      log("user_exists", { user_id: userId, email });

      const { error: profileUpdateErr } = await supabaseAdmin
        .from("profiles")
        .update({ full_name })
        .eq("id", userId);
      if (profileUpdateErr) log("profile_update_warning", { error: profileUpdateErr.message });

      const { error: roleUpsertErr } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role }, { onConflict: "user_id, role" });
      if (roleUpsertErr) log("role_upsert_warning", { error: roleUpsertErr.message });

      const { error: sendError } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTarget },
      } as any);

      return new Response(
        JSON.stringify({ success: true, existing_user: true, user_id: userId, confirmation_sent: !sendError }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Não existe: criar usuário
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name },
      email_confirm: false,
    } as any);
    if (createError) {
      log("user_create_error", { error: createError.message });
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders });
    }

    const userId = created?.user?.id;
    if (!userId) {
      log("user_create_failed", {});
      return new Response(JSON.stringify({ error: "User creation failed" }), { status: 500, headers: corsHeaders });
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, email, full_name }, { onConflict: "id" });
    if (profileError) {
      log("profile_sync_warning", { error: profileError.message });
    }

    const { error: roleAssignError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role }, { onConflict: "user_id, role" });
    if (roleAssignError) {
      log("role_assign_warning", { error: roleAssignError.message });
    }

    const { error: sendError } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: redirectTarget },
    } as any);

    log("user_created", { user_id: userId, role });
    return new Response(
      JSON.stringify({ success: true, user: created?.user ?? null, confirmation_sent: !sendError }),
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const origin = req.headers.get("Origin") ?? "";
    const corsHeaders = makeCorsHeaders(origin);
    console.log(JSON.stringify({ event: "exception", error: message }));
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});