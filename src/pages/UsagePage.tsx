import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { BarChart3, TrendingUp, Zap, Globe, Loader2, ArrowDownRight, ArrowUpRight, Gauge, ShieldAlert, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DailyUsage {
  day: string;
  scrape: number;
  crawl: number;
  extract: number;
  map: number;
}

interface CreditTrend {
  date: string;
  remaining: number;
}

interface LedgerRow {
  id: string;
  action: string;
  credits: number;
  balance_after: number | null;
  source_type: string | null;
  created_at: string;
  metadata_json: Record<string, unknown> | null;
}

interface HourlyRateData {
  hour: string;
  requests: number;
  limited: number;
}

const RPM_LIMITS: Record<string, number> = {
  free: 20,
  starter: 60,
  pro: 120,
  scale: 600,
};

export default function UsagePage() {
  const { user, activeOrg } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ creditsUsed: 0, scrapeJobs: 0, crawlJobs: 0, successRate: 0 });
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [creditTrend, setCreditTrend] = useState<CreditTrend[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerRow[]>([]);
  const [plan, setPlan] = useState("free");

  // Rate limit state
  const [hourlyRateData, setHourlyRateData] = useState<HourlyRateData[]>([]);
  const [rateLimitHits24h, setRateLimitHits24h] = useState(0);
  const [totalRequests24h, setTotalRequests24h] = useState(0);
  const [recentRequestCount, setRecentRequestCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchUsageData();
    fetchRateLimitData();
  }, [user, activeOrg]);

  async function fetchRateLimitData() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

    const [logRes, recentRes] = await Promise.all([
      supabase.from("rate_limit_log")
        .select("hit_at, was_limited, endpoint")
        .eq("user_id", user!.id)
        .gte("hit_at", twentyFourHoursAgo)
        .order("hit_at", { ascending: true })
        .limit(1000),
      supabase.from("rate_limit_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("hit_at", oneMinuteAgo),
    ]);

    const logs = logRes.data || [];
    const recent = recentRes.count || 0;
    setRecentRequestCount(recent);

    // Aggregate by hour
    const hourMap = new Map<string, { requests: number; limited: number }>();
    let limitedCount = 0;

    for (const log of logs) {
      const hour = new Date(log.hit_at).toLocaleTimeString([], { hour: "2-digit", hour12: true });
      const existing = hourMap.get(hour) || { requests: 0, limited: 0 };
      existing.requests++;
      if (log.was_limited) {
        existing.limited++;
        limitedCount++;
      }
      hourMap.set(hour, existing);
    }

    setRateLimitHits24h(limitedCount);
    setTotalRequests24h(logs.length);

    const hourly: HourlyRateData[] = Array.from(hourMap.entries()).map(([hour, data]) => ({
      hour,
      requests: data.requests - data.limited,
      limited: data.limited,
    }));
    setHourlyRateData(hourly);
  }

  async function fetchUsageData() {
    setLoading(true);
    try {
      let creditsUsed = 0;
      let total = 500;
      let currentPlan = "free";

      if (activeOrg) {
        // Org-level credits
        total = activeOrg.monthly_credits + activeOrg.extra_credits;
        creditsUsed = activeOrg.credits_used;
        currentPlan = activeOrg.plan;
      } else {
        const { data: profile } = await supabase.from("profiles").select("credits_used, monthly_credits, extra_credits, plan").eq("user_id", user!.id).single();
        total = (profile?.monthly_credits ?? 500) + (profile?.extra_credits ?? 0);
        creditsUsed = profile?.credits_used ?? 0;
        currentPlan = profile?.plan ?? "free";
      }

      setTotalCredits(total);
      setPlan(currentPlan);

      // Jobs are always user-scoped (RLS)
      const [jobsRes, ledgerRes] = await Promise.all([
        supabase.from("scrape_jobs").select("id, mode, status, credits_used, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1000),
        supabase.from("usage_ledger").select("id, credits, balance_after, created_at, action, source_type, metadata_json").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(100),
      ]);

      const jobs = jobsRes.data || [];
      const ledger = (ledgerRes.data || []) as unknown as LedgerRow[];

      const scrapeCount = jobs.filter(j => j.mode === "scrape").length;
      const crawlCount = jobs.filter(j => j.mode === "crawl").length;
      const successCount = jobs.filter(j => j.status === "completed").length;
      const rate = jobs.length > 0 ? (successCount / jobs.length) * 100 : 0;

      setStats({
        creditsUsed,
        scrapeJobs: scrapeCount,
        crawlJobs: crawlCount,
        successRate: Math.round(rate * 10) / 10,
      });

      const now = new Date();
      const days: DailyUsage[] = [];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayJobs = jobs.filter(j => {
          const jd = new Date(j.created_at);
          return jd >= dayStart && jd < dayEnd;
        });

        days.push({
          day: dayNames[dayStart.getDay()],
          scrape: dayJobs.filter(j => j.mode === "scrape").length,
          crawl: dayJobs.filter(j => j.mode === "crawl").length,
          extract: dayJobs.filter(j => j.mode === "extract").length,
          map: dayJobs.filter(j => j.mode === "map").length,
        });
      }
      setDailyUsage(days);

      const ascLedger = [...ledger].reverse();
      if (ascLedger.length > 0) {
        const trendMap = new Map<string, number>();
        for (const entry of ascLedger) {
          const dateStr = new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (entry.balance_after != null) {
            trendMap.set(dateStr, entry.balance_after);
          }
        }
        const trend: CreditTrend[] = Array.from(trendMap.entries()).map(([date, remaining]) => ({ date, remaining }));
        if (trend.length === 0) {
          trend.push({ date: "Today", remaining: total - (profile?.credits_used ?? 0) });
        }
        setCreditTrend(trend);
      } else {
        setCreditTrend([{ date: "Today", remaining: total - (profile?.credits_used ?? 0) }]);
      }

      setLedgerEntries(ledger.slice(0, 20));
    } catch (err) {
      console.error("Failed to fetch usage data", err);
    } finally {
      setLoading(false);
    }
  }

  const rpmLimit = RPM_LIMITS[plan] || 20;
  const rpmPercent = Math.min(100, (recentRequestCount / rpmLimit) * 100);
  const avgRpm = totalRequests24h > 0 ? Math.round(totalRequests24h / 24 / 60 * 100) / 100 : 0;

  const statCards = [
    { label: "Credits Used", value: stats.creditsUsed.toLocaleString(), icon: Zap },
    { label: "Scrape Jobs", value: stats.scrapeJobs.toLocaleString(), icon: BarChart3 },
    { label: "Crawl Jobs", value: stats.crawlJobs.toLocaleString(), icon: Globe },
    { label: "Success Rate", value: stats.scrapeJobs + stats.crawlJobs > 0 ? `${stats.successRate}%` : "—", icon: TrendingUp },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your API usage, credits, and performance this billing cycle.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-lg border border-border p-4 bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            {s.label === "Credits Used" && (
              <div className="text-xs text-muted-foreground mt-1">of {totalCredits.toLocaleString()} total</div>
            )}
          </div>
        ))}
      </div>

      {/* Rate Limits Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" /> Rate Limits
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="rounded-lg border border-border p-4 bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">Requests This Minute</span>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{recentRequestCount}</div>
            <Progress value={rpmPercent} className="mt-2 h-1.5" />
          </div>
          <div className="rounded-lg border border-border p-4 bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">RPM Limit</span>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{rpmLimit}</div>
            <div className="text-xs text-muted-foreground mt-1 capitalize">{plan} plan</div>
          </div>
          <div className="rounded-lg border border-border p-4 bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">Rate Limit Hits (24h)</span>
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className={`text-2xl font-bold ${rateLimitHits24h > 0 ? "text-destructive" : ""}`}>
              {rateLimitHits24h}
            </div>
          </div>
          <div className="rounded-lg border border-border p-4 bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">Avg Requests/Min (24h)</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{avgRpm}</div>
          </div>
        </div>

        {hourlyRateData.length > 0 && (
          <div className="rounded-lg border border-border p-4 bg-card">
            <h3 className="text-sm font-medium mb-4">Requests vs Rate-Limited (24h by Hour)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyRateData}>
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Successful" stackId="a" />
                <Bar dataKey="limited" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} name="Rate Limited" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Successful</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" />Rate Limited</span>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border p-4 bg-card">
          <h3 className="text-sm font-medium mb-4">Daily Usage by Type (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyUsage}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="scrape" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="crawl" fill="hsl(185 80% 55%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="extract" fill="hsl(38 92% 55%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="map" fill="hsl(280 70% 60%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Scrape</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "hsl(185 80% 55%)" }} />Crawl</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "hsl(38 92% 55%)" }} />Extract</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "hsl(280 70% 60%)" }} />Map</span>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 bg-card">
          <h3 className="text-sm font-medium mb-4">Credit Balance Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={creditTrend}>
              <defs>
                <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "hsl(var(--foreground))",
                }}
              />
              <Area type="monotone" dataKey="remaining" stroke="hsl(var(--primary))" fill="url(#creditGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ledger Activity */}
      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium">Recent Credit Activity</h3>
        </div>
        {ledgerEntries.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No usage activity yet. Run a scrape to see entries here.</div>
        ) : (
          <div className="divide-y divide-border">
            {ledgerEntries.map((entry) => {
              const isCharge = entry.credits < 0;
              const label = entry.action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
              const url = (entry.metadata_json as Record<string, unknown>)?.url as string | undefined;
              return (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isCharge ? "bg-destructive/10" : "bg-primary/10"}`}>
                      {isCharge
                        ? <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                        : <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{label}</div>
                      {url && <div className="text-xs text-muted-foreground truncate max-w-[300px]">{url}</div>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className={`text-sm font-mono font-medium ${isCharge ? "text-destructive" : "text-primary"}`}>
                      {isCharge ? "" : "+"}{entry.credits}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
