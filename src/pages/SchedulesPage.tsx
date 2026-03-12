import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Clock, Play, Pause, RefreshCw, Calendar, Diff, ArrowRight } from "lucide-react";
import { format } from "date-fns";

const PRESETS = [
  { value: "every_hour", label: "Every hour", cron: "0 * * * *" },
  { value: "every_6_hours", label: "Every 6 hours", cron: "0 */6 * * *" },
  { value: "every_12_hours", label: "Every 12 hours", cron: "0 */12 * * *" },
  { value: "daily", label: "Daily (midnight)", cron: "0 0 * * *" },
  { value: "weekly", label: "Weekly (Sunday)", cron: "0 0 * * 0" },
  { value: "monthly", label: "Monthly (1st)", cron: "0 0 1 * *" },
  { value: "custom", label: "Custom cron", cron: "" },
];

const JOB_TYPES = [
  { value: "scrape", label: "Scrape" },
  { value: "crawl", label: "Crawl" },
  { value: "extract", label: "Extract" },
];

interface ScheduleData {
  id: string;
  name: string;
  description: string | null;
  job_type: string;
  config_json: Record<string, unknown>;
  cron_expression: string;
  timezone: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: string | null;
  run_count: number;
  enable_diff: boolean;
  last_content_hash: string | null;
  last_diff_json: Record<string, unknown> | null;
  created_at: string;
}

interface RunData {
  id: string;
  schedule_id: string;
  job_id: string | null;
  job_type: string;
  status: string;
  content_changed: boolean;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

async function invokeSchedulesApi(method: string, path = "", body?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schedules-manage`;
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

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);

  // Form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newJobType, setNewJobType] = useState("scrape");
  const [newUrl, setNewUrl] = useState("");
  const [newPreset, setNewPreset] = useState("daily");
  const [newCustomCron, setNewCustomCron] = useState("0 0 * * *");
  const [newEnableDiff, setNewEnableDiff] = useState(false);
  // Extract-specific
  const [newPrompt, setNewPrompt] = useState("");
  // Crawl-specific
  const [newMaxPages, setNewMaxPages] = useState("10");
  const [newMaxDepth, setNewMaxDepth] = useState("2");

  const { data: schedules = [], isLoading } = useQuery<ScheduleData[]>({
    queryKey: ["schedules"],
    queryFn: () => invokeSchedulesApi("GET"),
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery<RunData[]>({
    queryKey: ["schedule-runs", selectedSchedule],
    queryFn: () => invokeSchedulesApi("GET", `${selectedSchedule}?runs=true`),
    enabled: !!selectedSchedule,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const cronExpr = newPreset === "custom" ? newCustomCron : undefined;
      const preset = newPreset !== "custom" ? newPreset : undefined;

      const config: Record<string, unknown> = { url: newUrl };
      if (newJobType === "extract" && newPrompt) config.prompt = newPrompt;
      if (newJobType === "crawl") {
        config.max_pages = parseInt(newMaxPages) || 10;
        config.max_depth = parseInt(newMaxDepth) || 2;
      }

      return invokeSchedulesApi("POST", "", {
        name: newName,
        description: newDesc || undefined,
        job_type: newJobType,
        config,
        ...(preset ? { preset } : { cron_expression: cronExpr }),
        enable_diff: newEnableDiff,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setCreateOpen(false);
      resetForm();
      toast.success("Schedule created!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      invokeSchedulesApi("PATCH", id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invokeSchedulesApi("DELETE", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Schedule deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function resetForm() {
    setNewName("");
    setNewDesc("");
    setNewJobType("scrape");
    setNewUrl("");
    setNewPreset("daily");
    setNewCustomCron("0 0 * * *");
    setNewEnableDiff(false);
    setNewPrompt("");
    setNewMaxPages("10");
    setNewMaxDepth("2");
  }

  const cronLabel = (cron: string) => {
    const preset = PRESETS.find((p) => p.cron === cron);
    return preset ? preset.label : cron;
  };

  const statusBadge = (status: string | null) => {
    if (status === "completed") return <Badge variant="default">Completed</Badge>;
    if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
    if (status === "running") return <Badge variant="secondary">Running</Badge>;
    return <Badge variant="outline">—</Badge>;
  };

  const jobTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      scrape: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      crawl: "bg-green-500/10 text-green-500 border-green-500/20",
      extract: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };
    return (
      <Badge variant="outline" className={colors[type] || ""}>
        {type}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scheduled Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set up recurring scrapes, crawls, and extractions with optional change detection.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Schedule</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Schedule</DialogTitle>
              <DialogDescription>
                Configure a recurring job that runs automatically on your chosen schedule.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <Label>Name</Label>
                <Input placeholder="My daily scrape" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input placeholder="Monitor pricing changes" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <div>
                <Label>Job Type</Label>
                <Select value={newJobType} onValueChange={setNewJobType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>URL</Label>
                <Input placeholder="https://example.com" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
              </div>

              {newJobType === "extract" && (
                <div>
                  <Label>Extraction Prompt</Label>
                  <Input placeholder="Extract product prices and availability" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
                </div>
              )}

              {newJobType === "crawl" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Max Pages</Label>
                    <Input type="number" value={newMaxPages} onChange={(e) => setNewMaxPages(e.target.value)} />
                  </div>
                  <div>
                    <Label>Max Depth</Label>
                    <Input type="number" value={newMaxDepth} onChange={(e) => setNewMaxDepth(e.target.value)} />
                  </div>
                </div>
              )}

              <div>
                <Label>Frequency</Label>
                <Select value={newPreset} onValueChange={setNewPreset}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newPreset === "custom" && (
                <div>
                  <Label>Cron Expression</Label>
                  <Input
                    placeholder="0 9 * * 1-5"
                    value={newCustomCron}
                    onChange={(e) => setNewCustomCron(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: minute hour day-of-month month day-of-week
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Checkbox
                  id="enable-diff"
                  checked={newEnableDiff}
                  onCheckedChange={(checked) => setNewEnableDiff(checked === true)}
                />
                <div>
                  <Label htmlFor="enable-diff" className="cursor-pointer">Enable change detection</Label>
                  <p className="text-xs text-muted-foreground">
                    Compare results between runs and flag when content changes.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newName || !newUrl || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="schedules" className="w-full">
        <TabsList>
          <TabsTrigger value="schedules">Schedules ({schedules.length})</TabsTrigger>
          <TabsTrigger value="runs" disabled={!selectedSchedule}>
            Run History {selectedSchedule ? `(${runs.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4 mt-4">
          {isLoading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : schedules.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No schedules yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Create your first scheduled job to automate recurring scrapes, crawls, or extractions.
                </p>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />New Schedule
                </Button>
              </CardContent>
            </Card>
          ) : (
            schedules.map((s) => (
              <Card key={s.id} className={!s.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-sm flex items-center gap-2">
                          {s.name}
                          {jobTypeBadge(s.job_type)}
                          {s.enable_diff && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                              <Diff className="h-3 w-3 mr-1" />Diff
                            </Badge>
                          )}
                        </CardTitle>
                        {s.description && (
                          <CardDescription className="mt-0.5">{s.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSchedule(s.id)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={s.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: s.id, is_active: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">URL</span>
                      <p className="font-mono text-xs truncate">{(s.config_json as any)?.url ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Frequency</span>
                      <p className="text-xs">{cronLabel(s.cron_expression)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Last Run</span>
                      <div className="flex items-center gap-1.5">
                        {statusBadge(s.last_status)}
                        {s.last_run_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(s.last_run_at), "MMM d HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Next Run</span>
                      <p className="text-xs">
                        {s.next_run_at ? format(new Date(s.next_run_at), "MMM d HH:mm") : "—"}
                      </p>
                    </div>
                  </div>
                  {s.last_diff_json && (
                    <div className="mt-3 p-2 rounded-md bg-amber-500/5 border border-amber-500/20">
                      <p className="text-xs text-amber-600 font-medium">
                        ⚡ Content changed at {(s.last_diff_json as any)?.changed_at
                          ? format(new Date((s.last_diff_json as any).changed_at), "MMM d HH:mm")
                          : "unknown"}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {s.run_count} runs · Created {format(new Date(s.created_at), "MMM d, yyyy")}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Run History</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["schedule-runs", selectedSchedule] })}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {runsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : runs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No runs yet. They'll appear here once the schedule triggers.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Changed</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell>{jobTypeBadge(r.job_type)}</TableCell>
                        <TableCell>
                          {r.content_changed ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Changed</Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.started_at ? format(new Date(r.started_at), "MMM d HH:mm:ss") : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.started_at && r.finished_at
                            ? `${((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000).toFixed(1)}s`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-destructive truncate max-w-[200px]">
                          {r.error_message ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
