import { useAdminOverview } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Key, Zap, Bug, Coins } from "lucide-react";

export default function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview();

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading overview…</div>;
  }

  if (!data) return null;

  const stats = [
    { label: "Total Users", value: data.totalUsers, icon: Users },
    { label: "Active API Keys", value: data.activeKeys, icon: Key },
    { label: "Scrape Jobs (30d)", value: data.scrapeCount, icon: Zap },
    { label: "Crawl Jobs (30d)", value: data.crawlCount, icon: Zap },
    { label: "Extract Jobs (30d)", value: data.extractCount, icon: Zap },
    { label: "Failed Scrapes (30d)", value: data.failedScrapes, icon: Bug },
    { label: "Failed Crawls (30d)", value: data.failedCrawls, icon: Bug },
    { label: "Credits Used (total)", value: data.totalCreditsUsed?.toLocaleString(), icon: Coins },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              <div className="text-xl font-bold text-foreground">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan distribution */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(data.planDistribution || {}).map(([plan, count]) => (
              <Badge key={plan} variant="secondary" className="text-xs px-3 py-1">
                {plan}: {count as number}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent failures */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recent Failures</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentFailures?.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent failures 🎉</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
