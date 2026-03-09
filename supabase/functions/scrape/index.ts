import { extractApiKey, validateApiKey } from "../_shared/api-key-auth.ts";
import { checkQuota, getUserCredits, recordLedgerEntry } from "../_shared/billing.ts";
import { performScrape } from "../_shared/scrape-pipeline.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScrapeRequest {
  url: string;
  formats?: string[];
  render_javascript?: boolean;
  only_main_content?: boolean;
  timeout_ms?: number;
  wait_until?: string;
  screenshot?: boolean;
  mobile?: boolean;
  headers?: Record<string, string>;
  cookies?: Array<{ name: string; value: string; domain?: string }>;
  proxy?: string | null;
  remove_selectors?: string[];
}

interface ScrapeResult {
  url: string;
  final_url: string;
  title: string;
  status_code: number;
  html?: string;
  markdown?: string;
  metadata?: Record<string, unknown>;
  links?: Array<{ href: string; text: string }>;
  screenshot_url?: string;
  timings: { navigation_ms: number; extraction_ms: number; total_ms: number };
  warnings: string[];
}

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

function classifyError(error: unknown): { code: string; message: string; status: number } {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("timeout") || msg.includes("Timeout")) {
    return { code: "NAVIGATION_TIMEOUT", message: "Page navigation timed out", status: 408 };
  }
  if (msg.includes("ERR_BLOCKED") || msg.includes("403") || msg.includes("blocked")) {
    return { code: "BLOCKED_BY_TARGET", message: "Request was blocked by the target site", status: 403 };
  }
  return { code: "INTERNAL_ERROR", message: msg, status: 500 };
}

function getAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

/**
 * Mock scrape implementation — returns realistic structured data.
 * Replace with Firecrawl or browser integration when ready.
 */
async function performScrape(req: ScrapeRequest): Promise<ScrapeResult> {
  const startTime = Date.now();
  const formats = req.formats ?? ["markdown"];
  const warnings: string[] = [];

  // Simulate navigation time
  const navStart = Date.now();
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
  const navMs = Date.now() - navStart;

  // Mock extraction
  const extractStart = Date.now();
  const domain = new URL(req.url).hostname;
  const title = `${domain} — Page Title`;

  const mockMarkdown = `# ${title}\n\nThis is mock content from **${req.url}**.\n\nThe scrape endpoint is working correctly with API key authentication, request validation, and database persistence.\n\n## Features\n- Markdown extraction\n- HTML capture\n- Metadata parsing\n- Link discovery\n- Screenshot support (placeholder)\n\n> Note: Connect Firecrawl for real browser rendering and content extraction.`;

  const mockHtml = `<!DOCTYPE html><html><head><title>${title}</title><meta name="description" content="Mock page for ${domain}"><meta name="language" content="en"></head><body><h1>${title}</h1><p>Mock content from ${req.url}</p></body></html>`;

  const mockLinks = [
    { href: `${req.url}/about`, text: "About" },
    { href: `${req.url}/docs`, text: "Documentation" },
    { href: `${req.url}/pricing`, text: "Pricing" },
  ];

  const mockMetadata = {
    description: `Mock page for ${domain}`,
    language: "en",
    canonical_url: req.url,
    og_title: title,
    og_type: "website",
  };

  const extractMs = Date.now() - extractStart;

  if (req.screenshot) {
    warnings.push("Screenshots are not available in mock mode. Connect Firecrawl for screenshot support.");
  }
  if (!req.render_javascript) {
    warnings.push("JavaScript rendering disabled — static HTML only.");
  }

  warnings.push("Running in mock mode. Connect Firecrawl for real scraping.");

  const result: ScrapeResult = {
    url: req.url,
    final_url: req.url,
    title,
    status_code: 200,
    timings: {
      navigation_ms: navMs,
      extraction_ms: extractMs,
      total_ms: Date.now() - startTime,
    },
    warnings,
  };

  if (formats.includes("markdown")) result.markdown = mockMarkdown;
  if (formats.includes("html")) result.html = mockHtml;
  if (formats.includes("metadata")) result.metadata = mockMetadata;
  if (formats.includes("links")) result.links = mockLinks;

  return result;
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
    return json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing API key. Use Authorization: Bearer <key> or X-API-Key header." },
    }, 401);
  }

  const authResult = await validateApiKey(rawKey);
  if (!authResult.ok) {
    return json({
      success: false,
      error: { code: "UNAUTHORIZED", message: authResult.error },
    }, authResult.status);
  }

  const { ctx } = authResult;
  console.log(`Scrape request from user=${ctx.userId} key=${ctx.apiKeyId}`);

  // --- Parse & validate request ---
  let body: ScrapeRequest;
  try {
    body = await req.json();
  } catch {
    return json({
      success: false,
      error: { code: "BAD_REQUEST", message: "Invalid JSON body" },
    }, 400);
  }

  if (!body.url || typeof body.url !== "string") {
    return json({
      success: false,
      error: { code: "BAD_REQUEST", message: "Field 'url' is required" },
    }, 400);
  }

  const normalizedUrl = normalizeUrl(body.url);
  if (!normalizedUrl) {
    return json({
      success: false,
      error: { code: "INVALID_URL", message: `Invalid or unsupported URL: ${body.url}` },
    }, 422);
  }

  body.url = normalizedUrl;

  // Apply defaults
  const scrapeReq: ScrapeRequest = {
    url: normalizedUrl,
    formats: body.formats ?? ["markdown"],
    render_javascript: body.render_javascript ?? true,
    only_main_content: body.only_main_content ?? true,
    timeout_ms: Math.min(body.timeout_ms ?? 30000, 60000),
    wait_until: body.wait_until ?? "networkidle",
    screenshot: body.screenshot ?? false,
    mobile: body.mobile ?? false,
    headers: body.headers ?? {},
    cookies: body.cookies ?? [],
    proxy: body.proxy ?? null,
    remove_selectors: body.remove_selectors ?? [],
  };

  // --- Quota check ---
  const quotaError = await checkQuota(ctx.userId, 1);
  if (quotaError) {
    console.warn(`Quota rejected: user=${ctx.userId} — ${quotaError.message}`);
    return json({
      success: false,
      error: { code: quotaError.code, message: quotaError.message },
    }, 402);
  }

  const admin = getAdmin();

  // --- Create job record ---
  const { data: job, error: insertError } = await admin
    .from("scrape_jobs")
    .insert({
      user_id: ctx.userId,
      api_key_id: ctx.apiKeyId,
      url: scrapeReq.url,
      mode: "scrape",
      status: "running",
      request_json: scrapeReq as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (insertError || !job) {
    console.error("Failed to create scrape job:", insertError);
    return json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to create scrape job" },
    }, 500);
  }

  // --- Execute scrape ---
  let result: ScrapeResult;
  try {
    result = await performScrape(scrapeReq);
  } catch (error) {
    const classified = classifyError(error);
    await admin
      .from("scrape_jobs")
      .update({
        status: "failed",
        error_code: classified.code,
        error_message: classified.message,
      })
      .eq("id", job.id);

    console.error(`Scrape failed job=${job.id}: ${classified.code} — ${classified.message}`);
    return json({
      success: false,
      error: { code: classified.code, message: classified.message },
      meta: { job_id: job.id },
    }, classified.status);
  }

  // --- Persist result ---
  await admin
    .from("scrape_jobs")
    .update({
      status: "completed",
      final_url: result.final_url,
      title: result.title,
      http_status_code: result.status_code,
      markdown: result.markdown ?? null,
      html: result.html ?? null,
      metadata_json: result.metadata ?? null,
      links_json: result.links ?? null,
      screenshot_url: result.screenshot_url ?? null,
      warnings_json: result.warnings,
      duration_ms: result.timings.total_ms,
      credits_used: 1,
    })
    .eq("id", job.id);

  // --- Record ledger entry (charge 1 credit) ---
  const userCredits = await getUserCredits(ctx.userId);
  const newBalance = Math.max(0, userCredits.remaining - 1);
  await recordLedgerEntry({
    user_id: ctx.userId,
    api_key_id: ctx.apiKeyId,
    action: "scrape_charge",
    credits: -1,
    job_id: job.id,
    source_type: "scrape",
    balance_after: newBalance,
    metadata_json: { url: scrapeReq.url, final_url: result.final_url, duration_ms: result.timings.total_ms },
  });

  console.log(`Scrape completed job=${job.id} url=${result.final_url} time=${result.timings.total_ms}ms credits_remaining=${newBalance}`);

  // --- Return response ---
  return json({
    success: true,
    data: {
      url: result.url,
      final_url: result.final_url,
      title: result.title,
      status_code: result.status_code,
      ...(result.markdown !== undefined && { markdown: result.markdown }),
      ...(result.html !== undefined && { html: result.html }),
      ...(result.metadata !== undefined && { metadata: result.metadata }),
      ...(result.links !== undefined && { links: result.links }),
      ...(result.screenshot_url !== undefined && { screenshot_url: result.screenshot_url }),
      timings: result.timings,
      warnings: result.warnings,
    },
    meta: {
      job_id: job.id,
      credits_used: 1,
    },
  });
});
