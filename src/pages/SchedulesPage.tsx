import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Clock, Play, RefreshCw, Calendar, GitCompare, ArrowRight, Pencil } from "lucide-react";
import { format } from "date-fns";
import ScheduleFormFields, { defaultFormState, PRESETS, type ScheduleFormState } from "@/components/schedules/ScheduleFormFields";
import { invokeSchedulesApi, cronLabel, presetFromCron, type ScheduleData, type RunData } from "@/components/schedules/scheduleHelpers";

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleData | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleFormState>(defaultFormState);
  const [editForm, setEditForm] = useState<ScheduleFormState>(defaultFormState);

  const { data: schedules = [], isLoading } = useQuery<ScheduleData[]>({
    queryKey: ["schedules"],
    queryFn: () => invokeSchedulesApi("GET"),
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery<RunData[]>({
    queryKey: ["schedule-runs", selectedSchedule],
    queryFn: () => invokeSchedulesApi("GET", `${selectedSchedule}?runs=true`),
    enabled: !!selectedSchedule,
  });

  const buildPayload = (f: ScheduleFormState) => {
    const cronExpr = f.preset === "custom" ? f.customCron : undefined;
    const preset = f.preset !== "custom" ? f.preset : undefined;
    const config: Record<string, unknown> = { url: f.url };
    if (f.jobType === "extract" && f.prompt) config.prompt = f.prompt;
    if (f.jobType === "crawl") {
      config.max_pages = parseInt(f.maxPages) || 10;
      config.max_depth = parseInt(f.maxDepth) || 2;
    }
    return {
      name: f.name,
      description: f.description || undefined,
      job_type: f.jobType,
      config,
      ...(preset ? { preset } : { cron_expression: cronExpr }),
      enable_diff: f.enableDiff,
    };
  };

  const createMutation = useMutation({
    mutationFn: () => invokeSchedulesApi("POST", "", buildPayload(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setCreateOpen(false);
      setForm(defaultFormState);
      toast.success("Schedule created!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: () => {
      if (!editingSchedule) throw new Error("No schedule selected");
      const payload = buildPayload(editForm);
      return invokeSchedulesApi("PATCH", editingSchedule.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setEditOpen(false);
      setEditingSchedule(null);
      toast.success("Schedule updated!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const triggerMutation = useMutation({
    mutationFn: (id: string) => invokeSchedulesApi("POST", id, { action: "trigger" }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      if (selectedSchedule) queryClient.invalidateQueries({ queryKey: ["schedule-runs", selectedSchedule] });
      if (data?.error) {
        toast.error(`Run failed: ${data.error}`);
      } else {
        toast.success("Job triggered successfully!");
      }
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

  const openEdit = (s: ScheduleData) => {
    const cfg = s.config_json as Record<string, any>;
    setEditingSchedule(s);
    setEditForm({
      name: s.name,
      description: s.description || "",
      jobType: s.job_type,
      url: cfg?.url || "",
      preset: presetFromCron(s.cron_expression),
      customCron: s.cron_expression,
      enableDiff: s.enable_diff,
      prompt: cfg?.prompt || "",
      maxPages: String(cfg?.max_pages || 10),
      maxDepth: String(cfg?.max_depth || 2),
    });
    setEditOpen(true);
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
    return <Badge variant="outline" className={colors[type] || ""}>{type}</Badge>;
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
              <DialogDescription>Configure a recurring job that runs automatically.</DialogDescription>
            </DialogHeader>
            <ScheduleFormFields form={form} onChange={(u) => setForm((p) => ({ ...p, ...u }))} />
            <DialogFooter>
              <Button onClick={() => createMutation.mutate()} disabled={!form.name || !form.url || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>Update the schedule configuration.</DialogDescription>
          </DialogHeader>
          <ScheduleFormFields form={editForm} onChange={(u) => setEditForm((p) => ({ ...p, ...u }))} disableJobType />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => editMutation.mutate()} disabled={!editForm.name || !editForm.url || editMutation.isPending}>
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                              <GitCompare className="h-3 w-3 mr-1" />Diff
                            </Badge>
                          )}
                        </CardTitle>
                        {s.description && <CardDescription className="mt-0.5">{s.description}</CardDescription>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Run Now"
                        disabled={triggerMutation.isPending}
                        onClick={() => triggerMutation.mutate(s.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedSchedule(s.id)}>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={s.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: s.id, is_active: checked })}
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
                      <p className="text-xs">{s.next_run_at ? format(new Date(s.next_run_at), "MMM d HH:mm") : "—"}</p>
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
