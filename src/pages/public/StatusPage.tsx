import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EndpointHealth {
  name: string;
  uptime_pct: number;
  avg_response_ms: number;
  total_jobs: number;
  failed_jobs: number;
}

interface HourlyMetric {
  hour: string;
  p50_ms: number;
}

interface Incident {
  period: string;
  endpoint: string;
  error_rate: number;
}

interface StatusData {
  overall: "operational" | "degraded" | "outage";
  endpoints: EndpointHealth[];
  hourly_response_times: HourlyMetric[];
  incidents: Incident[];
  last_updated: string;
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5 * 60 * 1000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    try {
      const { data: result, error: err } = await supabase.functions.invoke("status-public");
      if (err) throw err;
      setData(result);
      setError(null);
    } catch (e) {
      setError("Failed to load status data");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Unable to load status</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const statusConfig = {
    operational: { icon: CheckCircle2, label: "All Systems Operational", color: "text-primary", bg: "bg-primary/10 border-primary/30" },
    degraded: { icon: AlertTriangle, label: "Degraded Performance", color: "text-warning", bg: "bg-warning/10 border-warning/20" },
    outage: { icon: XCircle, label: "Service Disruption", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  };

  const overall = statusConfig[data.overall];
  const OverallIcon = overall.icon;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">API Status</h1>
        <p className="text-sm text-muted-foreground">Real-time health monitoring for all endpoints</p>
      </div>

      {/* Overall status */}
      <div className={`rounded-lg border p-6 flex items-center gap-4 ${overall.bg}`}>
        <OverallIcon className={`h-8 w-8 ${overall.color}`} />
        <div>
          <h2 className={`text-xl font-semibold ${overall.color}`}>{overall.label}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {new Date(data.last_updated).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Endpoint health cards */}
      <div>
        <h3 className="text-sm font-medium mb-3">Endpoint Health (24h)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.endpoints.map((ep) => {
            const isHealthy = ep.uptime_pct >= 99;
            const isDegraded = ep.uptime_pct >= 95 && ep.uptime_pct < 99;
            return (
              <div key={ep.name} className="rounded-lg border border-border p-4 bg-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">{ep.name}</span>
                  {isHealthy ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : isDegraded ? (
                    <AlertTriangle className="h-4 w-4 text-[hsl(var(--nebula-warning))]" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Uptime</span>
                    <span className={`font-medium ${isHealthy ? "text-primary" : isDegraded ? "text-[hsl(var(--nebula-warning))]" : "text-destructive"}`}>
                      {ep.uptime_pct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Avg Response</span>
                    <span className="font-mono">{ep.avg_response_ms}ms</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Jobs</span>
                    <span>{ep.total_jobs.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Response time chart */}
      {data.hourly_response_times.length > 0 && (
        <div className="rounded-lg border border-border p-4 bg-card">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            P50 Response Time (24h)
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.hourly_response_times}>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} unit="ms" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "hsl(var(--foreground))",
                }}
                formatter={(val: number) => [`${val}ms`, "p50"]}
              />
              <Line type="monotone" dataKey="p50_ms" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Incident history */}
      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium">Recent Incidents (24h)</h3>
        </div>
        {data.incidents.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            No incidents in the last 24 hours
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.incidents.map((inc, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <div>
                    <span className="text-sm font-medium">{inc.endpoint}</span>
                    <span className="text-xs text-muted-foreground ml-2">Error rate: {inc.error_rate.toFixed(1)}%</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{inc.period}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
