import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

interface Job {
  id: string;
  type: "scrape" | "crawl" | "extract" | "map";
  url: string;
  status: "completed" | "failed" | "running" | "queued";
  credits: number;
  duration: string;
  createdAt: string;
}

const MOCK_JOBS: Job[] = [
  { id: "scr_01abc", type: "scrape", url: "https://example.com", status: "completed", credits: 1, duration: "1.1s", createdAt: "2026-03-08T15:30:00Z" },
  { id: "crw_02def", type: "crawl", url: "https://docs.example.com", status: "running", credits: 12, duration: "45s", createdAt: "2026-03-08T15:25:00Z" },
  { id: "ext_03ghi", type: "extract", url: "https://shop.example.com/product/1", status: "completed", credits: 2, duration: "3.2s", createdAt: "2026-03-08T15:20:00Z" },
  { id: "scr_04jkl", type: "scrape", url: "https://blog.example.com/post/hello", status: "failed", credits: 0, duration: "30s", createdAt: "2026-03-08T15:10:00Z" },
  { id: "map_05mno", type: "map", url: "https://example.com", status: "completed", credits: 1, duration: "2.5s", createdAt: "2026-03-08T14:50:00Z" },
  { id: "scr_06pqr", type: "scrape", url: "https://news.ycombinator.com", status: "completed", credits: 1, duration: "1.8s", createdAt: "2026-03-08T14:40:00Z" },
  { id: "crw_07stu", type: "crawl", url: "https://tailwindcss.com/docs", status: "completed", credits: 45, duration: "2m 12s", createdAt: "2026-03-08T13:00:00Z" },
  { id: "ext_08vwx", type: "extract", url: "https://amazon.com/dp/B0123", status: "failed", credits: 0, duration: "30s", createdAt: "2026-03-08T12:30:00Z" },
];

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
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = MOCK_JOBS.filter((j) => {
    if (filter !== "all" && j.type !== filter) return false;
    if (search && !j.url.toLowerCase().includes(search.toLowerCase()) && !j.id.includes(search)) return false;
    return true;
  });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Job History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and inspect past scrape, crawl, map, and extract jobs.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 text-sm"
            placeholder="Search by URL or job ID..."
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

      {/* Jobs table */}
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
            {filtered.map((j) => (
              <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{j.id}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border capitalize ${typeColors[j.type]}`}>
                    {j.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 max-w-[300px]">
                    <span className="truncate font-mono text-xs">{j.url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border capitalize ${statusStyles[j.status]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      j.status === "completed" ? "bg-primary" :
                      j.status === "failed" ? "bg-destructive" :
                      j.status === "running" ? "bg-nebula-cyan animate-pulse" :
                      "bg-muted-foreground"
                    }`} />
                    {j.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{j.credits}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{j.duration}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatTime(j.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {filtered.length} of {MOCK_JOBS.length} jobs</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary">1</Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
