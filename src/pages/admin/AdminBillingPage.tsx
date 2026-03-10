import { useAdminBilling } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminBillingPage() {
  const { data, isLoading } = useAdminBilling();

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading…</div>;
  if (!data) return null;

  // Aggregate stats
  const activeSubs = data.subscriptions?.filter((s: Record<string, unknown>) => s.status === "active").length ?? 0;
  const totalCreditsUsed = data.profiles?.reduce((s: number, p: Record<string, number>) => s + p.credits_used, 0) ?? 0;
  const totalCreditsGranted = data.profiles?.reduce((s: number, p: Record<string, number>) => s + p.monthly_credits + p.extra_credits, 0) ?? 0;

  // Plan distribution
  const planDist: Record<string, number> = {};
  data.profiles?.forEach((p: Record<string, unknown>) => {
    const plan = p.plan as string;
    planDist[plan] = (planDist[plan] || 0) + 1;
  });

  // Top users by usage
  const topUsers = [...(data.profiles || [])]
    .sort((a: Record<string, number>, b: Record<string, number>) => b.credits_used - a.credits_used)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Billing & Usage</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Active Subscriptions</div>
            <div className="text-xl font-bold text-foreground">{activeSubs}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Credits Used</div>
            <div className="text-xl font-bold text-foreground">{totalCreditsUsed.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Credits Granted</div>
            <div className="text-xl font-bold text-foreground">{totalCreditsGranted.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Plan Distribution</div>
            <div className="flex gap-1 flex-wrap mt-1">
              {Object.entries(planDist).map(([plan, count]) => (
                <Badge key={plan} variant="secondary" className="text-[10px]">{plan}: {count}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top users */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Top Users by Usage</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((u: Record<string, unknown>) => {
                  const total = (u.monthly_credits as number) + (u.extra_credits as number);
                  const pct = total > 0 ? Math.round(((u.credits_used as number) / total) * 100) : 0;
                  return (
                    <TableRow key={u.user_id as string}>
                      <TableCell className="font-mono text-xs">{(u.user_id as string).slice(0, 12)}…</TableCell>
                      <TableCell><Badge variant="secondary">{u.plan as string}</Badge></TableCell>
                      <TableCell>{(u.credits_used as number).toLocaleString()}</TableCell>
                      <TableCell>{total.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent webhook events */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Recent Webhook Events</CardTitle></CardHeader>
        <CardContent>
          {data.recentWebhooks?.length === 0 ? (
            <p className="text-muted-foreground text-sm">No webhook events</p>
          ) : (
            <div className="space-y-2">
              {data.recentWebhooks?.map((w: Record<string, unknown>) => (
                <div key={w.id as string} className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0">
                  <span className="font-mono text-foreground">{w.event_type as string}</span>
                  <Badge variant={w.processed ? "default" : "secondary"}>{w.processed ? "Processed" : "Pending"}</Badge>
                  <span className="text-muted-foreground">{new Date(w.created_at as string).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
