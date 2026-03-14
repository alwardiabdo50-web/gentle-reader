import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserPlan, canAccessFeature } from "../_shared/plan-limits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function getAuthClient(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

function getAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

/** Generate a random webhook signing secret */
function generateSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return "whsec_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const VALID_EVENTS = [
  "scrape.completed", "scrape.failed",
  "crawl.completed", "crawl.failed",
  "extract.completed", "extract.failed",
  "job.completed", "job.failed",
  "*",
];

/** Extract webhook ID from path: /webhooks-manage/<id> */
function extractWebhookId(url: string): string | null {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("webhooks-manage");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return null;
}

async function getUser(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  
  const supabase = getAuthClient(req);
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return { userId: data.claims.sub as string };
}

// ─── LIST ────────────────────────────────────────────────────
async function handleList(userId: string) {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("webhooks")
    .select("id, url, events, is_active, description, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, 500);
  return json({ success: true, data: data ?? [] });
}

// ─── CREATE ──────────────────────────────────────────────────
async function handleCreate(userId: string, req: Request) {
  let body: { url?: string; events?: string[]; description?: string };
  try { body = await req.json(); } catch {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON" } }, 400);
  }

  // Plan gate
  const userPlan = await getUserPlan(userId);
  if (!canAccessFeature(userPlan, "webhooks")) {
    return json({ success: false, error: { code: "PLAN_REQUIRED", message: "Webhooks require a Hobby plan or above. Please upgrade." } }, 403);
  }

  if (!body.url || typeof body.url !== "string") {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "'url' is required" } }, 400);
  }

  try { new URL(body.url); } catch {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid webhook URL" } }, 400);
  }

  const events = body.events ?? ["job.completed", "job.failed"];
  for (const e of events) {
    if (!VALID_EVENTS.includes(e)) {
      return json({ success: false, error: { code: "BAD_REQUEST", message: `Invalid event type: ${e}` } }, 400);
    }
  }

  const admin = getAdmin();

  // Limit webhooks per user
  const { count } = await admin
    .from("webhooks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) >= 10) {
    return json({ success: false, error: { code: "LIMIT_REACHED", message: "Maximum 10 webhooks per account" } }, 400);
  }

  const secret = generateSecret();

  const { data, error } = await admin
    .from("webhooks")
    .insert({
      user_id: userId,
      url: body.url,
      events,
      secret,
      description: body.description ?? null,
    })
    .select("id, url, events, secret, is_active, description, created_at")
    .single();

  if (error) return json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, 500);

  return json({ success: true, data }, 201);
}

// ─── UPDATE ──────────────────────────────────────────────────
async function handleUpdate(userId: string, webhookId: string, req: Request) {
  let body: { url?: string; events?: string[]; is_active?: boolean; description?: string };
  try { body = await req.json(); } catch {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON" } }, 400);
  }

  if (body.url) {
    try { new URL(body.url); } catch {
      return json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid webhook URL" } }, 400);
    }
  }

  if (body.events) {
    for (const e of body.events) {
      if (!VALID_EVENTS.includes(e)) {
        return json({ success: false, error: { code: "BAD_REQUEST", message: `Invalid event type: ${e}` } }, 400);
      }
    }
  }

  const admin = getAdmin();
  const updates: Record<string, unknown> = {};
  if (body.url !== undefined) updates.url = body.url;
  if (body.events !== undefined) updates.events = body.events;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.description !== undefined) updates.description = body.description;

  const { data, error } = await admin
    .from("webhooks")
    .update(updates)
    .eq("id", webhookId)
    .eq("user_id", userId)
    .select("id, url, events, is_active, description, updated_at")
    .single();

  if (error || !data) return json({ success: false, error: { code: "NOT_FOUND", message: "Webhook not found" } }, 404);
  return json({ success: true, data });
}

// ─── DELETE ──────────────────────────────────────────────────
async function handleDelete(userId: string, webhookId: string) {
  const admin = getAdmin();
  const { error } = await admin
    .from("webhooks")
    .delete()
    .eq("id", webhookId)
    .eq("user_id", userId);

  if (error) return json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, 500);
  return json({ success: true });
}

// ─── DELIVERIES ──────────────────────────────────────────────
async function handleDeliveries(userId: string, webhookId: string | null) {
  const admin = getAdmin();

  // Get user's webhook IDs
  const { data: userWebhooks } = await admin
    .from("webhooks")
    .select("id")
    .eq("user_id", userId);

  if (!userWebhooks || userWebhooks.length === 0) {
    return json({ success: true, data: [] });
  }

  const webhookIds = webhookId
    ? [webhookId].filter((id) => userWebhooks.some((w: any) => w.id === id))
    : userWebhooks.map((w: any) => w.id);

  if (webhookIds.length === 0) {
    return json({ success: false, error: { code: "NOT_FOUND", message: "Webhook not found" } }, 404);
  }

  const { data, error } = await admin
    .from("webhook_deliveries")
    .select("id, webhook_id, event_type, job_id, job_type, status, http_status_code, attempts, error_message, delivered_at, failed_at, created_at")
    .in("webhook_id", webhookIds)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return json({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }, 500);
  return json({ success: true, data: data ?? [] });
}

// ─── Router ──────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const user = await getUser(req);
  if (!user) {
    return json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  }

  const webhookId = extractWebhookId(req.url);
  const url = new URL(req.url);
  const isDeliveries = url.searchParams.get("deliveries") === "true";

  if (isDeliveries && req.method === "GET") {
    return handleDeliveries(user.userId, webhookId);
  }

  if (req.method === "GET" && !webhookId) {
    return handleList(user.userId);
  }

  if (req.method === "POST" && !webhookId) {
    return handleCreate(user.userId, req);
  }

  if (req.method === "PATCH" && webhookId) {
    return handleUpdate(user.userId, webhookId, req);
  }

  if (req.method === "DELETE" && webhookId) {
    return handleDelete(user.userId, webhookId);
  }

  return json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Invalid method or path" } }, 405);
});
