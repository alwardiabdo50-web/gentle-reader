import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { BarChart3, TrendingUp, Zap, Globe, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DailyUsage {
  day: string;
  scrape: number;
  crawl: number;
  extract: number;
}

interface CreditTrend {
  date: string;
  remaining: number;
}

export default function UsagePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ creditsUsed: 0, scrapeJobs: 0, crawlJobs: 0, successRate: 0 });
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [creditTrend, setCreditTrend] = useState<CreditTrend[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchUsageData();
  }, [user]);

  async function fetchUsageData() {
    setLoading(true);
    try {
      const [profileRes, jobsRes, ledgerRes] = await Promise.all([
        supabase.from("profiles").select("credits_used, monthly_credits, extra_credits").eq("user_id", user!.id).single(),
        supabase.from("scrape_jobs").select("id, mode, status, credits_used, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1000),
        supabase.from("usage_ledger").select("credits, balance_after, created_at, action").eq("user_id", user!.id).order("created_at", { ascending: true }).limit(1000),
      ]);

      const profile = profileRes.data;
      const jobs = jobsRes.data || [];
      const ledger = ledgerRes.data || [];

      const total = (profile?.monthly_credits ?? 500) + (profile?.extra_credits ?? 0);
      setTotalCredits(total);

      // Stats
      const scrapeCount = jobs.filter(j => j.mode === "scrape").length;
      const crawlCount = jobs.filter(j => j.mode === "crawl").length;
      const successCount = jobs.filter(j => j.status === "completed").length;
      const rate = jobs.length > 0 ? (successCount / jobs.length) * 100 : 0;

      setStats({
        creditsUsed: profile?.credits_used ?? 0,
        scrapeJobs: scrapeCount,
        crawlJobs: crawlCount,
        successRate: Math.round(rate * 10) / 10,
      });

      // Daily usage (last 7 days)
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
        });
      }
      setDailyUsage(days);

      // Credit trend from ledger
      if (ledger.length > 0) {
        const trendMap = new Map<string, number>();
        for (const entry of ledger) {
          const dateStr = new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (entry.balance_after != null) {
            trendMap.set(dateStr, entry.balance_after);
          }
        }
        const trend: CreditTrend[] = Array.from(trendMap.entries()).map(([date, remaining]) => ({ date, remaining }));
        // Always show current balance at end
        if (trend.length === 0) {
          trend.push({ date: "Today", remaining: total - (profile?.credits_used ?? 0) });
        }
        setCreditTrend(trend);
      } else {
        setCreditTrend([{ date: "Today", remaining: total - (profile?.credits_used ?? 0) }]);
      }
    } catch (err) {
      console.error("Failed to fetch usage data", err);
    } finally {
      setLoading(false);
    }
  }

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
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Scrape</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "hsl(185 80% 55%)" }} />Crawl</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "hsl(38 92% 55%)" }} />Extract</span>
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
    </div>
  );
}
