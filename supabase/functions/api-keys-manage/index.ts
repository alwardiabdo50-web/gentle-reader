import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserPlan, getMaxApiKeys } from "../_shared/plan-limits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function getAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function getUserClient(authHeader: string) {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
}

async function hashKey(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Authenticate via session token
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ success: false, error: "Unauthorized" }, 401);

  const userClient = getUserClient(authHeader);
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ success: false, error: "Unauthorized" }, 401);

  const admin = getAdmin();
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Path: /api-keys-manage or /api-keys-manage/:id
  const keyId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

  // POST - Create API key
  if (req.method === "POST") {
    const body = await req.json();
    const name = body.name?.trim();
    if (!name) return json({ success: false, error: "Name is required" }, 400);

    // Plan gate: check API key limit
    const userPlan = await getUserPlan(user.id);
    const maxKeys = getMaxApiKeys(userPlan);
    if (maxKeys !== -1) {
      const { count } = await admin
        .from("api_keys")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);
      if ((count ?? 0) >= maxKeys) {
        return json({ success: false, error: `Your ${userPlan} plan allows up to ${maxKeys} API keys. Please upgrade.` }, 403);
      }
    }

    const rawToken = `nc_live_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const prefix = rawToken.slice(0, 13);
    const keyHash = await hashKey(rawToken);

    const { data, error } = await admin.from("api_keys").insert({
      user_id: user.id,
      name,
      key_prefix: prefix,
      key_hash: keyHash,
    }).select("id, name, created_at").single();

    if (error) return json({ success: false, error: error.message }, 500);

    console.log(`API key created: ${data.id} for user ${user.id}`);
    return json({
      success: true,
      data: { id: data.id, name: data.name, token: rawToken, created_at: data.created_at },
    }, 201);
  }

  // GET - List API keys
  if (req.method === "GET") {
    const { data, error } = await admin
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, is_active, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, data });
  }

  // DELETE - Revoke API key
  if (req.method === "DELETE" && keyId) {
    const { data, error } = await admin
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", keyId)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (error || !data) return json({ success: false, error: "Key not found" }, 404);

    console.log(`API key revoked: ${data.id} by user ${user.id}`);
    return json({ success: true, data: { id: data.id, revoked: true } });
  }

  return json({ success: false, error: "Method not allowed" }, 405);
});
