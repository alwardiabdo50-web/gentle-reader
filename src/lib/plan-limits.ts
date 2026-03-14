export type PlanId = "free" | "hobby" | "standard" | "growth" | "scale";

export type GatedFeature =
  | "webhooks"
  | "schedules"
  | "pipelines"
  | "extract"
  | "organizations";

export interface PlanLimits {
  maxApiKeys: number; // -1 = unlimited
  features: Record<GatedFeature, boolean>;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxApiKeys: 2,
    features: {
      webhooks: false,
      schedules: false,
      pipelines: false,
      extract: false,
      organizations: false,
    },
  },
  hobby: {
    maxApiKeys: 5,
    features: {
      webhooks: true,
      schedules: false,
      pipelines: false,
      extract: false,
      organizations: false,
    },
  },
  standard: {
    maxApiKeys: 10,
    features: {
      webhooks: true,
      schedules: true,
      pipelines: true,
      extract: true,
      organizations: true,
    },
  },
  growth: {
    maxApiKeys: 25,
    features: {
      webhooks: true,
      schedules: true,
      pipelines: true,
      extract: true,
      organizations: true,
    },
  },
  scale: {
    maxApiKeys: -1,
    features: {
      webhooks: true,
      schedules: true,
      pipelines: true,
      extract: true,
      organizations: true,
    },
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  const normalized = plan.toLowerCase() as PlanId;
  return PLAN_LIMITS[normalized] ?? PLAN_LIMITS.free;
}

export function canAccessFeature(plan: string, feature: GatedFeature): boolean {
  return getPlanLimits(plan).features[feature];
}

export function getMaxApiKeys(plan: string): number {
  return getPlanLimits(plan).maxApiKeys;
}

/** Human-readable minimum plan required for a feature */
export function minimumPlanForFeature(feature: GatedFeature): string {
  if (feature === "webhooks") return "Hobby";
  return "Standard";
}
