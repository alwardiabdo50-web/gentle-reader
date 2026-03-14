import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AIModel {
  id: string;
  provider_id: string;
  name: string;
  tier: "free" | "cheaper" | "expensive";
  credit_cost: number;
  min_plan: string;
  is_default: boolean;
  sort_order: number;
}

const PLAN_TIER_ACCESS: Record<string, string[]> = {
  free: ["free"],
  hobby: ["free", "cheaper"],
  standard: ["free", "cheaper", "expensive"],
  growth: ["free", "cheaper", "expensive"],
  scale: ["free", "cheaper", "expensive"],
};

export function useModels(userPlan = "free") {
  const query = useQuery({
    queryKey: ["ai-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_models" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AIModel[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const allowedTiers = PLAN_TIER_ACCESS[userPlan.toLowerCase()] ?? PLAN_TIER_ACCESS.free;

  const models = query.data ?? [];
  const accessibleModels = models.filter((m) => allowedTiers.includes(m.tier));
  const lockedModels = models.filter((m) => !allowedTiers.includes(m.tier));

  const grouped = {
    free: models.filter((m) => m.tier === "free"),
    cheaper: models.filter((m) => m.tier === "cheaper"),
    expensive: models.filter((m) => m.tier === "expensive"),
  };

  const defaultModel = models.find((m) => m.is_default)?.id ?? models[0]?.id ?? "google/gemini-3-flash-preview";

  return {
    ...query,
    models,
    accessibleModels,
    lockedModels,
    grouped,
    defaultModel,
    allowedTiers,
    canUseModel: (modelId: string) => {
      const model = models.find((m) => m.id === modelId);
      return model ? allowedTiers.includes(model.tier) : false;
    },
    getModelCost: (modelId: string) => {
      return models.find((m) => m.id === modelId)?.credit_cost ?? 0;
    },
  };
}
