import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Globe, Map, Brain, Loader2, Copy, CheckCircle2, AlertTriangle, Layers, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ScrapeResponse } from "@/lib/api/scrape";

type Mode = "scrape" | "batch" | "crawl" | "map" | "extract";

export default function PlaygroundPage() {
  const [mode, setMode] = useState<Mode>("scrape");
  const [url, setUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [resultTab, setResultTab] = useState("markdown");
  const [renderJs, setRenderJs] = useState(true);
  const [mainContent, setMainContent] = useState(true);
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [batchSelectedIdx, setBatchSelectedIdx] = useState(0);
  const [cacheTtl, setCacheTtl] = useState("3600");

  // Crawl options
  const [maxPages, setMaxPages] = useState("50");
  const [maxDepth, setMaxDepth] = useState("3");

  // Map options
  const [maxUrls, setMaxUrls] = useState("500");

  // Extract options
  const [extractPrompt, setExtractPrompt] = useState("");
  const [extractSchema, setExtractSchema] = useState("");
  const [extractModel, setExtractModel] = useState("google/gemini-3-flash-preview");

  // Fetch (or create) a playground API key on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("playground_api_key");
    if (stored) {
      setApiKey(stored);
      return;
    }

    (async () => {
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

  const parseBatchUrls = (): string[] => {
    return batchUrls
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  };

  const handleRun = async () => {
    if (mode === "batch") {
      const urls = parseBatchUrls();
      if (urls.length === 0 || !apiKey) return;
    } else {
      if (!url || !apiKey) return;
    }
    setLoading(true);
    setResult(null);
    setBatchSelectedIdx(0);

    try {
      let functionName: string;
      let body: Record<string, unknown>;

      switch (mode) {
        case "scrape":
          functionName = "scrape";
          body = {
            url,
            formats: ["markdown", "html", "metadata", "links"],
            render_javascript: renderJs,
            only_main_content: mainContent,
            cache_ttl: Number(cacheTtl),
          };
          break;
        case "batch":
          functionName = "batch-scrape";
          body = {
            urls: parseBatchUrls(),
            formats: ["markdown", "html", "metadata", "links"],
            render_javascript: renderJs,
            only_main_content: mainContent,
            cache_ttl: Number(cacheTtl),
          };
          break;
        case "crawl":
          functionName = "crawl";
          body = {
            url,
            max_pages: Number(maxPages),
            max_depth: Number(maxDepth),
            same_domain_only: true,
            render_javascript: renderJs,
            only_main_content: mainContent,
          };
          break;
        case "map":
          functionName = "map";
          body = {
            url,
            same_domain_only: true,
            include_subdomains: false,
            max_urls: Number(maxUrls),
          };
          break;
        case "extract":
          functionName = "extract";
          body = {
            url,
            model: extractModel,
            only_main_content: mainContent,
          };
          if (extractPrompt.trim()) body.prompt = extractPrompt;
          if (extractSchema.trim()) {
            try {
              body.schema = JSON.parse(extractSchema);
            } catch {
              setResult({ success: false, error: { code: "INVALID_SCHEMA", message: "Invalid JSON schema" } });
              setLoading(false);
              return;
            }
          }
          if (!body.prompt && !body.schema) {
            setResult({ success: false, error: { code: "BAD_REQUEST", message: "Provide a prompt or schema for extraction" } });
            setLoading(false);
            return;
          }
          break;
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        headers: { "X-API-Key": apiKey },
      });

      if (error) {
        setResult({ success: false, error: { code: "NETWORK_ERROR", message: error.message } });
      } else {
        setResult(data);
        if (mode === "batch") setResultTab("markdown");
        else if (mode === "map") setResultTab("json");
        else if (mode === "extract") setResultTab("extracted");
        else if (mode === "crawl") setResultTab("json");
        else setResultTab("markdown");
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
    batch: <Layers className="h-4 w-4" />,
    crawl: <Globe className="h-4 w-4" />,
    map: <Map className="h-4 w-4" />,
    extract: <Brain className="h-4 w-4" />,
  };

  const d = result?.data;
  const isBatchResult = mode === "batch" && Array.isArray(d);
  const batchItem = isBatchResult ? d[batchSelectedIdx] : null;
  const batchError = isBatchResult && result?.errors ? result.errors[batchSelectedIdx] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Test scrape, batch scrape, crawl, map, and extract endpoints interactively.
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 flex-wrap">
        {(["scrape", "batch", "crawl", "map", "extract"] as Mode[]).map((m) => (
          <Button
            key={m}
            variant={mode === m ? "default" : "secondary"}
            size="sm"
            onClick={() => { setMode(m); setResult(null); }}
            className="gap-1.5 capitalize"
          >
            {modeIcons[m]}
            {m === "batch" ? "Batch Scrape" : m}
          </Button>
        ))}
      </div>

      {/* Input section */}
      <div className="rounded-lg border border-border p-5 bg-card space-y-4">
        {mode === "batch" ? (
          <div>
            <Label htmlFor="batch-urls" className="text-xs text-muted-foreground mb-1.5 block">
              URLs (one per line, max 100)
            </Label>
            <Textarea
              id="batch-urls"
              placeholder={"https://example.com\nhttps://httpbin.org/html\nhttps://news.ycombinator.com"}
              value={batchUrls}
              onChange={(e) => setBatchUrls(e.target.value)}
              className="font-mono text-sm min-h-[120px]"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {parseBatchUrls().length} URL{parseBatchUrls().length !== 1 ? "s" : ""} entered
              </span>
              <Button onClick={handleRun} disabled={loading || parseBatchUrls().length === 0 || !apiKey} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                {loading ? "Running..." : `Batch Scrape (${parseBatchUrls().length})`}
              </Button>
            </div>
          </div>
        ) : (
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : modeIcons[mode]}
                {loading ? "Running..." : "Run"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-6 text-sm items-end">
          {(mode === "scrape" || mode === "batch" || mode === "extract") && (
            <>
              <div className="flex items-center gap-2">
                <Switch id="render-js" checked={renderJs} onCheckedChange={setRenderJs} />
                <Label htmlFor="render-js" className="text-xs text-muted-foreground">Render JS</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="main-content" checked={mainContent} onCheckedChange={setMainContent} />
                <Label htmlFor="main-content" className="text-xs text-muted-foreground">Main content only</Label>
              </div>
            </>
          )}

          {(mode === "scrape" || mode === "batch") && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Cache TTL</Label>
              <Select value={cacheTtl} onValueChange={setCacheTtl}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Disabled</SelectItem>
                  <SelectItem value="300">5 min</SelectItem>
                  <SelectItem value="1800">30 min</SelectItem>
                  <SelectItem value="3600">1 hour</SelectItem>
                  <SelectItem value="86400">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "crawl" && (
            <>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Max pages</Label>
                <Select value={maxPages} onValueChange={setMaxPages}>
                  <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Max depth</Label>
                <Select value={maxDepth} onValueChange={setMaxDepth}>
                  <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {mode === "map" && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Max URLs</Label>
              <Select value={maxUrls} onValueChange={setMaxUrls}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1,000</SelectItem>
                  <SelectItem value="5000">5,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {mode === "extract" && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <Label className="text-xs text-muted-foreground block mb-1.5">Extraction prompt</Label>
              <Input
                placeholder="Extract the product name, price, and availability"
                value={extractPrompt}
                onChange={(e) => setExtractPrompt(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground block mb-1.5">JSON Schema (optional)</Label>
              <Textarea
                placeholder='{"type":"object","properties":{"name":{"type":"string"},"price":{"type":"number"}},"required":["name"]}'
                value={extractSchema}
                onChange={(e) => setExtractSchema(e.target.value)}
                className="text-xs font-mono min-h-[60px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Model</Label>
              <Select value={extractModel} onValueChange={setExtractModel}>
                <SelectTrigger className="w-56 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash (fast)</SelectItem>
                  <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                  <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                  <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {result && !result.success && !isBatchResult && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">{result.error?.code}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{result.error?.message}</p>
          </div>
        </div>
      )}

      {/* Batch Results */}
      {isBatchResult && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Batch summary header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Batch complete — {result.meta?.completed ?? 0}/{result.meta?.total ?? 0} succeeded
              </span>
              {result.meta?.failed > 0 && (
                <span className="text-xs text-destructive font-medium">{result.meta.failed} failed</span>
              )}
              {result.meta?.cache_hits > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary px-1.5 py-0.5 rounded bg-primary/10">
                  <Database className="h-3 w-3" />
                  {result.meta.cache_hits} cached
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              <Copy className="h-3 w-3" />
              {copied ? "Copied!" : "Copy JSON"}
            </Button>
          </div>

          {/* URL selector row */}
          <div className="px-4 py-2 border-b border-border bg-muted/30 flex gap-2 flex-wrap">
            {(d as any[]).map((item, idx) => {
              const err = result.errors?.[idx];
              const isSuccess = item !== null;
              return (
                <button
                  key={idx}
                  onClick={() => { setBatchSelectedIdx(idx); setResultTab("markdown"); }}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    batchSelectedIdx === idx
                      ? "bg-primary text-primary-foreground"
                      : isSuccess
                      ? "bg-card border border-border text-foreground hover:bg-accent"
                      : "bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20"
                  }`}
                >
                  {isSuccess ? (item.title?.slice(0, 30) || item.url?.slice(0, 30) || `URL ${idx + 1}`) : (err?.url?.slice(0, 30) || `URL ${idx + 1} ✗`)}
                </button>
              );
            })}
          </div>

          {/* Selected item content */}
          {batchItem ? (
            <>
              <div className="px-4 py-2 border-b border-border flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground truncate">{batchItem.final_url || batchItem.url}</span>
                {batchItem.status_code && (
                  <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded border border-border">{batchItem.status_code}</span>
                )}
                {batchItem.timings && (
                  <span className="text-xs font-mono text-muted-foreground">{batchItem.timings.total_ms}ms</span>
                )}
              </div>

              {batchItem.warnings?.length > 0 && (
                <div className="px-4 py-2 border-b border-border bg-muted/30">
                  {batchItem.warnings.map((w: string, i: number) => (
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
                    {batchItem.markdown !== undefined && (
                      <TabsTrigger value="markdown" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Markdown</TabsTrigger>
                    )}
                    {batchItem.html !== undefined && (
                      <TabsTrigger value="html" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">HTML</TabsTrigger>
                    )}
                    {batchItem.metadata !== undefined && (
                      <TabsTrigger value="metadata" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Metadata</TabsTrigger>
                    )}
                    <TabsTrigger value="json" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Raw JSON</TabsTrigger>
                  </TabsList>
                </div>

                {batchItem.markdown !== undefined && (
                  <TabsContent value="markdown" className="p-4 m-0">
                    <pre className="font-mono text-sm text-secondary-foreground whitespace-pre-wrap leading-relaxed">{batchItem.markdown}</pre>
                  </TabsContent>
                )}
                {batchItem.html !== undefined && (
                  <TabsContent value="html" className="p-4 m-0">
                    <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">{batchItem.html}</pre>
                  </TabsContent>
                )}
                {batchItem.metadata !== undefined && (
                  <TabsContent value="metadata" className="p-4 m-0">
                    <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">{JSON.stringify(batchItem.metadata, null, 2)}</pre>
                  </TabsContent>
                )}
                <TabsContent value="json" className="p-4 m-0">
                  <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">{JSON.stringify(batchItem, null, 2)}</pre>
                </TabsContent>
              </Tabs>
            </>
          ) : batchError ? (
            <div className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">{batchError.code}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{batchError.message}</p>
                <p className="text-xs font-mono text-muted-foreground mt-1">{batchError.url}</p>
              </div>
            </div>
          ) : null}

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border flex gap-6 text-xs text-muted-foreground">
            <span>Total: {result.meta?.total}</span>
            <span>Completed: {result.meta?.completed}</span>
            <span>Failed: {result.meta?.failed}</span>
            <span>Credits: {result.meta?.credits_used}</span>
            {result.meta?.job_id && <span className="font-mono">{result.meta.job_id.slice(0, 8)}…</span>}
          </div>
        </div>
      )}

      {/* Single-item Results (scrape, crawl, map, extract) */}
      {d && !isBatchResult && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {mode === "scrape" && d.title}
                {mode === "crawl" && `Crawl ${d.status} — ${d.job_id?.slice(0, 8)}`}
                {mode === "map" && `${result.meta?.count ?? d.urls?.length ?? 0} URLs discovered`}
                {mode === "extract" && (d.title || "Extraction complete")}
              </span>
              {d.timings && (
                <span className="text-xs font-mono text-muted-foreground">{d.timings.total_ms}ms</span>
              )}
              {d.status_code && (
                <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded border border-border">{d.status_code}</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              <Copy className="h-3 w-3" />
              {copied ? "Copied!" : "Copy JSON"}
            </Button>
          </div>

          {/* Warnings */}
          {(d.warnings?.length > 0 || result.warnings?.length > 0) && (
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              {(d.warnings || result.warnings || []).map((w: string, i: number) => (
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
                {mode === "scrape" && d.markdown !== undefined && (
                  <TabsTrigger value="markdown" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Markdown</TabsTrigger>
                )}
                {mode === "scrape" && d.html !== undefined && (
                  <TabsTrigger value="html" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">HTML</TabsTrigger>
                )}
                {mode === "scrape" && d.metadata !== undefined && (
                  <TabsTrigger value="metadata" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Metadata</TabsTrigger>
                )}
                {mode === "extract" && d.extracted && (
                  <TabsTrigger value="extracted" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Extracted</TabsTrigger>
                )}
                {mode === "map" && d.urls && (
                  <TabsTrigger value="urls" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">URLs ({d.urls.length})</TabsTrigger>
                )}
                <TabsTrigger value="json" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Raw JSON</TabsTrigger>
              </TabsList>
            </div>

            {mode === "scrape" && d.markdown !== undefined && (
              <TabsContent value="markdown" className="p-4 m-0">
                <pre className="font-mono text-sm text-secondary-foreground whitespace-pre-wrap leading-relaxed">{d.markdown}</pre>
              </TabsContent>
            )}
            {mode === "scrape" && d.html !== undefined && (
              <TabsContent value="html" className="p-4 m-0">
                <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">{d.html}</pre>
              </TabsContent>
            )}
            {mode === "scrape" && d.metadata !== undefined && (
              <TabsContent value="metadata" className="p-4 m-0">
                <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">{JSON.stringify(d.metadata, null, 2)}</pre>
              </TabsContent>
            )}
            {mode === "extract" && d.extracted && (
              <TabsContent value="extracted" className="p-4 m-0">
                <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">{JSON.stringify(d.extracted, null, 2)}</pre>
                {d.validation && !d.validation.valid && (
                  <div className="mt-3 p-3 rounded border border-destructive/20 bg-destructive/5">
                    <p className="text-xs font-medium text-destructive mb-1">Validation warnings:</p>
                    {d.validation.warnings.map((w: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">• {w}</p>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
            {mode === "map" && d.urls && (
              <TabsContent value="urls" className="p-4 m-0 max-h-96 overflow-y-auto">
                <div className="space-y-1">
                  {d.urls.map((u: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-mono text-secondary-foreground hover:text-primary">
                      <span className="text-muted-foreground w-8 text-right shrink-0">{i + 1}</span>
                      <a href={u} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{u}</a>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
            <TabsContent value="json" className="p-4 m-0">
              <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border flex gap-6 text-xs text-muted-foreground">
            {d.links && <span>Links: {d.links.length}</span>}
            {d.timings && <span>Nav: {d.timings.navigation_ms}ms</span>}
            {d.timings && <span>Extract: {d.timings.extraction_ms}ms</span>}
            {result?.meta && <span>Credits: {result.meta.credits_used}</span>}
            {result?.meta?.job_id && <span className="font-mono">{result.meta.job_id.slice(0, 8)}…</span>}
            {d.stats && <span>Processed: {d.stats.processed}/{d.stats.discovered}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
