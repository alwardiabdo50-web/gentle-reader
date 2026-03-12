import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function getAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ─── Cron helpers ────────────────────────────────────────────
const PRESET_CRONS: Record<string, string> = {
  "every_hour": "0 * * * *",
  "every_6_hours": "0 */6 * * *",
  "every_12_hours": "0 */12 * * *",
  "daily": "0 0 * * *",
  "weekly": "0 0 * * 0",
  "monthly": "0 0 1 * *",
};

/** Very basic cron validation */
function isValidCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  return parts.length === 5;
}

/** Calculate next run from a cron expression (simple implementation) */
function calculateNextRun(cronExpr: string, timezone: string): string {
  // For simplicity, we calculate a rough next run based on the cron pattern
  // The schedule-runner will do the precise matching
  const now = new Date();
  const parts = cronExpr.trim().split(/\s+/);
  const minute = parts[0];
  const hour = parts[1];
  
  const next = new Date(now);
  
  if (minute !== "*" && !minute.startsWith("*/")) {
    next.setMinutes(parseInt(minute));
  }
  if (hour !== "*" && !hour.startsWith("*/")) {
    next.setHours(parseInt(hour));
  }
  
  // If next is in the past, add appropriate interval
  if (next <= now) {
    if (hour === "*" || hour.startsWith("*/")) {
      // Runs every hour or more frequently
      next.setHours(next.getHours() + 1);
    } else {
      // Runs daily or less frequently
      next.setDate(next.getDate() + 1);
    }
  }
  
  return next.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ success: false, error: { message: "Unauthorized" } }, 401);

    const admin = getAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ success: false, error: { message: "Unauthorized" } }, 401);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const scheduleId = pathParts[pathParts.length - 1] !== "schedules-manage"
      ? pathParts[pathParts.length - 1]
      : null;

    // ─── GET ─────────────────────────────────────────────
    if (req.method === "GET") {
      // Get runs for a specific schedule
      if (url.searchParams.has("runs") && scheduleId) {
        const { data: runs } = await admin
          .from("schedule_runs")
          .select("*")
          .eq("schedule_id", scheduleId)
          .order("created_at", { ascending: false })
          .limit(50);
        return json({ success: true, data: runs ?? [] });
      }

      // List all schedules
      const { data: schedules } = await admin
        .from("scheduled_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      return json({ success: true, data: schedules ?? [] });
    }

    // ─── POST ────────────────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json();

      // ── Trigger (Run Now) ──────────────────────────────
      if (scheduleId && body.action === "trigger") {
        // Verify ownership
        const { data: schedule, error: fetchErr } = await admin
          .from("scheduled_jobs")
          .select("*")
          .eq("id", scheduleId)
          .eq("user_id", user.id)
          .single();
        if (fetchErr || !schedule) return json({ success: false, error: { message: "Schedule not found" } }, 404);

        // Call the schedule-runner's triggerJob logic inline
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Create run record
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
        if (!run) return json({ success: false, error: { message: "Failed to create run" } }, 500);

        // Build request for the job endpoint
        const config = schedule.config_json as Record<string, any>;
        let endpoint: string;
        let jobBody: Record<string, unknown>;

        switch (schedule.job_type) {
          case "scrape":
            endpoint = `${supabaseUrl}/functions/v1/scrape`;
            jobBody = { url: config.url, formats: config.formats ?? ["markdown"], render_javascript: config.render_javascript ?? true, only_main_content: config.only_main_content ?? true, _scheduled: true, _schedule_id: schedule.id, _run_id: run.id, _schedule_user_id: schedule.user_id };
            break;
          case "crawl":
            endpoint = `${supabaseUrl}/functions/v1/crawl`;
            jobBody = { url: config.url, max_pages: config.max_pages ?? 10, max_depth: config.max_depth ?? 2, same_domain_only: config.same_domain_only ?? true, _scheduled: true, _schedule_id: schedule.id, _run_id: run.id, _schedule_user_id: schedule.user_id };
            break;
          case "extract":
            endpoint = `${supabaseUrl}/functions/v1/extract`;
            jobBody = { url: config.url, prompt: config.prompt ?? "Extract all key information", model: config.model ?? "google/gemini-3-flash-preview", _scheduled: true, _schedule_id: schedule.id, _run_id: run.id, _schedule_user_id: schedule.user_id };
            break;
          default:
            return json({ success: false, error: { message: `Unknown job type` } }, 400);
        }

        let jobId: string | null = null;
        let content = "";
        let jobError: string | null = null;

        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
            body: JSON.stringify(jobBody),
          });
          const result = await res.json();
          if (!res.ok) {
            jobError = result.error?.message || result.error || `HTTP ${res.status}`;
          } else {
            jobId = result.data?.id || result.id || null;
            content = result.data?.markdown || (result.data?.output_json ? JSON.stringify(result.data.output_json) : "") || "";
          }
        } catch (err) {
          jobError = err instanceof Error ? err.message : String(err);
        }

        // Diff detection
        let contentChanged = false;
        let diffSummary: Record<string, unknown> | null = null;
        let contentHash: string | null = null;
        if (schedule.enable_diff && content && !jobError) {
          const encoder = new TextEncoder();
          const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(content));
          contentHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
          if (schedule.last_content_hash && schedule.last_content_hash !== contentHash) {
            contentChanged = true;
            diffSummary = { previous_hash: schedule.last_content_hash, new_hash: contentHash, changed_at: new Date().toISOString(), content_length: content.length };
          }
          await admin.from("scheduled_jobs").update({ last_content_hash: contentHash, ...(contentChanged ? { last_diff_json: diffSummary } : {}) }).eq("id", schedule.id);
        }

        // Update schedule
        await admin.from("scheduled_jobs").update({
          last_run_at: new Date().toISOString(),
          last_job_id: jobId,
          last_status: jobError ? "failed" : "completed",
          run_count: (schedule.run_count || 0) + 1,
        }).eq("id", schedule.id);

        // Update run
        await admin.from("schedule_runs").update({
          job_id: jobId, status: jobError ? "failed" : "completed",
          content_hash: contentHash, content_changed: contentChanged,
          diff_summary_json: diffSummary, error_message: jobError,
          finished_at: new Date().toISOString(),
        }).eq("id", run.id);

        return json({ success: true, data: { run_id: run.id, status: jobError ? "failed" : "completed", error: jobError } });
      }

      // ── Create schedule ────────────────────────────────
      const { name, description, job_type, config: cfgBody, cron_expression, preset, timezone, enable_diff } = body;

      if (!name || !job_type || !cfgBody) {
        return json({ success: false, error: { message: "name, job_type, and config are required" } }, 400);
      }

      if (!["scrape", "crawl", "extract"].includes(job_type)) {
        return json({ success: false, error: { message: "job_type must be scrape, crawl, or extract" } }, 400);
      }

      // Resolve cron expression
      let cron = cron_expression;
      if (preset && PRESET_CRONS[preset]) {
        cron = PRESET_CRONS[preset];
      }
      if (!cron || !isValidCron(cron)) {
        return json({ success: false, error: { message: "Invalid cron expression" } }, 400);
      }

      const tz = timezone || "UTC";
      const nextRun = calculateNextRun(cron, tz);

      const { data: schedule, error } = await admin
        .from("scheduled_jobs")
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          job_type,
          config_json: cfgBody,
          cron_expression: cron,
          timezone: tz,
          enable_diff: enable_diff ?? false,
          next_run_at: nextRun,
        })
        .select()
        .single();

      if (error) {
        console.error("Create schedule error:", error);
        return json({ success: false, error: { message: error.message } }, 500);
      }

      return json({ success: true, data: schedule }, 201);
    }

    // ─── PATCH ───────────────────────────────────────────
    if (req.method === "PATCH" && scheduleId) {
      const body = await req.json();
      const updates: Record<string, unknown> = {};

      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) updates.description = body.description;
      if (body.is_active !== undefined) {
        updates.is_active = body.is_active;
        // Recalculate next_run when re-activating
        if (body.is_active) {
          const { data: existing } = await admin
            .from("scheduled_jobs")
            .select("cron_expression, timezone")
            .eq("id", scheduleId)
            .eq("user_id", user.id)
            .single();
          if (existing) {
            updates.next_run_at = calculateNextRun(existing.cron_expression, existing.timezone);
          }
        }
      }
      if (body.enable_diff !== undefined) updates.enable_diff = body.enable_diff;
      if (body.config !== undefined) updates.config_json = body.config;
      if (body.cron_expression || body.preset) {
        let cron = body.cron_expression;
        if (body.preset && PRESET_CRONS[body.preset]) {
          cron = PRESET_CRONS[body.preset];
        }
        if (cron && isValidCron(cron)) {
          updates.cron_expression = cron;
          const tz = body.timezone || "UTC";
          updates.next_run_at = calculateNextRun(cron, tz);
        }
      }

      const { data: schedule, error } = await admin
        .from("scheduled_jobs")
        .update(updates)
        .eq("id", scheduleId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) return json({ success: false, error: { message: error.message } }, 500);
      return json({ success: true, data: schedule });
    }

    // ─── DELETE ──────────────────────────────────────────
    if (req.method === "DELETE" && scheduleId) {
      const { error } = await admin
        .from("scheduled_jobs")
        .delete()
        .eq("id", scheduleId)
        .eq("user_id", user.id);

      if (error) return json({ success: false, error: { message: error.message } }, 500);
      return json({ success: true });
    }

    return json({ success: false, error: { message: "Not found" } }, 404);
  } catch (err) {
    console.error("schedules-manage error:", err);
    return json({ success: false, error: { message: err instanceof Error ? err.message : "Internal error" } }, 500);
  }
});
