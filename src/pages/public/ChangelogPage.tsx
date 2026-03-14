import { Badge } from "@/components/ui/badge";

type Category = "feature" | "improvement" | "deprecation" | "fix";

interface ChangelogEntry {
  date: string;
  version: string;
  category: Category;
  title: string;
  description: string;
}

const categoryConfig: Record<Category, { label: string; variant: "success" | "info" | "warning" | "destructive" }> = {
  feature: { label: "Feature", variant: "success" },
  improvement: { label: "Improvement", variant: "info" },
  deprecation: { label: "Deprecation", variant: "warning" },
  fix: { label: "Fix", variant: "destructive" },
};

const entries: ChangelogEntry[] = [
  {
    date: "March 10, 2026",
    version: "v1.4.0",
    category: "feature",
    title: "Pipeline API — chain scrape, extract & transform in one call",
    description:
      "The new /pipeline endpoint lets you define a multi-step workflow (scrape → extract → transform) and execute it with a single request. Reusable pipeline definitions can be saved and triggered via schedules or webhooks.",
  },
  {
    date: "February 22, 2026",
    version: "v1.3.1",
    category: "improvement",
    title: "Faster JavaScript rendering for /scrape",
    description:
      "Upgraded the headless browser pool to reduce median render time by 40 %. The render_javascript option now also supports a wait_for_selector parameter for more reliable page-ready detection.",
  },
  {
    date: "February 10, 2026",
    version: "v1.3.0",
    category: "feature",
    title: "New /map endpoint for sitemap discovery",
    description:
      "Retrieve a structured list of all discoverable URLs on a domain — including pages found via sitemap.xml, robots.txt, and link traversal — in a single request.",
  },
  {
    date: "January 28, 2026",
    version: "v1.2.2",
    category: "fix",
    title: "Crawl depth limit off-by-one fix",
    description:
      "Fixed a bug where setting max_depth to 1 would sometimes include pages at depth 2. Crawl results are now strictly bounded by the configured depth.",
  },
  {
    date: "January 15, 2026",
    version: "v1.2.1",
    category: "deprecation",
    title: "Legacy /scrape response field `raw_html` renamed to `html`",
    description:
      "The raw_html field in scrape responses has been renamed to html. The old field will continue to work until April 2026 but is no longer documented. Please update your integrations.",
  },
  {
    date: "January 5, 2026",
    version: "v1.2.0",
    category: "feature",
    title: "Structured data extraction with /extract",
    description:
      "Supply a JSON schema and an optional prompt, and the new /extract endpoint will scrape a page and return structured data matching your schema — powered by LLM extraction under the hood.",
  },
];

export default function ChangelogPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Changelog
      </h1>
      <p className="mt-2 text-muted-foreground">
        New features, improvements, and deprecations for the Nebula Crawl API.
      </p>

      <div className="mt-12 space-y-0">
        {entries.map((entry, i) => {
          const cat = categoryConfig[entry.category];
          return (
            <div key={i} className="relative pl-8 pb-10 last:pb-0">
              {/* timeline line */}
              {i < entries.length - 1 && (
                <span className="absolute left-[7px] top-[22px] bottom-0 w-px bg-border" />
              )}
              {/* dot */}
              <span className="absolute left-0 top-[6px] h-[15px] w-[15px] rounded-full border-2 border-primary bg-background" />

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <time>{entry.date}</time>
                <span className="font-mono text-foreground/70">{entry.version}</span>
                <Badge variant={cat.variant}>{cat.label}</Badge>
              </div>

              <h2 className="mt-1.5 text-base font-semibold text-foreground leading-snug">
                {entry.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {entry.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
