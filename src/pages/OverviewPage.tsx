import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Key, Webhook, Calendar, Zap, BookOpen, BarChart3, History, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  activeApiKeys: number;
  activeWebhooks: number;
  activeSchedules: number;
  scrapeJobs7d: number;
  crawlJobs7d: number;
  extractJobs7d: number;
}

interface RecentJob {
  id: string;
  url: string;
  status: string;
  created_at: string;
  mode: string;
}

export default function OverviewPage() {
  const { user } = useAuth();
  const credits = useCredits();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const fetchAll = async () => {
      const [apiKeys, webhooks, schedules, scrapes, crawls, extracts, recent] = await Promise.all([
        supabase.from("api_keys").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true),
        supabase.from("webhooks").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true),
        supabase.from("scheduled_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true),
        supabase.from("scrape_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", sevenDaysAgo),
        supabase.from("crawl_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", sevenDaysAgo),
        supabase.from("extraction_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", sevenDaysAgo),
        supabase.from("scrape_jobs").select("id, url, status, created_at, mode").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);

      setStats({
        activeApiKeys: apiKeys.count ?? 0,
        activeWebhooks: webhooks.count ?? 0,
        activeSchedules: schedules.count ?? 0,
        scrapeJobs7d: scrapes.count ?? 0,
        crawlJobs7d: crawls.count ?? 0,
        extractJobs7d: extracts.count ?? 0,
      });
      setRecentJobs((recent.data as RecentJob[]) ?? []);
      setLoading(false);
    };

    fetchAll();
  }, [user]);

  const statCards = stats
    ? [
        { label: "Credits Remaining", value: credits.creditsRemaining.toLocaleString(), icon: BarChart3, href: "/usage" },
        { label: "Active API Keys", value: stats.activeApiKeys, icon: Key, href: "/api-keys" },
        { label: "Scrapes (7d)", value: stats.scrapeJobs7d, icon: Zap, href: "/jobs" },
        { label: "Crawls (7d)", value: stats.crawlJobs7d, icon: ExternalLink, href: "/jobs" },
        { label: "Extractions (7d)", value: stats.extractJobs7d, icon: History, href: "/jobs" },
        { label: "Active Webhooks", value: stats.activeWebhooks, icon: Webhook, href: "/webhooks" },
        { label: "Active Schedules", value: stats.activeSchedules, icon: Calendar, href: "/schedules" },
      ]
    : [];

  const statusVariant = (s: string) => {
    if (s === "completed") return "success";
    if (s === "failed") return "destructive";
    if (s === "running" || s === "queued") return "warning";
    return "secondary";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Your dashboard at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <Card key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-16" />
              </Card>
            ))
          : statCards.map((card) => (
              <Link key={card.label} to={card.href}>
                <Card className="hover:border-primary/40 cursor-pointer group">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <card.icon className="h-4 w-4" />
                    <span className="text-[11px] uppercase tracking-wide font-medium">{card.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground tracking-tight">{card.value}</div>
                </Card>
              </Link>
            ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link to="/playground"><Zap className="h-4 w-4 mr-1.5" />Playground</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/api-keys"><Key className="h-4 w-4 mr-1.5" />API Keys</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/docs"><BookOpen className="h-4 w-4 mr-1.5" />Docs</Link>
        </Button>
      </div>

      {/* Recent jobs */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Recent Jobs</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
        ) : recentJobs.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">No jobs yet. Head to the <Link to="/playground" className="text-primary underline">Playground</Link> to run your first scrape.</p>
          </Card>
        ) : (
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wide">
                  <th className="text-left px-4 py-2 font-medium">URL</th>
                  <th className="text-left px-4 py-2 font-medium">Mode</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={job.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 truncate max-w-[280px] text-foreground">{job.url}</td>
                    <td className="px-4 py-2.5"><Badge variant="secondary">{job.mode}</Badge></td>
                    <td className="px-4 py-2.5"><Badge variant={statusVariant(job.status)}>{job.status}</Badge></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{new Date(job.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
