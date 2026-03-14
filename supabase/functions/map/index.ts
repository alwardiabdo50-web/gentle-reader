import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractApiKey, validateApiKey } from "../_shared/api-key-auth.ts";
import { checkQuota, getUserCredits, recordLedgerEntry, checkRateLimit } from "../_shared/billing.ts";
import { normalizeUrl, isSameDomain, isBlockedUrl, extractLinks } from "../_shared/crawl-utils.ts";
import { getCreditCost } from "../_shared/credit-costs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ─── Config ──────────────────────────────────────────────────
const MAP_DEFAULT_MAX_URLS = 500;
const MAP_HARD_MAX_URLS = 5000;
const SITEMAP_FETCH_TIMEOUT = 8000;
const ROBOTS_FETCH_TIMEOUT = 5000;
const MAX_SITEMAP_RECURSION = 3;
const ENABLE_FALLBACK_HTML = true;

// ─── Sitemap parsing ─────────────────────────────────────────

/** Fetch a URL with timeout, returning text or null */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "NocodoBot/1.0" } });
    if (!res.ok) return null;
    const text = await res.text();
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Parse robots.txt and extract Sitemap: directives */
function parseSitemapFromRobots(robotsTxt: string): string[] {
  const sitemaps: string[] = [];
  for (const line of robotsTxt.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith("sitemap:")) {
      const url = trimmed.slice(8).trim();
      if (url.startsWith("http")) sitemaps.push(url);
    }
  }
  return sitemaps;
}

/** Parse sitemap XML (urlset or sitemapindex) */
function parseSitemapXml(xml: string): { urls: string[]; sitemaps: string[] } {
  const urls: string[] = [];
  const sitemaps: string[] = [];

  // Extract <loc> tags
  const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;

  // Detect if this is a sitemap index
  const isSitemapIndex = xml.includes("<sitemapindex");

  while ((match = locRegex.exec(xml)) !== null) {
    const loc = match[1].trim();
    if (!loc.startsWith("http")) continue;
    if (isSitemapIndex) {
      sitemaps.push(loc);
    } else {
      urls.push(loc);
    }
  }

  return { urls, sitemaps };
}

/** Recursively discover URLs from sitemaps */
async function discoverFromSitemaps(
  sitemapUrls: string[],
  depth: number = 0
): Promise<{ urls: string[]; warnings: string[] }> {
  const allUrls: string[] = [];
  const warnings: string[] = [];

  if (depth > MAX_SITEMAP_RECURSION) {
    warnings.push(`Sitemap recursion limit reached (depth=${depth})`);
    return { urls: allUrls, warnings };
  }

  for (const sitemapUrl of sitemapUrls) {
    const content = await fetchWithTimeout(sitemapUrl, SITEMAP_FETCH_TIMEOUT);
    if (!content) {
      warnings.push(`Failed to fetch sitemap: ${sitemapUrl}`);
      continue;
    }

    try {
      const parsed = parseSitemapXml(content);
      allUrls.push(...parsed.urls);

      if (parsed.sitemaps.length > 0) {
        const nested = await discoverFromSitemaps(parsed.sitemaps, depth + 1);
        allUrls.push(...nested.urls);
        warnings.push(...nested.warnings);
      }
    } catch (err) {
      warnings.push(`Failed to parse sitemap ${sitemapUrl}: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Cap early if we already have a lot
    if (allUrls.length > MAP_HARD_MAX_URLS * 2) break;
  }

  return { urls: allUrls, warnings };
}

/** Discover sitemap URLs from robots.txt */
async function discoverSitemapsFromRobots(rootUrl: string): Promise<{ sitemaps: string[]; warnings: string[] }> {
  const warnings: string[] = [];
  try {
    const origin = new URL(rootUrl).origin;
    const robotsTxt = await fetchWithTimeout(`${origin}/robots.txt`, ROBOTS_FETCH_TIMEOUT);
    if (!robotsTxt) {
      return { sitemaps: [], warnings: ["robots.txt not found or timed out"] };
    }
    const sitemaps = parseSitemapFromRobots(robotsTxt);
    return { sitemaps, warnings };
  } catch {
    warnings.push("Failed to parse robots.txt");
    return { sitemaps: [], warnings };
  }
}

/** Fallback: fetch root page and extract internal links */
async function discoverFromRootPage(rootUrl: string): Promise<{ urls: string[]; warnings: string[] }> {
  const warnings: string[] = [];
  const html = await fetchWithTimeout(rootUrl, SITEMAP_FETCH_TIMEOUT);
  if (!html) {
    warnings.push("Failed to fetch root page for link extraction");
    return { urls: [], warnings };
  }
  const links = extractLinks(html, rootUrl);
  return { urls: links, warnings };
}

// ─── Main discovery orchestration ────────────────────────────
interface MapRequest {
  url: string;
  same_domain_only?: boolean;
  include_subdomains?: boolean;
  max_urls?: number;
}

async function performMap(req: MapRequest): Promise<{
  rootUrl: string;
  normalizedRootUrl: string;
  urls: string[];
  warnings: string[];
  usedFallback: boolean;
}> {
  const normalizedRootUrl = normalizeUrl(req.url)!;
  const sameDomainOnly = req.same_domain_only !== false;
  const includeSubdomains = req.include_subdomains === true;
  const maxUrls = Math.min(Math.max(Number(req.max_urls) || MAP_DEFAULT_MAX_URLS, 1), MAP_HARD_MAX_URLS);

  const warnings: string[] = [];
  const seenNormalized = new Set<string>();
  const resultUrls: string[] = [];

  const addUrl = (raw: string) => {
    const n = normalizeUrl(raw);
    if (!n) return;
    if (seenNormalized.has(n)) return;
    if (isBlockedUrl(n)) return;
    if (sameDomainOnly && !isSameDomain(n, normalizedRootUrl, includeSubdomains)) return;
    seenNormalized.add(n);
    resultUrls.push(n);
  };

  // Always include root
  addUrl(normalizedRootUrl);

  // 1. Discover sitemaps from robots.txt
  const robots = await discoverSitemapsFromRobots(normalizedRootUrl);
  warnings.push(...robots.warnings);

  // 2. Add default /sitemap.xml if not already found
  const origin = new URL(normalizedRootUrl).origin;
  const sitemapUrls = [...robots.sitemaps];
  const defaultSitemap = `${origin}/sitemap.xml`;
  if (!sitemapUrls.includes(defaultSitemap)) {
    sitemapUrls.unshift(defaultSitemap);
  }

  // 3. Fetch and parse sitemaps
  const sitemapResult = await discoverFromSitemaps(sitemapUrls);
  warnings.push(...sitemapResult.warnings);
  for (const u of sitemapResult.urls) addUrl(u);

  console.log(`Map: sitemap discovery found ${sitemapResult.urls.length} raw URLs, ${resultUrls.length} after filtering`);

  // 4. Fallback: HTML link extraction if sitemap yield is low
  let usedFallback = false;
  if (ENABLE_FALLBACK_HTML && resultUrls.length < 10) {
    usedFallback = true;
    const fallback = await discoverFromRootPage(normalizedRootUrl);
    warnings.push(...fallback.warnings);
    for (const u of fallback.urls) addUrl(u);
    console.log(`Map: fallback HTML discovery added links, total now ${resultUrls.length}`);
  }

  // 5. Cap results
  const capped = resultUrls.slice(0, maxUrls);
  if (resultUrls.length > maxUrls) {
    warnings.push(`Results capped to max_urls=${maxUrls} (${resultUrls.length} discovered)`);
  }

  return {
    rootUrl: req.url,
    normalizedRootUrl,
    urls: capped,
    warnings,
    usedFallback,
  };
}

// ─── Handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } }, 405);
  }

  // Auth
  const rawKey = extractApiKey(req);
  if (!rawKey) {
    return json({ success: false, error: { code: "UNAUTHORIZED", message: "Missing API key" } }, 401);
  }
  const authResult = await validateApiKey(rawKey);
  if (!authResult.ok) {
    return json({ success: false, error: { code: "UNAUTHORIZED", message: authResult.error } }, authResult.status);
  }
  const { ctx } = authResult;

  // Parse body
  let body: MapRequest;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, 400);
  }

  if (!body.url || typeof body.url !== "string") {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "Field 'url' is required" } }, 400);
  }

  const normalizedRoot = normalizeUrl(body.url);
  if (!normalizedRoot) {
    return json({ success: false, error: { code: "INVALID_URL", message: `Invalid URL: ${body.url}` } }, 422);
  }

  // Rate limit check
  const rateLimitError = await checkRateLimit(ctx.userId);
  if (rateLimitError) {
    return json({ success: false, error: { code: rateLimitError.code, message: rateLimitError.message } }, 429);
  }

  // Dynamic credit cost
  const mapAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const mapCreditCost = await getCreditCost(mapAdmin, "map");

  // Quota check
  const quotaError = await checkQuota(ctx.userId, mapCreditCost);
  if (quotaError) {
    return json({ success: false, error: { code: quotaError.code, message: quotaError.message } }, 402);
  }

  console.log(`Map request from user=${ctx.userId} key=${ctx.apiKeyId} url=${normalizedRoot}`);

  // Create job record
  const jobId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const result = await performMap(body);
    const duration = Date.now() - startTime;

    // Create admin client for DB operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert job record
    const { error: insertError } = await supabase.from("scrape_jobs").insert({
      id: jobId,
      user_id: ctx.userId,
      api_key_id: ctx.apiKeyId === "scheduled" ? null : ctx.apiKeyId,
      mode: "map",
      url: result.rootUrl,
      final_url: result.normalizedRootUrl,
      status: "completed",
      credits_used: mapCreditCost,
      duration_ms: duration,
      metadata_json: {
        count: result.urls.length,
        used_fallback: result.usedFallback,
      },
      warnings_json: result.warnings,
    });

    if (insertError) {
      console.error(`Failed to insert job record: ${insertError.message}`);
    }

    // Charge 1 credit
    try {
      const credits = await getUserCredits(ctx.userId);
      const newBalance = Math.max(0, credits.remaining - 1);
      await recordLedgerEntry({
        user_id: ctx.userId,
        api_key_id: ctx.apiKeyId === "scheduled" ? null : ctx.apiKeyId,
        action: "map_charge",
        credits: -1,
        source_type: "map",
        balance_after: newBalance,
        job_id: jobId,
        metadata_json: {
          root_url: result.normalizedRootUrl,
          urls_returned: result.urls.length,
          used_fallback: result.usedFallback,
        },
      });
    } catch (billingError) {
      console.error(`Billing error for map job=${jobId}:`, billingError);
    }

    console.log(`Map completed user=${ctx.userId} root=${result.normalizedRootUrl} urls=${result.urls.length} fallback=${result.usedFallback}`);

    return json({
      success: true,
      data: {
        root_url: result.rootUrl,
        urls: result.urls,
      },
      meta: {
        count: result.urls.length,
        credits_used: 1,
        job_id: jobId,
      },
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
      error: null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Map failed user=${ctx.userId}: ${msg}`);

    if (msg.includes("timeout") || msg.includes("Timeout")) {
      return json({ success: false, error: { code: "NAVIGATION_TIMEOUT", message: "Discovery timed out" } }, 408);
    }
    return json({ success: false, error: { code: "INTERNAL_ERROR", message: msg } }, 500);
  }
});
