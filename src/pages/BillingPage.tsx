import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    credits: "500",
    features: ["500 credits/month", "5 req/min", "Community support", "Playground access"],
    current: false,
  },
  {
    name: "Starter",
    price: "$29",
    credits: "10,000",
    features: ["10,000 credits/month", "60 req/min", "Email support", "Full API access", "Crawl up to 100 pages"],
    current: true,
  },
  {
    name: "Pro",
    price: "$99",
    credits: "50,000",
    features: ["50,000 credits/month", "200 req/min", "Priority support", "AI extraction", "Crawl up to 1,000 pages", "Screenshot capture"],
    current: false,
  },
  {
    name: "Scale",
    price: "$349",
    credits: "250,000",
    features: ["250,000 credits/month", "1,000 req/min", "Dedicated support", "Custom extraction models", "Unlimited crawl depth", "SLA guarantee"],
    current: false,
  },
];

export default function BillingPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your plan and payment method.
        </p>
      </div>

      {/* Current plan summary */}
      <div className="rounded-lg border border-primary/30 p-5 surface-1 glow-primary">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Current Plan</span>
            </div>
            <div className="text-2xl font-bold">Starter — $29/mo</div>
            <p className="text-xs text-muted-foreground mt-1">
              Next billing date: April 1, 2026 · 9,225 credits remaining
            </p>
          </div>
          <Button variant="secondary" size="sm">Manage Payment</Button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-lg border p-5 flex flex-col ${
              plan.current
                ? "border-primary/40 surface-1 glow-primary"
                : "border-border surface-1"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{plan.name}</h3>
              {plan.current && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/30 text-primary bg-primary/10">
                  Current
                </span>
              )}
            </div>
            <div className="text-3xl font-bold mb-1">{plan.price}</div>
            <div className="text-xs text-muted-foreground mb-4">{plan.credits} credits/mo</div>
            <ul className="space-y-2 flex-1 mb-4">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-secondary-foreground">
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.current ? "secondary" : "default"}
              size="sm"
              className="w-full"
              disabled={plan.current}
            >
              {plan.current ? "Current Plan" : "Upgrade"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
