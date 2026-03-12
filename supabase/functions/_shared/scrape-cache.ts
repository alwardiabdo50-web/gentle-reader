import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/**
 * Build a deterministic cache key from normalized URL + relevant scrape options.
 * Uses SHA-256 hash of a canonical JSON string.
 */
export async function buildCacheKey(
  url: string,
  options: {
    formats?: string[];
    render_javascript?: boolean;
    only_main_content?: boolean;
    remove_selectors?: string[];
  }
): Promise<string> {
  const canonical = JSON.stringify({
    url,
    formats: (options.formats ?? ["markdown"]).sort(),
    render_javascript: options.render_javascript ?? true,
    only_main_content: options.only_main_content ?? true,
    remove_selectors: (options.remove_selectors ?? []).sort(),
  });

  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical)
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface CachedResult {
  url: string;
  final_url: string | null;
  title: string | null;
  status_code: number | null;
  markdown: string | null;
  html: string | null;
  metadata_json: Record<string, unknown> | null;
  links_json: Array<{ href: string; text: string }> | null;
  warnings_json: string[];
  duration_ms: number | null;
}

/**
 * Look up a cached scrape result. Returns null on miss or expired.
 */
export async function getCachedResult(
  cacheKey: string
): Promise<CachedResult | null> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("scrape_cache")
    .select("*")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as CachedResult;
}

/**
 * Store (upsert) a scrape result in the cache.
 */
export async function setCachedResult(
  cacheKey: string,
  result: {
    url: string;
    final_url?: string;
    title?: string;
    status_code?: number;
    markdown?: string;
    html?: string;
    metadata?: Record<string, unknown>;
    links?: Array<{ href: string; text: string }>;
    warnings?: string[];
    timings?: { total_ms: number };
  },
  ttlSeconds: number
): Promise<void> {
  const admin = getAdmin();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  await admin.from("scrape_cache").upsert(
    {
      cache_key: cacheKey,
      url: result.url,
      final_url: result.final_url ?? null,
      title: result.title ?? null,
      status_code: result.status_code ?? null,
      markdown: result.markdown ?? null,
      html: result.html ?? null,
      metadata_json: result.metadata ?? null,
      links_json: result.links ?? null,
      warnings_json: result.warnings ?? [],
      duration_ms: result.timings?.total_ms ?? null,
      expires_at: expiresAt,
    },
    { onConflict: "cache_key" }
  );
}
