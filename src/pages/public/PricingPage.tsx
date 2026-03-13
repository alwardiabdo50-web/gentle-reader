import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Minus, ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const mainPlans = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    credits: "500",
    desc: "For testing and personal projects.",
    features: [
      "500 credits/month",
      "5 req/min rate limit",
      "Scrape, Crawl & Map",
      "2 API keys",
      "Community support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Hobby",
    monthlyPrice: 9,
    yearlyPrice: 75,
    credits: "3,000",
    desc: "For side projects and small apps.",
    features: [
      "3,000 credits/month",
      "20 req/min rate limit",
      "Scrape, Crawl & Map",
      "5 API keys",
      "Email support",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Standard",
    monthlyPrice: 49,
    yearlyPrice: 408,
    credits: "25,000",
    desc: "For developers building production apps.",
    features: [
      "25,000 credits/month",
      "100 req/min rate limit",
      "Scrape, Crawl & Map",
      "AI Extract included",
      "10 API keys",
      "Priority email support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Growth",
    monthlyPrice: 199,
    yearlyPrice: 1658,
    credits: "150,000",
    desc: "For teams and high-volume workloads.",
    features: [
      "150,000 credits/month",
      "500 req/min rate limit",
      "Scrape, Crawl & Map",
      "AI Extract included",
      "25 API keys",
      "Dedicated support",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
];

const bottomPlans = [
  {
    name: "Scale",
    monthlyPrice: 399,
    yearlyPrice: 3325,
    credits: "500,000",
    desc: "For high-scale production workloads with premium support and SLA guarantees.",
    features: [
      "500,000 credits/month",
      "1,000 req/min rate limit",
      "All features included",
      "Unlimited crawl depth",
      "SLA guarantee",
      "Dedicated account manager",
    ],
  },
  {
    name: "Enterprise",
    monthlyPrice: null,
    yearlyPrice: null,
    credits: "Custom",
    desc: "Custom volume, dedicated infrastructure, and tailored onboarding for large organizations.",
    features: [
      "Custom credit volume",
      "Custom rate limits",
      "Dedicated infrastructure",
      "Custom extraction models",
      "SSO & advanced security",
      "24/7 premium support",
    ],
  },
];

const creditRows = [
  { label: "Scrape", values: ["1 credit", "1 credit", "1 credit", "1 credit"] },
  { label: "Crawl (per page)", values: ["2 credits", "2 credits", "2 credits", "2 credits"] },
  { label: "Map", values: ["1 credit", "1 credit", "1 credit", "1 credit"] },
  { label: "AI Extract", values: ["—", "—", "5 credits", "5 credits"] },
  { label: "Screenshot", values: ["—", "—", "2 credits", "2 credits"] },
  { label: "JS Rendering", values: ["+1 credit", "+1 credit", "+1 credit", "+1 credit"] },
];

const faqs = [
  {
    q: "What happens when I run out of credits?",
    a: "Your API calls will return a 429 error. You can upgrade your plan or wait for your credits to reset at the start of your next billing cycle.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Yes! You can upgrade or downgrade at any time. When upgrading, you'll get immediate access to the new plan's features. Downgrades take effect at the end of your current billing period.",
  },
  {
    q: "Do unused credits roll over?",
    a: "No, credits reset at the beginning of each billing cycle. We recommend choosing a plan that fits your expected monthly usage.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor Stripe.",
  },
  {
    q: "Is there a free trial for paid plans?",
    a: "Yes, all paid plans come with a 7-day free trial. You can cancel anytime during the trial period without being charged.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Yes! Annual billing saves you the equivalent of 2 months free compared to monthly billing.",
  },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Flexible pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free with 500 credits. Scale as you grow.
            <br />
            All plans include core scraping, crawling, and mapping.
          </p>
        </div>

        {/* Monthly / Yearly toggle */}
        <div className="flex items-center justify-center gap-3 mb-12 mt-8">
          <button
            onClick={() => setYearly(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !yearly
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              yearly
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <span className="ml-1.5 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              2 months free
            </span>
          </button>
        </div>

        {/* Main plan cards */}
        <div className="grid md:grid-cols-4 gap-5 max-w-5xl mx-auto mb-10">
          {mainPlans.map((plan) => {
            const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
            const period = yearly ? "/year" : "/month";
            return (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 flex flex-col ${
                  plan.highlighted
                    ? "border-primary bg-primary/[0.03] ring-1 ring-primary/20"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlighted && (
                  <div className="text-[10px] font-semibold text-primary mb-3 uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4 min-h-[2rem]">
                  {plan.desc}
                </p>
                <div className="mb-1">
                  <span className="text-3xl font-bold text-foreground">
                    ${price}
                  </span>
                  <span className="text-sm text-muted-foreground">{period}</span>
                </div>
                <p className="text-xs text-primary font-semibold mb-5">
                  {plan.credits} credits/mo
                </p>
                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-xs text-secondary-foreground"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full"
                  asChild
                >
                  <Link to="/auth">{plan.cta}</Link>
                </Button>
              </div>
            );
          })}
        </div>

        {/* Scale + Enterprise */}
        <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto mb-24">
          {bottomPlans.map((plan) => {
            const isEnterprise = plan.monthlyPrice === null;
            const price = isEnterprise
              ? null
              : yearly
                ? plan.yearlyPrice
                : plan.monthlyPrice;
            return (
              <div
                key={plan.name}
                className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row md:items-center gap-6"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    {plan.desc}
                  </p>
                  {price !== null ? (
                    <div className="mb-3">
                      <span className="text-2xl font-bold text-foreground">
                        ${price}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {yearly ? "/year" : "/month"}
                      </span>
                      <span className="ml-2 text-xs text-primary font-semibold">
                        {plan.credits} credits/mo
                      </span>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-foreground mb-3">
                      Custom pricing
                    </div>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link to={isEnterprise ? "/contact" : "/auth"}>
                      {isEnterprise ? "Contact Sales" : "Start Free Trial"}
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
                <ul className="space-y-2 md:w-56 shrink-0">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-xs text-secondary-foreground"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* API Credits Table */}
        <div className="max-w-5xl mx-auto mb-24">
          <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
            API Credits
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            How credits are consumed per endpoint across plans.
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">
                    Endpoint
                  </th>
                  {["Free", "Hobby", "Standard", "Growth"].map((p) => (
                    <th
                      key={p}
                      className="text-center px-5 py-3 text-foreground font-semibold"
                    >
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {creditRows.map((row) => (
                  <tr key={row.label} className="border-t border-border">
                    <td className="px-5 py-3 text-muted-foreground">
                      {row.label}
                    </td>
                    {row.values.map((val, i) => (
                      <td key={i} className="text-center px-5 py-3">
                        {val === "—" ? (
                          <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                        ) : (
                          <span className="text-foreground">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
