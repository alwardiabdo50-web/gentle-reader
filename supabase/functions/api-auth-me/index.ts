import { extractApiKey, validateApiKey } from "../_shared/api-key-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawKey = extractApiKey(req);
    if (!rawKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing API key. Use Authorization: Bearer <key> or X-API-Key header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await validateApiKey(rawKey);
    if (!result.ok) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user_id: result.ctx.userId,
          api_key_id: result.ctx.apiKeyId,
          api_key_name: result.ctx.apiKeyName,
          plan: result.ctx.plan,
          authenticated_via: "api_key",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in /v1/me:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
