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
}

/**
 * Calculate the authenticated user's current credit situation.
 */
export async function getUserCredits(userId: string): Promise<UserCredits> {
  const admin = getAdmin();

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
  };
}

/**
 * Check if a user has enough credits. Returns null if OK, or an error object.
 */
export async function checkQuota(userId: string, cost: number = 1): Promise<{ code: string; message: string } | null> {
  const credits = await getUserCredits(userId);
  if (credits.remaining < cost) {
    return {
      code: "INSUFFICIENT_CREDITS",
      message: `Insufficient credits. You have ${credits.remaining} remaining but this operation costs ${cost}. Upgrade your plan or purchase additional credits.`,
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
}

/**
 * Record a ledger entry and update the user's credits_used counter.
 */
export async function recordLedgerEntry(entry: LedgerEntry): Promise<{ id: string } | null> {
  const admin = getAdmin();

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

  if (error) {
    console.error("Failed to record ledger entry:", error);
    return null;
  }

  // Update credits_used on profile (increment by absolute consumed amount)
  if (entry.credits < 0) {
    const absAmount = Math.abs(entry.credits);
    // Use raw SQL-like increment via rpc or just read-update
    const { data: profile } = await admin
      .from("profiles")
      .select("credits_used")
      .eq("user_id", entry.user_id)
      .single();

    if (profile) {
      await admin
        .from("profiles")
        .update({ credits_used: profile.credits_used + absAmount })
        .eq("user_id", entry.user_id);
    }
  }

  console.log(`Ledger: user=${entry.user_id} action=${entry.action} amount=${entry.credits} balance=${entry.balance_after}`);
  return data;
}
