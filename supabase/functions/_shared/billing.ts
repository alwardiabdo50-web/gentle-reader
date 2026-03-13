import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Plan configuration — credits and rate limits */
const PLAN_CONFIG: Record<string, { monthly_credits: number; rpm: number }> = {
  free:    { monthly_credits: 500,    rpm: 5 },
  starter: { monthly_credits: 10000,  rpm: 60 },
  pro:     { monthly_credits: 50000,  rpm: 200 },
  scale:   { monthly_credits: 250000, rpm: 1000 },
};

export function getPlanConfig(plan: string) {
  return PLAN_CONFIG[plan] ?? PLAN_CONFIG.free;
}

function getAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export interface UserCredits {
  plan: string;
  included_monthly: number;
  extra: number;
  used_this_cycle: number;
  remaining: number;
  rpm: number;
  orgId: string | null;
}

/**
 * Calculate the authenticated user's current credit situation.
 * If orgId is provided, uses org credits instead of user credits.
 */
export async function getUserCredits(userId: string, orgId?: string | null): Promise<UserCredits> {
  const admin = getAdmin();

  if (orgId) {
    // Shared credits model: org members use the org owner's personal credits
    const { data: org } = await admin
      .from("organizations")
      .select("owner_id")
      .eq("id", orgId)
      .single();

    if (!org) {
      // Fallback to personal credits if org not found
      return getUserCredits(userId);
    }

    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("plan, monthly_credits, extra_credits, credits_used, current_period_start, current_period_end")
      .eq("user_id", org.owner_id)
      .single();

    const plan = ownerProfile?.plan ?? "free";
    const config = getPlanConfig(plan);
    const monthly = ownerProfile?.monthly_credits ?? config.monthly_credits;
    const extra = ownerProfile?.extra_credits ?? 0;
    const used = ownerProfile?.credits_used ?? 0;
    const remaining = Math.max(0, monthly + extra - used);

    return {
      plan,
      included_monthly: monthly,
      extra,
      used_this_cycle: used,
      remaining,
      rpm: config.rpm,
      orgId,
    };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("plan, monthly_credits, extra_credits, credits_used, current_period_start, current_period_end")
    .eq("user_id", userId)
    .single();

  const plan = profile?.plan ?? "free";
  const config = getPlanConfig(plan);
  const monthly = profile?.monthly_credits ?? config.monthly_credits;
  const extra = profile?.extra_credits ?? 0;
  const used = profile?.credits_used ?? 0;
  const remaining = Math.max(0, monthly + extra - used);

  return {
    plan,
    included_monthly: monthly,
    extra,
    used_this_cycle: used,
    remaining,
    rpm: config.rpm,
    orgId: null,
  };
}

/**
 * Check if a user has enough credits. Returns null if OK, or an error object.
 */
export async function checkQuota(userId: string, cost: number = 1, orgId?: string | null): Promise<{ code: string; message: string } | null> {
  const credits = await getUserCredits(userId, orgId);
  if (credits.remaining < cost) {
    return {
      code: "INSUFFICIENT_CREDITS",
      message: `Insufficient credits. You have ${credits.remaining} remaining but this operation costs ${cost}. Upgrade your plan or purchase additional credits.`,
    };
  }
  return null;
}

/**
 * Check rate limit (requests per minute) for a user.
 * Queries the usage_ledger for entries in the last 60 seconds.
 * Returns null if OK, or an error object if rate limit exceeded.
 */
export async function checkRateLimit(userId: string, orgId?: string | null): Promise<{ code: string; message: string } | null> {
  const credits = await getUserCredits(userId, orgId);
  const rpm = credits.rpm;

  const admin = getAdmin();
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

  const { count, error } = await admin
    .from("usage_ledger")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .lt("credits", 0) // only consumption entries
    .gte("created_at", oneMinuteAgo);

  if (error) {
    console.error("Rate limit check failed:", JSON.stringify(error));
    // Fail open — don't block on errors
    return null;
  }

  if ((count ?? 0) >= rpm) {
    return {
      code: "RATE_LIMIT_EXCEEDED",
      message: `Rate limit exceeded. Your plan allows ${rpm} requests per minute. Please wait and try again.`,
    };
  }

  return null;
}

export interface LedgerEntry {
  user_id: string;
  api_key_id?: string;
  action: string;        // event_type: scrape_charge, monthly_grant, etc.
  credits: number;       // negative = consumed, positive = added
  job_id?: string;       // source_id
  source_type?: string;  // scrape, crawl, extract, system
  balance_after: number;
  metadata_json?: Record<string, unknown>;
  org_id?: string | null;
}

/**
 * Record a ledger entry and update the user's credits_used counter.
 * If org_id is provided, updates org credits_used instead of profile.
 */
export async function recordLedgerEntry(entry: LedgerEntry): Promise<{ id: string }> {
  const admin = getAdmin();

  console.log(`Ledger: attempting insert user=${entry.user_id} action=${entry.action} credits=${entry.credits} job_id=${entry.job_id ?? "null"} source_type=${entry.source_type} org_id=${entry.org_id ?? "null"}`);

  const { data, error } = await admin
    .from("usage_ledger")
    .insert({
      user_id: entry.user_id,
      api_key_id: entry.api_key_id ?? null,
      action: entry.action,
      credits: entry.credits,
      job_id: entry.job_id ?? null,
      source_type: entry.source_type ?? "scrape",
      balance_after: entry.balance_after,
      metadata_json: entry.metadata_json ?? {},
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("BILLING ERROR: Failed to record ledger entry:", JSON.stringify(error));
    throw new Error(`Billing failed: ${error?.message ?? "no data returned"}`);
  }

  // Update credits_used on profile or org (increment by absolute consumed amount)
  if (entry.credits < 0) {
    const absAmount = Math.abs(entry.credits);

    if (entry.org_id) {
      // Update org credits
      const { data: org } = await admin
        .from("organizations")
        .select("credits_used")
        .eq("id", entry.org_id)
        .single();

      if (org) {
        const { error: updateError } = await admin
          .from("organizations")
          .update({ credits_used: org.credits_used + absAmount })
          .eq("id", entry.org_id);

        if (updateError) {
          console.error("BILLING ERROR: Failed to update org credits_used:", JSON.stringify(updateError));
        }
      }
    } else {
      // Update profile credits
      const { data: profile } = await admin
        .from("profiles")
        .select("credits_used")
        .eq("user_id", entry.user_id)
        .single();

      if (profile) {
        const { error: updateError } = await admin
          .from("profiles")
          .update({ credits_used: profile.credits_used + absAmount })
          .eq("user_id", entry.user_id);

        if (updateError) {
          console.error("BILLING ERROR: Failed to update profile credits_used:", JSON.stringify(updateError));
        }
      }
    }
  }

  console.log(`Ledger: SUCCESS user=${entry.user_id} action=${entry.action} amount=${entry.credits} balance=${entry.balance_after} ledger_id=${data.id}`);
  return data;
}
