import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText, Plus, MoreVertical, Play, Pencil, Copy, Trash2, Clock, Loader2, History, RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Template {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  prompt: string | null;
  schema_json: any;
  model: string;
  version: number;
  is_public: boolean;
  tags: string[];
  use_count: number;
  created_at: string;
  updated_at: string;
}

interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  prompt: string | null;
  schema_json: any;
  model: string;
  change_note: string | null;
  created_at: string;
}

const MODEL_OPTIONS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (fast)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5" },
];

export default function TemplatesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [versionDialogTemplate, setVersionDialogTemplate] = useState<Template | null>(null);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formSchema, setFormSchema] = useState("");
  const [formModel, setFormModel] = useState("google/gemini-3-flash-preview");
  const [formTags, setFormTags] = useState("");
  const [formChangeNote, setFormChangeNote] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("extraction_templates")
      .select("*")
      .order("is_public", { ascending: false })
      .order("updated_at", { ascending: false });
    if (data) setTemplates(data as unknown as Template[]);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormPrompt(""); setFormSchema("");
    setFormModel("google/gemini-3-flash-preview"); setFormTags(""); setFormChangeNote("");
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (t: Template) => {
    setEditing(t);
    setFormName(t.name);
    setFormDesc(t.description || "");
    setFormPrompt(t.prompt || "");
    setFormSchema(t.schema_json ? JSON.stringify(t.schema_json, null, 2) : "");
    setFormModel(t.model);
    setFormTags((t.tags || []).join(", "));
    setFormChangeNote("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !user) return;
    setSaving(true);

    let parsedSchema: any = null;
    if (formSchema.trim()) {
      try { parsedSchema = JSON.parse(formSchema); }
      catch { toast.error("Invalid JSON schema"); setSaving(false); return; }
    }

    const tags = formTags.split(",").map(t => t.trim()).filter(Boolean);

    if (editing) {
      // Save version snapshot before updating
      const { error: vErr } = await supabase.from("extraction_template_versions").insert({
        template_id: editing.id,
        version: editing.version,
        prompt: editing.prompt,
        schema_json: editing.schema_json,
        model: editing.model,
        change_note: formChangeNote || null,
      });

      const newVersion = editing.version + 1;
      const { error } = await supabase.from("extraction_templates").update({
        name: formName.trim(),
        description: formDesc.trim() || null,
        prompt: formPrompt.trim() || null,
        schema_json: parsedSchema,
        model: formModel,
        tags,
        version: newVersion,
      }).eq("id", editing.id);

      if (error) { toast.error("Failed to update template"); }
      else { toast.success("Template updated (v" + newVersion + ")"); }
    } else {
      const { error } = await supabase.from("extraction_templates").insert({
        user_id: user.id,
        name: formName.trim(),
        description: formDesc.trim() || null,
        prompt: formPrompt.trim() || null,
        schema_json: parsedSchema,
        model: formModel,
        tags,
      });
      if (error) { toast.error("Failed to create template"); }
      else { toast.success("Template created"); }
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchTemplates();
  };

  const handleDuplicate = async (t: Template) => {
    if (!user) return;
    await supabase.from("extraction_templates").insert({
      user_id: user.id,
      name: t.name + " (copy)",
      description: t.description,
      prompt: t.prompt,
      schema_json: t.schema_json,
      model: t.model,
      tags: t.tags,
    });
    toast.success("Template duplicated");
    fetchTemplates();
  };

  const handleDelete = async (t: Template) => {
    await supabase.from("extraction_templates").delete().eq("id", t.id);
    toast.success("Template deleted");
    fetchTemplates();
  };

  const handleUse = (t: Template) => {
    // Increment use_count
    supabase.from("extraction_templates").update({ use_count: t.use_count + 1 }).eq("id", t.id).then();
    // Navigate to playground with template params
    const params = new URLSearchParams();
    params.set("mode", "extract");
    if (t.prompt) params.set("extractPrompt", t.prompt);
    if (t.schema_json) params.set("extractSchema", JSON.stringify(t.schema_json));
    if (t.model) params.set("extractModel", t.model);
    navigate(`/app/playground?${params.toString()}`);
  };

  const openVersionHistory = async (t: Template) => {
    setVersionDialogTemplate(t);
    setVersionsLoading(true);
    const { data } = await supabase
      .from("extraction_template_versions")
      .select("*")
      .eq("template_id", t.id)
      .order("version", { ascending: false });
    setVersions((data || []) as unknown as TemplateVersion[]);
    setVersionsLoading(false);
  };

  const handleRestoreVersion = async (v: TemplateVersion) => {
    if (!versionDialogTemplate) return;
    const t = versionDialogTemplate;
    // Save current as version first
    await supabase.from("extraction_template_versions").insert({
      template_id: t.id,
      version: t.version,
      prompt: t.prompt,
      schema_json: t.schema_json,
      model: t.model,
      change_note: "Before restoring v" + v.version,
    });

    const newVersion = t.version + 1;
    await supabase.from("extraction_templates").update({
      prompt: v.prompt,
      schema_json: v.schema_json,
      model: v.model,
      version: newVersion,
    }).eq("id", t.id);

    toast.success("Restored to v" + v.version);
    setVersionDialogTemplate(null);
    fetchTemplates();
  };

  const isOwn = (t: Template) => t.user_id === user?.id;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Extraction Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Save and reuse extraction configurations across your workflows.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-medium">No templates yet</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first extraction template to get started.
          </p>
          <Button onClick={openCreate} size="sm" className="mt-4 gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Create Template
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <div
              key={t.id}
              className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate">{t.name}</h3>
                    {t.is_public && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">Starter</Badge>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                  )}
                </div>
                {(isOwn(t)) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openVersionHistory(t)}>
                        <History className="h-3.5 w-3.5 mr-2" /> Version History
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(t)}>
                        <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(t)} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {!isOwn(t) && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => handleDuplicate(t)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(t.tags || []).map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                ))}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-auto">
                <span>v{t.version}</span>
                <span>·</span>
                <span>{t.use_count} use{t.use_count !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span>{MODEL_OPTIONS.find(m => m.value === t.model)?.label || t.model}</span>
              </div>

              <Button size="sm" className="gap-1.5 w-full" onClick={() => handleUse(t)}>
                <Play className="h-3.5 w-3.5" /> Use in Playground
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "New Template"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update your extraction template. A new version will be created." : "Create a reusable extraction configuration."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Product Data Extractor" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Extracts product info from e-commerce pages" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Extraction Prompt</Label>
              <Textarea value={formPrompt} onChange={e => setFormPrompt(e.target.value)} placeholder="Extract the product name, price, and availability" className="mt-1 text-xs min-h-[60px]" />
            </div>
            <div>
              <Label className="text-xs">JSON Schema</Label>
              <Textarea value={formSchema} onChange={e => setFormSchema(e.target.value)} placeholder='{"type":"object","properties":{...}}' className="mt-1 text-xs font-mono min-h-[80px]" />
            </div>
            <div>
              <Label className="text-xs">Model</Label>
              <Select value={formModel} onValueChange={setFormModel}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="ecommerce, product" className="mt-1" />
            </div>
            {editing && (
              <div>
                <Label className="text-xs">Change note (optional)</Label>
                <Input value={formChangeNote} onChange={e => setFormChangeNote(e.target.value)} placeholder="Updated schema fields" className="mt-1" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editing ? "Save & Version" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={!!versionDialogTemplate} onOpenChange={(open) => { if (!open) setVersionDialogTemplate(null); }}>
        <DialogContent className="sm:max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version History — {versionDialogTemplate?.name}</DialogTitle>
            <DialogDescription>
              Current: v{versionDialogTemplate?.version}
            </DialogDescription>
          </DialogHeader>
          {versionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No previous versions yet.</p>
          ) : (
            <div className="space-y-2">
              {versions.map(v => (
                <div key={v.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">v{v.version}</span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(v.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {v.change_note && (
                      <p className="text-xs text-muted-foreground mt-0.5">{v.change_note}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {v.prompt ? v.prompt.slice(0, 60) + (v.prompt.length > 60 ? "..." : "") : "No prompt"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 text-xs shrink-0" onClick={() => handleRestoreVersion(v)}>
                    <RotateCcw className="h-3 w-3" /> Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
