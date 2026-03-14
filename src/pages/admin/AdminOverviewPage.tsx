import { useState } from "react";
import { useAdminOverview } from "@/hooks/useAdminData";
import AdminUserDetailDialog from "@/components/admin/AdminUserDetailDialog";
import { Badge } from "@/components/ui/badge";
import {
  Users, Key, Zap, Bug, Coins, CheckCircle2, Brain, TrendingUp, TrendingDown,
  Activity, Shield, Clock, Webhook, CalendarClock, GitBranch, UserPlus,
  CreditCard, AlertTriangle, Globe, Bot, ChevronRight,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart } from "recharts";

// ─── Types ───────────────────────────────────────────────
interface ModelUsageEntry {
  model: string;
  tier: string;
  total_jobs: number;
  credits: number;
  by_plan: Record<string, number>;
}
interface TrendModel { model: string; tier: string; }
interface ActivityItem { type: string; timestamp: string; description: string; id: string; }
interface TopUser { user_id: string; full_name: string | null; plan: string; credits_used: number; }

// ─── Constants ───────────────────────────────────────────
const TIER_VARIANT: Record<string, "success" | "info" | "warning" | "secondary"> = {
  free: "success", cheaper: "info", expensive: "warning",
};
const TIER_COLORS: Record<string, string> = {
  free: "hsl(142 71% 45%)", cheaper: "hsl(217 91% 60%)", expensive: "hsl(25 95% 53%)", unknown: "hsl(240 5% 64%)",
};
const MODEL_PALETTE = [
  "hsl(217 91% 60%)", "hsl(142 71% 45%)", "hsl(25 95% 53%)", "hsl(280 67% 55%)", "hsl(352 83% 55%)",
];

const ACTIVITY_ICONS: Record<string, typeof Users> = {
  signup: UserPlus, subscription: CreditCard, scrape_completed: Globe,
  scrape_failed: AlertTriangle, crawl_completed: Globe, extract_completed: Bot,
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ──────────────────────────────────────
function HeroKPI({ label, value, sub, icon: Icon, delta, accent }: {
  label: string; value: string | number; sub?: string; icon: typeof Users; delta?: string; accent?: boolean;
}) {
  const isPositive = delta && !delta.startsWith("-");
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-card p-5 ${accent ? "border-primary/30" : "border-border"}`}>
      {accent && <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />}
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground">{label}</p>
          <p className="text-2xl md:text-[32px] font-bold text-foreground tracking-[-0.03em] leading-none">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className={`rounded-lg p-2 ${accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            <Icon className="h-4 w-4" />
          </div>
          {delta && (
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SecondaryStatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalJobs30d = (data.scrapeCount ?? 0) + (data.crawlCount ?? 0) + (data.extractCount ?? 0);

  // ─── Charts config ────────────────────────────────────
  const jobsChartConfig: ChartConfig = {
    scrapes: { label: "Scrapes", color: "hsl(var(--primary))" },
    crawls: { label: "Crawls", color: "hsl(var(--info))" },
    extractions: { label: "Extractions", color: "hsl(var(--warning))" },
  };

  const modelUsage: ModelUsageEntry[] = data.modelUsage ?? [];
  const modelUsageTrend: Record<string, unknown>[] = data.modelUsageTrend ?? [];
  const trendModels: TrendModel[] = data.trendModels ?? [];
  const modelChartConfig: ChartConfig = {};
  trendModels.forEach((tm, i) => {
    modelChartConfig[tm.model] = { label: tm.model, color: TIER_COLORS[tm.tier] || MODEL_PALETTE[i % MODEL_PALETTE.length] };
  });

  const recentActivity: ActivityItem[] = data.recentActivity ?? [];
  const topUsers: TopUser[] = data.topUsers ?? [];
  const jobsDaily: { date: string; scrapes: number; crawls: number; extractions: number }[] = data.jobsDaily ?? [];

  // Plan distribution bar data
  const planDistEntries = Object.entries(data.planDistribution || {}).sort(([, a], [, b]) => (b as number) - (a as number));
  const maxPlanCount = planDistEntries.length > 0 ? Math.max(...planDistEntries.map(([, c]) => c as number)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-[36px] font-bold text-foreground tracking-[-0.03em]">Command Center</h1>
        <Badge variant="outline" className="gap-1.5 text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          Live
        </Badge>
      </div>

      {/* ═══ 1. Hero KPIs ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HeroKPI
          label="Total Users" value={data.totalUsers} icon={Users} accent
          sub={`+${data.newUsersToday ?? 0} today · +${data.newUsers7d ?? 0} this week`}
          delta={data.newUsers7d > 0 ? `+${data.newUsers7d}` : undefined}
        />
        <HeroKPI
          label="Jobs (30d)" value={totalJobs30d.toLocaleString()} icon={Zap}
          sub={`${data.scrapeCount} scrapes · ${data.crawlCount} crawls · ${data.extractCount} extracts`}
        />
        <HeroKPI
          label="MRR" value={`$${(data.mrr ?? 0).toLocaleString()}`} icon={CreditCard}
          sub={`${Object.keys(data.planDistribution || {}).filter(p => p !== "free").reduce((s, p) => s + ((data.planDistribution as Record<string, number>)[p] || 0), 0)} paid users`}
        />
        <HeroKPI
          label="Success Rate" value={`${data.successRate ?? 100}%`} icon={CheckCircle2}
          sub={`${(data.failedScrapes ?? 0) + (data.failedCrawls ?? 0) + (data.failedExtracts ?? 0)} failures (30d)`}
          delta={data.successRate >= 99 ? "Healthy" : data.successRate >= 95 ? "Good" : "-Degraded"}
        />
      </div>

      {/* ═══ 2. Secondary Stats ═══ */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <SecondaryStatCard label="API Keys" value={data.activeKeys ?? 0} icon={Key} />
        <SecondaryStatCard label="Webhooks" value={data.activeWebhooks ?? 0} icon={Webhook} />
        <SecondaryStatCard label="Schedules" value={data.activeSchedules ?? 0} icon={CalendarClock} />
        <SecondaryStatCard label="Credits Used" value={(data.totalCreditsUsed ?? 0).toLocaleString()} icon={Coins} />
        <SecondaryStatCard label="Pipeline Runs" value={data.pipelineRuns30d ?? 0} icon={GitBranch} />
        <SecondaryStatCard label="Avg Response" value={data.avgDurationMs24h ? `${(data.avgDurationMs24h / 1000).toFixed(1)}s` : "—"} icon={Clock} />
      </div>

      {/* ═══ 3. Jobs Volume Chart + Plan Distribution ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Jobs chart (2/3) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Job Volume (7d)</h2>
          </div>
          <div className="p-5">
            {jobsDaily.length > 0 ? (
              <ChartContainer config={jobsChartConfig} className="h-[220px] w-full">
                <AreaChart data={jobsDaily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="date" tickFormatter={(v: string) => v.substring(5)} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="scrapes" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="crawls" stackId="1" stroke="hsl(var(--info))" fill="hsl(var(--info))" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="extractions" stackId="1" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.3} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No jobs in the last 7 days.</p>
            )}
          </div>
        </div>

        {/* Plan distribution (1/3) */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Plan Distribution</h2>
          </div>
          <div className="p-5 space-y-3">
            {planDistEntries.map(([plan, count]) => (
              <div key={plan} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize text-foreground font-medium">{plan}</span>
                  <span className="text-muted-foreground">{count as number}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${((count as number) / maxPlanCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {planDistEntries.length === 0 && <p className="text-sm text-muted-foreground">No users yet.</p>}
          </div>
        </div>
      </div>

      {/* ═══ 4. Activity Feed + Top Users ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Feed (2/3) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Activity Feed</h2>
          </div>
          <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">No recent activity.</div>
            ) : recentActivity.map((item) => {
              const Icon = ACTIVITY_ICONS[item.type] || Activity;
              const isFail = item.type.includes("failed");
              return (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-card-hover transition-colors">
                  <div className={`rounded-md p-1.5 shrink-0 ${isFail ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground truncate">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{item.type.replace("_", " ")}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(item.timestamp)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Users (1/3) */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Top Users</h2>
          </div>
          <div className="divide-y divide-border">
            {topUsers.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">No data yet.</div>
            ) : topUsers.map((u, i) => (
              <Link key={u.user_id} to={`/admin/users/${u.user_id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors group">
                <span className="text-[11px] font-bold text-muted-foreground w-4">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{u.full_name || "Unnamed"}</p>
                  <Badge variant={u.plan === "free" ? "secondary" : "default"} className="text-[9px] mt-0.5 capitalize">{u.plan}</Badge>
                </div>
                <span className="text-xs font-bold text-foreground">{u.credits_used.toLocaleString()}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ 5. System Health + Error Log ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* System Health (1/3) */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">System Health (24h)</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Avg Response Time</span>
              <span className="text-sm font-bold text-foreground">
                {data.avgDurationMs24h ? `${(data.avgDurationMs24h / 1000).toFixed(2)}s` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Rate Limit Hits</span>
              <span className={`text-sm font-bold ${(data.rateLimitHits24h ?? 0) > 0 ? "text-warning" : "text-foreground"}`}>
                {data.rateLimitHits24h ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Failed Extracts (30d)</span>
              <span className={`text-sm font-bold ${(data.failedExtracts ?? 0) > 0 ? "text-destructive" : "text-foreground"}`}>
                {data.failedExtracts ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Overall Status</span>
              <Badge variant={(data.successRate ?? 100) >= 99 ? "success" : (data.successRate ?? 100) >= 95 ? "warning" : "destructive"}>
                {(data.successRate ?? 100) >= 99 ? "Healthy" : (data.successRate ?? 100) >= 95 ? "Degraded" : "Critical"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Error Log (2/3) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Bug className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Recent Failures</h2>
          </div>
          <div className="p-5">
            {(data.recentFailures?.length ?? 0) === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                All systems healthy — no failures
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentFailures?.map((f: Record<string, string>) => (
                  <div key={f.id} className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0">
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground font-mono truncate block">{f.url}</span>
                      <span className="text-destructive">{f.error_code}: {f.error_message}</span>
                    </div>
                    <span className="text-muted-foreground shrink-0 ml-2">{timeAgo(f.created_at)}</span>
                    <Badge variant="outline" className="shrink-0 ml-2 capitalize">{f.mode}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 6. Model Usage Analytics ═══ */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Model Usage (30d)</h2>
        </div>
        {modelUsageTrend.length > 1 && trendModels.length > 0 && (
          <div className="p-5 border-b border-border">
            <ChartContainer config={modelChartConfig} className="h-[220px] w-full">
              <AreaChart data={modelUsageTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tickFormatter={(v: string) => v.substring(5)} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                {trendModels.map((tm, i) => (
                  <Area key={tm.model} type="monotone" dataKey={tm.model} stackId="1"
                    stroke={modelChartConfig[tm.model]?.color || MODEL_PALETTE[i]} fill={modelChartConfig[tm.model]?.color || MODEL_PALETTE[i]} fillOpacity={0.3} />
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
                      <Badge variant={TIER_VARIANT[entry.tier] ?? "secondary"} className="capitalize">{entry.tier}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-foreground font-medium">{entry.total_jobs}</TableCell>
                    <TableCell className="text-right text-foreground font-medium">{entry.credits.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap">
                        {Object.entries(entry.by_plan).sort(([, a], [, b]) => b - a).map(([plan, count]) => (
                          <Badge key={plan} variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{plan}: {count}</Badge>
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
    </div>
  );
}
