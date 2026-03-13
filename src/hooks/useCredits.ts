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
  isOrg: boolean;
  orgName: string | null;
}

export function useCredits(): CreditInfo {
  const { user, activeOrg } = useAuth();
  const [state, setState] = useState<Omit<CreditInfo, "loading">>({
    plan: "free",
    creditsUsed: 0,
    creditsTotal: 500,
    creditsRemaining: 500,
    percentUsed: 0,
    isOrg: false,
    orgName: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCredits = async () => {
      setLoading(true);

      if (activeOrg) {
        // Shared credits model: org uses the owner's personal credits
        const { data, error } = await supabase
          .rpc("get_org_owner_credits", { _org_id: activeOrg.id });

        if (!error && data && data.length > 0) {
          const ownerCredits = data[0];
          const total = ownerCredits.monthly_credits + ownerCredits.extra_credits;
          const remaining = Math.max(0, total - ownerCredits.credits_used);
          const pct = total > 0 ? (ownerCredits.credits_used / total) * 100 : 0;
          setState({
            plan: ownerCredits.plan,
            creditsUsed: ownerCredits.credits_used,
            creditsTotal: total,
            creditsRemaining: remaining,
            percentUsed: pct,
            isOrg: true,
            orgName: activeOrg.name,
          });
        }
        setLoading(false);
        return;
      }

      // Personal credits from profile
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
          isOrg: false,
          orgName: null,
        });
      }
      setLoading(false);
    };

    fetchCredits();

    // Realtime subscription for personal profile updates
    if (!activeOrg) {
      const channel = supabase
        .channel("credits-hook")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles" },
          (payload) => {
            const u = payload.new as Record<string, unknown>;
            if ((u.user_id as string) !== user.id) return;

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
              isOrg: false,
              orgName: null,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    // Realtime for org updates
    const channel = supabase
      .channel("org-credits-hook")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "organizations" },
        (payload) => {
          const o = payload.new as Record<string, unknown>;
          if ((o.id as string) !== activeOrg.id) return;

          const monthlyCredits = (o.monthly_credits as number) ?? 500;
          const extraCredits = (o.extra_credits as number) ?? 0;
          const creditsUsed = (o.credits_used as number) ?? 0;
          const total = monthlyCredits + extraCredits;
          const remaining = Math.max(0, total - creditsUsed);
          const pct = total > 0 ? (creditsUsed / total) * 100 : 0;

          setState({
            plan: (o.plan as string) ?? "free",
            creditsUsed,
            creditsTotal: total,
            creditsRemaining: remaining,
            percentUsed: pct,
            isOrg: true,
            orgName: (o.name as string) ?? activeOrg.name,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeOrg]);

  return { ...state, loading };
}
