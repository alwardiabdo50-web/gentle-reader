import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/** Simple SHA-256 hash of content for diff detection */
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Calculate next run from cron expression (rough) */
function calculateNextRun(cronExpr: string): string {
  const now = new Date();
  const parts = cronExpr.trim().split(/\s+/);
  const minute = parts[0];
  const hour = parts[1];
  const dayOfMonth = parts[2];
  const dayOfWeek = parts[4];

  const next = new Date(now);
  next.setSeconds(0);
  next.setMilliseconds(0);

  if (minute !== "*" && !minute.startsWith("*/")) {
    next.setMinutes(parseInt(minute));
  } else if (minute.startsWith("*/")) {
    const interval = parseInt(minute.slice(2));
    next.setMinutes(Math.ceil((next.getMinutes() + 1) / interval) * interval);
  }

  if (hour !== "*" && !hour.startsWith("*/")) {
    next.setHours(parseInt(hour));
  } else if (hour.startsWith("*/")) {
    const interval = parseInt(hour.slice(2));
    next.setHours(Math.ceil((next.getHours() + 1) / interval) * interval);
  }

  // Ensure next is in the future
  while (next <= now) {
    if (hour === "*" || hour.startsWith("*/")) {
      next.setHours(next.getHours() + 1);
    } else if (dayOfWeek !== "*") {
      next.setDate(next.getDate() + 7);
    } else if (dayOfMonth !== "*" && dayOfMonth !== "1") {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 1);
    }
  }

  return next.toISOString();
}

/** Invoke the appropriate edge function for a job */
async function triggerJob(
  admin: ReturnType<typeof getAdmin>,
  schedule: any,
  runId: string
): Promise<{ jobId: string | null; content: string; error: string | null }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const config = schedule.config_json;
  const jobType = schedule.job_type;

  let endpoint: string;
  let body: Record<string, unknown>;

  switch (jobType) {
    case "scrape":
      endpoint = `${supabaseUrl}/functions/v1/scrape`;
      body = {
        url: config.url,
        formats: config.formats ?? ["markdown"],
        render_javascript: config.render_javascript ?? true,
        only_main_content: config.only_main_content ?? true,
        timeout_ms: config.timeout_ms ?? 30000,
        _scheduled: true,
        _schedule_id: schedule.id,
        _run_id: runId,
      };
      break;
    case "crawl":
      endpoint = `${supabaseUrl}/functions/v1/crawl`;
      body = {
        url: config.url,
        max_pages: config.max_pages ?? 10,
        max_depth: config.max_depth ?? 2,
        same_domain_only: config.same_domain_only ?? true,
        render_javascript: config.render_javascript ?? true,
        only_main_content: config.only_main_content ?? true,
        _scheduled: true,
        _schedule_id: schedule.id,
        _run_id: runId,
      };
      break;
    case "extract":
      endpoint = `${supabaseUrl}/functions/v1/extract`;
      body = {
        url: config.url,
        prompt: config.prompt ?? "Extract all key information",
        schema: config.schema ?? undefined,
        model: config.model ?? "google/gemini-3-flash-preview",
        _scheduled: true,
        _schedule_id: schedule.id,
        _run_id: runId,
      };
      break;
    default:
      return { jobId: null, content: "", error: `Unknown job type: ${jobType}` };
  }

  try {
    // Use the user's auth context by generating a token for them
    // Since this is a service-level operation, we use service role
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify(body),
    });

    const result = await res.json();

    if (!res.ok) {
      return {
        jobId: null,
        content: "",
        error: result.error?.message || result.error || `HTTP ${res.status}`,
      };
    }

    // Extract job ID and content from response
    const jobId = result.data?.id || result.id || null;
    const content = result.data?.markdown || result.data?.output_json
      ? JSON.stringify(result.data.output_json)
      : result.data?.markdown || "";

    return { jobId, content, error: null };
  } catch (err) {
    return {
      jobId: null,
      content: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = getAdmin();
  const now = new Date().toISOString();

  console.log(`Schedule runner triggered at ${now}`);

  // Find all active schedules that are due
  const { data: dueSchedules, error: fetchErr } = await admin
    .from("scheduled_jobs")
    .select("*")
    .eq("is_active", true)
    .lte("next_run_at", now)
    .order("next_run_at", { ascending: true })
    .limit(20); // Process max 20 per run

  if (fetchErr) {
    console.error("Error fetching due schedules:", fetchErr);
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!dueSchedules || dueSchedules.length === 0) {
    console.log("No schedules due");
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Found ${dueSchedules.length} due schedules`);

  let processed = 0;

  for (const schedule of dueSchedules) {
    try {
      // Create a run record
      const { data: run } = await admin
        .from("schedule_runs")
        .insert({
          schedule_id: schedule.id,
          job_type: schedule.job_type,
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (!run) {
        console.error(`Failed to create run record for schedule ${schedule.id}`);
        continue;
      }

      // Trigger the job
      const result = await triggerJob(admin, schedule, run.id);

      // Diff detection
      let contentChanged = false;
      let diffSummary: Record<string, unknown> | null = null;

      if (schedule.enable_diff && result.content && !result.error) {
        const newHash = await hashContent(result.content);
        if (schedule.last_content_hash && schedule.last_content_hash !== newHash) {
          contentChanged = true;
          diffSummary = {
            previous_hash: schedule.last_content_hash,
            new_hash: newHash,
            changed_at: new Date().toISOString(),
            content_length: result.content.length,
          };
        }

        // Update schedule with new hash
        await admin
          .from("scheduled_jobs")
          .update({
            last_content_hash: newHash,
            ...(contentChanged ? { last_diff_json: diffSummary } : {}),
          })
          .eq("id", schedule.id);
      }

      // Calculate next run
      const nextRun = calculateNextRun(schedule.cron_expression);

      // Update schedule state
      await admin
        .from("scheduled_jobs")
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextRun,
          last_job_id: result.jobId,
          last_status: result.error ? "failed" : "completed",
          run_count: (schedule.run_count || 0) + 1,
        })
        .eq("id", schedule.id);

      // Update run record
      await admin
        .from("schedule_runs")
        .update({
          job_id: result.jobId,
          status: result.error ? "failed" : "completed",
          content_hash: schedule.enable_diff && result.content
            ? await hashContent(result.content)
            : null,
          content_changed: contentChanged,
          diff_summary_json: diffSummary,
          error_message: result.error,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      processed++;
      console.log(
        `Schedule ${schedule.id} (${schedule.name}): ${result.error ? "FAILED" : "OK"} | next=${nextRun}`
      );
    } catch (err) {
      console.error(`Error processing schedule ${schedule.id}:`, err);
    }
  }

  return new Response(
    JSON.stringify({ processed, total_due: dueSchedules.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
