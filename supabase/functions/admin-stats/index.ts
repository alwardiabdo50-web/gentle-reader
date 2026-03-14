import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user via JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role using service role client
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || (req.method === "POST" ? null : "overview");

    // Handle POST actions (mutations)
    if (req.method === "POST") {
      const body = await req.json();
      const postAction = body.action;

      if (postAction === "contact-update") {
        const { contactId, status: newStatus } = body;
        if (!contactId || !["new", "read", "archived"].includes(newStatus)) {
          return new Response(JSON.stringify({ error: "contactId and valid status required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await admin.from("contact_requests").update({ status: newStatus }).eq("id", contactId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (postAction === "contact-delete") {
        const { contactId } = body;
        if (!contactId) {
          return new Response(JSON.stringify({ error: "contactId required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await admin.from("contact_requests").delete().eq("id", contactId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (postAction === "plan-update") {
        const { planId, ...fields } = body;
        if (!planId) {
          return new Response(JSON.stringify({ error: "planId required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const allowed = ["name", "monthly_price", "yearly_price", "monthly_credits", "max_api_keys", "rate_limit_rpm", "features_json", "description", "display_features", "cta_text", "highlighted", "sort_order", "is_active", "original_monthly_price", "original_yearly_price"];
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const key of allowed) {
          if (key in fields) updateData[key] = fields[key];
        }
        const { error } = await admin.from("plans").update(updateData).eq("id", planId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (postAction === "plan-create") {
        const { id, name, monthly_price, yearly_price, monthly_credits, max_api_keys, rate_limit_rpm, features_json, description, display_features, cta_text, highlighted, sort_order, original_monthly_price, original_yearly_price } = body;
        if (!id || !name) {
          return new Response(JSON.stringify({ error: "id and name required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await admin.from("plans").insert({
          id, name,
          monthly_price: monthly_price ?? 0,
          yearly_price: yearly_price ?? 0,
          monthly_credits: monthly_credits ?? 500,
          max_api_keys: max_api_keys ?? 2,
          rate_limit_rpm: rate_limit_rpm ?? 5,
          features_json: features_json ?? {},
          description: description ?? "",
          display_features: display_features ?? [],
          cta_text: cta_text ?? "Get Started",
          highlighted: highlighted ?? false,
          sort_order: sort_order ?? 0,
          original_monthly_price: original_monthly_price ?? null,
          original_yearly_price: original_yearly_price ?? null,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (postAction === "plan-delete") {
        const { planId } = body;
        if (!planId) {
          return new Response(JSON.stringify({ error: "planId required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await admin.from("plans").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", planId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Credit Cost mutations ─────────────────────────────
      if (postAction === "credit-cost-update") {
        const { costId, ...fields } = body;
        if (!costId) {
          return new Response(JSON.stringify({ error: "costId required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const allowed = ["label", "base_cost", "plan_overrides", "is_addon", "sort_order", "is_active"];
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const key of allowed) {
          if (key in fields) updateData[key] = fields[key];
        }
        const { error } = await admin.from("api_credit_costs").update(updateData).eq("id", costId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (postAction === "credit-cost-create") {
        const { id, label, base_cost, plan_overrides, is_addon, sort_order } = body;
        if (!id || !label) {
          return new Response(JSON.stringify({ error: "id and label required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await admin.from("api_credit_costs").insert({
          id,
          label,
          base_cost: base_cost ?? 1,
          plan_overrides: plan_overrides ?? {},
          is_addon: is_addon ?? false,
          sort_order: sort_order ?? 0,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (postAction === "credit-cost-delete") {
        const { costId } = body;
        if (!costId) {
          return new Response(JSON.stringify({ error: "costId required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await admin.from("api_credit_costs").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", costId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Changelog mutations ─────────────────────────────
      if (postAction === "changelog-create") {
        const { date, version, category, title, description, is_published, sort_order } = body;
        if (!date || !version || !category || !title || !description) {
          return new Response(JSON.stringify({ error: "date, version, category, title, description required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await admin.from("changelog_entries").insert({
          date, version, category, title, description,
          is_published: is_published !== false,
          sort_order: sort_order ?? 0,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (postAction === "changelog-update") {
        const { entryId, ...fields } = body;
        if (!entryId) {
          return new Response(JSON.stringify({ error: "entryId required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const allowed = ["date", "version", "category", "title", "description", "is_published", "sort_order"];
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const key of allowed) {
          if (key in fields) updateData[key] = fields[key];
        }
        const { error } = await admin.from("changelog_entries").update(updateData).eq("id", entryId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (postAction === "changelog-delete") {
        const { entryId } = body;
        if (!entryId) {
          return new Response(JSON.stringify({ error: "entryId required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await admin.from("changelog_entries").delete().eq("id", entryId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Settings mutations ─────────────────────────────
      if (postAction === "settings-update") {
        const { key, value: rawValue } = body;
        if (!key || rawValue === undefined) {
          return new Response(JSON.stringify({ error: "key and value required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Safety: if value arrived as a string (double-serialized), parse it back
        let value = rawValue;
        if (typeof rawValue === "string") {
          try { value = JSON.parse(rawValue); } catch { /* keep as-is */ }
        }
        const { error } = await admin
          .from("site_settings")
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Provider mutations ─────────────────────────────
      if (postAction === "provider-create") {
        const { id, name, base_url, is_default, sort_order } = body;
        if (!id || !name || !base_url) {
          return new Response(JSON.stringify({ error: "id, name, base_url required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { error } = await admin.from("ai_providers").insert({ id, name, base_url, is_default: is_default ?? false, sort_order: sort_order ?? 0 });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (postAction === "provider-update") {
        const { providerId, ...fields } = body;
        if (!providerId) {
          return new Response(JSON.stringify({ error: "providerId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const allowed = ["name", "base_url", "is_default", "is_active", "sort_order"];
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const key of allowed) { if (key in fields) updateData[key] = fields[key]; }
        const { error } = await admin.from("ai_providers").update(updateData).eq("id", providerId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (postAction === "provider-delete") {
        const { providerId } = body;
        if (!providerId) {
          return new Response(JSON.stringify({ error: "providerId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { error } = await admin.from("ai_providers").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", providerId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ─── Model mutations ─────────────────────────────
      if (postAction === "model-create") {
        const { id, provider_id, name, tier, credit_cost, min_plan, is_default, sort_order } = body;
        if (!id || !provider_id || !name) {
          return new Response(JSON.stringify({ error: "id, provider_id, name required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { error } = await admin.from("ai_models").insert({
          id, provider_id, name, tier: tier ?? "free", credit_cost: credit_cost ?? 0,
          min_plan: min_plan ?? "free", is_default: is_default ?? false, sort_order: sort_order ?? 0,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (postAction === "model-update") {
        const { modelId, ...fields } = body;
        if (!modelId) {
          return new Response(JSON.stringify({ error: "modelId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const allowed = ["provider_id", "name", "tier", "credit_cost", "min_plan", "is_default", "is_active", "sort_order"];
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const key of allowed) { if (key in fields) updateData[key] = fields[key]; }
        const { error } = await admin.from("ai_models").update(updateData).eq("id", modelId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (postAction === "model-delete") {
        const { modelId } = body;
        if (!modelId) {
          return new Response(JSON.stringify({ error: "modelId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { error } = await admin.from("ai_models").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", modelId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: Record<string, unknown> = {};

    if (action === "providers") {
      const { data, error } = await admin.from("ai_providers").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      result = { providers: data ?? [] };
    } else if (action === "models") {
      const { data, error } = await admin.from("ai_models").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      result = { models: data ?? [] };
    } else if (action === "credit-costs") {
      const { data: costs, error } = await admin
        .from("api_credit_costs")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      result = { costs: costs ?? [] };
    } else if (action === "plans") {
      const { data: plans, error } = await admin
        .from("plans")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      result = { plans: plans ?? [] };
    } else if (action === "overview") {
      const now = Date.now();
      const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();
      const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
      const oneDayAgo = new Date(now - 86400000).toISOString();
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

      // ─── Parallel batch 1: counts & profiles ─────────────
      const [
        { count: totalUsers },
        { count: activeKeys },
        { count: activeWebhooks },
        { count: activeSchedules },
        { count: pipelineRuns30d },
        { count: scrapeCount },
        { count: crawlCount },
        { count: extractCount },
        { count: failedScrapes },
        { count: failedCrawls },
        { count: failedExtracts },
        { count: newUsersToday },
        { count: newUsers7d },
        { count: rateLimitHits24h },
        { data: creditsData },
      ] = await Promise.all([
        admin.from("profiles").select("*", { count: "exact", head: true }),
        admin.from("api_keys").select("*", { count: "exact", head: true }).eq("is_active", true),
        admin.from("webhooks").select("*", { count: "exact", head: true }).eq("is_active", true),
        admin.from("scheduled_jobs").select("*", { count: "exact", head: true }).eq("is_active", true),
        admin.from("pipeline_runs").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
        admin.from("scrape_jobs").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
        admin.from("crawl_jobs").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
        admin.from("extraction_jobs").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
        admin.from("scrape_jobs").select("*", { count: "exact", head: true }).eq("status", "failed").gte("created_at", thirtyDaysAgo),
        admin.from("crawl_jobs").select("*", { count: "exact", head: true }).eq("status", "failed").gte("created_at", thirtyDaysAgo),
        admin.from("extraction_jobs").select("*", { count: "exact", head: true }).eq("status", "failed").gte("created_at", thirtyDaysAgo),
        admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
        admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
        admin.from("rate_limit_log").select("*", { count: "exact", head: true }).gte("hit_at", oneDayAgo).eq("was_limited", true),
        admin.from("profiles").select("user_id, full_name, credits_used, monthly_credits, extra_credits, plan"),
      ]);

      const totalCreditsUsed = creditsData?.reduce((s: number, p: { credits_used: number }) => s + p.credits_used, 0) ?? 0;
      const totalCreditsGranted = creditsData?.reduce((s: number, p: { monthly_credits: number; extra_credits: number }) => s + p.monthly_credits + p.extra_credits, 0) ?? 0;

      // Plan distribution
      const planDist: Record<string, number> = {};
      creditsData?.forEach((p: { plan: string }) => {
        planDist[p.plan] = (planDist[p.plan] || 0) + 1;
      });

      // Success rate
      const totalJobs30d = (scrapeCount ?? 0) + (crawlCount ?? 0) + (extractCount ?? 0);
      const totalFailed30d = (failedScrapes ?? 0) + (failedCrawls ?? 0) + (failedExtracts ?? 0);
      const successRate = totalJobs30d > 0 ? Math.round(((totalJobs30d - totalFailed30d) / totalJobs30d) * 10000) / 100 : 100;

      // ─── Parallel batch 2: detailed data ──────────────
      const [
        { data: recentScrapeFailures },
        { data: recentCrawlFailures },
        { data: recentExtractFailures },
        { data: topUsersData },
        { data: activeSubs },
        { data: scrapeJobs7d },
        { data: crawlJobs7d },
        { data: extractJobs7d },
        { data: avgDurationData },
        { data: recentSignups },
        { data: recentSubChanges },
        { data: extractionRows },
        { data: aiModelsData },
      ] = await Promise.all([
        admin.from("scrape_jobs").select("id, url, error_code, error_message, created_at, user_id, mode").eq("status", "failed").order("created_at", { ascending: false }).limit(5),
        admin.from("crawl_jobs").select("id, root_url, error_code, error_message, created_at, user_id").eq("status", "failed").order("created_at", { ascending: false }).limit(5),
        admin.from("extraction_jobs").select("id, source_url, error_code, error_message, created_at, user_id, model").eq("status", "failed").order("created_at", { ascending: false }).limit(5),
        admin.from("profiles").select("user_id, full_name, plan, credits_used").order("credits_used", { ascending: false }).limit(5),
        admin.from("subscriptions").select("user_id, status, provider_subscription_id, price_id").eq("status", "active"),
        admin.from("scrape_jobs").select("created_at").gte("created_at", sevenDaysAgo),
        admin.from("crawl_jobs").select("created_at").gte("created_at", sevenDaysAgo),
        admin.from("extraction_jobs").select("created_at").gte("created_at", sevenDaysAgo),
        admin.from("scrape_jobs").select("duration_ms").gte("created_at", oneDayAgo).not("duration_ms", "is", null),
        admin.from("profiles").select("user_id, full_name, created_at").order("created_at", { ascending: false }).limit(10),
        admin.from("subscriptions").select("user_id, status, created_at, updated_at").order("updated_at", { ascending: false }).limit(10),
        admin.from("extraction_jobs").select("model, credits_used, user_id, created_at").gte("created_at", thirtyDaysAgo),
        admin.from("ai_models").select("id, tier"),
      ]);

      // ─── MRR from plans ───────────────────────────────
      const { data: plansData } = await admin.from("plans").select("id, monthly_price");
      const planPriceMap: Record<string, number> = {};
      (plansData ?? []).forEach((p: { id: string; monthly_price: number }) => { planPriceMap[p.id] = p.monthly_price; });
      const userPlanMap: Record<string, string> = {};
      (creditsData ?? []).forEach((p: { user_id: string; plan: string }) => { if (p.user_id) userPlanMap[p.user_id] = p.plan; });
      
      // Count unique paying users from active subscriptions
      const payingUserIds = new Set((activeSubs ?? []).map((s: { user_id: string }) => s.user_id));
      let mrr = 0;
      payingUserIds.forEach((uid) => {
        const plan = userPlanMap[uid as string];
        if (plan && planPriceMap[plan]) mrr += planPriceMap[plan];
      });

      // ─── Jobs daily trend (7 days) ────────────────────
      const jobsDaily: Record<string, { scrapes: number; crawls: number; extractions: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 86400000).toISOString().substring(0, 10);
        jobsDaily[d] = { scrapes: 0, crawls: 0, extractions: 0 };
      }
      (scrapeJobs7d ?? []).forEach((r: { created_at: string }) => {
        const d = r.created_at.substring(0, 10);
        if (jobsDaily[d]) jobsDaily[d].scrapes++;
      });
      (crawlJobs7d ?? []).forEach((r: { created_at: string }) => {
        const d = r.created_at.substring(0, 10);
        if (jobsDaily[d]) jobsDaily[d].crawls++;
      });
      (extractJobs7d ?? []).forEach((r: { created_at: string }) => {
        const d = r.created_at.substring(0, 10);
        if (jobsDaily[d]) jobsDaily[d].extractions++;
      });
      const jobsDailyArray = Object.entries(jobsDaily).map(([date, counts]) => ({ date, ...counts }));

      // ─── Avg duration (24h) ───────────────────────────
      const durations = (avgDurationData ?? []).map((r: { duration_ms: number }) => r.duration_ms).filter(Boolean);
      const avgDurationMs24h = durations.length > 0 ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0;

      // ─── Activity feed (unified, last 20) ─────────────
      type ActivityItem = { type: string; timestamp: string; description: string; id: string };
      const activityItems: ActivityItem[] = [];
      
      (recentSignups ?? []).forEach((p: { user_id: string; full_name: string | null; created_at: string }) => {
        activityItems.push({ type: "signup", timestamp: p.created_at, description: p.full_name || "New user", id: `signup-${p.user_id}` });
      });
      (recentSubChanges ?? []).forEach((s: { user_id: string; status: string; updated_at: string }) => {
        activityItems.push({ type: "subscription", timestamp: s.updated_at, description: `Subscription ${s.status}`, id: `sub-${s.user_id}-${s.updated_at}` });
      });
      // Recent completed scrapes
      const { data: recentCompletedScrapes } = await admin.from("scrape_jobs").select("id, url, created_at").eq("status", "completed").order("created_at", { ascending: false }).limit(10);
      (recentCompletedScrapes ?? []).forEach((j: { id: string; url: string; created_at: string }) => {
        activityItems.push({ type: "scrape_completed", timestamp: j.created_at, description: j.url, id: `scrape-${j.id}` });
      });
      // Recent failed scrapes for feed
      (recentScrapeFailures ?? []).forEach((j: { id: string; url: string; created_at: string }) => {
        activityItems.push({ type: "scrape_failed", timestamp: j.created_at, description: j.url, id: `sfail-${j.id}` });
      });

      activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const recentActivity = activityItems.slice(0, 20);

      // ─── Model usage analytics (30d) ───────────────────
      const modelTierMap: Record<string, string> = {};
      (aiModelsData ?? []).forEach((m: { id: string; tier: string }) => { modelTierMap[m.id] = m.tier; });

      const modelAgg: Record<string, { total_jobs: number; credits: number; by_plan: Record<string, number> }> = {};
      (extractionRows ?? []).forEach((row: { model: string; credits_used: number; user_id: string }) => {
        if (!modelAgg[row.model]) modelAgg[row.model] = { total_jobs: 0, credits: 0, by_plan: {} };
        const agg = modelAgg[row.model];
        agg.total_jobs++;
        agg.credits += row.credits_used;
        const plan = userPlanMap[row.user_id] || "unknown";
        agg.by_plan[plan] = (agg.by_plan[plan] || 0) + 1;
      });

      const modelUsage = Object.entries(modelAgg)
        .map(([model, stats]) => ({ model, tier: modelTierMap[model] || "unknown", ...stats }))
        .sort((a, b) => b.total_jobs - a.total_jobs);

      const top5Models = modelUsage.slice(0, 5).map((m) => m.model);
      const dailyBuckets: Record<string, Record<string, number>> = {};
      (extractionRows ?? []).forEach((row: { model: string; created_at: string }) => {
        if (!top5Models.includes(row.model)) return;
        const date = row.created_at.substring(0, 10);
        if (!dailyBuckets[date]) dailyBuckets[date] = {};
        dailyBuckets[date][row.model] = (dailyBuckets[date][row.model] || 0) + 1;
      });
      const modelUsageTrend = Object.entries(dailyBuckets)
        .map(([date, models]) => ({ date, ...models }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const trendModels = top5Models.map((m) => ({ model: m, tier: modelTierMap[m] || "unknown" }));

      // Combined recent failures
      const recentFailures = [
        ...(recentScrapeFailures ?? []).map((f: Record<string, unknown>) => ({ ...f, mode: (f as { mode?: string }).mode || "scrape" })),
        ...(recentCrawlFailures ?? []).map((f: Record<string, unknown>) => ({ ...f, url: (f as { root_url?: string }).root_url, mode: "crawl" })),
        ...(recentExtractFailures ?? []).map((f: Record<string, unknown>) => ({ ...f, url: (f as { source_url?: string }).source_url, mode: "extract" })),
      ].sort((a, b) => new Date((b as { created_at: string }).created_at).getTime() - new Date((a as { created_at: string }).created_at).getTime()).slice(0, 10);

      result = {
        totalUsers: totalUsers ?? 0,
        activeKeys: activeKeys ?? 0,
        activeWebhooks: activeWebhooks ?? 0,
        activeSchedules: activeSchedules ?? 0,
        pipelineRuns30d: pipelineRuns30d ?? 0,
        scrapeCount: scrapeCount ?? 0,
        crawlCount: crawlCount ?? 0,
        extractCount: extractCount ?? 0,
        failedScrapes: failedScrapes ?? 0,
        failedCrawls: failedCrawls ?? 0,
        failedExtracts: failedExtracts ?? 0,
        totalCreditsUsed,
        totalCreditsGranted,
        planDistribution: planDist,
        recentFailures,
        modelUsage,
        modelUsageTrend,
        trendModels,
        // New fields
        newUsersToday: newUsersToday ?? 0,
        newUsers7d: newUsers7d ?? 0,
        successRate,
        mrr,
        jobsDaily: jobsDailyArray,
        topUsers: topUsersData ?? [],
        avgDurationMs24h,
        rateLimitHits24h: rateLimitHits24h ?? 0,
        recentActivity,
      };
    } else if (action === "users") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = 50;
      const offset = (page - 1) * limit;
      const search = url.searchParams.get("search") || "";

      let query = admin
        .from("profiles")
        .select("user_id, full_name, plan, credits_used, monthly_credits, extra_credits, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (search) {
        query = query.ilike("full_name", `%${search}%`);
      }

      const planFilter = url.searchParams.get("plan") || "all";
      if (planFilter !== "all") {
        query = query.eq("plan", planFilter);
      }

      const { data: users, count } = await query;

      // Get API key counts per user
      const userIds = users?.map((u) => u.user_id) ?? [];
      const { data: keyCounts } = await admin
        .from("api_keys")
        .select("user_id")
        .in("user_id", userIds)
        .eq("is_active", true);

      const keyCountMap: Record<string, number> = {};
      keyCounts?.forEach((k) => {
        keyCountMap[k.user_id] = (keyCountMap[k.user_id] || 0) + 1;
      });

      result = {
        users: users?.map((u) => ({ ...u, apiKeyCount: keyCountMap[u.user_id] || 0 })) ?? [],
        total: count ?? 0,
        page,
        limit,
      };
    } else if (action === "user-detail") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      const { data: keys } = await admin
        .from("api_keys")
        .select("id, name, key_prefix, is_active, created_at, last_used_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const { data: recentJobs } = await admin
        .from("scrape_jobs")
        .select("id, url, mode, status, credits_used, created_at, duration_ms")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: subscription } = await admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      result = { profile, keys: keys ?? [], recentJobs: recentJobs ?? [], subscription };
    } else if (action === "jobs") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = 50;
      const offset = (page - 1) * limit;
      const type = url.searchParams.get("type") || "all";
      const status = url.searchParams.get("status") || "all";

      if (type === "crawl") {
        let query = admin
          .from("crawl_jobs")
          .select("id, root_url, status, credits_used, created_at, finished_at, user_id, processed_count, failed_count", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (status !== "all") query = query.eq("status", status);
        const { data, count } = await query;
        result = { jobs: data ?? [], total: count ?? 0, page, limit, jobType: "crawl" };
      } else if (type === "extract") {
        let query = admin
          .from("extraction_jobs")
          .select("id, source_url, status, credits_used, created_at, finished_at, user_id, model, error_code", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (status !== "all") query = query.eq("status", status);
        const { data, count } = await query;
        result = { jobs: data ?? [], total: count ?? 0, page, limit, jobType: "extract" };
      } else {
        // scrape (default, includes map)
        let query = admin
          .from("scrape_jobs")
          .select("id, url, mode, status, credits_used, created_at, duration_ms, user_id, error_code, http_status_code", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (status !== "all") query = query.eq("status", status);
        if (type === "scrape") query = query.eq("mode", "scrape");
        if (type === "map") query = query.eq("mode", "map");
        const { data, count } = await query;
        result = { jobs: data ?? [], total: count ?? 0, page, limit, jobType: type };
      }
    } else if (action === "contacts") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = 20;
      const offset = (page - 1) * limit;
      const statusFilter = url.searchParams.get("status") || "all";

      let query = admin
        .from("contact_requests")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: contacts, count } = await query;

      result = { contacts: contacts ?? [], total: count ?? 0, page, limit };
    } else if (action === "contacts-export") {
      const statusFilter = url.searchParams.get("status") || "all";
      let query = admin
        .from("contact_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: contacts, error: exportError } = await query;
      if (exportError) throw exportError;

      result = { contacts: contacts ?? [] };
    } else if (action === "settings") {
      const { data: settings, error } = await admin
        .from("site_settings")
        .select("*");
      if (error) throw error;
      const settingsMap: Record<string, unknown> = {};
      settings?.forEach((s: { key: string; value: unknown }) => { settingsMap[s.key] = s.value; });
      result = { settings: settingsMap };
    } else if (action === "changelog") {
      const { data: entries, error } = await admin
        .from("changelog_entries")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      result = { entries: entries ?? [] };
    } else if (action === "billing") {
      const { data: subs } = await admin
        .from("subscriptions")
        .select("user_id, status, provider, price_id, product_id, current_period_end, cancel_at_period_end")
        .order("created_at", { ascending: false });

      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, plan, credits_used, monthly_credits, extra_credits");

      const { data: recentWebhooks } = await admin
        .from("webhook_events")
        .select("id, event_type, processed, created_at, error_message")
        .order("created_at", { ascending: false })
        .limit(20);

      result = {
        subscriptions: subs ?? [],
        profiles: profiles ?? [],
        recentWebhooks: recentWebhooks ?? [],
      };
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return new Response(
      JSON.stringify({ success: false, error: { message: err.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
