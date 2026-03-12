import { extractApiKey, validateApiKey, authenticateServiceRole } from "../_shared/api-key-auth.ts";
import { checkQuota, getUserCredits, recordLedgerEntry } from "../_shared/billing.ts";
import { normalizeUrl, CrawlConfig } from "../_shared/crawl-utils.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Authenticate via API key */
async function authenticate(req: Request) {
  const rawKey = extractApiKey(req);
  if (!rawKey) {
    return { ok: false as const, response: json({ success: false, error: { code: "UNAUTHORIZED", message: "Missing API key" } }, 401) };
  }
  const result = await validateApiKey(rawKey);
  if (!result.ok) {
    return { ok: false as const, response: json({ success: false, error: { code: "UNAUTHORIZED", message: result.error } }, result.status) };
  }
  return { ok: true as const, ctx: result.ctx };
}

/** Extract crawl ID from URL path: /crawl/xxx or /crawl/:id */
function extractCrawlId(url: string): string | null {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  // Pattern: /crawl/<id>
  const crawlIdx = parts.indexOf("crawl");
  if (crawlIdx >= 0 && parts[crawlIdx + 1]) {
    return parts[crawlIdx + 1];
  }
  return null;
}

// ─── POST /v1/crawl ──────────────────────────────────────────
async function handleCreateCrawl(req: Request, ctx: { userId: string; apiKeyId: string }) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, 400);
  }

  if (!body.url || typeof body.url !== "string") {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "Field 'url' is required" } }, 400);
  }

  const normalizedRootUrl = normalizeUrl(body.url as string);
  if (!normalizedRootUrl) {
    return json({ success: false, error: { code: "INVALID_URL", message: `Invalid URL: ${body.url}` } }, 422);
  }

  const maxPages = Math.min(Math.max(Number(body.max_pages) || 100, 1), 1000);
  const maxDepth = Math.min(Math.max(Number(body.max_depth) || 3, 1), 10);

  // Quota check — need at least 1 credit to start
  const quotaError = await checkQuota(ctx.userId, 1);
  if (quotaError) {
    return json({ success: false, error: { code: quotaError.code, message: quotaError.message } }, 402);
  }

  const admin = getAdmin();

  const { data: job, error: insertError } = await admin
    .from("crawl_jobs")
    .insert({
      user_id: ctx.userId,
      api_key_id: ctx.apiKeyId,
      root_url: body.url as string,
      normalized_root_url: normalizedRootUrl,
      status: "queued",
      max_pages: maxPages,
      max_depth: maxDepth,
      same_domain_only: body.same_domain_only !== false,
      include_subdomains: body.include_subdomains === true,
      include_patterns_json: Array.isArray(body.include_patterns) ? body.include_patterns : [],
      exclude_patterns_json: Array.isArray(body.exclude_patterns) ? body.exclude_patterns : [],
      render_javascript: body.render_javascript !== false,
      only_main_content: body.only_main_content !== false,
      timeout_ms: Math.min(Number(body.timeout_ms) || 30000, 60000),
    })
    .select("id, status, created_at")
    .single();

  if (insertError || !job) {
    console.error("Failed to create crawl job:", insertError);
    return json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create crawl job" } }, 500);
  }

  // Seed root URL as first crawl page
  await admin.from("crawl_pages").insert({
    crawl_job_id: job.id,
    depth: 0,
    url: body.url as string,
    normalized_url: normalizedRootUrl,
    status: "queued",
    queued_at: new Date().toISOString(),
  });

  await admin.from("crawl_jobs").update({ queued_count: 1, discovered_count: 1 }).eq("id", job.id);

  // Trigger async worker via edge function invocation (fire-and-forget)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  fetch(`${supabaseUrl}/functions/v1/crawl-worker`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ crawl_job_id: job.id }),
  }).catch((err) => console.error("Failed to invoke crawl-worker:", err));

  console.log(`Crawl created job=${job.id} root=${normalizedRootUrl} max_pages=${maxPages} max_depth=${maxDepth}`);

  return json({
    success: true,
    data: {
      job_id: job.id,
      status: "queued",
      root_url: body.url,
    },
  }, 201);
}

// ─── GET /v1/crawl/:id ───────────────────────────────────────
async function handleGetCrawl(crawlId: string, ctx: { userId: string }) {
  const admin = getAdmin();
  const url = new URL("http://x"); // just for searchParams parsing
  
  const { data: job, error } = await admin
    .from("crawl_jobs")
    .select("*")
    .eq("id", crawlId)
    .eq("user_id", ctx.userId)
    .single();

  if (error || !job) {
    return json({ success: false, error: { code: "NOT_FOUND", message: "Crawl job not found" } }, 404);
  }

  // Paginated pages
  const page = 1;
  const pageSize = 20;

  const { data: pages, count } = await admin
    .from("crawl_pages")
    .select("id, url, final_url, status, title, depth, http_status_code, markdown, metadata_json, scraped_at", { count: "exact" })
    .eq("crawl_job_id", crawlId)
    .order("discovered_at", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  return json({
    success: true,
    data: {
      job_id: job.id,
      root_url: job.root_url,
      status: job.status,
      stats: {
        discovered: job.discovered_count,
        queued: job.queued_count,
        processed: job.processed_count,
        failed: job.failed_count,
        credits_used: job.credits_used,
      },
      config: {
        max_pages: job.max_pages,
        max_depth: job.max_depth,
        same_domain_only: job.same_domain_only,
        render_javascript: job.render_javascript,
      },
      pages: pages ?? [],
      pagination: {
        page,
        page_size: pageSize,
        total: count ?? 0,
      },
      started_at: job.started_at,
      finished_at: job.finished_at,
      created_at: job.created_at,
    },
  });
}

// ─── DELETE /v1/crawl/:id ────────────────────────────────────
async function handleCancelCrawl(crawlId: string, ctx: { userId: string }) {
  const admin = getAdmin();

  const { data: job } = await admin
    .from("crawl_jobs")
    .select("id, status, user_id")
    .eq("id", crawlId)
    .eq("user_id", ctx.userId)
    .single();

  if (!job) {
    return json({ success: false, error: { code: "NOT_FOUND", message: "Crawl job not found" } }, 404);
  }

  if (["completed", "failed", "cancelled"].includes(job.status)) {
    return json({ success: true, data: { job_id: job.id, status: job.status } });
  }

  await admin
    .from("crawl_jobs")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", crawlId);

  // Cancel all pending pages
  await admin
    .from("crawl_pages")
    .update({ status: "cancelled" })
    .eq("crawl_job_id", crawlId)
    .in("status", ["discovered", "queued"]);

  console.log(`Crawl cancelled job=${crawlId}`);

  return json({ success: true, data: { job_id: crawlId, status: "cancelled" } });
}

// ─── Router ──────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const crawlId = extractCrawlId(req.url);

  if (req.method === "POST" && !crawlId) {
    return handleCreateCrawl(req, ctx);
  }

  if (req.method === "GET" && crawlId) {
    return handleGetCrawl(crawlId, ctx);
  }

  if (req.method === "DELETE" && crawlId) {
    return handleCancelCrawl(crawlId, ctx);
  }

  return json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Invalid method or path" } }, 405);
});
