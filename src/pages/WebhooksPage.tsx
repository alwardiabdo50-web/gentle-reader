import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Eye, EyeOff, Globe, Webhook, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const EVENT_OPTIONS = [
  { value: "scrape.completed", label: "Scrape Completed" },
  { value: "scrape.failed", label: "Scrape Failed" },
  { value: "crawl.completed", label: "Crawl Completed" },
  { value: "crawl.failed", label: "Crawl Failed" },
  { value: "extract.completed", label: "Extract Completed" },
  { value: "extract.failed", label: "Extract Failed" },
  { value: "job.completed", label: "All Completed" },
  { value: "job.failed", label: "All Failed" },
  { value: "*", label: "All Events" },
];

interface WebhookData {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret?: string;
  description: string | null;
  created_at: string;
  updated_at?: string;
}

interface DeliveryData {
  id: string;
  webhook_id: string;
  event_type: string;
  job_id: string | null;
  job_type: string;
  status: string;
  http_status_code: number | null;
  attempts: number;
  error_message: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
}

async function invokeWebhooksApi(method: string, path = "", body?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhooks-manage`;
  const url = path ? `${baseUrl}/${path}` : baseUrl;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Unknown error");
  return json.data;
}

export default function WebhooksPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>(["job.completed", "job.failed"]);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());
  const [deliveryPage, setDeliveryPage] = useState(1);
  const DELIVERIES_PER_PAGE = 20;

  // Fetch webhooks
  const { data: webhooks = [], isLoading } = useQuery<WebhookData[]>({
    queryKey: ["webhooks"],
    queryFn: () => invokeWebhooksApi("GET"),
  });

  // Fetch deliveries
  const { data: deliveries = [], isLoading: deliveriesLoading } = useQuery<DeliveryData[]>({
    queryKey: ["webhook-deliveries"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhooks-manage?deliveries=true`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Error");
      return json.data;
    },
  });

  // Create webhook
  const createMutation = useMutation({
    mutationFn: () => invokeWebhooksApi("POST", "", { url: newUrl, events: newEvents, description: newDesc || undefined }),
    onSuccess: (data: WebhookData) => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setCreateOpen(false);
      setNewUrl("");
      setNewDesc("");
      setNewEvents(["job.completed", "job.failed"]);
      if (data.secret) {
        setRevealedSecrets((prev) => new Set(prev).add(data.id));
      }
      toast.success("Webhook created! Copy the signing secret — it won't be shown again.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      invokeWebhooksApi("PATCH", id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: (id: string) => invokeWebhooksApi("DELETE", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["webhook-deliveries"] });
      toast.success("Webhook deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleEvent = (event: string) => {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const statusBadge = (status: string) => {
    if (status === "delivered") return <Badge variant="default">Delivered</Badge>;
    if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Receive real-time notifications when your jobs complete or fail.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Webhook</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>
                We'll send a POST request to your URL when events occur.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="webhook-url">Endpoint URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://your-server.com/webhook"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="webhook-desc">Description (optional)</Label>
                <Input
                  id="webhook-desc"
                  placeholder="My production webhook"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
              <div>
                <Label>Events</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {EVENT_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={newEvents.includes(opt.value)}
                        onCheckedChange={() => toggleEvent(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newUrl || newEvents.length === 0 || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Webhook"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="endpoints" className="w-full">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints ({webhooks.length})</TabsTrigger>
          <TabsTrigger value="deliveries">Recent Deliveries ({deliveries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4 mt-4">
          {isLoading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : webhooks.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No webhooks yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Create your first webhook to start receiving real-time notifications.
                </p>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />Add Webhook
                </Button>
              </CardContent>
            </Card>
          ) : (
            webhooks.map((wh) => (
              <Card key={wh.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-sm font-mono">{wh.url}</CardTitle>
                        {wh.description && (
                          <CardDescription className="mt-0.5">{wh.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={wh.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: wh.id, is_active: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(wh.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {wh.events.map((e) => (
                      <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                    ))}
                  </div>
                  {wh.secret && revealedSecrets.has(wh.id) && (
                    <div className="flex items-center gap-2 bg-muted rounded-md p-2">
                      <code className="text-xs flex-1 font-mono text-foreground">{wh.secret}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(wh.secret!);
                          toast.success("Secret copied");
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {format(new Date(wh.created_at), "MMM d, yyyy")}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="deliveries" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Delivery Log</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["webhook-deliveries"] })}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {deliveriesLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : deliveries.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No deliveries yet. They'll appear here once your jobs trigger webhooks.
                </div>
              ) : (() => {
                const totalDeliveryPages = Math.max(1, Math.ceil(deliveries.length / DELIVERIES_PER_PAGE));
                const pagedDeliveries = deliveries.slice(
                  (deliveryPage - 1) * DELIVERIES_PER_PAGE,
                  deliveryPage * DELIVERIES_PER_PAGE
                );
                return (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Job Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>HTTP</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedDeliveries.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-mono text-xs">{d.event_type}</TableCell>
                            <TableCell className="text-sm">{d.job_type}</TableCell>
                            <TableCell>{statusBadge(d.status)}</TableCell>
                            <TableCell className="text-sm">
                              {d.http_status_code ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(d.created_at), "MMM d HH:mm:ss")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {totalDeliveryPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">{deliveries.length} total</span>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" disabled={deliveryPage <= 1} onClick={() => setDeliveryPage(deliveryPage - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-xs text-muted-foreground">Page {deliveryPage} of {totalDeliveryPages}</span>
                          <Button size="sm" variant="outline" disabled={deliveryPage >= totalDeliveryPages} onClick={() => setDeliveryPage(deliveryPage + 1)}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
