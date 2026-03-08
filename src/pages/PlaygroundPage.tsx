import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Globe, Map, Brain, Loader2, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ScrapeResponse } from "@/lib/api/scrape";

type Mode = "scrape" | "crawl" | "map" | "extract";

export default function PlaygroundPage() {
  const [mode, setMode] = useState<Mode>("scrape");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResponse | null>(null);
  const [resultTab, setResultTab] = useState("markdown");
  const [renderJs, setRenderJs] = useState(true);
  const [mainContent, setMainContent] = useState(true);
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Fetch (or create) a playground API key on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("playground_api_key");
    if (stored) {
      setApiKey(stored);
      return;
    }

    (async () => {
      // Check for existing playground key
      const { data: keys } = await supabase
        .from("api_keys")
        .select("id, key_prefix")
        .eq("name", "Playground (auto)")
        .eq("is_active", true)
        .limit(1);

      if (keys && keys.length > 0) {
        // We can't recover the raw token — create a fresh one
      }

      // Create a new playground key
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const rawToken = `nc_live_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
      const prefix = rawToken.slice(0, 13);
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawToken));
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const { error } = await supabase.from("api_keys").insert({
        user_id: user.id,
        name: "Playground (auto)",
        key_prefix: prefix,
        key_hash: hashHex,
      });

      if (!error) {
        sessionStorage.setItem("playground_api_key", rawToken);
        setApiKey(rawToken);
      }
    })();
  }, []);

  const handleRun = async () => {
    if (!url || !apiKey) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("scrape", {
        body: {
          url,
          formats: ["markdown", "html", "metadata", "links"],
          render_javascript: renderJs,
          only_main_content: mainContent,
        },
        headers: { "X-API-Key": apiKey },
      });

      if (error) {
        setResult({ success: false, error: { code: "NETWORK_ERROR", message: error.message } });
      } else {
        setResult(data as ScrapeResponse);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setResult({ success: false, error: { code: "CLIENT_ERROR", message: msg } });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modeIcons: Record<Mode, React.ReactNode> = {
    scrape: <Zap className="h-4 w-4" />,
    crawl: <Globe className="h-4 w-4" />,
    map: <Map className="h-4 w-4" />,
    extract: <Brain className="h-4 w-4" />,
  };

  const d = result?.data;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Test scrape, crawl, map, and extract endpoints interactively.
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        {(["scrape", "crawl", "map", "extract"] as Mode[]).map((m) => (
          <Button
            key={m}
            variant={mode === m ? "default" : "secondary"}
            size="sm"
            onClick={() => setMode(m)}
            className="gap-1.5 capitalize"
            disabled={m !== "scrape"}
          >
            {modeIcons[m]}
            {m}
            {m !== "scrape" && <span className="text-[10px] opacity-60">(soon)</span>}
          </Button>
        ))}
      </div>

      {/* Input section */}
      <div className="rounded-lg border border-border p-5 bg-card space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="url" className="text-xs text-muted-foreground mb-1.5 block">
              Target URL
            </Label>
            <Input
              id="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleRun()}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleRun} disabled={loading || !url || !apiKey} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {loading ? "Running..." : "Run"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Switch id="render-js" checked={renderJs} onCheckedChange={setRenderJs} />
            <Label htmlFor="render-js" className="text-xs text-muted-foreground">Render JS</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="main-content" checked={mainContent} onCheckedChange={setMainContent} />
            <Label htmlFor="main-content" className="text-xs text-muted-foreground">Main content only</Label>
          </div>
          {mode === "crawl" && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Max pages</Label>
              <Select defaultValue="50">
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {mode === "extract" && (
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground block mb-1">Extraction prompt</Label>
              <Input
                placeholder="Extract the product name, price, and availability"
                className="text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {result && !result.success && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">{result.error?.code}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{result.error?.message}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {d && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{d.title}</span>
              <span className="text-xs font-mono text-muted-foreground">
                {d.timings.total_ms}ms
              </span>
              <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                {d.status_code}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              <Copy className="h-3 w-3" />
              {copied ? "Copied!" : "Copy JSON"}
            </Button>
          </div>

          {/* Warnings */}
          {d.warnings && d.warnings.length > 0 && (
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              {d.warnings.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-destructive/70 shrink-0" />
                  {w}
                </p>
              ))}
            </div>
          )}

          <Tabs value={resultTab} onValueChange={setResultTab}>
            <div className="px-4 border-b border-border">
              <TabsList className="bg-transparent h-9 p-0 gap-4">
                {d.markdown !== undefined && (
                  <TabsTrigger value="markdown" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Markdown</TabsTrigger>
                )}
                {d.html !== undefined && (
                  <TabsTrigger value="html" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">HTML</TabsTrigger>
                )}
                {d.metadata !== undefined && (
                  <TabsTrigger value="metadata" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Metadata</TabsTrigger>
                )}
                <TabsTrigger value="json" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Raw JSON</TabsTrigger>
              </TabsList>
            </div>
            {d.markdown !== undefined && (
              <TabsContent value="markdown" className="p-4 m-0">
                <pre className="font-mono text-sm text-secondary-foreground whitespace-pre-wrap leading-relaxed">
                  {d.markdown}
                </pre>
              </TabsContent>
            )}
            {d.html !== undefined && (
              <TabsContent value="html" className="p-4 m-0">
                <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">
                  {d.html}
                </pre>
              </TabsContent>
            )}
            {d.metadata !== undefined && (
              <TabsContent value="metadata" className="p-4 m-0">
                <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">
                  {JSON.stringify(d.metadata, null, 2)}
                </pre>
              </TabsContent>
            )}
            <TabsContent value="json" className="p-4 m-0">
              <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border flex gap-6 text-xs text-muted-foreground">
            {d.links && <span>Links: {d.links.length}</span>}
            <span>Nav: {d.timings.navigation_ms}ms</span>
            <span>Extract: {d.timings.extraction_ms}ms</span>
            {result?.meta && <span>Credits: {result.meta.credits_used}</span>}
            {result?.meta && <span className="font-mono">{result.meta.job_id.slice(0, 8)}…</span>}
          </div>
        </div>
      )}
    </div>
  );
}
