import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pencil, Trash2, Loader2, GitBranch, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  extract_prompt: string | null;
  extract_schema: Record<string, unknown> | null;
  extract_model: string;
  transform_prompt: string | null;
  transform_model: string;
  scrape_options: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PipelineFormData {
  name: string;
  description: string;
  extract_prompt: string;
  extract_schema: string;
  extract_model: string;
  transform_prompt: string;
  transform_model: string;
}

const emptyForm: PipelineFormData = {
  name: "",
  description: "",
  extract_prompt: "",
  extract_schema: "",
  extract_model: "google/gemini-3-flash-preview",
  transform_prompt: "",
  transform_model: "google/gemini-3-flash-preview",
};

import { UpgradeGate } from "@/components/UpgradeGate";

export default function PipelinesPage() {
  return (
    <UpgradeGate feature="pipelines">
      <PipelinesPageContent />
    </UpgradeGate>
  );
}

function PipelinesPageContent() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PipelineFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Run state
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runPipelineId, setRunPipelineId] = useState<string | null>(null);
  const [runUrl, setRunUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

  const fetchPipelines = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("pipelines-manage", {
      method: "GET",
    });
    if (data?.pipelines) setPipelines(data.pipelines);
    setLoading(false);
  };

  useEffect(() => { fetchPipelines(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    let extractSchema = null;
    if (form.extract_schema.trim()) {
      try {
        extractSchema = JSON.parse(form.extract_schema);
      } catch {
        toast({ title: "Invalid JSON schema", variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      extract_prompt: form.extract_prompt || null,
      extract_schema: extractSchema,
      extract_model: form.extract_model,
      transform_prompt: form.transform_prompt || null,
      transform_model: form.transform_model,
    };

    if (editingId) {
      await supabase.functions.invoke(`pipelines-manage?id=${editingId}`, {
        method: "PUT",
        body: payload,
      });
    } else {
      await supabase.functions.invoke("pipelines-manage", {
        method: "POST",
        body: payload,
      });
    }

    setSaving(false);
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchPipelines();
  };

  const handleDelete = async (id: string) => {
    await supabase.functions.invoke(`pipelines-manage?id=${id}`, {
      method: "DELETE",
    });
    fetchPipelines();
  };

  const openEdit = (p: Pipeline) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || "",
      extract_prompt: p.extract_prompt || "",
      extract_schema: p.extract_schema ? JSON.stringify(p.extract_schema, null, 2) : "",
      extract_model: p.extract_model,
      transform_prompt: p.transform_prompt || "",
      transform_model: p.transform_model,
    });
    setDialogOpen(true);
  };

  const openRun = (id: string) => {
    setRunPipelineId(id);
    setRunUrl("");
    setRunResult(null);
    setRunDialogOpen(true);
  };

  const handleRun = async () => {
    if (!runUrl || !runPipelineId) return;
    setRunning(true);
    setRunResult(null);

    // Get API key from session
    const apiKey = sessionStorage.getItem("playground_api_key");
    if (!apiKey) {
      toast({ title: "No API key found. Visit the Playground first to auto-generate one.", variant: "destructive" });
      setRunning(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke("pipeline", {
      body: { url: runUrl, pipeline_id: runPipelineId },
      headers: { "X-API-Key": apiKey },
    });

    if (error) {
      setRunResult({ success: false, error: { code: "NETWORK_ERROR", message: error.message } });
    } else {
      setRunResult(data);
    }
    setRunning(false);
  };

  const ModelSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash (fast)</SelectItem>
        <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
        <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
        <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
        <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipelines</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chain scrape → extract → transform in a single API call with reusable definitions.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Pipeline</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Pipeline" : "Create Pipeline"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs text-muted-foreground">Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product scraper" className="text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Extracts product info and normalizes prices" className="text-sm" />
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-foreground mb-2">Extract Stage</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Extraction prompt</Label>
                    <Input value={form.extract_prompt} onChange={(e) => setForm({ ...form, extract_prompt: e.target.value })} placeholder="Extract the product name, price, and availability" className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">JSON Schema</Label>
                    <Textarea value={form.extract_schema} onChange={(e) => setForm({ ...form, extract_schema: e.target.value })} placeholder='{"type":"object","properties":{"name":{"type":"string"}}}' className="text-xs font-mono min-h-[60px]" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Model</Label>
                    <ModelSelect value={form.extract_model} onChange={(v) => setForm({ ...form, extract_model: v })} />
                  </div>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-foreground mb-2">Transform Stage (optional)</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Transform prompt</Label>
                    <Textarea value={form.transform_prompt} onChange={(e) => setForm({ ...form, transform_prompt: e.target.value })} placeholder="Normalize all prices to USD, flatten nested arrays" className="text-xs min-h-[50px]" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Model</Label>
                    <ModelSelect value={form.transform_model} onChange={(v) => setForm({ ...form, transform_model: v })} />
                  </div>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingId ? "Update Pipeline" : "Create Pipeline"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipelines table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : pipelines.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <GitBranch className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No pipelines yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Stages</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pipelines.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-48 truncate">{p.description || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="text-[10px]">Scrape</Badge>
                      <Badge variant="secondary" className="text-[10px]">Extract</Badge>
                      {p.transform_prompt && <Badge variant="secondary" className="text-[10px]">Transform</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{p.extract_model.split("/")[1]}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openRun(p.id)} className="gap-1 text-xs">
                        <Play className="h-3 w-3" /> Run
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Run dialog */}
      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Run Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com"
                value={runUrl}
                onChange={(e) => setRunUrl(e.target.value)}
                className="font-mono text-sm flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleRun()}
              />
              <Button onClick={handleRun} disabled={running || !runUrl} className="gap-1.5">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {running ? "Running..." : "Run"}
              </Button>
            </div>

            {runResult && !runResult.success && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">{runResult.error?.code}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{runResult.error?.message}</p>
                </div>
              </div>
            )}

            {runResult?.success && runResult.data && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Pipeline completed — {runResult.meta?.credits_used} credits used
                </div>

                {/* Scrape stage */}
                <div className="rounded border border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Stage 1: Scrape</p>
                  <p className="text-xs text-foreground">{runResult.data.stages?.scrape?.title}</p>
                  {runResult.data.stages?.scrape?.cache_hit && (
                    <Badge variant="secondary" className="text-[10px] mt-1">Cache hit</Badge>
                  )}
                </div>

                {/* Extract stage */}
                <div className="rounded border border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Stage 2: Extract</p>
                  <pre className="text-xs font-mono text-secondary-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {JSON.stringify(runResult.data.stages?.extract?.data, null, 2)}
                  </pre>
                  {runResult.data.stages?.extract?.validation && !runResult.data.stages.extract.validation.valid && (
                    <p className="text-xs text-destructive mt-1">⚠ Validation warnings</p>
                  )}
                </div>

                {/* Transform stage */}
                {runResult.data.stages?.transform && (
                  <div className="rounded border border-border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Stage 3: Transform</p>
                    <pre className="text-xs font-mono text-secondary-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {JSON.stringify(runResult.data.stages.transform.data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Final output */}
                <div className="rounded border border-primary/30 bg-primary/5 p-3">
                  <p className="text-xs font-medium text-primary mb-1">Final Output</p>
                  <pre className="text-xs font-mono text-secondary-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {JSON.stringify(runResult.data.final_output, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
