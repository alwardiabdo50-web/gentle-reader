import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Minus } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    credits: "500",
    desc: "For testing and personal projects.",
    features: {
      "Monthly credits": "500",
      "Scrape endpoint": true,
      "Crawl endpoint": true,
      "Map endpoint": true,
      "AI Extract": false,
      "JavaScript rendering": true,
      "API keys": "2",
      "Rate limit": "10 req/min",
      "Support": "Community",
    },
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    credits: "10,000",
    desc: "For developers building production apps.",
    features: {
      "Monthly credits": "10,000",
      "Scrape endpoint": true,
      "Crawl endpoint": true,
      "Map endpoint": true,
      "AI Extract": true,
      "JavaScript rendering": true,
      "API keys": "10",
      "Rate limit": "60 req/min",
      "Support": "Priority email",
    },
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Growth",
    price: "$99",
    period: "/month",
    credits: "50,000",
    desc: "For teams and high-volume workloads.",
    features: {
      "Monthly credits": "50,000",
      "Scrape endpoint": true,
      "Crawl endpoint": true,
      "Map endpoint": true,
      "AI Extract": true,
      "JavaScript rendering": true,
      "API keys": "25",
      "Rate limit": "200 req/min",
      "Support": "Dedicated",
    },
    cta: "Start Free Trial",
    highlighted: false,
  },
];

const featureRows = [
  "Monthly credits",
  "Scrape endpoint",
  "Crawl endpoint",
  "Map endpoint",
  "AI Extract",
  "JavaScript rendering",
  "API keys",
  "Rate limit",
  "Support",
];

export default function PricingPage() {
  return (
    <div className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free with 500 credits. Upgrade when you need more.
            All plans include core scraping, crawling, and mapping.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-20">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 flex flex-col ${
                plan.highlighted
                  ? "border-primary bg-card"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <div className="text-xs font-semibold text-primary mb-3">Most Popular</div>
              )}
              <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.desc}</p>
              <div className="mb-5">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="text-sm text-primary font-semibold mb-5">
                {plan.credits} credits/month
              </p>
              <Button
                variant={plan.highlighted ? "default" : "outline"}
                className={`w-full ${plan.highlighted ? "glow-primary" : ""}`}
                asChild
              >
                <Link to="/auth">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Feature comparison
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="surface-2">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Feature</th>
                  {plans.map((p) => (
                    <th key={p.name} className="text-center px-5 py-3 text-foreground font-semibold">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row) => (
                  <tr key={row} className="border-t border-border">
                    <td className="px-5 py-3 text-muted-foreground">{row}</td>
                    {plans.map((p) => {
                      const val = p.features[row as keyof typeof p.features];
                      return (
                        <td key={p.name} className="text-center px-5 py-3">
                          {val === true ? (
                            <CheckCircle2 className="h-4 w-4 text-primary mx-auto" />
                          ) : val === false ? (
                            <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                          ) : (
                            <span className="text-foreground">{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Extra credits note */}
        <div className="max-w-2xl mx-auto mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Need more credits? All paid plans support purchasing extra credit packs.
            Volume pricing available for enterprise workloads —{" "}
            <Link to="/contact" className="text-primary hover:underline">
              contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
