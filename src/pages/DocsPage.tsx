import { useState } from "react";
import { Copy, CheckCircle2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg border border-border bg-muted/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-[10px] font-mono text-muted-foreground uppercase">{language}</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleCopy}>
          {copied ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-foreground leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

const SCRAPE_EXAMPLE = `curl -X POST https://moeegphrlhtuovqtgrci.supabase.co/functions/v1/scrape \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: nc_live_your_api_key_here" \\
  -d '{
    "url": "https://example.com",
    "formats": ["markdown", "html", "metadata", "links"],
    "render_javascript": true,
    "only_main_content": true
  }'`;

const CRAWL_EXAMPLE = `curl -X POST https://moeegphrlhtuovqtgrci.supabase.co/functions/v1/crawl \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: nc_live_your_api_key_here" \\
  -d '{
    "url": "https://example.com",
    "max_pages": 50,
    "max_depth": 3,
    "same_domain_only": true,
    "exclude_patterns": ["/logout", "/cart"]
  }'`;

const CRAWL_STATUS_EXAMPLE = `curl https://moeegphrlhtuovqtgrci.supabase.co/functions/v1/crawl/<job_id> \\
  -H "X-API-Key: nc_live_your_api_key_here"`;

const MAP_EXAMPLE = `curl -X POST https://moeegphrlhtuovqtgrci.supabase.co/functions/v1/map \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: nc_live_your_api_key_here" \\
  -d '{
    "url": "https://example.com",
    "same_domain_only": true,
    "include_subdomains": false,
    "max_urls": 500
  }'`;

const EXTRACT_PROMPT_EXAMPLE = `curl -X POST https://moeegphrlhtuovqtgrci.supabase.co/functions/v1/extract \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: nc_live_your_api_key_here" \\
  -d '{
    "url": "https://example.com/product/123",
    "prompt": "Extract the product name, price, and availability",
    "model": "google/gemini-3-flash-preview"
  }'`;

const EXTRACT_SCHEMA_EXAMPLE = `curl -X POST https://moeegphrlhtuovqtgrci.supabase.co/functions/v1/extract \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: nc_live_your_api_key_here" \\
  -d '{
    "url": "https://example.com/product/123",
    "schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "price": { "type": "number" },
        "in_stock": { "type": "boolean" }
      },
      "required": ["name", "price"]
    },
    "model": "google/gemini-3-flash-preview"
  }'`;

const USAGE_EXAMPLE = `curl https://moeegphrlhtuovqtgrci.supabase.co/functions/v1/api-usage \\
  -H "X-API-Key: nc_live_your_api_key_here"`;

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Documentation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quick-start guide and endpoint reference. Use your API key from the API Keys page.
        </p>
      </div>

      {/* Auth */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Authentication
        </h2>
        <p className="text-sm text-muted-foreground">
          All API requests require an API key. Pass it via the <code className="text-xs bg-muted px-1.5 py-0.5 rounded border border-border font-mono">X-API-Key</code> header
          or <code className="text-xs bg-muted px-1.5 py-0.5 rounded border border-border font-mono">Authorization: Bearer &lt;key&gt;</code>.
        </p>
        <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-1">
          <p className="text-xs font-medium">Quick setup:</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal ml-4">
            <li>Go to <strong>API Keys</strong> page and create a new key</li>
            <li>Copy the token (shown only once)</li>
            <li>Add to your requests as a header</li>
          </ol>
        </div>
      </section>

      {/* Endpoints */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Endpoints</h2>

        <Tabs defaultValue="scrape">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="scrape" className="text-xs">Scrape</TabsTrigger>
            <TabsTrigger value="crawl" className="text-xs">Crawl</TabsTrigger>
            <TabsTrigger value="map" className="text-xs">Map</TabsTrigger>
            <TabsTrigger value="extract" className="text-xs">Extract</TabsTrigger>
            <TabsTrigger value="usage" className="text-xs">Usage</TabsTrigger>
          </TabsList>

          <TabsContent value="scrape" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-semibold">POST /v1/scrape</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Scrape a single URL and get back structured content. Costs <strong>1 credit</strong>.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium">Parameters:</p>
              <div className="rounded-lg border border-border divide-y divide-border text-xs">
                {[
                  ["url", "string", "required", "Target URL to scrape"],
                  ["formats", "string[]", '["markdown"]', "Output formats: markdown, html, metadata, links"],
                  ["render_javascript", "boolean", "true", "Enable JS rendering"],
                  ["only_main_content", "boolean", "true", "Strip nav/footer"],
                  ["screenshot", "boolean", "false", "Capture screenshot"],
                  ["timeout_ms", "number", "30000", "Request timeout (max 60000)"],
                ].map(([name, type, def, desc]) => (
                  <div key={name} className="flex items-start px-3 py-2 gap-4">
                    <code className="font-mono text-primary shrink-0 w-36">{name}</code>
                    <span className="text-muted-foreground w-16 shrink-0">{type}</span>
                    <span className="text-muted-foreground w-20 shrink-0">{def}</span>
                    <span className="text-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <CodeBlock code={SCRAPE_EXAMPLE} language="bash" />
          </TabsContent>

          <TabsContent value="crawl" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-semibold">POST /v1/crawl</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Start an async crawl job. Costs <strong>1 credit per page</strong>.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium">Parameters:</p>
              <div className="rounded-lg border border-border divide-y divide-border text-xs">
                {[
                  ["url", "string", "required", "Root URL to crawl"],
                  ["max_pages", "number", "100", "Max pages to crawl (1-1000)"],
                  ["max_depth", "number", "3", "Max link depth (1-10)"],
                  ["same_domain_only", "boolean", "true", "Stay on same domain"],
                  ["exclude_patterns", "string[]", "[]", "URL patterns to skip"],
                ].map(([name, type, def, desc]) => (
                  <div key={name} className="flex items-start px-3 py-2 gap-4">
                    <code className="font-mono text-primary shrink-0 w-36">{name}</code>
                    <span className="text-muted-foreground w-16 shrink-0">{type}</span>
                    <span className="text-muted-foreground w-20 shrink-0">{def}</span>
                    <span className="text-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <CodeBlock code={CRAWL_EXAMPLE} language="bash" />
            <div className="mt-4">
              <h3 className="text-sm font-semibold">GET /v1/crawl/:id</h3>
              <p className="text-xs text-muted-foreground mt-1">Poll crawl status and get paginated results.</p>
            </div>
            <CodeBlock code={CRAWL_STATUS_EXAMPLE} language="bash" />
          </TabsContent>

          <TabsContent value="map" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-semibold">POST /v1/map</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Discover URLs from sitemaps and page links. Costs <strong>1 credit</strong>.
              </p>
            </div>
            <CodeBlock code={MAP_EXAMPLE} language="bash" />
          </TabsContent>

          <TabsContent value="extract" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-semibold">POST /v1/extract</h3>
              <p className="text-xs text-muted-foreground mt-1">
                AI-powered structured data extraction. Costs <strong>2 credits</strong>.
                Supports natural-language prompts or JSON schema mode.
              </p>
            </div>
            <p className="text-xs font-medium mt-2">Prompt mode:</p>
            <CodeBlock code={EXTRACT_PROMPT_EXAMPLE} language="bash" />
            <p className="text-xs font-medium mt-4">Schema mode:</p>
            <CodeBlock code={EXTRACT_SCHEMA_EXAMPLE} language="bash" />
          </TabsContent>

          <TabsContent value="usage" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-semibold">GET /v1/usage</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Get your current credit balance and rate limit info.
              </p>
            </div>
            <CodeBlock code={USAGE_EXAMPLE} language="bash" />
          </TabsContent>
        </Tabs>
      </section>

      {/* Rate limits */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Rate Limits & Credits</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Credits/mo</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Rate Limit</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Price</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Free", "500", "5 req/min", "$0"],
                ["Starter", "10,000", "60 req/min", "$29/mo"],
                ["Pro", "50,000", "200 req/min", "$99/mo"],
                ["Scale", "250,000", "1,000 req/min", "$349/mo"],
              ].map(([plan, credits, rate, price]) => (
                <tr key={plan} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{plan}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{credits}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{rate}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Error codes */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Error Codes</h2>
        <div className="rounded-lg border border-border divide-y divide-border text-xs">
          {[
            ["UNAUTHORIZED", "401", "Missing or invalid API key"],
            ["BAD_REQUEST", "400", "Invalid request body or missing required fields"],
            ["INVALID_URL", "422", "URL could not be parsed or is unsupported"],
            ["INSUFFICIENT_CREDITS", "402", "Not enough credits — upgrade or top up"],
            ["NAVIGATION_TIMEOUT", "408", "Page navigation timed out"],
            ["BLOCKED_BY_TARGET", "403", "Target site blocked the request"],
            ["EXTRACTION_FAILED", "422", "AI model output could not be parsed as valid JSON"],
            ["INTERNAL_ERROR", "500", "Unexpected server error"],
          ].map(([code, status, desc]) => (
            <div key={code} className="flex items-start px-4 py-2.5 gap-4">
              <code className="font-mono text-destructive shrink-0 w-44">{code}</code>
              <span className="text-muted-foreground w-10 shrink-0">{status}</span>
              <span className="text-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
