import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  console.log(`Free credits reset triggered at ${new Date().toISOString()}`);

  // Find free-plan profiles whose period has ended
  const { data: expiredProfiles, error } = await admin
    .from("profiles")
    .select("user_id, monthly_credits, credits_used, current_period_end")
    .eq("plan", "free")
    .lt("current_period_end", new Date().toISOString());

  if (error) {
    console.error("Failed to query expired profiles:", JSON.stringify(error));
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!expiredProfiles || expiredProfiles.length === 0) {
    console.log("No free profiles need reset");
    return new Response(JSON.stringify({ reset: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Found ${expiredProfiles.length} free profiles to reset`);

  let resetCount = 0;
  for (const profile of expiredProfiles) {
    const now = new Date();
    const newPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        credits_used: 0,
        current_period_start: now.toISOString(),
        current_period_end: newPeriodEnd.toISOString(),
      })
      .eq("user_id", profile.user_id);

    if (updateError) {
      console.error(`Failed to reset profile for user=${profile.user_id}:`, JSON.stringify(updateError));
      continue;
    }

    // Record ledger entry
    await admin.from("usage_ledger").insert({
      user_id: profile.user_id,
      action: "monthly_grant",
      credits: profile.monthly_credits,
      balance_after: profile.monthly_credits,
      source_type: "system",
      metadata_json: {
        event: "free_plan_reset",
        previous_used: profile.credits_used,
      },
    });

    resetCount++;
  }

  console.log(`Reset ${resetCount} free profiles`);

  return new Response(JSON.stringify({ reset: resetCount }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
