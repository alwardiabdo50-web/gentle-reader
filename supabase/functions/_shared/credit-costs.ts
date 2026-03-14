import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Hardcoded fallbacks in case DB lookup fails
const FALLBACK_COSTS: Record<string, number> = {
  scrape: 1,
  crawl: 2,
  map: 1,
  extract: 5,
  screenshot: 2,
  js_rendering: 1,
};

/**
 * Get the credit cost for a given endpoint, optionally applying plan overrides.
 * Falls back to hardcoded defaults if DB is unavailable.
 */
export async function getCreditCost(
  admin: ReturnType<typeof createClient>,
  endpointId: string,
  planId?: string
): Promise<number> {
  try {
    const { data, error } = await admin
      .from("api_credit_costs")
      .select("base_cost, plan_overrides")
      .eq("id", endpointId)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.warn(`Credit cost lookup failed for ${endpointId}, using fallback`);
      return FALLBACK_COSTS[endpointId] ?? 1;
    }

    // Check plan override
    if (planId && data.plan_overrides && typeof data.plan_overrides === "object") {
      const overrides = data.plan_overrides as Record<string, number>;
      if (planId in overrides) {
        return overrides[planId];
      }
    }

    return data.base_cost;
  } catch (err) {
    console.error(`getCreditCost error for ${endpointId}:`, err);
    return FALLBACK_COSTS[endpointId] ?? 1;
  }
}
