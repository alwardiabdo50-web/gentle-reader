import { useAdminOverview } from "@/hooks/useAdminData";
import { Badge } from "@/components/ui/badge";
import { Users, Key, Zap, Bug, Coins, CheckCircle2 } from "lucide-react";

export default function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview();

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading overview…</div>;
  }

  if (!data) return null;

  const stats = [
    { label: "Total Users", value: data.totalUsers, icon: Users, accent: true },
    { label: "Active API Keys", value: data.activeKeys, icon: Key },
    { label: "Scrape Jobs (30d)", value: data.scrapeCount, icon: Zap },
    { label: "Crawl Jobs (30d)", value: data.crawlCount, icon: Zap },
    { label: "Extract Jobs (30d)", value: data.extractCount, icon: Zap },
    { label: "Failed Scrapes (30d)", value: data.failedScrapes, icon: Bug },
    { label: "Failed Crawls (30d)", value: data.failedCrawls, icon: Bug },
    { label: "Credits Used (total)", value: data.totalCreditsUsed?.toLocaleString(), icon: Coins },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl md:text-[36px] font-bold text-foreground tracking-[-0.03em]">Admin Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`rounded-xl border border-border bg-card p-5 ${i === 0 ? "border-l-2 border-l-primary" : ""}`}>
            <div className="text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground mb-2">
              {s.label}
            </div>
            <div className="text-[28px] font-bold text-foreground tracking-[-0.03em]">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Plan Distribution</h2>
        </div>
        <div className="p-5">
          <div className="flex gap-2 flex-wrap">
            {Object.entries(data.planDistribution || {}).map(([plan, count]) => (
              <Badge key={plan} variant="secondary" className="text-xs px-3 py-1 capitalize">
                {plan}: {count as number}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent Failures</h2>
        </div>
        <div className="p-5">
          {data.recentFailures?.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              All systems healthy
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentFailures?.map((f: Record<string, string>) => (
                <div key={f.id} className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground font-mono truncate block">{f.url}</span>
                    <span className="text-destructive">{f.error_code}: {f.error_message}</span>
                  </div>
                  <Badge variant="outline" className="shrink-0 ml-2">{f.mode}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
