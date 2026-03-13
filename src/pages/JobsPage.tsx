import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Job {
  id: string;
  mode: string;
  url: string;
  status: string;
  credits_used: number;
  duration_ms: number | null;
  created_at: string;
  title: string | null;
}

const statusStyles: Record<string, string> = {
  completed: "border-primary/30 text-primary bg-primary/10",
  failed: "border-destructive/30 text-destructive bg-destructive/10",
  running: "border-info/30 text-info bg-info/10",
  queued: "border-muted-foreground/30 text-muted-foreground bg-muted",
};

const typeColors: Record<string, string> = {
  scrape: "bg-primary/15 text-primary border-primary/20",
  batch: "bg-primary/15 text-primary border-primary/20",
  crawl: "bg-info/15 text-info border-info/20",
  extract: "bg-warning/15 text-warning border-warning/20",
  map: "bg-secondary text-secondary-foreground border-border",
  pipeline: "bg-accent/15 text-accent-foreground border-accent/20",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      const allJobs: Job[] = [];

      // Fetch scrape_jobs (unless filtering to extract/pipeline only)
      if (filter === "all" || filter === "scrape" || filter === "batch" || filter === "crawl" || filter === "map") {
        let scrapeQuery = supabase
          .from("scrape_jobs")
          .select("id, mode, url, status, credits_used, duration_ms, created_at, title")
          .order("created_at", { ascending: false })
          .limit(50);

        if (filter !== "all") scrapeQuery = scrapeQuery.eq("mode", filter);
        if (search) scrapeQuery = scrapeQuery.ilike("url", `%${search}%`);

        const { data } = await scrapeQuery;
        if (data) allJobs.push(...data);
      }

      // Fetch extraction_jobs
      if (filter === "all" || filter === "extract") {
        let extractQuery = supabase
          .from("extraction_jobs")
          .select("id, status, credits_used, created_at, source_url, started_at, finished_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (search) extractQuery = extractQuery.ilike("source_url", `%${search}%`);

        const { data } = await extractQuery;
        if (data) {
          allJobs.push(...data.map((e) => ({
            id: e.id,
            mode: "extract",
            url: e.source_url,
            status: e.status,
            credits_used: e.credits_used,
            duration_ms: e.started_at && e.finished_at
              ? new Date(e.finished_at).getTime() - new Date(e.started_at).getTime()
              : null,
            created_at: e.created_at,
            title: null,
          })));
        }
      }

      // Fetch pipeline_runs
      if (filter === "all" || filter === "pipeline") {
        let pipelineQuery = supabase
          .from("pipeline_runs")
          .select("id, status, credits_used, created_at, source_url, started_at, finished_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (search) pipelineQuery = pipelineQuery.ilike("source_url", `%${search}%`);

        const { data } = await pipelineQuery;
        if (data) {
          allJobs.push(...data.map((p) => ({
            id: p.id,
            mode: "pipeline",
            url: p.source_url,
            status: p.status ?? "unknown",
            credits_used: p.credits_used ?? 0,
            duration_ms: p.started_at && p.finished_at
              ? new Date(p.finished_at).getTime() - new Date(p.started_at).getTime()
              : null,
            created_at: p.created_at ?? "",
            title: null,
          })));
        }
      }

      // Sort all jobs by created_at descending
      allJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setJobs(allJobs.slice(0, 50));
      setLoading(false);
    };
    fetchJobs();
  }, [filter, search]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const formatDuration = (ms: number | null) => {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Job History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and inspect past scrape, crawl, map, extract, and pipeline jobs.
        </p>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 text-sm"
            placeholder="Search by URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32 h-9 text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="scrape">Scrape</SelectItem>
            <SelectItem value="batch">Batch</SelectItem>
            <SelectItem value="crawl">Crawl</SelectItem>
            <SelectItem value="map">Map</SelectItem>
            <SelectItem value="extract">Extract</SelectItem>
            <SelectItem value="pipeline">Pipeline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-sidebar">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Job ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">URL</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Credits</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No jobs yet. Run a scrape from the Playground to get started.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id} className="border-b border-border last:border-0 hover:bg-card-hover transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{j.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded border capitalize ${typeColors[j.mode] ?? typeColors.scrape}`}>
                        {j.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={j.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 max-w-[300px] hover:text-primary transition-colors"
                      >
                        <span className="truncate font-mono text-xs">{j.url}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border capitalize ${statusStyles[j.status] ?? statusStyles.queued}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          j.status === "completed" ? "bg-primary" :
                          j.status === "failed" ? "bg-destructive" :
                          j.status === "running" ? "bg-info animate-pulse" :
                          "bg-muted-foreground"
                        }`} />
                        {j.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{j.credits_used}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDuration(j.duration_ms)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatTime(j.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
