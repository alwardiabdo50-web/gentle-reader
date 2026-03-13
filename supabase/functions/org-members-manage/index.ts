import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  const userEmail = claimsData?.claims?.email as string | undefined;

  if (claimsError || !userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const user = { id: userId, email: userEmail ?? null };
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const action = body.action || "list";

    if (action === "list") {
      const orgId = body.org_id;
      if (!orgId) {
        return new Response(JSON.stringify({ error: "org_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: isMember } = await admin.rpc("is_org_member", { _user_id: user.id, _org_id: orgId });
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Not a member" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: members, error } = await admin
        .from("org_members")
        .select("id, user_id, role, joined_at, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const memberDetails = [];
      for (const m of members || []) {
        const { data: profile } = await admin
          .from("profiles")
          .select("full_name")
          .eq("user_id", m.user_id)
          .single();

        const { data: { user: memberUser } } = await admin.auth.admin.getUserById(m.user_id);

        memberDetails.push({
          ...m,
          email: memberUser?.email ?? "unknown",
          full_name: profile?.full_name ?? null,
        });
      }

      const { data: invitations } = await admin
        .from("org_invitations")
        .select("id, email, role, created_at, expires_at, accepted_at")
        .eq("org_id", orgId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({ members: memberDetails, invitations: invitations || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "my-invitations") {
      // Fetch all pending invitations for the current user's email
      if (!user.email) {
        return new Response(JSON.stringify({ invitations: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: invs } = await admin
        .from("org_invitations")
        .select("id, org_id, email, role, created_at, expires_at")
        .eq("email", user.email)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      const enriched = [];
      for (const inv of invs || []) {
        const { data: org } = await admin
          .from("organizations")
          .select("name")
          .eq("id", inv.org_id)
          .single();
        enriched.push({
          id: inv.id,
          org_name: org?.name ?? "Unknown",
          role: inv.role,
          email: inv.email,
          created_at: inv.created_at,
        });
      }

      return new Response(JSON.stringify({ invitations: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "decline") {
      const { invitation_id } = body;
      const { data: inv } = await admin
        .from("org_invitations")
        .select("id, email, accepted_at")
        .eq("id", invitation_id)
        .single();

      if (!inv) {
        return new Response(JSON.stringify({ error: "Invitation not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (inv.email !== user.email) {
        return new Response(JSON.stringify({ error: "Email mismatch" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin.from("org_invitations").delete().eq("id", invitation_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { invitation_id } = body;
      const { data: inv, error: invError } = await admin
        .from("org_invitations")
        .select("id, org_id, email, role, accepted_at, expires_at")
        .eq("id", invitation_id)
        .single();

      if (invError || !inv) {
        return new Response(JSON.stringify({ error: "Invitation not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (inv.accepted_at) {
        return new Response(JSON.stringify({ error: "Already accepted" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (inv.email !== user.email) {
        return new Response(JSON.stringify({ error: "Email mismatch" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(inv.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Invitation expired" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: memberErr } = await admin
        .from("org_members")
        .insert({ org_id: inv.org_id, user_id: user.id, role: inv.role, invited_by: user.id });
      if (memberErr) throw memberErr;

      await admin.from("org_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invitation_id);

      return new Response(JSON.stringify({ success: true, org_id: inv.org_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "invite") {
      const { org_id, email, role } = body;
      if (!org_id || !email || !role) {
        return new Response(JSON.stringify({ error: "org_id, email, and role required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: isOwner } = await admin.rpc("is_org_owner", { _user_id: user.id, _org_id: org_id });
      if (!isOwner) {
        return new Response(JSON.stringify({ error: "Only owners can invite" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existingMembers } = await admin
        .from("org_members")
        .select("id, user_id")
        .eq("org_id", org_id);

      for (const m of existingMembers || []) {
        const { data: { user: mUser } } = await admin.auth.admin.getUserById(m.user_id);
        if (mUser?.email === email) {
          return new Response(JSON.stringify({ error: "User is already a member" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { data: invitation, error: invError } = await admin
        .from("org_invitations")
        .insert({ org_id, email, role, invited_by: user.id })
        .select("id")
        .single();
      if (invError) throw invError;

      return new Response(JSON.stringify({ invitation }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "change_role") {
      const { org_id, member_id, role } = body;

      const { data: isOwner } = await admin.rpc("is_org_owner", { _user_id: user.id, _org_id: org_id });
      if (!isOwner) {
        return new Response(JSON.stringify({ error: "Only owners can change roles" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await admin.from("org_members").update({ role }).eq("id", member_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove") {
      const { org_id, member_id, invitation_id } = body;

      const { data: isOwner } = await admin.rpc("is_org_owner", { _user_id: user.id, _org_id: org_id });
      if (!isOwner) {
        return new Response(JSON.stringify({ error: "Only owners can remove members" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (invitation_id) {
        await admin.from("org_invitations").delete().eq("id", invitation_id);
      } else if (member_id) {
        const { data: member } = await admin.from("org_members").select("user_id, role").eq("id", member_id).single();
        if (member?.role === "owner" && member?.user_id === user.id) {
          return new Response(JSON.stringify({ error: "Cannot remove yourself as owner" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await admin.from("org_members").delete().eq("id", member_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("org-members-manage error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});