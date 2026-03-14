import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeUrl, isCrawlable, extractLinks, CrawlConfig } from "../_shared/crawl-utils.ts";
import { getUserCredits, recordLedgerEntry, checkQuota } from "../_shared/billing.ts";
import { performScrape } from "../_shared/scrape-pipeline.ts";
import { CrawlThrottle } from "../_shared/crawl-throttle.ts";
import { dispatchWebhooks } from "../_shared/webhook-dispatch.ts";
import { getCreditCost } from "../_shared/credit-costs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function getAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

const CONCURRENCY = 3;

/** Scrape a single page (fetch + extraction) */
async function scrapePage(
  url: string,
  config: CrawlConfig
): Promise<{
  finalUrl: string;
  title: string;
  statusCode: number;
  markdown: string;
  html: string;
  metadata: Record<string, unknown>;
  links: Array<{ href: string; text: string }>;
}> {
  const result = await performScrape({
    url,
    formats: ["markdown", "html", "metadata", "links"],
    render_javascript: config.renderJavascript,
    only_main_content: config.onlyMainContent,
    timeout_ms: config.timeoutMs,
    wait_until: "networkidle",
    screenshot: false,
  });

  return {
    finalUrl: result.final_url,
    title: result.title,
    statusCode: result.status_code,
    markdown: result.markdown ?? "",
    html: result.html ?? "",
    metadata: (result.metadata ?? {}) as Record<string, unknown>,
    links: result.links ?? [],
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

  const throttle = new CrawlThrottle({
    globalRps: Number(Deno.env.get("CRAWL_GLOBAL_RPS") ?? "1.5"),
    domainMinIntervalMs: Number(Deno.env.get("CRAWL_DOMAIN_MIN_INTERVAL_MS") ?? "800"),
    domainMaxConcurrent: Number(Deno.env.get("CRAWL_DOMAIN_MAX_CONCURRENT") ?? "1"),
    jitterMs: Number(Deno.env.get("CRAWL_JITTER_MS") ?? "200"),
  });

  const seenUrls = new Set<string>([job.normalized_root_url]);
  let processedCount = 0;
  let failedCount = 0;
  let creditsUsed = 0;

  const crawlCreditCost = await getCreditCost(admin, "crawl");

  console.log(`Crawl worker started job=${jobId} root=${job.root_url} creditCost=${crawlCreditCost}`);
  console.log(`Crawl worker throttle settings job=${jobId}`, throttle.getSettings());

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

      // Process batch with global + per-domain throttling
      const results = await Promise.all(
        queuedPages.map((p) =>
          throttle.schedule(p.url, () => processPage(admin, jobId, p.id, p.url, p.depth, config, seenUrls))
        )
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

        dispatchWebhooks({
          userId: job.user_id,
          eventType: "crawl.failed",
          jobId,
          jobType: "crawl",
          payload: { root_url: job.root_url, error: { code: "INSUFFICIENT_CREDITS", message: quotaErr.message }, processed: processedCount },
        }).catch((e) => console.error("Webhook dispatch error:", e));

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

      dispatchWebhooks({
        userId: job.user_id,
        eventType: "crawl.completed",
        jobId,
        jobType: "crawl",
        payload: { root_url: job.root_url, processed: processedCount, failed: failedCount, credits_used: creditsUsed },
      }).catch((e) => console.error("Webhook dispatch error:", e));
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

    dispatchWebhooks({
      userId: job.user_id,
      eventType: "crawl.failed",
      jobId,
      jobType: "crawl",
      payload: { root_url: job.root_url, error: { code: "WORKER_ERROR", message: err instanceof Error ? err.message : String(err) }, processed: processedCount },
    }).catch((e) => console.error("Webhook dispatch error:", e));
  }

  return new Response(JSON.stringify({ status: "done", processed: processedCount }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
