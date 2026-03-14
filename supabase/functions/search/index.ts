import { extractApiKey, validateApiKey } from "../_shared/api-key-auth.ts";
import { checkQuota, getUserCredits, recordLedgerEntry, checkRateLimit } from "../_shared/billing.ts";
import { getCreditCost } from "../_shared/credit-costs.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchRequest {
  query: string;
  limit?: number;
  lang?: string;
  country?: string;
  tbs?: string; // time filter: qdr:d, qdr:w, qdr:m, qdr:y
  scrape_content?: boolean;
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
  content?: string;
}

function getAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } }, 405);
  }

  // --- Auth ---
  const rawKey = extractApiKey(req);
  if (!rawKey) {
    return json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing API key. Use Authorization: Bearer <key> or X-API-Key header." },
    }, 401);
  }

  const authResult = await validateApiKey(rawKey);
  if (!authResult.ok) {
    return json({ success: false, error: { code: "UNAUTHORIZED", message: authResult.error } }, authResult.status);
  }
  const ctx = authResult.ctx;

  // --- Parse body ---
  let body: SearchRequest;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, 400);
  }

  if (!body.query || typeof body.query !== "string" || !body.query.trim()) {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "Field 'query' is required" } }, 400);
  }

  const query = body.query.trim();
  const limit = Math.min(Math.max(body.limit ?? 5, 1), 20);
  const lang = body.lang ?? "en";
  const country = body.country ?? "us";

  // --- Rate limit ---
  const rateLimitError = await checkRateLimit(ctx.userId);
  if (rateLimitError) {
    return json({ success: false, error: { code: rateLimitError.code, message: rateLimitError.message } }, 429);
  }

  // --- Credit cost ---
  const admin = getAdmin();
  const creditCost = await getCreditCost(admin, "search");

  // --- Quota check ---
  const quotaError = await checkQuota(ctx.userId, creditCost);
  if (quotaError) {
    return json({ success: false, error: { code: quotaError.code, message: quotaError.message } }, 402);
  }

  // --- Create job record ---
  const { data: job, error: insertError } = await admin
    .from("scrape_jobs")
    .insert({
      user_id: ctx.userId,
      api_key_id: ctx.apiKeyId,
      url: `search://${encodeURIComponent(query)}`,
      mode: "search",
      status: "running",
      request_json: { query, limit, lang, country, tbs: body.tbs ?? null } as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (insertError || !job) {
    console.error("Failed to create search job:", insertError);
    return json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create search job" } }, 500);
  }

  const startTime = Date.now();

  // --- Use Lovable AI with search grounding ---
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a web search assistant. Given a search query, return the top ${limit} most relevant and recent web results. For each result provide: title, url, and description. Return ONLY the structured data via the tool call. Results should be real, accurate web pages. Language: ${lang}, Country: ${country}.${body.tbs ? ` Time filter: ${body.tbs}` : ""}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_search_results",
              description: "Return structured search results",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        url: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["title", "url", "description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["results"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_search_results" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        await admin.from("scrape_jobs").update({ status: "failed", error_code: "RATE_LIMIT", error_message: "AI rate limit exceeded" }).eq("id", job.id);
        return json({ success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Rate limit exceeded, please try again later." } }, 429);
      }
      if (aiResponse.status === 402) {
        await admin.from("scrape_jobs").update({ status: "failed", error_code: "PAYMENT_REQUIRED", error_message: "AI credits exhausted" }).eq("id", job.id);
        return json({ success: false, error: { code: "PAYMENT_REQUIRED", message: "Payment required, please add funds." } }, 402);
      }

      throw new Error(`AI gateway returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let results: SearchResult[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        results = (parsed.results || []).slice(0, limit);
      } catch (e) {
        console.error("Failed to parse AI search results:", e);
        throw new Error("Failed to parse search results from AI");
      }
    }

    const durationMs = Date.now() - startTime;

    // --- Update job ---
    await admin.from("scrape_jobs").update({
      status: "completed",
      title: `Search: ${query}`,
      duration_ms: durationMs,
      credits_used: creditCost,
      metadata_json: { results_count: results.length, query, lang, country },
    }).eq("id", job.id);

    // --- Record ledger ---
    try {
      const userCredits = await getUserCredits(ctx.userId);
      const newBalance = Math.max(0, userCredits.remaining - creditCost);
      await recordLedgerEntry({
        user_id: ctx.userId,
        api_key_id: ctx.apiKeyId,
        action: "search_charge",
        credits: -creditCost,
        job_id: job.id,
        source_type: "search",
        balance_after: newBalance,
        metadata_json: { query, results_count: results.length, duration_ms: durationMs },
      });
    } catch (billingError) {
      console.error(`Billing error for search job=${job.id}:`, billingError);
    }

    return json({
      success: true,
      data: results,
      meta: {
        job_id: job.id,
        query,
        total_results: results.length,
        credits_used: creditCost,
        duration_ms: durationMs,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Search failed job=${job.id}:`, msg);

    await admin.from("scrape_jobs").update({
      status: "failed",
      error_code: "SEARCH_FAILED",
      error_message: msg,
    }).eq("id", job.id);

    return json({
      success: false,
      error: { code: "SEARCH_FAILED", message: msg },
      meta: { job_id: job.id },
    }, 500);
  }
});
