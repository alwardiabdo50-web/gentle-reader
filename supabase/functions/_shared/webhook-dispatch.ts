import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

/** Generate HMAC-SHA256 signature for webhook payload */
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", encoder.encode(payload), key);
  const hashArray = Array.from(new Uint8Array(signature));
  return "sha256=" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface WebhookEvent {
  userId: string;
  eventType: string; // e.g. "scrape.completed", "crawl.completed", "extract.failed"
  jobId: string;
  jobType: string; // "scrape" | "crawl" | "extract"
  payload: Record<string, unknown>;
}

/**
 * Dispatch webhook notifications for a completed/failed job.
 * Finds all active webhooks for the user that subscribe to the event type,
 * creates delivery records, and attempts delivery.
 */
export async function dispatchWebhooks(event: WebhookEvent): Promise<void> {
  const admin = getAdmin();

  // Find matching active webhooks
  const { data: webhooks } = await admin
    .from("webhooks")
    .select("id, url, secret, events")
    .eq("user_id", event.userId)
    .eq("is_active", true);

  if (!webhooks || webhooks.length === 0) return;

  const matching = webhooks.filter((wh: any) => {
    const events = wh.events as string[];
    return events.includes(event.eventType) || events.includes("*");
  });

  if (matching.length === 0) return;

  console.log(`Dispatching ${matching.length} webhooks for ${event.eventType} job=${event.jobId}`);

  // Send to each webhook
  await Promise.allSettled(
    matching.map((wh: any) => deliverWebhook(admin, wh, event))
  );
}

async function deliverWebhook(
  admin: ReturnType<typeof getAdmin>,
  webhook: { id: string; url: string; secret: string },
  event: WebhookEvent
): Promise<void> {
  const body = JSON.stringify({
    event: event.eventType,
    job_id: event.jobId,
    job_type: event.jobType,
    timestamp: new Date().toISOString(),
    data: event.payload,
  });

  // Create delivery record
  const { data: delivery } = await admin
    .from("webhook_deliveries")
    .insert({
      webhook_id: webhook.id,
      event_type: event.eventType,
      job_id: event.jobId,
      job_type: event.jobType,
      payload_json: JSON.parse(body),
      status: "pending",
      attempts: 0,
    })
    .select("id")
    .single();

  if (!delivery) {
    console.error(`Failed to create delivery record for webhook ${webhook.id}`);
    return;
  }

  // Attempt delivery
  try {
    const signature = await signPayload(body, webhook.secret);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": event.eventType,
        "X-Webhook-ID": delivery.id,
        "User-Agent": "NebulaCrawl-Webhook/1.0",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseBody = await res.text().catch(() => "");

    if (res.ok) {
      await admin.from("webhook_deliveries").update({
        status: "delivered",
        http_status_code: res.status,
        response_body: responseBody.slice(0, 1000),
        attempts: 1,
        delivered_at: new Date().toISOString(),
      }).eq("id", delivery.id);

      console.log(`Webhook delivered: ${webhook.id} -> ${res.status}`);
    } else {
      await admin.from("webhook_deliveries").update({
        status: "failed",
        http_status_code: res.status,
        response_body: responseBody.slice(0, 1000),
        attempts: 1,
        failed_at: new Date().toISOString(),
        error_message: `HTTP ${res.status}`,
      }).eq("id", delivery.id);

      console.warn(`Webhook failed: ${webhook.id} -> ${res.status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from("webhook_deliveries").update({
      status: "failed",
      attempts: 1,
      failed_at: new Date().toISOString(),
      error_message: msg,
    }).eq("id", delivery.id);

    console.error(`Webhook delivery error: ${webhook.id} -> ${msg}`);
  }
}
