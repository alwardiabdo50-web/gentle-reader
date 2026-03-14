import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ApiCreditCost {
  id: string;
  label: string;
  base_cost: number;
  plan_overrides: Record<string, number>;
  is_addon: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useApiCreditCosts() {
  return useQuery({
    queryKey: ["api-credit-costs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_credit_costs")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as ApiCreditCost[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
