import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Loader2, ExternalLink, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const PLAN_PRICES: Record<string, { price_id: string; product_id: string }> = {
  hobby:    { price_id: "price_1T8rVAF7VmTA91ISjCoQzkq4", product_id: "prod_U75gHF5XUrUy2E" },
  standard: { price_id: "price_1T8rVWF7VmTA91ISyNNxcsg6", product_id: "prod_U75gA8gdsRsNaJ" },
  growth:   { price_id: "price_1T8rWYF7VmTA91ISUTSoy23Z", product_id: "prod_U75h0OkYXcc0mu" },
  scale:    { price_id: "price_1T8rWYF7VmTA91ISUTSoy23Z", product_id: "prod_U75h0OkYXcc0mu" },
};

const plans = [
  { name: "free", label: "Free", price: "$0", credits: 500, features: ["500 credits/month", "5 req/min", "Community support", "Playground access"] },
  { name: "hobby", label: "Hobby", price: "$9", credits: 3000, features: ["3,000 credits/month", "20 req/min", "Email support", "Full API access"] },
  { name: "standard", label: "Standard", price: "$49", credits: 25000, features: ["25,000 credits/month", "100 req/min", "Priority support", "AI extraction", "10 API keys"] },
  { name: "growth", label: "Growth", price: "$199", credits: 150000, features: ["150,000 credits/month", "500 req/min", "Dedicated support", "AI extraction", "25 API keys"] },
  { name: "scale", label: "Scale", price: "$399", credits: 500000, features: ["500,000 credits/month", "1,000 req/min", "Dedicated account manager", "Unlimited crawl depth", "SLA guarantee"] },
];

export default function BillingPage() {
  const credits = useCredits();
  const { user, activeOrg } = useAuth();
  const [loading, setLoading] = useState(true);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState<typeof plans[0] | null>(null);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (!error && data) {
        // Plan is now sourced from useCredits hook
        setHasStripeSubscription(data.subscribed || false);
        if (data.subscription_end) {
          setPeriodEnd(data.subscription_end);
        }
      }
    } catch (e) {
      console.error("Failed to check subscription:", e);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await checkSubscription();
      setLoading(false);
    })();
  }, [user, activeOrg, checkSubscription]);

  // Auto-refresh subscription status every 60s
  useEffect(() => {
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  // Check for returning from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("session_id")) {
      toast.success("Payment processing! Your plan will update shortly.");
      // Clean URL
      window.history.replaceState({}, "", "/billing");
      // Poll for subscription update
      const poll = setInterval(async () => {
        await checkSubscription();
      }, 3000);
      setTimeout(() => clearInterval(poll), 30000);
    }
  }, [checkSubscription]);

  const handleUpgrade = async () => {
    if (!confirmPlan || !user) return;
    if (confirmPlan.name === "free") {
      // Downgrade to free means canceling subscription via portal
      await handleManageSubscription();
      setConfirmPlan(null);
      return;
    }

    setSwitching(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: confirmPlan.name },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.info("Stripe checkout opened in a new tab");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create checkout session");
    }
    setSwitching(false);
    setConfirmPlan(null);
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.info("Stripe portal opened in a new tab");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open subscription management");
    }
  };

  const currentPlan = credits.plan;
  const currentPlanData = plans.find((p) => p.name === currentPlan) ?? plans[0];
  const formattedEnd = periodEnd
    ? new Date(periodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeOrg ? `Managing billing for ${activeOrg.name}` : "Manage your plan and payment method."}
        </p>
      </div>

      <div className="rounded-lg border border-primary/30 p-5 bg-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Current Plan</span>
            </div>
            <div className="text-2xl font-bold">{currentPlanData.label} — {currentPlanData.price}/mo</div>
            <p className="text-xs text-muted-foreground mt-1">
              Next billing date: {formattedEnd} · {credits.creditsRemaining.toLocaleString()} credits remaining
            </p>
          </div>
          {hasStripeSubscription && (
            <Button variant="outline" size="sm" onClick={handleManageSubscription}>
              <Settings className="h-4 w-4 mr-1" />
              Manage Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Credit Usage Progress */}
      {!credits.loading && (
        <div className="rounded-lg border border-border p-5 bg-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium">Credit Usage</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {credits.creditsUsed.toLocaleString()} of {credits.creditsTotal.toLocaleString()} credits used this period
              </p>
            </div>
            <span className="text-2xl font-bold text-foreground">
              {credits.creditsRemaining.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1">remaining</span>
            </span>
          </div>
          <Progress
            value={credits.percentUsed}
            className={`h-3 ${
              credits.percentUsed > 90
                ? "[&>div]:bg-destructive"
                : credits.percentUsed > 70
                  ? "[&>div]:bg-yellow-500"
                  : ""
            }`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.name === currentPlan;
          const isDowngrade = plans.indexOf(plan) < plans.findIndex((p) => p.name === currentPlan);
          return (
            <div
              key={plan.name}
              className={`rounded-lg border p-5 flex flex-col ${
                isCurrent ? "border-primary/40 bg-card" : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{plan.label}</h3>
                {isCurrent && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/30 text-primary bg-primary/10">Current</span>
                )}
              </div>
              <div className="text-3xl font-bold mb-1">{plan.price}</div>
              <div className="text-xs text-muted-foreground mb-4">{plan.credits.toLocaleString()} credits/mo</div>
              <ul className="space-y-2 flex-1 mb-4">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-secondary-foreground">
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={isCurrent ? "secondary" : "default"}
                size="sm"
                className="w-full"
                disabled={isCurrent}
                onClick={() => setConfirmPlan(plan)}
              >
                {isCurrent ? "Current Plan" : isDowngrade ? "Downgrade" : "Upgrade"}
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!confirmPlan} onOpenChange={(open) => !open && setConfirmPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmPlan?.name === "free" ? "Downgrade to Free?" : `Upgrade to ${confirmPlan?.label}?`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmPlan?.name === "free" ? (
              "You'll be redirected to the Stripe portal to cancel your current subscription."
            ) : (
              <>
                You'll be redirected to Stripe Checkout to subscribe to{" "}
                <strong>{confirmPlan?.label}</strong> ({confirmPlan?.price}/mo) with{" "}
                {confirmPlan?.credits.toLocaleString()} credits.
              </>
            )}
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmPlan(null)}>Cancel</Button>
            <Button onClick={handleUpgrade} disabled={switching}>
              {switching && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              <ExternalLink className="h-4 w-4 mr-1" />
              {confirmPlan?.name === "free" ? "Manage Subscription" : "Continue to Stripe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}