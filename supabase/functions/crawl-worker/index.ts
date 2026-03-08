import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeUrl, isCrawlable, extractLinks, CrawlConfig } from "../_shared/crawl-utils.ts";
import { getUserCredits, recordLedgerEntry, checkQuota } from "../_shared/billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function getAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

const CONCURRENCY = 3;

/** Mock scrape a single page (reuses same logic as scrape endpoint) */
async function scrapePage(url: string, config: CrawlConfig): Promise<{
  finalUrl: string;
  title: string;
  statusCode: number;
  markdown: string;
  html: string;
  metadata: Record<string, unknown>;
  links: Array<{ href: string; text: string }>;
}> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));

  const domain = new URL(url).hostname;
  const title = `${domain} — ${url.split("/").pop() || "Home"}`;

  const mockLinks = [
    { href: `${url}/about`, text: "About" },
    { href: `${url}/docs`, text: "Docs" },
    { href: `${url}/pricing`, text: "Pricing" },
    { href: `${url}/blog`, text: "Blog" },
  ];

  return {
    finalUrl: url,
    title,
    statusCode: 200,
    markdown: `# ${title}\n\nCrawled content from **${url}**.\n\n> Mock mode — connect a real browser for live crawling.`,
    html: `<html><head><title>${title}</title></head><body><h1>${title}</h1><a href="${url}/about">About</a><a href="${url}/docs">Docs</a><a href="${url}/pricing">Pricing</a><a href="${url}/blog">Blog</a></body></html>`,
    metadata: { description: `Page at ${url}`, language: "en" },
    links: mockLinks,
  };
}

/** Process a single page within a crawl */
async function processPage(
  admin: ReturnType<typeof getAdmin>,
  jobId: string,
  pageId: string,
  url: string,
  depth: number,
  config: CrawlConfig,
  seenUrls: Set<string>
): Promise<string[]> {
  // Mark page as processing
  await admin.from("crawl_pages").update({ status: "processing" }).eq("id", pageId);

  try {
    const result = await scrapePage(url, config);

    // Persist page result
    await admin.from("crawl_pages").update({
      status: "completed",
      final_url: result.finalUrl,
      title: result.title,
      http_status_code: result.statusCode,
      markdown: result.markdown,
      html: result.html,
      metadata_json: result.metadata,
      links_json: result.links,
      scraped_at: new Date().toISOString(),
    }).eq("id", pageId);

    // Extract and filter discovered links
    const discoveredLinks = extractLinks(result.html, url);
    const newUrls: string[] = [];

    for (const link of discoveredLinks) {
      const normalized = normalizeUrl(link);
      if (!normalized) continue;
      if (seenUrls.has(normalized)) continue;
      if (!isCrawlable(link, config)) continue;
      if (depth + 1 > config.maxDepth) continue;

      seenUrls.add(normalized);
      newUrls.push(normalized);
    }

    return newUrls;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from("crawl_pages").update({
      status: "failed",
      error_code: "SCRAPE_FAILED",
      error_message: msg,
    }).eq("id", pageId);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: { crawl_job_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const jobId = body.crawl_job_id;
  if (!jobId) return new Response("Missing crawl_job_id", { status: 400 });

  const admin = getAdmin();

  // Load job
  const { data: job } = await admin.from("crawl_jobs").select("*").eq("id", jobId).single();
  if (!job) return new Response("Job not found", { status: 404 });
  if (job.status === "cancelled") return new Response(JSON.stringify({ status: "cancelled" }), { status: 200 });

  // Mark as running
  await admin.from("crawl_jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", jobId);

  const config: CrawlConfig = {
    rootUrl: job.root_url,
    normalizedRootUrl: job.normalized_root_url,
    maxPages: job.max_pages,
    maxDepth: job.max_depth,
    sameDomainOnly: job.same_domain_only,
    includeSubdomains: job.include_subdomains,
    includePatterns: (job.include_patterns_json as string[]) ?? [],
    excludePatterns: (job.exclude_patterns_json as string[]) ?? [],
    renderJavascript: job.render_javascript,
    onlyMainContent: job.only_main_content,
    timeoutMs: job.timeout_ms,
  };

  const seenUrls = new Set<string>([job.normalized_root_url]);
  let processedCount = 0;
  let failedCount = 0;
  let creditsUsed = 0;

  console.log(`Crawl worker started job=${jobId} root=${job.root_url}`);

  try {
    // Process pages in BFS order
    while (processedCount < config.maxPages) {
      // Check for cancellation
      const { data: currentJob } = await admin.from("crawl_jobs").select("status").eq("id", jobId).single();
      if (currentJob?.status === "cancelled") {
        console.log(`Crawl cancelled mid-run job=${jobId}`);
        break;
      }

      // Get next batch of queued pages
      const { data: queuedPages } = await admin
        .from("crawl_pages")
        .select("id, url, depth")
        .eq("crawl_job_id", jobId)
        .eq("status", "queued")
        .order("depth", { ascending: true })
        .order("discovered_at", { ascending: true })
        .limit(CONCURRENCY);

      if (!queuedPages || queuedPages.length === 0) break;

      // Process batch
      const results = await Promise.all(
        queuedPages.map((p) => processPage(admin, jobId, p.id, p.url, p.depth, config, seenUrls))
      );

      // Track results
      for (let i = 0; i < queuedPages.length; i++) {
        processedCount++;
        creditsUsed++;

        // Check page status to count failures
        const { data: pageStatus } = await admin
          .from("crawl_pages")
          .select("status")
          .eq("id", queuedPages[i].id)
          .single();
        if (pageStatus?.status === "failed") failedCount++;

        // Record ledger entry per page
        const credits = await getUserCredits(job.user_id);
        const newBalance = Math.max(0, credits.remaining - 1);
        await recordLedgerEntry({
          user_id: job.user_id,
          api_key_id: job.api_key_id,
          action: "crawl_charge",
          credits: -1,
          job_id: jobId,
          source_type: "crawl",
          balance_after: newBalance,
          metadata_json: { url: queuedPages[i].url, crawl_job_id: jobId },
        });

        // Insert newly discovered URLs as pages
        const newUrls = results[i];
        if (newUrls.length > 0 && processedCount + newUrls.length <= config.maxPages + 10) {
          const pagesToInsert = newUrls.slice(0, config.maxPages - processedCount).map((nUrl) => ({
            crawl_job_id: jobId,
            parent_page_id: queuedPages[i].id,
            depth: queuedPages[i].depth + 1,
            url: nUrl,
            normalized_url: nUrl,
            status: "queued",
            queued_at: new Date().toISOString(),
          }));

          if (pagesToInsert.length > 0) {
            // Use upsert to handle dedup via unique index
            await admin.from("crawl_pages").upsert(pagesToInsert, {
              onConflict: "crawl_job_id,normalized_url",
              ignoreDuplicates: true,
            });
          }
        }
      }

      // Update counters
      const { count: discoveredTotal } = await admin
        .from("crawl_pages")
        .select("id", { count: "exact", head: true })
        .eq("crawl_job_id", jobId);

      const { count: queuedTotal } = await admin
        .from("crawl_pages")
        .select("id", { count: "exact", head: true })
        .eq("crawl_job_id", jobId)
        .eq("status", "queued");

      await admin.from("crawl_jobs").update({
        discovered_count: discoveredTotal ?? 0,
        queued_count: queuedTotal ?? 0,
        processed_count: processedCount,
        failed_count: failedCount,
        credits_used: creditsUsed,
      }).eq("id", jobId);

      // Check quota before continuing
      const quotaErr = await checkQuota(job.user_id, 1);
      if (quotaErr) {
        console.warn(`Crawl stopped due to quota job=${jobId}: ${quotaErr.message}`);
        await admin.from("crawl_jobs").update({
          status: "failed",
          error_code: "INSUFFICIENT_CREDITS",
          error_message: quotaErr.message,
          finished_at: new Date().toISOString(),
        }).eq("id", jobId);
        return new Response(JSON.stringify({ status: "failed", reason: "quota" }), { status: 200 });
      }
    }

    // Final status
    const { data: finalJob } = await admin.from("crawl_jobs").select("status").eq("id", jobId).single();
    if (finalJob?.status === "running") {
      await admin.from("crawl_jobs").update({
        status: "completed",
        finished_at: new Date().toISOString(),
      }).eq("id", jobId);
    }

    console.log(`Crawl worker finished job=${jobId} processed=${processedCount} failed=${failedCount} credits=${creditsUsed}`);
  } catch (err) {
    console.error(`Crawl worker error job=${jobId}:`, err);
    await admin.from("crawl_jobs").update({
      status: "failed",
      error_code: "WORKER_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);
  }

  return new Response(JSON.stringify({ status: "done", processed: processedCount }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
