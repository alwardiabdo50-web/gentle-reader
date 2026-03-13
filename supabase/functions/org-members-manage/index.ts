import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("authorization") ?? "";
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
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "GET") {
      const orgId = url.searchParams.get("org_id");
      if (!orgId) {
        return new Response(JSON.stringify({ error: "org_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check membership
      const { data: isMember } = await admin.rpc("is_org_member", { _user_id: user.id, _org_id: orgId });
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Not a member" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get members
      const { data: members, error } = await admin
        .from("org_members")
        .select("id, user_id, role, joined_at, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Get user emails for each member
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

      // Get pending invitations
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

    if (req.method === "POST") {
      const body = await req.json();

      // Accept invitation
      if (action === "accept") {
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

        // Add member
        const { error: memberErr } = await admin
          .from("org_members")
          .insert({ org_id: inv.org_id, user_id: user.id, role: inv.role, invited_by: user.id });
        if (memberErr) throw memberErr;

        // Mark invitation accepted
        await admin.from("org_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invitation_id);

        return new Response(JSON.stringify({ success: true, org_id: inv.org_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Invite member
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

      // Check if already a member
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

    if (req.method === "PATCH") {
      const body = await req.json();
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

    if (req.method === "DELETE") {
      const body = await req.json();
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
        // Don't allow removing self if owner
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

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("org-members-manage error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
