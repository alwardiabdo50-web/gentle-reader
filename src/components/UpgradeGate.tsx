import { useCredits } from "@/hooks/useCredits";
import { usePlans } from "@/hooks/usePlans";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReactNode } from "react";

export type GatedFeature =
  | "webhooks"
  | "schedules"
  | "pipelines"
  | "extract"
  | "organizations";

const FEATURE_LABELS: Record<GatedFeature, string> = {
  webhooks: "Webhooks",
  schedules: "Scheduled Jobs",
  pipelines: "Pipelines",
  extract: "AI Extract",
  organizations: "Organizations",
};

interface UpgradeGateProps {
  feature: GatedFeature;
  children: ReactNode;
}

export function UpgradeGate({ feature, children }: UpgradeGateProps) {
  const { plan, loading } = useCredits();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const navigate = useNavigate();

  if (loading || plansLoading) return null;

  // Check if current plan has access to the feature
  const currentPlan = plans?.find((p) => p.id === plan.toLowerCase());
  const hasAccess = currentPlan?.features_json?.[feature] ?? false;

  if (hasAccess) {
    return <>{children}</>;
  }

  // Find the cheapest plan that has this feature
  const minPlan = plans
    ?.filter((p) => p.is_active && p.features_json?.[feature])
    ?.sort((a, b) => a.sort_order - b.sort_order)?.[0];

  const minPlanName = minPlan?.name ?? "a higher";
  const label = FEATURE_LABELS[feature];

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{label}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {label} is available on the <span className="font-medium text-foreground">{minPlanName}</span> plan and above.
              Upgrade your plan to unlock this feature.
            </p>
          </div>
          <Button onClick={() => navigate("/app/billing")} className="mt-2">
            Upgrade to {minPlanName}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
