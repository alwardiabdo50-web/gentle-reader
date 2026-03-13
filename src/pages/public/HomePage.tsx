import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/public/CodeBlock";
import {
  Zap, Globe, Map, Brain, Key, BarChart3, Shield, Clock,
  ArrowRight, Sparkles, Code2, Users, Server, CheckCircle2,
} from "lucide-react";

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-6 py-28 md:py-40 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 mb-8">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">Now with AI-powered extraction</span>
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-[-0.03em] leading-[1.1] mb-6">
          <span className="text-foreground">Web Scraping API</span><br />
          <span className="text-primary">Built for Developers</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed mb-10">
          Scrape, crawl, map, and extract structured data from any website. One API, production-ready reliability, developer-first design.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="text-base px-8" asChild>
            <Link to="/auth">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button variant="outline" size="lg" className="text-base px-8" asChild>
            <a href="#api-example">View API Example</a>
          </Button>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">500 free credits · No credit card required</p>
      </div>
    </section>
  );
}

const features = [
  { icon: Zap, title: "Scrape", desc: "Fetch clean markdown, HTML, or screenshots from any URL with a single API call." },
  { icon: Globe, title: "Crawl", desc: "Recursively crawl entire websites with depth control, pattern filters, and concurrency." },
  { icon: Map, title: "Map", desc: "Discover all URLs on a domain instantly. Build sitemaps without full page scraping." },
  { icon: Brain, title: "Extract", desc: "Use AI to pull structured JSON data from pages with custom schemas and prompts." },
  { icon: Key, title: "API Keys", desc: "Manage multiple API keys with prefix tracking, rotation, and per-key usage analytics." },
  { icon: BarChart3, title: "Usage Dashboard", desc: "Real-time visibility into credits, job history, success rates, and billing." },
  { icon: Shield, title: "Reliable", desc: "Built-in retries, anti-bot handling, JavaScript rendering, and smart rate limiting." },
  { icon: Clock, title: "Fast", desc: "Optimized pipeline delivers results in seconds. No queues, no waiting." },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-[-0.02em]">Everything you need to scrape the web</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">A complete toolkit for web data extraction. From single pages to entire domains.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="group rounded-xl border border-border p-5 bg-card hover:bg-card-hover hover:border-border-strong transition-all duration-150">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-[16px] tracking-[-0.01em]">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const scrapeExample = `curl -X POST https://api.nebulacrawl.com/v1/scrape \\
  -H "Authorization: Bearer nc_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "formats": ["markdown", "metadata"],
    "only_main_content": true
  }'`;

const responseExample = `{
  "success": true,
  "data": {
    "markdown": "# Example Domain\\nThis domain is for ...",
    "metadata": {
      "title": "Example Domain",
      "language": "en",
      "status_code": 200
    }
  }
}`;

function ApiExampleSection() {
  return (
    <section id="api-example" className="py-24 md:py-32 bg-sidebar">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-[-0.02em]">Simple, powerful API</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Get clean, structured data from any URL with a single request.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <CodeBlock code={scrapeExample} title="Request" language="bash" />
          <CodeBlock code={responseExample} title="Response" language="json" />
        </div>
      </div>
    </section>
  );
}

const steps = [
  { num: "01", title: "Get your API key", desc: "Sign up and grab your key from the dashboard." },
  { num: "02", title: "Make a request", desc: "Call the scrape, crawl, map, or extract endpoint." },
  { num: "03", title: "Get structured data", desc: "Receive clean markdown, HTML, JSON, or screenshots." },
  { num: "04", title: "Scale confidently", desc: "Monitor usage, upgrade plans, and build at any scale." },
];

function WorkflowSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-[-0.02em]">How it works</h2>
          <p className="text-muted-foreground text-lg">From signup to production in minutes.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s) => (
            <div key={s.num} className="relative">
              <span className="text-5xl font-bold text-primary/10">{s.num}</span>
              <h3 className="font-semibold text-foreground mt-2 mb-2 tracking-[-0.01em]">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const useCases = [
  { icon: Code2, title: "AI & LLM Training", desc: "Collect web data to fine-tune models and build RAG pipelines." },
  { icon: BarChart3, title: "Market Research", desc: "Track competitors, pricing, product catalogs at scale." },
  { icon: Users, title: "Lead Generation", desc: "Extract contact info, company data, and business signals." },
  { icon: Server, title: "Content Aggregation", desc: "Build news feeds, knowledge bases, and content indexes." },
];

function UseCasesSection() {
  return (
    <section className="py-24 md:py-32 bg-sidebar">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-[-0.02em]">Built for every use case</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">From startups to enterprises, Nebula Crawl powers data-driven workflows.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {useCases.map((uc) => (
            <div key={uc.title} className="flex gap-4 p-5 rounded-xl border border-border bg-card hover:bg-card-hover transition-all duration-150">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <uc.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1 tracking-[-0.01em]">{uc.title}</h3>
                <p className="text-sm text-muted-foreground">{uc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const plans = [
  { name: "Free", price: "$0", credits: "500 credits/mo", features: ["5 req/min", "Playground access", "Community support"], cta: "Get Started", highlighted: false },
  { name: "Hobby", price: "$9", credits: "3,000 credits/mo", features: ["20 req/min", "Full API access", "Email support"], cta: "Start Free", highlighted: false },
  { name: "Standard", price: "$49", credits: "25,000 credits/mo", features: ["100 req/min", "AI extraction", "Priority support"], cta: "Start Free", highlighted: true },
  { name: "Growth", price: "$199", credits: "150,000 credits/mo", features: ["500 req/min", "Dedicated support", "25 API keys"], cta: "Start Free", highlighted: false },
];

function PricingTeaser() {
  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-[-0.02em]">Simple, transparent pricing</h2>
          <p className="text-muted-foreground text-lg">Start free. Scale as you grow. No surprises.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-xl border p-6 flex flex-col transition-all duration-150 ${plan.highlighted ? "border-primary bg-card" : "border-border bg-card"}`}>
              <h3 className="font-semibold text-foreground text-lg">{plan.name}</h3>
              <div className="mt-3 mb-1">
                <span className="text-3xl font-bold text-foreground tracking-[-0.03em]">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-primary font-medium mb-5">{plan.credits}</p>
              <ul className="flex-1 space-y-2.5 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant={plan.highlighted ? "default" : "outline"} asChild>
                <Link to="/auth">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          Need more?{" "}<Link to="/pricing" className="text-primary hover:underline">View full pricing</Link>
        </p>
      </div>
    </section>
  );
}

const trustPoints = [
  { label: "99.9% Uptime", desc: "Enterprise-grade infrastructure" },
  { label: "Anti-bot Handling", desc: "Smart bypasses built in" },
  { label: "JS Rendering", desc: "Full browser-grade rendering" },
  { label: "GDPR Ready", desc: "Privacy-first data handling" },
];

function TrustSection() {
  return (
    <section className="py-24 md:py-32 bg-sidebar">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-[-0.02em]">Built for reliability</h2>
        <p className="text-muted-foreground text-lg mb-14 max-w-2xl mx-auto">Production-hardened infrastructure you can depend on.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {trustPoints.map((tp) => (
            <div key={tp.label} className="p-5 rounded-xl border border-border bg-card">
              <div className="text-lg font-bold text-primary mb-1">{tp.label}</div>
              <div className="text-xs text-muted-foreground">{tp.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/3 to-transparent pointer-events-none" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 tracking-[-0.03em]">Ready to start scraping?</h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">Join thousands of developers who trust Nebula Crawl for their web data needs. Start free today.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="text-base px-8" asChild>
            <Link to="/auth">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button variant="outline" size="lg" className="text-base px-8" asChild>
            <Link to="/docs">Read the Docs</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <ApiExampleSection />
      <WorkflowSection />
      <UseCasesSection />
      <PricingTeaser />
      <TrustSection />
      <CtaSection />
    </>
  );
}
