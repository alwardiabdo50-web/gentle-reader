import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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
  running: "border-nebula-cyan/30 text-nebula-cyan bg-nebula-cyan/10",
  queued: "border-muted-foreground/30 text-muted-foreground bg-muted",
};

const typeColors: Record<string, string> = {
  scrape: "bg-primary/15 text-primary border-primary/20",
  crawl: "bg-nebula-cyan/15 text-nebula-cyan border-nebula-cyan/20",
  extract: "bg-nebula-warning/15 text-nebula-warning border-nebula-warning/20",
  map: "bg-secondary text-secondary-foreground border-border",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      let query = supabase
        .from("scrape_jobs")
        .select("id, mode, url, status, credits_used, duration_ms, created_at, title")
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter !== "all") query = query.eq("mode", filter);
      if (search) query = query.ilike("url", `%${search}%`);

      const { data } = await query;
      setJobs(data ?? []);
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
          Browse and inspect past scrape, crawl, map, and extract jobs.
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
            <SelectItem value="crawl">Crawl</SelectItem>
            <SelectItem value="map">Map</SelectItem>
            <SelectItem value="extract">Extract</SelectItem>
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
              <tr className="border-b border-border surface-2">
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
                  <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{j.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded border capitalize ${typeColors[j.mode] ?? typeColors.scrape}`}>
                        {j.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 max-w-[300px]">
                        <span className="truncate font-mono text-xs">{j.url}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border capitalize ${statusStyles[j.status] ?? statusStyles.queued}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          j.status === "completed" ? "bg-primary" :
                          j.status === "failed" ? "bg-destructive" :
                          j.status === "running" ? "bg-nebula-cyan animate-pulse" :
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
