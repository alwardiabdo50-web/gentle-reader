import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory cache
let cachedResult: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Return cached if fresh
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL_MS) {
    return json(cachedResult.data);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch scrape jobs stats
    const { data: scrapeJobs } = await supabase
      .from("scrape_jobs")
      .select("status, duration_ms, created_at, mode")
      .gte("created_at", twentyFourHoursAgo)
      .limit(1000);

    // Fetch extraction jobs stats
    const { data: extractJobs } = await supabase
      .from("extraction_jobs")
      .select("status, created_at, started_at, finished_at")
      .gte("created_at", twentyFourHoursAgo)
      .limit(1000);

    // Fetch pipeline runs stats
    const { data: pipelineRuns } = await supabase
      .from("pipeline_runs")
      .select("status, created_at, started_at, finished_at")
      .gte("created_at", twentyFourHoursAgo)
      .limit(1000);

    // Fetch crawl jobs stats
    const { data: crawlJobs } = await supabase
      .from("crawl_jobs")
      .select("status, created_at, started_at, finished_at")
      .gte("created_at", twentyFourHoursAgo)
      .limit(1000);

    const jobs = scrapeJobs || [];
    const extracts = extractJobs || [];
    const pipelines = pipelineRuns || [];
    const crawls = crawlJobs || [];

    // Build endpoint health
    const scrapeOnly = jobs.filter(j => j.mode === "scrape");
    const mapOnly = jobs.filter(j => j.mode === "map");

    function computeHealth(name: string, items: { status: string; duration_ms?: number | null; started_at?: string | null; finished_at?: string | null }[]) {
      const total = items.length;
      const failed = items.filter(j => j.status === "failed" || j.status === "error").length;
      const uptime = total > 0 ? ((total - failed) / total) * 100 : 100;

      const durations = items
        .map(j => {
          if (j.duration_ms) return j.duration_ms;
          if (j.started_at && j.finished_at) return new Date(j.finished_at).getTime() - new Date(j.started_at).getTime();
          return null;
        })
        .filter((d): d is number => d !== null && d > 0);

      const avg = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

      return {
        name,
        uptime_pct: Math.round(uptime * 100) / 100,
        avg_response_ms: avg,
        total_jobs: total,
        failed_jobs: failed,
      };
    }

    const endpoints = [
      computeHealth("Scrape", scrapeOnly),
      computeHealth("Crawl", crawls),
      computeHealth("Map", mapOnly),
      computeHealth("Extract", extracts),
      computeHealth("Pipeline", pipelines),
    ];

    // Hourly p50 response times (scrape jobs only since they have duration_ms)
    const hourlyMap = new Map<string, number[]>();
    for (const job of scrapeOnly) {
      if (!job.duration_ms) continue;
      const hour = new Date(job.created_at).toLocaleTimeString("en-US", { hour: "2-digit", hour12: true });
      const existing = hourlyMap.get(hour) || [];
      existing.push(job.duration_ms);
      hourlyMap.set(hour, existing);
    }

    const hourly_response_times = Array.from(hourlyMap.entries()).map(([hour, durations]) => {
      durations.sort((a, b) => a - b);
      const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
      return { hour, p50_ms: p50 };
    });

    // Incidents: any hour where error rate > 10%
    const incidents: { period: string; endpoint: string; error_rate: number }[] = [];
    function checkIncidents(name: string, items: { status: string; created_at: string }[]) {
      const hourBuckets = new Map<string, { total: number; failed: number }>();
      for (const item of items) {
        const hour = new Date(item.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", hour12: true });
        const bucket = hourBuckets.get(hour) || { total: 0, failed: 0 };
        bucket.total++;
        if (item.status === "failed" || item.status === "error") bucket.failed++;
        hourBuckets.set(hour, bucket);
      }
      for (const [period, bucket] of hourBuckets) {
        if (bucket.total >= 3) {
          const errorRate = (bucket.failed / bucket.total) * 100;
          if (errorRate > 10) {
            incidents.push({ period, endpoint: name, error_rate: errorRate });
          }
        }
      }
    }

    checkIncidents("Scrape", scrapeOnly);
    checkIncidents("Crawl", crawls);
    checkIncidents("Extract", extracts);
    checkIncidents("Pipeline", pipelines);

    // Overall status
    const allEndpoints = endpoints;
    const anyOutage = allEndpoints.some(e => e.uptime_pct < 95);
    const anyDegraded = allEndpoints.some(e => e.uptime_pct < 99);
    const overall = anyOutage ? "outage" : anyDegraded ? "degraded" : "operational";

    const result = {
      overall,
      endpoints,
      hourly_response_times,
      incidents: incidents.slice(0, 20),
      last_updated: new Date().toISOString(),
    };

    cachedResult = { data: result, timestamp: Date.now() };
    return json(result);
  } catch (error) {
    console.error("Status error:", error);
    return json({ error: "Failed to compute status" }, 500);
  }
});
