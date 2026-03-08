import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthContext {
  userId: string;
  apiKeyId: string;
  apiKeyName: string;
  plan: string;
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
    .select("id, name, user_id, is_active, key_hash")
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

  // Get user profile for plan info
  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("user_id", apiKey.user_id)
    .single();

  return {
    ok: true,
    ctx: {
      userId: apiKey.user_id,
      apiKeyId: apiKey.id,
      apiKeyName: apiKey.name,
      plan: profile?.plan ?? "free",
    },
  };
}
