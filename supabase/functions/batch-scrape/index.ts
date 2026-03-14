import { extractApiKey, validateApiKey } from "../_shared/api-key-auth.ts";
import { checkQuota, getUserCredits, recordLedgerEntry, checkRateLimit } from "../_shared/billing.ts";
import { performScrape } from "../_shared/scrape-pipeline.ts";
import { dispatchWebhooks } from "../_shared/webhook-dispatch.ts";
import { buildCacheKey, getCachedResult, setCachedResult } from "../_shared/scrape-cache.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_URLS = 100;
const CONCURRENCY = 5;

function normalizeUrl(raw: string): string | null {
  let u = raw.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (!parsed.hostname || parsed.hostname.length < 3) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function classifyError(error: unknown): { code: string; message: string } {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("timeout") || msg.includes("Timeout")) {
    return { code: "NAVIGATION_TIMEOUT", message: "Page navigation timed out" };
  }
  if (msg.includes("ERR_BLOCKED") || msg.includes("403") || msg.includes("blocked")) {
    return { code: "BLOCKED_BY_TARGET", message: "Request was blocked by the target site" };
  }
  return { code: "INTERNAL_ERROR", message: msg };
}

function getAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function pooled<T>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<void>): Promise<void> {
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

interface BatchRequest {
  urls: string[];
  formats?: string[];
  render_javascript?: boolean;
  only_main_content?: boolean;
  timeout_ms?: number;
  headers?: Record<string, string>;
  remove_selectors?: string[];
  cache_ttl?: number;
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

  if (req.method !== "POST") {
    return json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } }, 405);
  }

  // --- Auth ---
  const rawKey = extractApiKey(req);
  if (!rawKey) {
    return json({ success: false, error: { code: "UNAUTHORIZED", message: "Missing API key." } }, 401);
  }
  const authResult = await validateApiKey(rawKey);
  if (!authResult.ok) {
    return json({ success: false, error: { code: "UNAUTHORIZED", message: authResult.error } }, authResult.status);
  }
  const ctx = authResult.ctx;

  // --- Parse body ---
  let body: BatchRequest;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, 400);
  }

  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "Field 'urls' must be a non-empty array" } }, 400);
  }
  if (body.urls.length > MAX_URLS) {
    return json({ success: false, error: { code: "BAD_REQUEST", message: `Maximum ${MAX_URLS} URLs per batch` } }, 400);
  }

  const normalized: (string | null)[] = body.urls.map(normalizeUrl);
  const invalidIndices = normalized.map((u, i) => u === null ? i : -1).filter(i => i >= 0);
  if (invalidIndices.length > 0) {
    return json({ success: false, error: { code: "INVALID_URL", message: `Invalid URLs at indices: ${invalidIndices.join(", ")}` } }, 422);
  }
  const urls = normalized as string[];

  const cacheTtl = typeof body.cache_ttl === "number" ? Math.max(0, Math.floor(body.cache_ttl)) : 3600;

  // --- Rate limit ---
  const rateLimitError = await checkRateLimit(ctx.userId);
  if (rateLimitError) {
    return json({ success: false, error: { code: rateLimitError.code, message: rateLimitError.message } }, 429);
  }

  const sharedOptions = {
    formats: body.formats ?? ["markdown"],
    render_javascript: body.render_javascript ?? true,
    only_main_content: body.only_main_content ?? true,
    timeout_ms: Math.min(body.timeout_ms ?? 30000, 60000),
    headers: body.headers ?? {},
    remove_selectors: body.remove_selectors ?? [],
  };

  // --- Pre-check cache to determine how many credits we actually need ---
  let cacheHits = 0;
  const cacheKeys: string[] = [];
  const cachedResults: (Awaited<ReturnType<typeof getCachedResult>>)[] = [];

  if (cacheTtl > 0) {
    await Promise.all(urls.map(async (url, i) => {
      const key = await buildCacheKey(url, {
        formats: sharedOptions.formats,
        render_javascript: sharedOptions.render_javascript,
        only_main_content: sharedOptions.only_main_content,
        remove_selectors: sharedOptions.remove_selectors,
      });
      cacheKeys[i] = key;
      const cached = await getCachedResult(key);
      cachedResults[i] = cached;
      if (cached) cacheHits++;
    }));
  }

  const creditsNeeded = urls.length - cacheHits;

  // --- Quota check only for cache misses ---
  if (creditsNeeded > 0) {
    const quotaError = await checkQuota(ctx.userId, creditsNeeded);
    if (quotaError) {
      return json({ success: false, error: { code: quotaError.code, message: quotaError.message } }, 402);
    }
  }

  const admin = getAdmin();

  // --- Create parent batch job ---
  const { data: parentJob, error: parentErr } = await admin
    .from("scrape_jobs")
    .insert({
      user_id: ctx.userId,
      api_key_id: ctx.apiKeyId === "scheduled" ? null : ctx.apiKeyId,
      url: urls[0],
      mode: "batch",
      status: "running",
      request_json: { urls, formats: body.formats, options: { render_javascript: body.render_javascript, only_main_content: body.only_main_content, timeout_ms: body.timeout_ms } },
    })
    .select("id")
    .single();

  if (parentErr || !parentJob) {
    console.error("Failed to create batch parent job:", parentErr);
    return json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create batch job" } }, 500);
  }

  console.log(`Batch scrape started job=${parentJob.id} urls=${urls.length} cache_hits=${cacheHits} user=${ctx.userId}`);

  // --- Process URLs ---
  const results: (Record<string, unknown> | null)[] = new Array(urls.length).fill(null);
  const errors: (Record<string, unknown> | null)[] = new Array(urls.length).fill(null);
  let successCount = 0;
  let failCount = 0;
  let actualCacheHits = 0;

  await pooled(urls, CONCURRENCY, async (url, index) => {
    // Check cache first
    const cached = cacheTtl > 0 ? cachedResults[index] : null;
    if (cached) {
      // Create child job for cache hit
      await admin.from("scrape_jobs").insert({
        user_id: ctx.userId,
        api_key_id: ctx.apiKeyId === "scheduled" ? null : ctx.apiKeyId,
        url,
        mode: "scrape",
        status: "completed",
        final_url: cached.final_url,
        title: cached.title,
        http_status_code: cached.status_code,
        markdown: cached.markdown,
        html: cached.html,
        metadata_json: cached.metadata_json,
        links_json: cached.links_json,
        warnings_json: cached.warnings_json,
        duration_ms: 0,
        credits_used: 0,
        request_json: { ...sharedOptions, url, _batch_parent_id: parentJob.id, cache_hit: true },
      });

      results[index] = {
        url: cached.url,
        final_url: cached.final_url,
        title: cached.title,
        status_code: cached.status_code,
        ...(cached.markdown !== null && { markdown: cached.markdown }),
        ...(cached.html !== null && { html: cached.html }),
        ...(cached.metadata_json !== null && { metadata: cached.metadata_json }),
        ...(cached.links_json !== null && { links: cached.links_json }),
        timings: { navigation_ms: 0, extraction_ms: 0, total_ms: 0 },
        warnings: cached.warnings_json ?? [],
        cache_hit: true,
      };
      successCount++;
      actualCacheHits++;
      return;
    }

    // Cache miss — perform scrape
    const { data: childJob } = await admin
      .from("scrape_jobs")
      .insert({
        user_id: ctx.userId,
        api_key_id: ctx.apiKeyId === "scheduled" ? null : ctx.apiKeyId,
        url,
        mode: "scrape",
        status: "running",
        request_json: { ...sharedOptions, url, _batch_parent_id: parentJob.id },
      })
      .select("id")
      .single();

    const childId = childJob?.id ?? null;

    try {
      const result = await performScrape({ url, ...sharedOptions });

      if (childId) {
        await admin.from("scrape_jobs").update({
          status: "completed",
          final_url: result.final_url,
          title: result.title,
          http_status_code: result.status_code,
          markdown: result.markdown ?? null,
          html: result.html ?? null,
          metadata_json: result.metadata ?? null,
          links_json: result.links ?? null,
          warnings_json: result.warnings,
          duration_ms: result.timings.total_ms,
          credits_used: 1,
        }).eq("id", childId);
      }

      // Store in cache
      if (cacheTtl > 0 && cacheKeys[index]) {
        setCachedResult(cacheKeys[index], result, cacheTtl).catch((e) =>
          console.error("Cache store error:", e)
        );
      }

      results[index] = {
        url: result.url,
        final_url: result.final_url,
        title: result.title,
        status_code: result.status_code,
        ...(result.markdown !== undefined && { markdown: result.markdown }),
        ...(result.html !== undefined && { html: result.html }),
        ...(result.metadata !== undefined && { metadata: result.metadata }),
        ...(result.links !== undefined && { links: result.links }),
        timings: result.timings,
        warnings: result.warnings,
        cache_hit: false,
      };
      successCount++;
    } catch (err) {
      const classified = classifyError(err);
      if (childId) {
        await admin.from("scrape_jobs").update({
          status: "failed",
          error_code: classified.code,
          error_message: classified.message,
        }).eq("id", childId);
      }
      errors[index] = { url, code: classified.code, message: classified.message };
      failCount++;
    }
  });

  // --- Charge credits only for cache misses that succeeded ---
  const creditsUsed = successCount - actualCacheHits;
  if (creditsUsed > 0) {
    const userCredits = await getUserCredits(ctx.userId);
    const newBalance = Math.max(0, userCredits.remaining - creditsUsed);

    await recordLedgerEntry({
      user_id: ctx.userId,
      api_key_id: ctx.apiKeyId,
      action: "batch_scrape_charge",
      credits: -creditsUsed,
      job_id: parentJob.id,
      source_type: "scrape",
      balance_after: newBalance,
      metadata_json: { total: urls.length, completed: successCount, failed: failCount, cache_hits: actualCacheHits },
    });
  }

  // --- Update parent job ---
  const batchStatus = failCount === 0 ? "completed" : successCount === 0 ? "failed" : "partial";
  await admin.from("scrape_jobs").update({
    status: batchStatus,
    credits_used: creditsUsed,
  }).eq("id", parentJob.id);

  console.log(`Batch done job=${parentJob.id} ok=${successCount} fail=${failCount} cache=${actualCacheHits} credits=${creditsUsed}`);

  // --- Dispatch webhook ---
  const eventType = batchStatus === "failed" ? "batch.failed" : batchStatus === "partial" ? "batch.partial" : "batch.completed";
  dispatchWebhooks({
    userId: ctx.userId,
    eventType,
    jobId: parentJob.id,
    jobType: "batch",
    payload: { total: urls.length, completed: successCount, failed: failCount, credits_used: creditsUsed, cache_hits: actualCacheHits },
  }).catch((e) => console.error("Webhook dispatch error:", e));

  return json({
    success: batchStatus !== "failed",
    data: results,
    errors: errors,
    meta: {
      job_id: parentJob.id,
      total: urls.length,
      completed: successCount,
      failed: failCount,
      credits_used: creditsUsed,
      cache_hits: actualCacheHits,
    },
  });
});
