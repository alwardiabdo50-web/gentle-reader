import { extractApiKey, validateApiKey } from "../_shared/api-key-auth.ts";
import { getUserCredits } from "../_shared/billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "GET") {
    return json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use GET" } }, 405);
  }

  // Auth
  const rawKey = extractApiKey(req);
  if (!rawKey) {
    return json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing API key." },
    }, 401);
  }

  const authResult = await validateApiKey(rawKey);
  if (!authResult.ok) {
    return json({ success: false, error: { code: "UNAUTHORIZED", message: authResult.error } }, authResult.status);
  }

  const { ctx } = authResult;

  try {
    const credits = await getUserCredits(ctx.userId);

    return json({
      success: true,
      data: {
        plan: credits.plan,
        credits: {
          included_monthly: credits.included_monthly,
          extra: credits.extra,
          used_this_cycle: credits.used_this_cycle,
          remaining: credits.remaining,
        },
        rate_limits: {
          requests_per_minute: credits.rpm,
        },
      },
      meta: {},
      error: null,
    });
  } catch (error) {
    console.error("Error in /v1/usage:", error);
    return json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch usage" } }, 500);
  }
});
