import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Zap, Globe, Map, Brain, Loader2, Copy, CheckCircle2, AlertTriangle, Layers, Database, GitBranch, History, Save, Share2, ChevronDown, ChevronRight, Trash2, X, Lock as LockIcon, FileText, Search, Palette, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useModels } from "@/hooks/useModels";
import { canAccessFeature } from "@/lib/plan-limits";
import { toast } from "sonner";
import type { ScrapeResponse } from "@/lib/api/scrape";

type Mode = "scrape" | "batch" | "crawl" | "map" | "extract" | "pipeline" | "search";

interface HistoryEntry {
  mode: Mode;
  url: string;
  params: Record<string, unknown>;
  timestamp: number;
  title?: string;
}

interface Preset {
  id: string;
  name: string;
  mode: string;
  config_json: Record<string, unknown>;
  created_at: string;
}

function getHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem("playground_history") || "[]");
  } catch { return []; }
}

function addHistory(entry: HistoryEntry) {
  const history = getHistory();
  history.unshift(entry);
  localStorage.setItem("playground_history", JSON.stringify(history.slice(0, 50)));
}

function computeDiff(oldText: string, newText: string) {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: { type: "same" | "added" | "removed"; text: string }[] = [];

  let oi = 0, ni = 0;
  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
      result.push({ type: "same", text: oldLines[oi] });
      oi++; ni++;
    } else if (ni < newLines.length && (oi >= oldLines.length || !oldLines.slice(oi, oi + 5).includes(newLines[ni]))) {
      result.push({ type: "added", text: newLines[ni] });
      ni++;
    } else if (oi < oldLines.length) {
      result.push({ type: "removed", text: oldLines[oi] });
      oi++;
    }
  }
  return result;
}

export default function PlaygroundPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { plan } = useCredits();
  const { models, grouped, defaultModel, canUseModel, getModelCost } = useModels(plan);
  const extractAllowed = canAccessFeature(plan, "extract");
  const [mode, setMode] = useState<Mode>((searchParams.get("mode") as Mode) || "scrape");
  const [url, setUrl] = useState(searchParams.get("url") || "");
  const [batchUrls, setBatchUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [resultTab, setResultTab] = useState("markdown");
  const [renderJs, setRenderJs] = useState(searchParams.get("renderJs") !== "false");
  const [mainContent, setMainContent] = useState(searchParams.get("mainContent") !== "false");
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [batchSelectedIdx, setBatchSelectedIdx] = useState(0);
  const [cacheTtl, setCacheTtl] = useState(searchParams.get("cacheTtl") || "3600");

  // Crawl options
  const [maxPages, setMaxPages] = useState(searchParams.get("maxPages") || "50");
  const [maxDepth, setMaxDepth] = useState(searchParams.get("maxDepth") || "3");

  // Map options
  const [maxUrls, setMaxUrls] = useState(searchParams.get("maxUrls") || "500");

  // Extract options
  const [extractPrompt, setExtractPrompt] = useState(searchParams.get("extractPrompt") || "");
  const [extractSchema, setExtractSchema] = useState(searchParams.get("extractSchema") || "");
  const [extractModel, setExtractModel] = useState(searchParams.get("extractModel") || "");

  // Pipeline options
  const [pipelinePrompt, setPipelinePrompt] = useState(searchParams.get("pipelinePrompt") || "");
  const [pipelineSchema, setPipelineSchema] = useState(searchParams.get("pipelineSchema") || "");
  const [pipelineTransformPrompt, setPipelineTransformPrompt] = useState(searchParams.get("pipelineTransformPrompt") || "");
  const [pipelineModel, setPipelineModel] = useState(searchParams.get("pipelineModel") || "");

  // History & presets
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(getHistory());
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [savePresetOpen, setSavePresetOpen] = useState(false);

  // Diff
  const [previousMarkdown, setPreviousMarkdown] = useState<string | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);

  // Extraction templates
  const [extractionTemplates, setExtractionTemplates] = useState<Array<{ id: string; name: string; prompt: string | null; schema_json: any; model: string; use_count: number }>>([]);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");

  // Set default model when models load
  useEffect(() => {
    if (defaultModel && !extractModel) setExtractModel(defaultModel);
    if (defaultModel && !pipelineModel) setPipelineModel(defaultModel);
  }, [defaultModel]);

  // Fetch extraction templates
  useEffect(() => {
    if (!user) return;
    supabase.from("extraction_templates").select("id,name,prompt,schema_json,model,use_count")
      .order("use_count", { ascending: false })
      .then(({ data }) => {
        if (data) setExtractionTemplates(data as any);
      });
  }, [user]);

  // Fetch presets
  useEffect(() => {
    if (!user) return;
    supabase.from("playground_presets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setPresets(data as unknown as Preset[]);
    });
  }, [user]);

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
      const hashHex = Array.from(new Uint8Array(hashBuffer)).
      map((b) => b.toString(16).padStart(2, "0")).
      join("");

      const { error } = await supabase.from("api_keys").insert({
        user_id: user.id,
        name: "Playground (auto)",
        key_prefix: prefix,
        key_hash: hashHex
      });

      if (!error) {
        sessionStorage.setItem("playground_api_key", rawToken);
        setApiKey(rawToken);
      }
    })();
  }, []);

  const getCurrentConfig = useCallback(() => ({
    url, renderJs, mainContent, cacheTtl, maxPages, maxDepth, maxUrls,
    extractPrompt, extractSchema, extractModel,
    pipelinePrompt, pipelineSchema, pipelineTransformPrompt, pipelineModel,
  }), [url, renderJs, mainContent, cacheTtl, maxPages, maxDepth, maxUrls, extractPrompt, extractSchema, extractModel, pipelinePrompt, pipelineSchema, pipelineTransformPrompt, pipelineModel]);

  const restoreConfig = (config: Record<string, unknown>) => {
    if (config.url) setUrl(config.url as string);
    if (config.renderJs !== undefined) setRenderJs(config.renderJs as boolean);
    if (config.mainContent !== undefined) setMainContent(config.mainContent as boolean);
    if (config.cacheTtl) setCacheTtl(config.cacheTtl as string);
    if (config.maxPages) setMaxPages(config.maxPages as string);
    if (config.maxDepth) setMaxDepth(config.maxDepth as string);
    if (config.maxUrls) setMaxUrls(config.maxUrls as string);
    if (config.extractPrompt !== undefined) setExtractPrompt(config.extractPrompt as string);
    if (config.extractSchema !== undefined) setExtractSchema(config.extractSchema as string);
    if (config.extractModel) setExtractModel(config.extractModel as string);
    if (config.pipelinePrompt !== undefined) setPipelinePrompt(config.pipelinePrompt as string);
    if (config.pipelineSchema !== undefined) setPipelineSchema(config.pipelineSchema as string);
    if (config.pipelineTransformPrompt !== undefined) setPipelineTransformPrompt(config.pipelineTransformPrompt as string);
    if (config.pipelineModel) setPipelineModel(config.pipelineModel as string);
  };

  const handleShare = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (url) params.set("url", url);
    if (!renderJs) params.set("renderJs", "false");
    if (!mainContent) params.set("mainContent", "false");
    if (cacheTtl !== "3600") params.set("cacheTtl", cacheTtl);
    if (mode === "crawl") { params.set("maxPages", maxPages); params.set("maxDepth", maxDepth); }
    if (mode === "map") params.set("maxUrls", maxUrls);
    if (mode === "extract") {
      if (extractPrompt) params.set("extractPrompt", extractPrompt);
      if (extractSchema) params.set("extractSchema", extractSchema);
      if (extractModel !== "google/gemini-3-flash-preview") params.set("extractModel", extractModel);
    }
    if (mode === "pipeline") {
      if (pipelinePrompt) params.set("pipelinePrompt", pipelinePrompt);
      if (pipelineSchema) params.set("pipelineSchema", pipelineSchema);
      if (pipelineTransformPrompt) params.set("pipelineTransformPrompt", pipelineTransformPrompt);
      if (pipelineModel !== "google/gemini-3-flash-preview") params.set("pipelineModel", pipelineModel);
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard");
  };

  const handleSavePreset = async () => {
    if (!presetName.trim() || !user) return;
    const config = getCurrentConfig();
    const { data, error } = await supabase.from("playground_presets").insert({
      user_id: user.id,
      name: presetName.trim(),
      mode,
      config_json: config,
    }).select().single();
    if (!error && data) {
      setPresets(prev => [data as unknown as Preset, ...prev]);
      setPresetName("");
      setSavePresetOpen(false);
      toast.success("Preset saved");
    }
  };

  const handleDeletePreset = async (id: string) => {
    await supabase.from("playground_presets").delete().eq("id", id);
    setPresets(prev => prev.filter(p => p.id !== id));
  };

  const handleLoadPreset = (preset: Preset) => {
    setMode(preset.mode as Mode);
    restoreConfig(preset.config_json);
    setResult(null);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const handleRestoreHistory = (entry: HistoryEntry) => {
    setMode(entry.mode);
    restoreConfig(entry.params);
    setResult(null);
    setHistoryOpen(false);
  };

  const parseBatchUrls = (): string[] => {
    return batchUrls.
    split("\n").
    map((line) => line.trim()).
    filter((line) => line.length > 0 && !line.startsWith("#"));
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
            cache_ttl: Number(cacheTtl)
          };
          break;
        case "batch":
          functionName = "batch-scrape";
          body = {
            urls: parseBatchUrls(),
            formats: ["markdown", "html", "metadata", "links"],
            render_javascript: renderJs,
            only_main_content: mainContent,
            cache_ttl: Number(cacheTtl)
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
            only_main_content: mainContent
          };
          break;
        case "map":
          functionName = "map";
          body = {
            url,
            same_domain_only: true,
            include_subdomains: false,
            max_urls: Number(maxUrls)
          };
          break;
        case "extract":
          functionName = "extract";
          body = {
            url,
            model: extractModel,
            only_main_content: mainContent
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
        case "pipeline":
          functionName = "pipeline";
          body = {
            url,
            extract: {} as Record<string, unknown>,
          };
          if (pipelinePrompt.trim()) (body.extract as Record<string, unknown>).prompt = pipelinePrompt;
          if (pipelineSchema.trim()) {
            try {
              (body.extract as Record<string, unknown>).schema = JSON.parse(pipelineSchema);
            } catch {
              setResult({ success: false, error: { code: "INVALID_SCHEMA", message: "Invalid JSON schema" } });
              setLoading(false);
              return;
            }
          }
          (body.extract as Record<string, unknown>).model = pipelineModel;
          if (!(body.extract as Record<string, unknown>).prompt && !(body.extract as Record<string, unknown>).schema) {
            setResult({ success: false, error: { code: "BAD_REQUEST", message: "Provide a prompt or schema for extraction" } });
            setLoading(false);
            return;
          }
          if (pipelineTransformPrompt.trim()) {
            body.transform = { prompt: pipelineTransformPrompt, model: pipelineModel };
          }
          body.scrape_options = { render_javascript: renderJs, only_main_content: mainContent, cache_ttl: Number(cacheTtl) };
          break;
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        headers: { "X-API-Key": apiKey }
      });

      if (error) {
        setResult({ success: false, error: { code: "NETWORK_ERROR", message: error.message } });
      } else {
        // Store previous markdown for diff (scrape mode only)
        if (mode === "scrape" && result?.data?.markdown && previousUrl === url) {
          setPreviousMarkdown(result.data.markdown);
        } else if (mode === "scrape") {
          setPreviousMarkdown(result?.data?.markdown || null);
        }
        setPreviousUrl(url);

        setResult(data);
        if (mode === "batch") setResultTab("markdown");
        else if (mode === "map") setResultTab("json");
        else if (mode === "extract") setResultTab("extracted");
        else if (mode === "crawl") setResultTab("json");
        else if (mode === "pipeline") setResultTab("pipeline");
        else setResultTab("markdown");

        // Save to history
        if (data?.success !== false) {
          const entry: HistoryEntry = {
            mode,
            url: mode === "batch" ? parseBatchUrls().join(", ") : url,
            params: getCurrentConfig(),
            timestamp: Date.now(),
            title: data?.data?.title,
          };
          addHistory(entry);
          setHistory(getHistory());
        }
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
    pipeline: <GitBranch className="h-4 w-4" />,
  };

  const d = result?.data;
  const isBatchResult = mode === "batch" && Array.isArray(d);
  const batchItem = isBatchResult ? d[batchSelectedIdx] : null;
  const batchError = isBatchResult && result?.errors ? result.errors[batchSelectedIdx] : null;

  const diffLines = mode === "scrape" && previousMarkdown && d?.markdown && previousUrl === url
    ? computeDiff(previousMarkdown, d.markdown)
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test scrape, batch scrape, crawl, map, and extract endpoints interactively.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Presets dropdown */}
          {presets.length > 0 && (
            <Select onValueChange={(id) => {
              const p = presets.find(pr => pr.id === id);
              if (p) handleLoadPreset(p);
            }}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Load preset..." />
              </SelectTrigger>
              <SelectContent>
                {presets.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span className="capitalize text-muted-foreground">{p.mode}</span>
                      <span>{p.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Dialog open={savePresetOpen} onOpenChange={setSavePresetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Save className="h-3.5 w-3.5" /> Save Preset
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Save Preset</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input
                  placeholder="Preset name..."
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSavePreset()}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSavePresetOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSavePreset} disabled={!presetName.trim()}>Save</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>

          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setHistoryOpen(!historyOpen)}>
            <History className="h-3.5 w-3.5" /> History
          </Button>
        </div>
      </div>

      {/* History panel */}
      {historyOpen && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" /> Recent Runs
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No history yet. Run a request to see it here.</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {history.map((entry, i) => (
                <button
                  key={i}
                  onClick={() => handleRestoreHistory(entry)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded text-left hover:bg-accent transition-colors"
                >
                  <span className="text-xs font-medium capitalize text-primary shrink-0 w-14">{entry.mode}</span>
                  <span className="text-xs font-mono text-foreground truncate flex-1">{entry.url}</span>
                  {entry.title && <span className="text-xs text-muted-foreground truncate max-w-32">{entry.title}</span>}
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
              ))}
            </div>
          )}
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive mt-2"
              onClick={() => { localStorage.removeItem("playground_history"); setHistory([]); }}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Clear history
            </Button>
          )}
        </div>
      )}

      {/* Preset management */}
      {presets.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
              <ChevronRight className="h-3 w-3" /> Manage {presets.length} preset{presets.length !== 1 ? "s" : ""}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {presets.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium capitalize text-primary">{p.mode}</span>
                    <span className="text-sm">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleLoadPreset(p)}>Load</Button>
                    <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => handleDeletePreset(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Mode selector */}
      <div className="flex gap-2 flex-wrap">
        {(["scrape", "batch", "crawl", "map", "extract", "pipeline"] as Mode[]).map((m) => {
          const locked = (m === "extract" || m === "pipeline") && !extractAllowed;
          return (
            <Button
              key={m}
              variant={mode === m ? "default" : "secondary"}
              size="sm"
              onClick={() => { if (!locked) { setMode(m); setResult(null); } }}
              disabled={locked}
              className="gap-1.5 capitalize"
              title={locked ? "Upgrade to Standard to use this mode" : undefined}
            >
              {locked ? <LockIcon className="h-3.5 w-3.5" /> : modeIcons[m]}
              {m === "batch" ? "Batch Scrape" : m}
            </Button>
          );
        })}
      </div>

      {/* Input section */}
      <div className="rounded-lg border border-border p-5 bg-card space-y-4">
        {mode === "batch" ?
        <div>
            <Label htmlFor="batch-urls" className="text-xs text-muted-foreground mb-1.5 block">
              URLs (one per line, max 100)
            </Label>
            <Textarea
            id="batch-urls"
            placeholder={"https://example.com\nhttps://httpbin.org/html\nhttps://news.ycombinator.com"}
            value={batchUrls}
            onChange={(e) => setBatchUrls(e.target.value)}
            className="font-mono text-sm min-h-[120px]" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {parseBatchUrls().length} URL{parseBatchUrls().length !== 1 ? "s" : ""} entered
              </span>
              <Button onClick={handleRun} disabled={loading || parseBatchUrls().length === 0 || !apiKey} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                {loading ? "Running..." : `Batch Scrape (${parseBatchUrls().length})`}
              </Button>
            </div>
          </div> :
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
              onKeyDown={(e) => e.key === "Enter" && handleRun()} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleRun} disabled={loading || !url || !apiKey} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : modeIcons[mode]}
                {loading ? "Running..." : "Run"}
              </Button>
            </div>
          </div>
        }

        <div className="flex-wrap gap-6 text-sm flex items-center justify-start">
          {(mode === "scrape" || mode === "batch" || mode === "extract" || mode === "pipeline") &&
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
          }

          {(mode === "scrape" || mode === "batch" || mode === "pipeline") &&
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
          }

          {mode === "crawl" &&
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
          }

          {mode === "map" &&
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
          }
        </div>

        {mode === "extract" &&
        <div className="space-y-3 pt-2 border-t border-border">
            {extractionTemplates.length > 0 && (
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <Select onValueChange={(id) => {
                  const t = extractionTemplates.find(t => t.id === id);
                  if (t) {
                    if (t.prompt) setExtractPrompt(t.prompt);
                    if (t.schema_json) setExtractSchema(JSON.stringify(t.schema_json, null, 2));
                    if (t.model) setExtractModel(t.model);
                    supabase.from("extraction_templates").update({ use_count: t.use_count + 1 }).eq("id", t.id).then();
                    toast.success(`Loaded template: ${t.name}`);
                  }
                }}>
                  <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Load template..." /></SelectTrigger>
                  <SelectContent>
                    {extractionTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground block mb-1.5">Extraction prompt</Label>
              <Input
              placeholder="Extract the product name, price, and availability"
              value={extractPrompt}
              onChange={(e) => setExtractPrompt(e.target.value)}
              className="text-xs" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground block mb-1.5">JSON Schema (optional)</Label>
              <Textarea
              placeholder='{"type":"object","properties":{"name":{"type":"string"},"price":{"type":"number"}},"required":["name"]}'
              value={extractSchema}
              onChange={(e) => setExtractSchema(e.target.value)}
              className="text-xs font-mono min-h-[60px]" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Model</Label>
              <Select value={extractModel} onValueChange={setExtractModel}>
                <SelectTrigger className="w-64 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {grouped.free.length > 0 && <SelectItem value="__free_header" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Free — 0 credits</SelectItem>}
                  {grouped.free.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  {grouped.cheaper.length > 0 && <SelectItem value="__cheaper_header" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cheaper — 2 credits</SelectItem>}
                  {grouped.cheaper.map(m => <SelectItem key={m.id} value={m.id} disabled={!canUseModel(m.id)}>{m.name}{!canUseModel(m.id) ? " 🔒" : ""}</SelectItem>)}
                  {grouped.expensive.length > 0 && <SelectItem value="__expensive_header" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Expensive — 5 credits</SelectItem>}
                  {grouped.expensive.map(m => <SelectItem key={m.id} value={m.id} disabled={!canUseModel(m.id)}>{m.name}{!canUseModel(m.id) ? " 🔒" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(extractPrompt.trim() || extractSchema.trim()) && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setSaveTemplateOpen(true)}>
                <Save className="h-3.5 w-3.5" /> Save as Template
              </Button>
            )}
          </div>
        }

        {mode === "pipeline" &&
        <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-xs font-medium text-foreground">Extract Stage</p>
            {extractionTemplates.length > 0 && (
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <Select onValueChange={(id) => {
                  const t = extractionTemplates.find(t => t.id === id);
                  if (t) {
                    if (t.prompt) setPipelinePrompt(t.prompt);
                    if (t.schema_json) setPipelineSchema(JSON.stringify(t.schema_json, null, 2));
                    if (t.model) setPipelineModel(t.model);
                    supabase.from("extraction_templates").update({ use_count: t.use_count + 1 }).eq("id", t.id).then();
                    toast.success(`Loaded template: ${t.name}`);
                  }
                }}>
                  <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Load template..." /></SelectTrigger>
                  <SelectContent>
                    {extractionTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground block mb-1.5">Extraction prompt</Label>
              <Input
              placeholder="Extract the product name, price, and availability"
              value={pipelinePrompt}
              onChange={(e) => setPipelinePrompt(e.target.value)}
              className="text-xs" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground block mb-1.5">JSON Schema (optional)</Label>
              <Textarea
              placeholder='{"type":"object","properties":{"name":{"type":"string"},"price":{"type":"number"}},"required":["name"]}'
              value={pipelineSchema}
              onChange={(e) => setPipelineSchema(e.target.value)}
              className="text-xs font-mono min-h-[60px]" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Model</Label>
              <Select value={pipelineModel} onValueChange={setPipelineModel}>
                <SelectTrigger className="w-64 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {grouped.free.length > 0 && <SelectItem value="__free_header_p" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Free — 0 credits</SelectItem>}
                  {grouped.free.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  {grouped.cheaper.length > 0 && <SelectItem value="__cheaper_header_p" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cheaper — 2 credits</SelectItem>}
                  {grouped.cheaper.map(m => <SelectItem key={m.id} value={m.id} disabled={!canUseModel(m.id)}>{m.name}{!canUseModel(m.id) ? " 🔒" : ""}</SelectItem>)}
                  {grouped.expensive.length > 0 && <SelectItem value="__expensive_header_p" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Expensive — 5 credits</SelectItem>}
                  {grouped.expensive.map(m => <SelectItem key={m.id} value={m.id} disabled={!canUseModel(m.id)}>{m.name}{!canUseModel(m.id) ? " 🔒" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs font-medium text-foreground pt-2">Transform Stage (optional)</p>
            <div>
              <Label className="text-xs text-muted-foreground block mb-1.5">Transform prompt</Label>
              <Textarea
              placeholder="Normalize all prices to USD, flatten nested arrays"
              value={pipelineTransformPrompt}
              onChange={(e) => setPipelineTransformPrompt(e.target.value)}
              className="text-xs min-h-[50px]" />
            </div>
          </div>
        }
      </div>

      {/* Error state */}
      {result && !result.success && !isBatchResult &&
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">{result.error?.code}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{result.error?.message}</p>
          </div>
        </div>
      }

      {/* Batch Results */}
      {isBatchResult &&
      <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Batch complete — {result.meta?.completed ?? 0}/{result.meta?.total ?? 0} succeeded
              </span>
              {result.meta?.failed > 0 &&
            <span className="text-xs text-destructive font-medium">{result.meta.failed} failed</span>
            }
              {result.meta?.cache_hits > 0 &&
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary px-1.5 py-0.5 rounded bg-primary/10">
                  <Database className="h-3 w-3" />
                  {result.meta.cache_hits} cached
                </span>
            }
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              <Copy className="h-3 w-3" />
              {copied ? "Copied!" : "Copy JSON"}
            </Button>
          </div>

          <div className="px-4 py-2 border-b border-border bg-muted/30 flex gap-2 flex-wrap">
            {(d as any[]).map((item, idx) => {
            const err = result.errors?.[idx];
            const isSuccess = item !== null;
            return (
              <button
                key={idx}
                onClick={() => {setBatchSelectedIdx(idx);setResultTab("markdown");}}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                batchSelectedIdx === idx ?
                "bg-primary text-primary-foreground" :
                isSuccess ?
                "bg-card border border-border text-foreground hover:bg-accent" :
                "bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20"}`
                }>
                  {isSuccess ? item.title?.slice(0, 30) || item.url?.slice(0, 30) || `URL ${idx + 1}` : err?.url?.slice(0, 30) || `URL ${idx + 1} ✗`}
                </button>);
          })}
          </div>

          {batchItem ?
        <>
              <div className="px-4 py-2 border-b border-border flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground truncate">{batchItem.final_url || batchItem.url}</span>
                {batchItem.status_code &&
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded border border-border">{batchItem.status_code}</span>
            }
                {batchItem.timings &&
            <span className="text-xs font-mono text-muted-foreground">{batchItem.timings.total_ms}ms</span>
            }
              </div>

              {batchItem.warnings?.length > 0 &&
          <div className="px-4 py-2 border-b border-border bg-muted/30">
                  {batchItem.warnings.map((w: string, i: number) =>
            <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-destructive/70 shrink-0" />
                      {w}
                    </p>
            )}
                </div>
          }

              <Tabs value={resultTab} onValueChange={setResultTab}>
                <div className="px-4 border-b border-border">
                  <TabsList className="bg-transparent h-9 p-0 gap-4">
                    {batchItem.markdown !== undefined &&
                <TabsTrigger value="markdown" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Markdown</TabsTrigger>
                }
                    {batchItem.html !== undefined &&
                <TabsTrigger value="html" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">HTML</TabsTrigger>
                }
                    {batchItem.metadata !== undefined &&
                <TabsTrigger value="metadata" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Metadata</TabsTrigger>
                }
                    <TabsTrigger value="json" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Raw JSON</TabsTrigger>
                  </TabsList>
                </div>

                {batchItem.markdown !== undefined &&
            <TabsContent value="markdown" className="p-4 m-0">
                    <pre className="font-mono text-sm text-secondary-foreground whitespace-pre-wrap leading-relaxed">{batchItem.markdown}</pre>
                  </TabsContent>
            }
                {batchItem.html !== undefined &&
            <TabsContent value="html" className="p-4 m-0">
                    <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">{batchItem.html}</pre>
                  </TabsContent>
            }
                {batchItem.metadata !== undefined &&
            <TabsContent value="metadata" className="p-4 m-0">
                    <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">{JSON.stringify(batchItem.metadata, null, 2)}</pre>
                  </TabsContent>
            }
                <TabsContent value="json" className="p-4 m-0">
                  <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">{JSON.stringify(batchItem, null, 2)}</pre>
                </TabsContent>
              </Tabs>
            </> :
        batchError ?
        <div className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">{batchError.code}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{batchError.message}</p>
                <p className="text-xs font-mono text-muted-foreground mt-1">{batchError.url}</p>
              </div>
            </div> :
        null}

          <div className="px-4 py-3 border-t border-border flex gap-6 text-xs text-muted-foreground">
            <span>Total: {result.meta?.total}</span>
            <span>Completed: {result.meta?.completed}</span>
            <span>Failed: {result.meta?.failed}</span>
            <span>Credits: {result.meta?.credits_used}</span>
            {result.meta?.cache_hits > 0 && <span>Cache hits: {result.meta.cache_hits}</span>}
            {result.meta?.job_id && <span className="font-mono">{result.meta.job_id.slice(0, 8)}…</span>}
          </div>
        </div>
      }

      {/* Pipeline Results */}
      {mode === "pipeline" && d && result?.success &&
      <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Pipeline completed — {result.meta?.credits_used} credits</span>
              {d.stages?.scrape?.cache_hit &&
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary px-1.5 py-0.5 rounded bg-primary/10">
                  <Database className="h-3 w-3" /> Scrape cached
                </span>
            }
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              <Copy className="h-3 w-3" />
              {copied ? "Copied!" : "Copy JSON"}
            </Button>
          </div>

          <div className="p-4 space-y-3">
            <div className="rounded border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Stage 1: Scrape</p>
              <p className="text-xs text-foreground">{d.stages?.scrape?.title}</p>
              {d.stages?.scrape?.markdown && (
                <pre className="text-xs font-mono text-secondary-foreground whitespace-pre-wrap mt-2 max-h-32 overflow-y-auto">{d.stages.scrape.markdown}</pre>
              )}
            </div>

            <div className="rounded border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Stage 2: Extract</p>
              <pre className="text-xs font-mono text-secondary-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                {JSON.stringify(d.stages?.extract?.data, null, 2)}
              </pre>
              {d.stages?.extract?.validation && !d.stages.extract.validation.valid && (
                <div className="mt-2 p-2 rounded border border-destructive/20 bg-destructive/5">
                  <p className="text-xs text-destructive">⚠ Validation warnings:</p>
                  {d.stages.extract.validation.warnings?.map((w: string, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">• {w}</p>
                  ))}
                </div>
              )}
            </div>

            {d.stages?.transform && (
              <div className="rounded border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Stage 3: Transform</p>
                <pre className="text-xs font-mono text-secondary-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {JSON.stringify(d.stages.transform.data, null, 2)}
                </pre>
              </div>
            )}

            <div className="rounded border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-medium text-primary mb-1">Final Output</p>
              <pre className="text-xs font-mono text-secondary-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
                {JSON.stringify(d.final_output, null, 2)}
              </pre>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-border flex gap-6 text-xs text-muted-foreground">
            <span>Credits: {result.meta?.credits_used}</span>
            {result.meta?.run_id && <span className="font-mono">{result.meta.run_id.slice(0, 8)}…</span>}
          </div>
        </div>
      }

      {/* Single-item Results (scrape, crawl, map, extract) */}
      {d && !isBatchResult && mode !== "pipeline" &&
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
              {d.timings &&
            <span className="text-xs font-mono text-muted-foreground">{d.timings.total_ms}ms</span>
            }
              {d.status_code &&
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded border border-border">{d.status_code}</span>
            }
              {result?.meta?.cache_hit &&
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary px-1.5 py-0.5 rounded bg-primary/10">
                  <Database className="h-3 w-3" />
                  Cache hit
                </span>
            }
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              <Copy className="h-3 w-3" />
              {copied ? "Copied!" : "Copy JSON"}
            </Button>
          </div>

          {/* Warnings */}
          {(d.warnings?.length > 0 || result.warnings?.length > 0) &&
        <div className="px-4 py-2 border-b border-border bg-muted/30">
              {(d.warnings || result.warnings || []).map((w: string, i: number) =>
          <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-destructive/70 shrink-0" />
                  {w}
                </p>
          )}
            </div>
        }

          <Tabs value={resultTab} onValueChange={setResultTab}>
            <div className="px-4 border-b border-border">
              <TabsList className="bg-transparent h-9 p-0 gap-4">
                {mode === "scrape" && d.markdown !== undefined &&
              <TabsTrigger value="markdown" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Markdown</TabsTrigger>
              }
                {mode === "scrape" && d.html !== undefined &&
              <TabsTrigger value="html" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">HTML</TabsTrigger>
              }
                {mode === "scrape" && d.metadata !== undefined &&
              <TabsTrigger value="metadata" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Metadata</TabsTrigger>
              }
                {mode === "scrape" && diffLines &&
              <TabsTrigger value="diff" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Diff</TabsTrigger>
              }
                {mode === "extract" && d.extracted &&
              <TabsTrigger value="extracted" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Extracted</TabsTrigger>
              }
                {mode === "map" && d.urls &&
              <TabsTrigger value="urls" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">URLs ({d.urls.length})</TabsTrigger>
              }
                <TabsTrigger value="json" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Raw JSON</TabsTrigger>
              </TabsList>
            </div>

            {mode === "scrape" && d.markdown !== undefined &&
          <TabsContent value="markdown" className="p-4 m-0">
                <pre className="font-mono text-sm text-secondary-foreground whitespace-pre-wrap leading-relaxed">{d.markdown}</pre>
              </TabsContent>
          }
            {mode === "scrape" && d.html !== undefined &&
          <TabsContent value="html" className="p-4 m-0">
                <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">{d.html}</pre>
              </TabsContent>
          }
            {mode === "scrape" && d.metadata !== undefined &&
          <TabsContent value="metadata" className="p-4 m-0">
                <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">{JSON.stringify(d.metadata, null, 2)}</pre>
              </TabsContent>
          }
            {mode === "scrape" && diffLines &&
          <TabsContent value="diff" className="p-4 m-0 max-h-[500px] overflow-y-auto">
                <div className="font-mono text-xs leading-relaxed">
                  {diffLines.map((line, i) => (
                    <div
                      key={i}
                      className={`px-2 py-0.5 ${
                        line.type === "added" ? "bg-primary/15 text-primary" :
                        line.type === "removed" ? "bg-destructive/15 text-destructive" :
                        "text-secondary-foreground"
                      }`}
                    >
                      <span className="select-none text-muted-foreground mr-2">
                        {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                      </span>
                      {line.text}
                    </div>
                  ))}
                </div>
              </TabsContent>
          }
            {mode === "extract" && d.extracted &&
          <TabsContent value="extracted" className="p-4 m-0">
                <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">{JSON.stringify(d.extracted, null, 2)}</pre>
                {d.validation && !d.validation.valid &&
            <div className="mt-3 p-3 rounded border border-destructive/20 bg-destructive/5">
                    <p className="text-xs font-medium text-destructive mb-1">Validation warnings:</p>
                    {d.validation.warnings.map((w: string, i: number) =>
              <p key={i} className="text-xs text-muted-foreground">• {w}</p>
              )}
                  </div>
            }
              </TabsContent>
          }
            {mode === "map" && d.urls &&
          <TabsContent value="urls" className="p-4 m-0 max-h-96 overflow-y-auto">
                <div className="space-y-1">
                  {d.urls.map((u: string, i: number) =>
              <div key={i} className="flex items-center gap-2 text-xs font-mono text-secondary-foreground hover:text-primary">
                      <span className="text-muted-foreground w-8 text-right shrink-0">{i + 1}</span>
                      <a href={u} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{u}</a>
                    </div>
              )}
                </div>
              </TabsContent>
          }
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
      }

      {/* Save as Template Dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Template name..." value={templateName} onChange={e => setTemplateName(e.target.value)} />
            <Input placeholder="Description (optional)" value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSaveTemplateOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={!templateName.trim()} onClick={async () => {
                if (!user) return;
                const prompt = mode === "pipeline" ? pipelinePrompt : extractPrompt;
                const schema = mode === "pipeline" ? pipelineSchema : extractSchema;
                const model = mode === "pipeline" ? pipelineModel : extractModel;
                let parsedSchema = null;
                if (schema.trim()) { try { parsedSchema = JSON.parse(schema); } catch {} }
                const { error } = await supabase.from("extraction_templates").insert({
                  user_id: user.id,
                  name: templateName.trim(),
                  description: templateDesc.trim() || null,
                  prompt: prompt.trim() || null,
                  schema_json: parsedSchema,
                  model,
                });
                if (!error) {
                  toast.success("Template saved");
                  setSaveTemplateOpen(false);
                  setTemplateName("");
                  setTemplateDesc("");
                  const { data } = await supabase.from("extraction_templates").select("id,name,prompt,schema_json,model,use_count").order("use_count", { ascending: false });
                  if (data) setExtractionTemplates(data as any);
                } else {
                  toast.error("Failed to save template");
                }
              }}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>);
}
