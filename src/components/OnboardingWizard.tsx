import { useState } from "react";
import { Link } from "react-router-dom";
import { Key, Zap, BarChart3, Copy, CheckCircle2, AlertCircle, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { scrapeUrl } from "@/lib/api/scrape";
import { toast } from "sonner";

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user } = useAuth();
  const credits = useCredits();
  const [step, setStep] = useState(0);

  // Step 1 state
  const [keyName, setKeyName] = useState("My First Key");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Step 2 state
  const [scrapeUrl_, setScrapeUrl] = useState("https://example.com");
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{
    title: string;
    wordCount: number;
    snippet: string;
    creditsUsed: number;
  } | null>(null);

  const steps = [
    { label: "Create API Key", icon: Key },
    { label: "First Scrape", icon: Zap },
    { label: "Your Credits", icon: BarChart3 },
  ];

  const handleCreateKey = async () => {
    if (!keyName.trim() || !user) return;
    setCreating(true);
    try {
      const rawToken = `nc_live_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
      const prefix = rawToken.slice(0, 13);
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawToken));
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const { error } = await supabase.from("api_keys").insert({
        user_id: user.id,
        name: keyName,
        key_prefix: prefix,
        key_hash: hashHex,
      });

      if (error) throw error;
      setCreatedToken(rawToken);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleScrape = async () => {
    if (!createdToken || !scrapeUrl_.trim()) return;
    setScraping(true);
    try {
      const result = await scrapeUrl(scrapeUrl_, createdToken, {
        formats: ["markdown"],
        only_main_content: true,
      });

      if (result.success && result.data) {
        const md = result.data.markdown ?? "";
        const words = md.split(/\s+/).filter(Boolean).length;
        setScrapeResult({
          title: result.data.title || "Untitled",
          wordCount: words,
          snippet: md.slice(0, 300) + (md.length > 300 ? "…" : ""),
          creditsUsed: result.meta?.credits_used ?? 1,
        });
      } else {
        toast.error(result.error?.message ?? "Scrape failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setScraping(false);
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true } as any)
      .eq("user_id", user.id);
    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          Getting Started
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome to your dashboard</h1>
        <p className="text-sm text-muted-foreground">Let's set you up in 3 quick steps</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px ${i < step ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card className="p-6">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Create your first API key</h2>
              <p className="text-sm text-muted-foreground mt-1">
                API keys authenticate your requests. You'll use this key to scrape web pages.
              </p>
            </div>

            {!createdToken ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Key name</label>
                  <Input
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g. My First Key"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
                  />
                </div>
                <Button onClick={handleCreateKey} disabled={!keyName.trim() || creating} className="w-full">
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Create API Key
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2 p-3 rounded-lg border border-warning/20 bg-warning/10">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-warning">Save this key — it won't be shown again.</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-muted p-2.5 rounded-lg border border-border break-all text-foreground">
                    {createdToken}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button onClick={() => setStep(1)} className="w-full gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Run your first scrape</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Try scraping a page. We'll fetch the content and convert it to clean markdown.
              </p>
            </div>

            {!scrapeResult ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">URL to scrape</label>
                  <Input
                    value={scrapeUrl_}
                    onChange={(e) => setScrapeUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <Button onClick={handleScrape} disabled={!scrapeUrl_.trim() || scraping} className="w-full">
                  {scraping && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  {scraping ? "Scraping…" : "Run Scrape"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{scrapeResult.title}</span>
                    <Badge variant="success">Completed</Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{scrapeResult.wordCount.toLocaleString()} words</span>
                    <span>•</span>
                    <span className="text-primary font-medium">{scrapeResult.creditsUsed} credit used</span>
                  </div>
                  <pre className="text-xs text-muted-foreground bg-background rounded-lg border border-border p-3 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                    {scrapeResult.snippet}
                  </pre>
                </div>
                <Button onClick={() => setStep(2)} className="w-full gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Understand your credits</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Every API call costs credits. Here's your current balance.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {credits.plan.charAt(0).toUpperCase() + credits.plan.slice(1)} Plan
                </span>
                <Badge variant="secondary">{credits.creditsTotal.toLocaleString()} credits/mo</Badge>
              </div>
              <Progress value={credits.percentUsed} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{credits.creditsUsed.toLocaleString()} used</span>
                <span>{credits.creditsRemaining.toLocaleString()} remaining</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1.5 bg-muted/20 rounded-lg p-3 border border-border">
              <p><strong className="text-foreground">What costs credits?</strong></p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Each scrape = 1 credit</li>
                <li>Each crawl page = 1 credit</li>
                <li>Extraction & AI features cost extra</li>
              </ul>
              <p className="pt-1">
                Need more? <Link to="/app/billing" className="text-primary underline">Upgrade your plan</Link>
              </p>
            </div>

            <Button onClick={handleFinish} className="w-full gap-1.5">
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>

      {/* Skip */}
      <div className="text-center">
        <button
          onClick={handleFinish}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
        >
          Skip setup
        </button>
      </div>
    </div>
  );
}
