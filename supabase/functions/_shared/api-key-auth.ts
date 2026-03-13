import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthContext {
  userId: string;
  apiKeyId: string;
  apiKeyName: string;
  plan: string;
  orgId: string | null;
}

/**
 * Extract API key from request headers.
 * Supports: Authorization: Bearer <key> and X-API-Key: <key>
 */
export function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.startsWith("nc_live_")) return token;
  }
  const xApiKey = req.headers.get("x-api-key");
  if (xApiKey?.trim()) return xApiKey.trim();
  return null;
}

/**
 * Hash an API key using SHA-256 (same as client-side).
 */
async function hashKey(raw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate an API key and return the authenticated context.
 * Updates last_used_at on success.
 */
export async function validateApiKey(rawKey: string): Promise<{ ok: true; ctx: AuthContext } | { ok: false; error: string; status: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const prefix = rawKey.slice(0, 13);
  const keyHash = await hashKey(rawKey);

  // Look up the key by prefix and hash
  const { data: apiKey, error } = await admin
    .from("api_keys")
    .select("id, name, user_id, is_active, key_hash, org_id")
    .eq("key_prefix", prefix)
    .single();

  if (error || !apiKey) {
    console.warn(`Auth failed: key not found for prefix ${prefix}`);
    return { ok: false, error: "Invalid API key", status: 401 };
  }

  // Constant-time-ish comparison via hash match
  if (apiKey.key_hash !== keyHash) {
    console.warn(`Auth failed: hash mismatch for key ${apiKey.id}`);
    return { ok: false, error: "Invalid API key", status: 401 };
  }

  if (!apiKey.is_active) {
    console.warn(`Auth failed: revoked key ${apiKey.id}`);
    return { ok: false, error: "API key has been revoked", status: 403 };
  }

  // Update last_used_at (fire and forget)
  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {});

  let plan = "free";

  // If key belongs to an org, use org plan
  if (apiKey.org_id) {
    const { data: org } = await admin
      .from("organizations")
      .select("plan")
      .eq("id", apiKey.org_id)
      .single();
    plan = org?.plan ?? "free";
  } else {
    // Get user profile for plan info
    const { data: profile } = await admin
      .from("profiles")
      .select("plan")
      .eq("user_id", apiKey.user_id)
      .single();
    plan = profile?.plan ?? "free";
  }

  return {
    ok: true,
    ctx: {
      userId: apiKey.user_id,
      apiKeyId: apiKey.id,
      apiKeyName: apiKey.name,
      plan,
      orgId: apiKey.org_id ?? null,
    },
  };
}

/**
 * Check if the request is authenticated with the service role key (used by scheduled jobs).
 * Returns the user_id from the request body's _schedule_user_id if present.
 */
export function authenticateServiceRole(req: Request, body: Record<string, unknown>): AuthContext | null {
  const authHeader = req.headers.get("authorization");
  const apikeyHeader = req.headers.get("apikey");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceKey) return null;

  const isServiceRole = (authHeader === `Bearer ${serviceKey}`) || (apikeyHeader === serviceKey);
  if (!isServiceRole) return null;
  if (!body._scheduled) return null;

  const userId = body._schedule_user_id as string;
  if (!userId) return null;

  return {
    userId,
    apiKeyId: "scheduled",
    apiKeyName: "Scheduled Job",
    plan: "scheduled",
    orgId: null,
  };
}
