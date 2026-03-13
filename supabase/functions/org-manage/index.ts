import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("authorization") ?? "";

  // Auth: get user from JWT
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    if (req.method === "GET") {
      // List user's orgs
      const { data, error } = await admin
        .from("org_members")
        .select("org_id, role, organizations(id, name, plan, monthly_credits, credits_used, extra_credits, current_period_end)")
        .eq("user_id", user.id);
      if (error) throw error;
      const orgs = (data || []).map((m: any) => ({
        id: m.organizations.id,
        name: m.organizations.name,
        role: m.role,
        plan: m.organizations.plan,
        monthly_credits: m.organizations.monthly_credits,
        credits_used: m.organizations.credits_used,
        extra_credits: m.organizations.extra_credits,
        current_period_end: m.organizations.current_period_end,
      }));
      return new Response(JSON.stringify({ orgs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const name = body.name?.trim();
      if (!name) {
        return new Response(JSON.stringify({ error: "Name is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create org
      const { data: org, error: orgError } = await admin
        .from("organizations")
        .insert({ name, owner_id: user.id })
        .select("id, name")
        .single();
      if (orgError) throw orgError;

      // Add creator as owner
      const { error: memberError } = await admin
        .from("org_members")
        .insert({ org_id: org.id, user_id: user.id, role: "owner", invited_by: user.id });
      if (memberError) throw memberError;

      return new Response(JSON.stringify({ org }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      const { org_id, name } = body;
      if (!org_id || !name?.trim()) {
        return new Response(JSON.stringify({ error: "org_id and name required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check ownership
      const { data: isOwner } = await admin.rpc("is_org_owner", { _user_id: user.id, _org_id: org_id });
      if (!isOwner) {
        return new Response(JSON.stringify({ error: "Only owners can update org" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await admin.from("organizations").update({ name: name.trim() }).eq("id", org_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      const body = await req.json();
      const { org_id } = body;

      const { data: isOwner } = await admin.rpc("is_org_owner", { _user_id: user.id, _org_id: org_id });
      if (!isOwner) {
        return new Response(JSON.stringify({ error: "Only owners can delete org" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await admin.from("organizations").delete().eq("id", org_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("org-manage error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
