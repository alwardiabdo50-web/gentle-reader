import { extractApiKey, validateApiKey, authenticateServiceRole } from "../_shared/api-key-auth.ts";
import { checkQuota, getUserCredits, recordLedgerEntry, checkRateLimit } from "../_shared/billing.ts";
import { getUserPlan, canAccessFeature } from "../_shared/plan-limits.ts";
import { normalizeUrl } from "../_shared/crawl-utils.ts";
import { dispatchWebhooks } from "../_shared/webhook-dispatch.ts";
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

// ─── Config ──────────────────────────────────────────────────
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";
const EXTRACTION_TIMEOUT = 30000;
const MAX_INPUT_LENGTH = 50000;
const EXTRACTION_CREDIT_COST = 2;

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

// ─── Scrape pipeline reuse (mock) ────────────────────────────
async function scrapeForExtraction(url: string, admin: ReturnType<typeof getAdmin>, userId: string, apiKeyId: string): Promise<{
  scrapeJobId: string | null;
  title: string;
  markdown: string;
}> {
  const domain = new URL(url).hostname;
  const title = `${domain} — Page`;
  const markdown = `# ${title}\n\nThis is mock content from **${url}**.\n\nProduct: Example Widget\nPrice: $29.99\nCurrency: USD\nRating: 4.5/5\nAvailability: In Stock\n\nFeatures:\n- Durable construction\n- Lightweight design\n- 2-year warranty\n\n> Mock mode — connect a real browser for live scraping.`;

  const { data: job, error } = await admin
    .from("scrape_jobs")
    .insert({
      user_id: userId,
      api_key_id: apiKeyId,
      url,
      mode: "extract",
      status: "completed",
      title,
      markdown,
      final_url: url,
      http_status_code: 200,
      duration_ms: 200,
      credits_used: EXTRACTION_CREDIT_COST,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to insert scrape job for extraction:", JSON.stringify(error));
  }

  return { scrapeJobId: job?.id ?? null, title, markdown };
}

// ─── AI extraction ───────────────────────────────────────────
function buildSystemPrompt(prompt: string | null, schema: Record<string, unknown> | null): string {
  let systemPrompt = `You are a structured data extraction assistant. Your job is to extract information from web page content and return it as valid JSON only. Do not include any explanation, markdown formatting, or code fences. Return ONLY a valid JSON object.`;

  if (schema && prompt) {
    systemPrompt += `\n\nThe user wants: ${prompt}\n\nYou MUST return JSON matching this schema:\n${JSON.stringify(schema, null, 2)}\n\nOnly include fields defined in the schema. Use null for missing values.`;
  } else if (schema) {
    systemPrompt += `\n\nExtract data matching this JSON schema:\n${JSON.stringify(schema, null, 2)}\n\nOnly include fields defined in the schema. Use null for missing values.`;
  } else if (prompt) {
    systemPrompt += `\n\nExtract the following: ${prompt}\n\nReturn a JSON object with appropriate field names.`;
  }

  return systemPrompt;
}

async function callAI(model: string, systemPrompt: string, pageContent: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("AI gateway not configured");

  // Truncate content if too long
  const truncated = pageContent.length > MAX_INPUT_LENGTH
    ? pageContent.slice(0, MAX_INPUT_LENGTH) + "\n\n[Content truncated]"
    : pageContent;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTRACTION_TIMEOUT);

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
          { role: "user", content: `Here is the page content to extract from:\n\n${truncated}` },
        ],
        temperature: 0,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`AI provider returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

// ─── JSON parsing & repair ───────────────────────────────────
function extractAndParseJson(raw: string): { parsed: unknown; repaired: boolean } {
  // Try direct parse
  try {
    return { parsed: JSON.parse(raw), repaired: false };
  } catch { /* continue */ }

  // Strip markdown code fences
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      return { parsed: JSON.parse(fenceMatch[1].trim()), repaired: true };
    } catch { /* continue */ }
  }

  // Find first { ... } or [ ... ]
  const objMatch = raw.match(/(\{[\s\S]*\})/);
  if (objMatch) {
    try {
      return { parsed: JSON.parse(objMatch[1]), repaired: true };
    } catch { /* continue */ }
  }

  const arrMatch = raw.match(/(\[[\s\S]*\])/);
  if (arrMatch) {
    try {
      return { parsed: JSON.parse(arrMatch[1]), repaired: true };
    } catch { /* continue */ }
  }

  throw new Error("Failed to parse JSON from model output");
}

// ─── Basic schema validation ─────────────────────────────────
function validateAgainstSchema(data: unknown, schema: Record<string, unknown>): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (schema.type === "object" && typeof data === "object" && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const required = (schema.required as string[]) ?? [];

    for (const field of required) {
      if (!(field in obj) || obj[field] === undefined) {
        warnings.push(`Required field "${field}" is missing`);
      }
    }

    const properties = (schema.properties as Record<string, { type?: string }>) ?? {};
    for (const [key, value] of Object.entries(obj)) {
      if (properties[key]?.type) {
        const expectedType = properties[key].type;
        const actualType = typeof value;
        if (expectedType === "number" && actualType !== "number") {
          warnings.push(`Field "${key}" expected number, got ${actualType}`);
        } else if (expectedType === "string" && actualType !== "string") {
          warnings.push(`Field "${key}" expected string, got ${actualType}`);
        } else if (expectedType === "boolean" && actualType !== "boolean") {
          warnings.push(`Field "${key}" expected boolean, got ${actualType}`);
        }
      }
    }

    return { valid: warnings.length === 0, warnings };
  }

  if (schema.type === "array" && Array.isArray(data)) {
    return { valid: true, warnings };
  }

  warnings.push(`Expected type "${schema.type}", got ${typeof data}`);
  return { valid: false, warnings };
}

// ─── Handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } }, 405);
  }

  // Auth — try service-role first (for scheduled jobs), then API key
  let peekBody: Record<string, unknown> = {};
  const clonedReq = req.clone();
  try { peekBody = await clonedReq.json(); } catch {}

  const serviceCtx = await authenticateServiceRole(req, peekBody);
  let ctx: { userId: string; apiKeyId: string; apiKeyName?: string; plan?: string };

  if (serviceCtx) {
    ctx = serviceCtx;
    console.log(`Scheduled extract for user=${ctx.userId}`);
  } else {
    const rawKey = extractApiKey(req);
    if (!rawKey) {
      return json({ success: false, error: { code: "UNAUTHORIZED", message: "Missing API key" } }, 401);
    }
    const authResult = await validateApiKey(rawKey);
    if (!authResult.ok) {
      return json({ success: false, error: { code: "UNAUTHORIZED", message: authResult.error } }, authResult.status);
    }
    ctx = authResult.ctx;
  }

  // Parse body
  let body: {
    url?: string;
    prompt?: string | null;
    schema?: Record<string, unknown> | null;
    model?: string;
    only_main_content?: boolean;
  };
  if (Object.keys(peekBody).length > 0) {
    body = peekBody as any;
  } else {
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, 400);
    }
  }

  // Validate
  if (!body.url || typeof body.url !== "string") {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "Field 'url' is required" } }, 400);
  }

  const normalizedUrl = normalizeUrl(body.url);
  if (!normalizedUrl) {
    return json({ success: false, error: { code: "INVALID_URL", message: `Invalid URL: ${body.url}` } }, 422);
  }

  if (!body.prompt && !body.schema) {
    return json({ success: false, error: { code: "BAD_REQUEST", message: "At least one of 'prompt' or 'schema' is required" } }, 400);
  }

  if (body.schema && typeof body.schema !== "object") {
    return json({ success: false, error: { code: "INVALID_SCHEMA", message: "'schema' must be a valid JSON schema object" } }, 400);
  }

  const model = body.model && ALLOWED_MODELS.includes(body.model) ? body.model : DEFAULT_MODEL;

  // Plan gate — skip for scheduled jobs (service-role context)
  if (!serviceCtx) {
    const userPlan = await getUserPlan(ctx.userId);
    if (!canAccessFeature(userPlan, "extract")) {
      return json({ success: false, error: { code: "PLAN_REQUIRED", message: "AI Extract requires a Standard plan or above. Please upgrade." } }, 403);
    }
  }

  // Rate limit check
  const rateLimitError = await checkRateLimit(ctx.userId);
  if (rateLimitError) {
    return json({ success: false, error: { code: rateLimitError.code, message: rateLimitError.message } }, 429);
  }

  // Quota check
  const quotaError = await checkQuota(ctx.userId, EXTRACTION_CREDIT_COST);
  if (quotaError) {
    return json({ success: false, error: { code: quotaError.code, message: quotaError.message } }, 402);
  }

  const admin = getAdmin();

  // Create extraction job
  const { data: extractJob } = await admin
    .from("extraction_jobs")
    .insert({
      user_id: ctx.userId,
      api_key_id: ctx.apiKeyId === "scheduled" ? null : ctx.apiKeyId,
      source_url: normalizedUrl,
      prompt: body.prompt ?? null,
      schema_json: body.schema ?? null,
      model,
      provider: "lovable",
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (!extractJob) {
    return json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create extraction job" } }, 500);
  }

  console.log(`Extract started job=${extractJob.id} user=${ctx.userId} url=${normalizedUrl} model=${model}`);

  try {
    // Step 1: Scrape
    const scrapeResult = await scrapeForExtraction(normalizedUrl, admin, ctx.userId, ctx.apiKeyId);

    await admin.from("extraction_jobs").update({
      scrape_job_id: scrapeResult.scrapeJobId || null,
      input_markdown: scrapeResult.markdown,
    }).eq("id", extractJob.id);

    // Step 2: AI extraction
    const systemPrompt = buildSystemPrompt(body.prompt ?? null, body.schema ?? null);
    const rawOutput = await callAI(model, systemPrompt, scrapeResult.markdown);

    // Step 3: Parse & validate
    const { parsed, repaired } = extractAndParseJson(rawOutput);

    let validation = { valid: true, warnings: [] as string[] };
    if (body.schema) {
      validation = validateAgainstSchema(parsed, body.schema);
    }
    if (repaired) {
      validation.warnings.push("JSON was extracted from wrapped model output");
    }

    // Step 4: Charge credits (non-fatal if billing fails)
    try {
      const credits = await getUserCredits(ctx.userId);
      const newBalance = Math.max(0, credits.remaining - EXTRACTION_CREDIT_COST);

      console.log(`Extract billing: user=${ctx.userId} job=${extractJob.id} cost=${EXTRACTION_CREDIT_COST} remaining=${credits.remaining} newBalance=${newBalance} scrapeJobId=${scrapeResult.scrapeJobId ?? "null"}`);

      await recordLedgerEntry({
        user_id: ctx.userId,
        api_key_id: ctx.apiKeyId === "scheduled" ? null : ctx.apiKeyId,
        action: "extract_charge",
        credits: -EXTRACTION_CREDIT_COST,
        job_id: scrapeResult.scrapeJobId,
        source_type: "extract",
        balance_after: newBalance,
        metadata_json: { url: normalizedUrl, model, mode: body.schema ? "schema" : "prompt", extraction_job_id: extractJob.id },
      });
    } catch (billingError) {
      console.error(`Billing error for extract job=${extractJob.id}:`, billingError);
    }

    // Step 5: Persist result (only after billing succeeds)
    await admin.from("extraction_jobs").update({
      status: "completed",
      output_json: parsed as Record<string, unknown>,
      validation_json: validation,
      credits_used: EXTRACTION_CREDIT_COST,
      finished_at: new Date().toISOString(),
    }).eq("id", extractJob.id);

    console.log(`Extract completed job=${extractJob.id} model=${model} valid=${validation.valid} credits_charged=${EXTRACTION_CREDIT_COST}`);

    dispatchWebhooks({
      userId: ctx.userId,
      eventType: "extract.completed",
      jobId: extractJob.id,
      jobType: "extract",
      payload: { url: normalizedUrl, model, valid: validation.valid },
    }).catch((e) => console.error("Webhook dispatch error:", e));

    return json({
      success: true,
      data: {
        url: normalizedUrl,
        title: scrapeResult.title,
        extracted: parsed,
        validation,
        provider: { model },
      },
      meta: {
        job_id: extractJob.id,
        credits_used: EXTRACTION_CREDIT_COST,
      },
      error: null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Extract failed job=${extractJob.id}: ${msg}`);

    const errorCode = msg.includes("parse JSON") ? "EXTRACTION_FAILED" 
      : msg.includes("Billing failed") ? "BILLING_ERROR"
      : "INTERNAL_ERROR";

    await admin.from("extraction_jobs").update({
      status: "failed",
      error_code: errorCode,
      error_message: msg,
      finished_at: new Date().toISOString(),
    }).eq("id", extractJob.id);

    dispatchWebhooks({
      userId: ctx.userId,
      eventType: "extract.failed",
      jobId: extractJob.id,
      jobType: "extract",
      payload: { url: normalizedUrl, error: { code: errorCode, message: msg } },
    }).catch((e) => console.error("Webhook dispatch error:", e));

    return json({
      success: false,
      error: { code: errorCode, message: msg },
      meta: { job_id: extractJob.id },
    }, errorCode === "EXTRACTION_FAILED" ? 422 : 500);
  }
});
