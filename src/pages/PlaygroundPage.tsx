import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Globe, Map, Brain, Loader2, Copy, CheckCircle2 } from "lucide-react";

type Mode = "scrape" | "crawl" | "map" | "extract";

const MOCK_SCRAPE_RESULT = {
  success: true,
  data: {
    url: "https://example.com",
    final_url: "https://example.com",
    title: "Example Domain",
    status_code: 200,
    markdown: "# Example Domain\n\nThis domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.\n\n[More information...](https://www.iana.org/domains/example)",
    metadata: {
      description: "Example description",
      language: "en",
      canonical_url: "https://example.com",
    },
    links: [{ href: "https://iana.org", text: "More information" }],
    timings: { navigation_ms: 812, extraction_ms: 149, total_ms: 1078 },
  },
  meta: { credits_used: 1 },
};

export default function PlaygroundPage() {
  const [mode, setMode] = useState<Mode>("scrape");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<object | null>(null);
  const [resultTab, setResultTab] = useState("markdown");
  const [renderJs, setRenderJs] = useState(true);
  const [mainContent, setMainContent] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleRun = () => {
    if (!url) return;
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setLoading(false);
      setResult(MOCK_SCRAPE_RESULT);
    }, 1500);
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

  const r = result as typeof MOCK_SCRAPE_RESULT | null;

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
          >
            {modeIcons[m]}
            {m}
          </Button>
        ))}
      </div>

      {/* Input section */}
      <div className="rounded-lg border border-border p-5 surface-1 space-y-4">
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
            <Button onClick={handleRun} disabled={loading || !url} className="glow-primary gap-2">
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

      {/* Results */}
      {r && (
        <div className="rounded-lg border border-border surface-1 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{r.data.title}</span>
              <span className="text-xs font-mono text-muted-foreground">
                {r.data.timings.total_ms}ms
              </span>
              <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                {r.data.status_code}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              <Copy className="h-3 w-3" />
              {copied ? "Copied!" : "Copy JSON"}
            </Button>
          </div>

          <Tabs value={resultTab} onValueChange={setResultTab}>
            <div className="px-4 border-b border-border">
              <TabsList className="bg-transparent h-9 p-0 gap-4">
                <TabsTrigger value="markdown" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Markdown</TabsTrigger>
                <TabsTrigger value="html" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">HTML</TabsTrigger>
                <TabsTrigger value="metadata" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Metadata</TabsTrigger>
                <TabsTrigger value="json" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2">Raw JSON</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="markdown" className="p-4 m-0">
              <pre className="font-mono text-sm text-secondary-foreground whitespace-pre-wrap leading-relaxed">
                {r.data.markdown}
              </pre>
            </TabsContent>
            <TabsContent value="html" className="p-4 m-0">
              <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">
                {"<html>\n  <head><title>Example Domain</title></head>\n  <body>\n    <h1>Example Domain</h1>\n    <p>This domain is for use in illustrative examples...</p>\n  </body>\n</html>"}
              </pre>
            </TabsContent>
            <TabsContent value="metadata" className="p-4 m-0">
              <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">
                {JSON.stringify(r.data.metadata, null, 2)}
              </pre>
            </TabsContent>
            <TabsContent value="json" className="p-4 m-0">
              <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap">
                {JSON.stringify(r, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>

          {/* Links & Timings footer */}
          <div className="px-4 py-3 border-t border-border flex gap-6 text-xs text-muted-foreground">
            <span>Links: {r.data.links.length}</span>
            <span>Nav: {r.data.timings.navigation_ms}ms</span>
            <span>Extract: {r.data.timings.extraction_ms}ms</span>
            <span>Credits: {r.meta.credits_used}</span>
          </div>
        </div>
      )}
    </div>
  );
}
