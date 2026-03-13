import { BookOpen } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateSnippet, type Lang } from "@/components/docs/snippetGenerator";
import { LanguageSnippet } from "@/components/docs/LanguageSnippet";
import { ParamsTable } from "@/components/docs/ParamsTable";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const PLACEHOLDER_KEY = "YOUR_API_KEY";

function snippets(method: "GET" | "POST", path: string, body: Record<string, unknown> | undefined) {
  const def = { method, path, body };
  return {
    curl: generateSnippet(def, "curl", PLACEHOLDER_KEY),
    python: generateSnippet(def, "python", PLACEHOLDER_KEY),
    nodejs: generateSnippet(def, "nodejs", PLACEHOLDER_KEY),
  };
}

export default function PublicDocsPage() {
  const { session } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Documentation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quick-start guide and endpoint reference.
        </p>
        {!session && (
          <Button size="sm" className="mt-3" asChild>
            <Link to="/auth">Sign up to get your API key</Link>
          </Button>
        )}
        {session && (
          <Button size="sm" variant="outline" className="mt-3" asChild>
            <Link to="/api-keys">Manage your API keys</Link>
          </Button>
        )}
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
            <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
            <TabsTrigger value="usage" className="text-xs">Usage</TabsTrigger>
          </TabsList>

          <TabsContent value="scrape" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-semibold">POST /v1/scrape</h3>
              <p className="text-xs text-muted-foreground mt-1">Scrape a single URL and get back structured content. Costs <strong>1 credit</strong>.</p>
            </div>
            <ParamsTable params={[
              { name: "url", type: "string", default: "required", desc: "Target URL to scrape" },
              { name: "formats", type: "string[]", default: '["markdown"]', desc: "Output formats: markdown, html, metadata, links" },
              { name: "render_javascript", type: "boolean", default: "true", desc: "Enable JS rendering" },
              { name: "only_main_content", type: "boolean", default: "true", desc: "Strip nav/footer" },
              { name: "screenshot", type: "boolean", default: "false", desc: "Capture screenshot" },
              { name: "timeout_ms", type: "number", default: "30000", desc: "Request timeout (max 60000)" },
            ]} />
            <LanguageSnippet snippets={snippets("POST", "/scrape", {
              url: "https://example.com",
              formats: ["markdown", "html", "metadata", "links"],
              render_javascript: true,
              only_main_content: true,
            })} />
          </TabsContent>

          <TabsContent value="crawl" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-semibold">POST /v1/crawl</h3>
              <p className="text-xs text-muted-foreground mt-1">Start an async crawl job. Costs <strong>1 credit per page</strong>.</p>
            </div>
            <ParamsTable params={[
              { name: "url", type: "string", default: "required", desc: "Root URL to crawl" },
              { name: "max_pages", type: "number", default: "100", desc: "Max pages to crawl (1-1000)" },
              { name: "max_depth", type: "number", default: "3", desc: "Max link depth (1-10)" },
              { name: "same_domain_only", type: "boolean", default: "true", desc: "Stay on same domain" },
              { name: "exclude_patterns", type: "string[]", default: "[]", desc: "URL patterns to skip" },
            ]} />
            <LanguageSnippet snippets={snippets("POST", "/crawl", {
              url: "https://example.com",
              max_pages: 50,
              max_depth: 3,
              same_domain_only: true,
              exclude_patterns: ["/logout", "/cart"],
            })} />
            <div className="mt-4">
              <h3 className="text-sm font-semibold">GET /v1/crawl/:id</h3>
              <p className="text-xs text-muted-foreground mt-1">Poll crawl status and get paginated results.</p>
            </div>
            <LanguageSnippet snippets={snippets("GET", "/crawl/<job_id>", undefined)} />
          </TabsContent>

          <TabsContent value="map" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-semibold">POST /v1/map</h3>
              <p className="text-xs text-muted-foreground mt-1">Discover URLs from sitemaps and page links. Costs <strong>1 credit</strong>.</p>
            </div>
            <LanguageSnippet snippets={snippets("POST", "/map", {
              url: "https://example.com",
              same_domain_only: true,
              include_subdomains: false,
              max_urls: 500,
            })} />
          </TabsContent>

          <TabsContent value="extract" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-semibold">POST /v1/extract</h3>
              <p className="text-xs text-muted-foreground mt-1">
                AI-powered structured data extraction. Costs <strong>2 credits</strong>. Supports natural-language prompts or JSON schema mode.
              </p>
            </div>
            <p className="text-xs font-medium mt-2">Prompt mode:</p>
            <LanguageSnippet snippets={snippets("POST", "/extract", {
              url: "https://example.com/product/123",
              prompt: "Extract the product name, price, and availability",
              model: "google/gemini-3-flash-preview",
            })} />
            <p className="text-xs font-medium mt-4">Schema mode:</p>
            <LanguageSnippet snippets={snippets("POST", "/extract", {
              url: "https://example.com/product/123",
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  price: { type: "number" },
                  in_stock: { type: "boolean" },
                },
                required: ["name", "price"],
              },
              model: "google/gemini-3-flash-preview",
            })} />
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-semibold">POST /v1/pipeline</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Run a multi-stage pipeline (scrape → extract → transform). Costs <strong>1 credit</strong> for scrape + <strong>2 credits</strong> per AI stage used.
              </p>
            </div>
            <p className="text-xs font-medium mt-2">Inline mode (all config in request):</p>
            <LanguageSnippet snippets={snippets("POST", "/pipeline", {
              url: "https://example.com/product/123",
              extract: {
                prompt: "Extract the product name and price",
                model: "google/gemini-3-flash-preview",
              },
              transform: {
                prompt: "Format as a one-line summary",
                model: "google/gemini-3-flash-preview",
              },
            })} />
            <p className="text-xs font-medium mt-4">Saved pipeline mode (reference by ID):</p>
            <LanguageSnippet snippets={snippets("POST", "/pipeline", {
              url: "https://example.com/product/123",
              pipeline_id: "<your_pipeline_id>",
            })} />
            <ParamsTable params={[
              { name: "url", type: "string", default: "required", desc: "Target URL to scrape and process" },
              { name: "pipeline_id", type: "string", default: "—", desc: "ID of a saved pipeline template" },
              { name: "extract.prompt", type: "string", default: "—", desc: "Natural-language extraction prompt" },
              { name: "extract.schema", type: "object", default: "—", desc: "JSON Schema for structured extraction" },
              { name: "extract.model", type: "string", default: "gemini-3-flash", desc: "AI model for extraction" },
              { name: "transform.prompt", type: "string", default: "—", desc: "Transform/reformat prompt" },
              { name: "transform.model", type: "string", default: "gemini-3-flash", desc: "AI model for transform" },
            ]} />
          </TabsContent>

          <TabsContent value="usage" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-semibold">GET /v1/usage</h3>
              <p className="text-xs text-muted-foreground mt-1">Get your current credit balance and rate limit info.</p>
            </div>
            <LanguageSnippet snippets={snippets("GET", "/api-usage", undefined)} />
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
