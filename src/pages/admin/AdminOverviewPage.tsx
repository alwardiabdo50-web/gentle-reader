import { useAdminOverview } from "@/hooks/useAdminData";
import { Badge } from "@/components/ui/badge";
import { Users, Key, Zap, Bug, Coins, CheckCircle2, Brain } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

const TIER_VARIANT: Record<string, "success" | "info" | "warning" | "secondary"> = {
  free: "success",
  cheaper: "info",
  expensive: "warning",
};

const TIER_COLORS: Record<string, string> = {
  free: "hsl(142 71% 45%)",
  cheaper: "hsl(217 91% 60%)",
  expensive: "hsl(25 95% 53%)",
  unknown: "hsl(240 5% 64%)",
};

// Distinct palette for up to 5 models within same tier
const MODEL_PALETTE = [
  "hsl(217 91% 60%)",
  "hsl(142 71% 45%)",
  "hsl(25 95% 53%)",
  "hsl(280 67% 55%)",
  "hsl(352 83% 55%)",
];

interface ModelUsageEntry {
  model: string;
  tier: string;
  total_jobs: number;
  credits: number;
  by_plan: Record<string, number>;
}

interface TrendModel {
  model: string;
  tier: string;
}

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

  const modelUsage: ModelUsageEntry[] = data.modelUsage ?? [];
  const modelUsageTrend: Record<string, unknown>[] = data.modelUsageTrend ?? [];
  const trendModels: TrendModel[] = data.trendModels ?? [];

  // Build chart config from trend models
  const chartConfig: ChartConfig = {};
  trendModels.forEach((tm, i) => {
    chartConfig[tm.model] = {
      label: tm.model,
      color: TIER_COLORS[tm.tier] || MODEL_PALETTE[i % MODEL_PALETTE.length],
    };
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl md:text-[36px] font-bold text-foreground tracking-[-0.03em]">Admin Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`rounded-xl border border-border bg-card p-5 ${i === 0 ? "border-l-2 border-l-primary" : ""}`}>
            <div className="text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground mb-2">
              {s.label}
            </div>
            <div className="text-xl md:text-[28px] font-bold text-foreground tracking-[-0.03em]">{s.value}</div>
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

      {/* Model Usage Analytics */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Model Usage (30d)</h2>
        </div>

        {/* Trend Chart */}
        {modelUsageTrend.length > 1 && trendModels.length > 0 && (
          <div className="p-5 border-b border-border">
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <AreaChart data={modelUsageTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.substring(5)} // MM-DD
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  labelFormatter={(label: string) => new Date(label).toLocaleDateString()}
                />
                {trendModels.map((tm, i) => (
                  <Area
                    key={tm.model}
                    type="monotone"
                    dataKey={tm.model}
                    stackId="1"
                    stroke={chartConfig[tm.model]?.color || MODEL_PALETTE[i]}
                    fill={chartConfig[tm.model]?.color || MODEL_PALETTE[i]}
                    fillOpacity={0.3}
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          </div>
        )}

        <div className="p-0">
          {modelUsage.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">No extraction jobs in the last 30 days.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Jobs</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead>By Plan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelUsage.map((entry) => (
                  <TableRow key={entry.model}>
                    <TableCell className="font-mono text-foreground text-xs">{entry.model}</TableCell>
                    <TableCell>
                      <Badge variant={TIER_VARIANT[entry.tier] ?? "secondary"} className="capitalize">
                        {entry.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-foreground font-medium">{entry.total_jobs}</TableCell>
                    <TableCell className="text-right text-foreground font-medium">{entry.credits.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap">
                        {Object.entries(entry.by_plan)
                          .sort(([, a], [, b]) => b - a)
                          .map(([plan, count]) => (
                            <Badge key={plan} variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                              {plan}: {count}
                            </Badge>
                          ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
