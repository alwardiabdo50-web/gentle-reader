import { extractApiKey, validateApiKey, authenticateServiceRole } from "../_shared/api-key-auth.ts";
import { checkQuota, getUserCredits, recordLedgerEntry, checkRateLimit } from "../_shared/billing.ts";
import { performScrape } from "../_shared/scrape-pipeline.ts";
import { buildCacheKey, getCachedResult, setCachedResult } from "../_shared/scrape-cache.ts";
import { dispatchWebhooks } from "../_shared/webhook-dispatch.ts";
import { normalizeUrl } from "../_shared/crawl-utils.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function getAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";
const MAX_INPUT_LENGTH = 50000;
const SCRAPE_CREDIT_COST = 1;
const EXTRACT_CREDIT_COST = 2;
const TRANSFORM_CREDIT_COST = 2;

const ALLOWED_MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-3.1-pro-preview",
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-5.2",
];

function pickModel(m?: string): string {
  return m && ALLOWED_MODELS.includes(m) ? m : DEFAULT_MODEL;
}

// ─── AI call ─────────────────────────────────────────────────
async function callAI(model: string, systemPrompt: string, userContent: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("AI gateway not configured");

  const truncated = userContent.length > MAX_INPUT_LENGTH
    ? userContent.slice(0, MAX_INPUT_LENGTH) + "\n\n[Content truncated]"
    : userContent;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: truncated },
        ],
        temperature: 0,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      if (res.status === 429) throw new Error("AI rate limit exceeded, please try again later");
      if (res.status === 402) throw new Error("AI credits exhausted, please add funds");
      throw new Error(`AI provider returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

// ─── JSON parsing ────────────────────────────────────────────
function extractAndParseJson(raw: string): unknown {
  try { return JSON.parse(raw); } catch { /* continue */ }

  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* continue */ }
  }

  const objMatch = raw.match(/(\{[\s\S]*\})/);
  if (objMatch) {
    try { return JSON.parse(objMatch[1]); } catch { /* continue */ }
  }

  const arrMatch = raw.match(/(\[[\s\S]*\])/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[1]); } catch { /* continue */ }
  }

  throw new Error("Failed to parse JSON from model output");
}

// ─── Schema validation ──────────────────────────────────────
function validateAgainstSchema(data: unknown, schema: Record<string, unknown>): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (schema.type === "object" && typeof data === "object" && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const required = (schema.required as string[]) ?? [];
    for (const field of required) {
      if (!(field in obj) || obj[field] === undefined) warnings.push(`Required field "${field}" is missing`);
    }
    return { valid: warnings.length === 0, warnings };
  }
  if (schema.type === "array" && Array.isArray(data)) return { valid: true, warnings };
  warnings.push(`Expected type "${schema.type}", got ${typeof data}`);
  return { valid: false, warnings };
}

// ─── Handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } }, 405);

  // Auth
  const clonedReq = req.clone();
  let peekBody: Record<string, unknown> = {};
  try { peekBody = await clonedReq.json(); } catch {}

  const serviceCtx = authenticateServiceRole(req, peekBody);
  let ctx: { userId: string; apiKeyId: string; plan?: string };

  if (serviceCtx) {
    ctx = serviceCtx;
  } else {
    const rawKey = extractApiKey(req);
    if (!rawKey) return json({ success: false, error: { code: "UNAUTHORIZED", message: "Missing API key" } }, 401);
    const authResult = await validateApiKey(rawKey);
    if (!authResult.ok) return json({ success: false, error: { code: "UNAUTHORIZED", message: authResult.error } }, authResult.status);
    ctx = authResult.ctx;
  }

  // Parse body
  let body: Record<string, unknown>;
  if (Object.keys(peekBody).length > 0) {
    body = peekBody;
  } else {
    try { body = await req.json(); } catch {
      return json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, 400);
    }
  }

  const sourceUrl = body.url as string | undefined;
  if (!sourceUrl || typeof sourceUrl !== "string") {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "Field 'url' is required" } }, 400);
  }

  const normalizedUrl = normalizeUrl(sourceUrl);
  if (!normalizedUrl) {
    return json({ success: false, error: { code: "INVALID_URL", message: `Invalid URL: ${sourceUrl}` } }, 422);
  }

  const admin = getAdmin();

  // Load config from saved pipeline or inline
  let pipelineId: string | null = null;
  let scrapeOptions: Record<string, unknown> = {};
  let extractPrompt: string | null = null;
  let extractSchema: Record<string, unknown> | null = null;
  let extractModel = DEFAULT_MODEL;
  let transformPrompt: string | null = null;
  let transformModel = DEFAULT_MODEL;

  if (body.pipeline_id) {
    const { data: pipeline, error } = await admin
      .from("pipelines")
      .select("*")
      .eq("id", body.pipeline_id)
      .eq("user_id", ctx.userId)
      .single();

    if (error || !pipeline) {
      return json({ success: false, error: { code: "NOT_FOUND", message: "Pipeline not found" } }, 404);
    }

    pipelineId = pipeline.id;
    scrapeOptions = (pipeline.scrape_options as Record<string, unknown>) ?? {};
    extractPrompt = pipeline.extract_prompt;
    extractSchema = pipeline.extract_schema as Record<string, unknown> | null;
    extractModel = pickModel(pipeline.extract_model);
    transformPrompt = pipeline.transform_prompt;
    transformModel = pickModel(pipeline.transform_model);
  } else {
    // Inline mode
    const extract = body.extract as Record<string, unknown> | undefined;
    const transform = body.transform as Record<string, unknown> | undefined;

    if (!extract || (!extract.prompt && !extract.schema)) {
      return json({ success: false, error: { code: "BAD_REQUEST", message: "Provide 'extract' with prompt/schema, or 'pipeline_id'" } }, 400);
    }

    scrapeOptions = (body.scrape_options as Record<string, unknown>) ?? {};
    extractPrompt = (extract.prompt as string) ?? null;
    extractSchema = (extract.schema as Record<string, unknown>) ?? null;
    extractModel = pickModel(extract.model as string);

    if (transform?.prompt) {
      transformPrompt = transform.prompt as string;
      transformModel = pickModel(transform.model as string);
    }
  }

  // Rate limit
  const rateLimitError = await checkRateLimit(ctx.userId);
  if (rateLimitError) return json({ success: false, error: { code: rateLimitError.code, message: rateLimitError.message } }, 429);

  // Calculate max cost
  const hasTransform = !!transformPrompt;
  const maxCost = SCRAPE_CREDIT_COST + EXTRACT_CREDIT_COST + (hasTransform ? TRANSFORM_CREDIT_COST : 0);

  const quotaError = await checkQuota(ctx.userId, maxCost);
  if (quotaError) return json({ success: false, error: { code: quotaError.code, message: quotaError.message } }, 402);

  // Create pipeline run
  const { data: run } = await admin
    .from("pipeline_runs")
    .insert({
      pipeline_id: pipelineId,
      user_id: ctx.userId,
      api_key_id: ctx.apiKeyId,
      source_url: normalizedUrl,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (!run) return json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create pipeline run" } }, 500);

  console.log(`Pipeline started run=${run.id} user=${ctx.userId} url=${normalizedUrl} transform=${hasTransform}`);

  try {
    // ─── Stage 1: Scrape ───────────────────────────────────
    let scrapeResult: Record<string, unknown>;
    let scrapeCacheHit = false;
    let scrapeCreditCost = SCRAPE_CREDIT_COST;
    const cacheTtl = typeof scrapeOptions.cache_ttl === "number" ? Math.max(0, scrapeOptions.cache_ttl as number) : 3600;

    // Check cache
    if (cacheTtl > 0) {
      const cacheKey = await buildCacheKey(normalizedUrl, {
        formats: ["markdown"],
        render_javascript: (scrapeOptions.render_javascript as boolean) ?? true,
        only_main_content: (scrapeOptions.only_main_content as boolean) ?? true,
        remove_selectors: (scrapeOptions.remove_selectors as string[]) ?? [],
      });
      const cached = await getCachedResult(cacheKey);
      if (cached) {
        scrapeCacheHit = true;
        scrapeCreditCost = 0;
        scrapeResult = {
          url: cached.url,
          final_url: cached.final_url,
          title: cached.title,
          markdown: cached.markdown,
          cache_hit: true,
        };
        console.log(`Pipeline scrape cache hit run=${run.id}`);
      }
    }

    if (!scrapeCacheHit) {
      const result = await performScrape({
        url: normalizedUrl,
        formats: ["markdown"],
        render_javascript: (scrapeOptions.render_javascript as boolean) ?? true,
        only_main_content: (scrapeOptions.only_main_content as boolean) ?? true,
        timeout_ms: (scrapeOptions.timeout_ms as number) ?? 30000,
        remove_selectors: (scrapeOptions.remove_selectors as string[]) ?? [],
      });

      scrapeResult = {
        url: result.url,
        final_url: result.final_url,
        title: result.title,
        markdown: result.markdown,
        cache_hit: false,
      };

      // Store in cache
      if (cacheTtl > 0) {
        const cacheKey = await buildCacheKey(normalizedUrl, {
          formats: ["markdown"],
          render_javascript: (scrapeOptions.render_javascript as boolean) ?? true,
          only_main_content: (scrapeOptions.only_main_content as boolean) ?? true,
          remove_selectors: (scrapeOptions.remove_selectors as string[]) ?? [],
        });
        setCachedResult(cacheKey, result, cacheTtl).catch((e) => console.error("Cache store error:", e));
      }
    }

    await admin.from("pipeline_runs").update({ scrape_result: scrapeResult! }).eq("id", run.id);

    const markdown = (scrapeResult! as any).markdown as string;
    if (!markdown) throw new Error("Scrape returned no markdown content");

    // ─── Stage 2: Extract ──────────────────────────────────
    let extractSystemPrompt = "You are a structured data extraction assistant. Return ONLY valid JSON, no explanations or code fences.";
    if (extractSchema && extractPrompt) {
      extractSystemPrompt += `\n\nThe user wants: ${extractPrompt}\n\nReturn JSON matching this schema:\n${JSON.stringify(extractSchema, null, 2)}`;
    } else if (extractSchema) {
      extractSystemPrompt += `\n\nExtract data matching this JSON schema:\n${JSON.stringify(extractSchema, null, 2)}`;
    } else if (extractPrompt) {
      extractSystemPrompt += `\n\nExtract the following: ${extractPrompt}\n\nReturn a JSON object with appropriate field names.`;
    }

    const extractRaw = await callAI(extractModel, extractSystemPrompt, `Here is the page content:\n\n${markdown}`);
    const extractedData = extractAndParseJson(extractRaw);

    let validation = { valid: true, warnings: [] as string[] };
    if (extractSchema) {
      validation = validateAgainstSchema(extractedData, extractSchema);
    }

    const extractResult = { data: extractedData, validation };
    await admin.from("pipeline_runs").update({ extract_result: extractResult as unknown as Record<string, unknown> }).eq("id", run.id);

    console.log(`Pipeline extract done run=${run.id} valid=${validation.valid}`);

    // ─── Stage 3: Transform (optional) ─────────────────────
    let transformResult: Record<string, unknown> | null = null;
    let transformCreditCost = 0;

    if (transformPrompt) {
      transformCreditCost = TRANSFORM_CREDIT_COST;
      const transformSystemPrompt = `You are a data transformation assistant. You receive JSON data and transform it according to instructions. Return ONLY valid JSON, no explanations or code fences.`;
      const transformInput = `Instructions: ${transformPrompt}\n\nInput data:\n${JSON.stringify(extractedData, null, 2)}`;

      const transformRaw = await callAI(transformModel, transformSystemPrompt, transformInput);
      const transformedData = extractAndParseJson(transformRaw);
      transformResult = { data: transformedData };

      await admin.from("pipeline_runs").update({ transform_result: transformResult as unknown as Record<string, unknown> }).eq("id", run.id);
      console.log(`Pipeline transform done run=${run.id}`);
    }

    const finalOutput = transformResult ? (transformResult.data as Record<string, unknown>) : extractedData;
    const totalCredits = scrapeCreditCost + EXTRACT_CREDIT_COST + transformCreditCost;

    // ─── Billing ───────────────────────────────────────────
    const credits = await getUserCredits(ctx.userId);
    const newBalance = Math.max(0, credits.remaining - totalCredits);

    await recordLedgerEntry({
      user_id: ctx.userId,
      api_key_id: ctx.apiKeyId,
      action: "pipeline_charge",
      credits: -totalCredits,
      source_type: "pipeline",
      balance_after: newBalance,
      metadata_json: {
        url: normalizedUrl,
        pipeline_id: pipelineId,
        run_id: run.id,
        scrape_cost: scrapeCreditCost,
        extract_cost: EXTRACT_CREDIT_COST,
        transform_cost: transformCreditCost,
        cache_hit: scrapeCacheHit,
      },
    });

    // ─── Finalize ──────────────────────────────────────────
    await admin.from("pipeline_runs").update({
      status: "completed",
      final_output: finalOutput as Record<string, unknown>,
      credits_used: totalCredits,
      finished_at: new Date().toISOString(),
    }).eq("id", run.id);

    console.log(`Pipeline completed run=${run.id} credits=${totalCredits}`);

    dispatchWebhooks({
      userId: ctx.userId,
      eventType: "pipeline.completed",
      jobId: run.id,
      jobType: "pipeline",
      payload: { url: normalizedUrl, pipeline_id: pipelineId, credits_used: totalCredits },
    }).catch((e) => console.error("Webhook dispatch error:", e));

    return json({
      success: true,
      data: {
        url: normalizedUrl,
        stages: {
          scrape: { title: (scrapeResult! as any).title, markdown: markdown?.slice(0, 500), cache_hit: scrapeCacheHit },
          extract: extractResult,
          ...(transformResult ? { transform: transformResult } : {}),
        },
        final_output: finalOutput,
      },
      meta: {
        run_id: run.id,
        pipeline_id: pipelineId,
        credits_used: totalCredits,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Pipeline failed run=${run.id}: ${msg}`);

    const errorCode = msg.includes("parse JSON") ? "EXTRACTION_FAILED"
      : msg.includes("rate limit") ? "RATE_LIMIT"
      : msg.includes("credits") ? "BILLING_ERROR"
      : "INTERNAL_ERROR";

    await admin.from("pipeline_runs").update({
      status: "failed",
      error_code: errorCode,
      error_message: msg,
      finished_at: new Date().toISOString(),
    }).eq("id", run.id);

    dispatchWebhooks({
      userId: ctx.userId,
      eventType: "pipeline.failed",
      jobId: run.id,
      jobType: "pipeline",
      payload: { url: normalizedUrl, error: { code: errorCode, message: msg } },
    }).catch((e) => console.error("Webhook dispatch error:", e));

    return json({
      success: false,
      error: { code: errorCode, message: msg },
      meta: { run_id: run.id },
    }, errorCode === "EXTRACTION_FAILED" ? 422 : 500);
  }
});
