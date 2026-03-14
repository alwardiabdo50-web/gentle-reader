import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserPlan, canAccessFeature } from "../_shared/plan-limits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth via session JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return json({ error: "Unauthorized" }, 401);
  }
  const userId = claimsData.claims.sub as string;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url = new URL(req.url);
  const pipelineId = url.searchParams.get("id");

  // GET — list pipelines
  if (req.method === "GET") {
    const { data, error } = await admin
      .from("pipelines")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return json({ error: error.message }, 500);
    return json({ pipelines: data });
  }

  // POST — create pipeline
  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (!body.name || typeof body.name !== "string") {
      return json({ error: "Field 'name' is required" }, 400);
    }

    const { data, error } = await admin
      .from("pipelines")
      .insert({
        user_id: userId,
        name: body.name,
        description: body.description ?? null,
        scrape_options: body.scrape_options ?? {},
        extract_schema: body.extract_schema ?? null,
        extract_prompt: body.extract_prompt ?? null,
        extract_model: body.extract_model ?? "google/gemini-3-flash-preview",
        transform_prompt: body.transform_prompt ?? null,
        transform_model: body.transform_model ?? "google/gemini-3-flash-preview",
      })
      .select()
      .single();

    if (error) return json({ error: error.message }, 500);
    return json({ pipeline: data }, 201);
  }

  // PUT — update pipeline
  if (req.method === "PUT") {
    if (!pipelineId) return json({ error: "Query param 'id' required" }, 400);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const updates: Record<string, unknown> = {};
    for (const key of ["name", "description", "scrape_options", "extract_schema", "extract_prompt", "extract_model", "transform_prompt", "transform_model", "is_active"]) {
      if (key in body) updates[key] = body[key];
    }

    const { data, error } = await admin
      .from("pipelines")
      .update(updates)
      .eq("id", pipelineId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) return json({ error: error.message }, 500);
    return json({ pipeline: data });
  }

  // DELETE
  if (req.method === "DELETE") {
    if (!pipelineId) return json({ error: "Query param 'id' required" }, 400);

    const { error } = await admin
      .from("pipelines")
      .delete()
      .eq("id", pipelineId)
      .eq("user_id", userId);

    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, 405);
});
