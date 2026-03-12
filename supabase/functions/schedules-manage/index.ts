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
      const { name, description, job_type, config, cron_expression, preset, timezone, enable_diff } = body;

      if (!name || !job_type || !config) {
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
          config_json: config,
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
