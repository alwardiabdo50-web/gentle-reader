import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CreditInfo {
  plan: string;
  creditsUsed: number;
  creditsTotal: number;
  creditsRemaining: number;
  percentUsed: number;
  loading: boolean;
}

export function useCredits(): CreditInfo {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<CreditInfo, "loading">>({
    plan: "free",
    creditsUsed: 0,
    creditsTotal: 500,
    creditsRemaining: 500,
    percentUsed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, monthly_credits, extra_credits, credits_used")
        .eq("user_id", user.id)
        .single();

      if (data) {
        const total = data.monthly_credits + data.extra_credits;
        const remaining = Math.max(0, total - data.credits_used);
        const pct = total > 0 ? (data.credits_used / total) * 100 : 0;
        setState({
          plan: data.plan,
          creditsUsed: data.credits_used,
          creditsTotal: total,
          creditsRemaining: remaining,
          percentUsed: pct,
        });
      }
      setLoading(false);
    };

    fetchProfile();

    // Realtime subscription
    const channel = supabase
      .channel("credits-hook")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const u = payload.new as Record<string, unknown>;
          const userId = u.user_id as string;
          if (userId !== user.id) return;

          const monthlyCredits = (u.monthly_credits as number) ?? 500;
          const extraCredits = (u.extra_credits as number) ?? 0;
          const creditsUsed = (u.credits_used as number) ?? 0;
          const total = monthlyCredits + extraCredits;
          const remaining = Math.max(0, total - creditsUsed);
          const pct = total > 0 ? (creditsUsed / total) * 100 : 0;

          setState({
            plan: (u.plan as string) ?? "free",
            creditsUsed,
            creditsTotal: total,
            creditsRemaining: remaining,
            percentUsed: pct,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { ...state, loading };
}
