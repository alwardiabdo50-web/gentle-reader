import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { BarChart3, TrendingUp, Zap, Globe } from "lucide-react";

const usageData = [
  { day: "Mon", scrape: 120, crawl: 45, extract: 30 },
  { day: "Tue", scrape: 180, crawl: 60, extract: 25 },
  { day: "Wed", scrape: 95, crawl: 80, extract: 40 },
  { day: "Thu", scrape: 210, crawl: 35, extract: 55 },
  { day: "Fri", scrape: 150, crawl: 50, extract: 20 },
  { day: "Sat", scrape: 60, crawl: 20, extract: 10 },
  { day: "Sun", scrape: 45, crawl: 15, extract: 8 },
];

const creditTrend = [
  { date: "Mar 1", remaining: 10000 },
  { date: "Mar 2", remaining: 9800 },
  { date: "Mar 3", remaining: 9550 },
  { date: "Mar 4", remaining: 9400 },
  { date: "Mar 5", remaining: 9280 },
  { date: "Mar 6", remaining: 9100 },
  { date: "Mar 7", remaining: 8950 },
  { date: "Mar 8", remaining: 9225 },
];

const stats = [
  { label: "Credits Used", value: "775", icon: Zap, delta: "+12%" },
  { label: "Scrape Jobs", value: "342", icon: BarChart3, delta: "+8%" },
  { label: "Crawl Jobs", value: "18", icon: Globe, delta: "+23%" },
  { label: "Success Rate", value: "97.2%", icon: TrendingUp, delta: "+1.1%" },
];

export default function UsagePage() {
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
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border p-4 surface-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-primary mt-1">{s.delta} vs last week</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border p-4 surface-1">
          <h3 className="text-sm font-medium mb-4">Daily Usage by Type</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={usageData}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(215 12% 52%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215 12% 52%)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(230 14% 11%)",
                  border: "1px solid hsl(230 12% 18%)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="scrape" fill="hsl(160 84% 52%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="crawl" fill="hsl(185 80% 55%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="extract" fill="hsl(38 92% 55%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Scrape</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-nebula-cyan" />Crawl</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-nebula-warning" />Extract</span>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 surface-1">
          <h3 className="text-sm font-medium mb-4">Credit Balance Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={creditTrend}>
              <defs>
                <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160 84% 52%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160 84% 52%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(215 12% 52%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215 12% 52%)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(230 14% 11%)",
                  border: "1px solid hsl(230 12% 18%)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="remaining" stroke="hsl(160 84% 52%)" fill="url(#creditGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
