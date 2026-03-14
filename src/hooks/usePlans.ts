import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  yearly_price: number;
  monthly_credits: number;
  max_api_keys: number;
  rate_limit_rpm: number;
  features_json: Record<string, boolean>;
  description: string | null;
  display_features: string[];
  cta_text: string;
  highlighted: boolean;
  original_monthly_price: number | null;
  original_yearly_price: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePlans(includeInactive = false) {
  return useQuery({
    queryKey: ["plans", includeInactive],
    queryFn: async () => {
      let query = supabase
        .from("plans")
        .select("*")
        .order("sort_order", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as Plan[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
