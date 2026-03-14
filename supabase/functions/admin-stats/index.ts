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

      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: Record<string, unknown> = {};

    if (action === "plans") {
      const { data: plans, error } = await admin
        .from("plans")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      result = { plans: plans ?? [] };
    } else if (action === "overview") {
      // Total users
      const { count: totalUsers } = await admin
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Active API keys
      const { count: activeKeys } = await admin
        .from("api_keys")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Job counts (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const { count: scrapeCount } = await admin
        .from("scrape_jobs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo);

      const { count: crawlCount } = await admin
        .from("crawl_jobs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo);

      const { count: extractCount } = await admin
        .from("extraction_jobs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo);

      // Failed jobs
      const { count: failedScrapes } = await admin
        .from("scrape_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", thirtyDaysAgo);

      const { count: failedCrawls } = await admin
        .from("crawl_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", thirtyDaysAgo);

      // Credits overview
      const { data: creditsData } = await admin
        .from("profiles")
        .select("credits_used, monthly_credits, extra_credits, plan");

      const totalCreditsUsed = creditsData?.reduce((s, p) => s + p.credits_used, 0) ?? 0;
      const totalCreditsGranted = creditsData?.reduce((s, p) => s + p.monthly_credits + p.extra_credits, 0) ?? 0;

      // Plan distribution
      const planDist: Record<string, number> = {};
      creditsData?.forEach((p) => {
        planDist[p.plan] = (planDist[p.plan] || 0) + 1;
      });

      // Recent failures
      const { data: recentFailures } = await admin
        .from("scrape_jobs")
        .select("id, url, error_code, error_message, created_at, user_id, mode")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(10);

      result = {
        totalUsers: totalUsers ?? 0,
        activeKeys: activeKeys ?? 0,
        scrapeCount: scrapeCount ?? 0,
        crawlCount: crawlCount ?? 0,
        extractCount: extractCount ?? 0,
        failedScrapes: failedScrapes ?? 0,
        failedCrawls: failedCrawls ?? 0,
        totalCreditsUsed,
        totalCreditsGranted,
        planDistribution: planDist,
        recentFailures: recentFailures ?? [],
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
