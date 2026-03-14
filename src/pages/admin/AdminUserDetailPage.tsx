import { useParams, useNavigate } from "react-router-dom";
import { useAdminUserDetail } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useAdminUserDetail(userId || "");

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading…</div>;
  if (!data?.profile) return <div className="text-muted-foreground">User not found</div>;

  const p = data.profile;
  const totalCredits = p.monthly_credits + p.extra_credits;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Users
      </Button>

      <h1 className="text-2xl font-bold text-foreground">{p.full_name || "Unnamed User"}</h1>

      {/* Profile card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Plan</CardTitle></CardHeader>
          <CardContent><Badge>{p.plan}</Badge></CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Credits</CardTitle></CardHeader>
          <CardContent className="text-foreground font-bold">{p.credits_used} / {totalCredits}</CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Joined</CardTitle></CardHeader>
          <CardContent className="text-foreground">{new Date(p.created_at).toLocaleDateString()}</CardContent>
        </Card>
      </div>

      {/* Subscription */}
      {data.subscription && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Subscription</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Status: <Badge variant={data.subscription.status === "active" ? "default" : "secondary"}>{data.subscription.status}</Badge></div>
            {data.subscription.current_period_end && (
              <div className="text-muted-foreground">Period ends: {new Date(data.subscription.current_period_end).toLocaleDateString()}</div>
            )}
            {data.subscription.cancel_at_period_end && <Badge variant="destructive">Cancels at period end</Badge>}
          </CardContent>
        </Card>
      )}

      {/* API Keys */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">API Keys ({data.keys.length})</CardTitle></CardHeader>
        <CardContent>
          {data.keys.length === 0 ? (
            <p className="text-muted-foreground text-sm">No API keys</p>
          ) : (
            <div className="space-y-1">
              {data.keys.map((k: Record<string, unknown>) => (
                <div key={k.id as string} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                  <span className="font-mono text-foreground">{k.key_prefix as string}…</span>
                  <span className="text-muted-foreground">{k.name as string}</span>
                  <Badge variant={k.is_active ? "default" : "secondary"}>{k.is_active ? "Active" : "Revoked"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Jobs</CardTitle></CardHeader>
        <CardContent>
          {data.recentJobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No jobs</p>
          ) : (
            <div className="rounded-md border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentJobs.map((j: Record<string, unknown>) => (
                    <TableRow key={j.id as string}>
                      <TableCell className="font-mono text-xs truncate max-w-[200px]">{j.url as string}</TableCell>
                      <TableCell><Badge variant="outline">{j.mode as string}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={j.status === "completed" ? "default" : j.status === "failed" ? "destructive" : "secondary"}>
                          {j.status as string}
                        </Badge>
                      </TableCell>
                      <TableCell>{j.credits_used as number}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(j.created_at as string).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
