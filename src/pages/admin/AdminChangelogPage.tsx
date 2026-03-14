import { useState } from "react";
import { useAdminChangelog, useAdminChangelogMutations } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ChangelogEntry {
  id: string;
  date: string;
  version: string;
  category: string;
  title: string;
  description: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const categoryConfig: Record<string, { label: string; variant: "success" | "info" | "warning" | "destructive" }> = {
  feature: { label: "Feature", variant: "success" },
  improvement: { label: "Improvement", variant: "info" },
  deprecation: { label: "Deprecation", variant: "warning" },
  fix: { label: "Fix", variant: "destructive" },
};

const emptyEntry = {
  date: new Date().toISOString().split("T")[0],
  version: "",
  category: "feature",
  title: "",
  description: "",
  is_published: true,
  sort_order: 0,
};

export default function AdminChangelogPage() {
  const { data, isLoading } = useAdminChangelog();
  const { createEntry, updateEntry, deleteEntry } = useAdminChangelogMutations();
  const [editing, setEditing] = useState<ChangelogEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const entries: ChangelogEntry[] = data?.entries ?? [];

  const openEdit = (entry: ChangelogEntry) => {
    setEditing(entry);
    setCreating(false);
    setForm({ ...entry });
  };

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm({ ...emptyEntry });
  };

  const closeDialog = () => {
    setEditing(null);
    setCreating(false);
    setForm({});
  };

  const handleSave = async () => {
    const payload = {
      date: form.date as string,
      version: form.version as string,
      category: form.category as string,
      title: form.title as string,
      description: form.description as string,
      is_published: form.is_published !== false,
      sort_order: Number(form.sort_order) || 0,
    };

    try {
      if (creating) {
        await createEntry.mutateAsync(payload);
        toast({ title: "Entry created" });
      } else if (editing) {
        await updateEntry.mutateAsync({ entryId: editing.id, ...payload });
        toast({ title: "Entry updated" });
      }
      closeDialog();
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (entry: ChangelogEntry) => {
    if (!confirm(`Delete "${entry.title}"?`)) return;
    try {
      await deleteEntry.mutateAsync(entry.id);
      toast({ title: "Entry deleted" });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Changelog Management</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Entry
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">All Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const cat = categoryConfig[entry.category];
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{entry.date}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.version}</TableCell>
                      <TableCell>
                        <Badge variant={cat?.variant ?? "default"}>{cat?.label ?? entry.category}</Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[300px] truncate">{entry.title}</TableCell>
                      <TableCell>
                        <Badge variant={entry.is_published ? "default" : "secondary"}>
                          {entry.is_published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(entry)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(entry)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      <Dialog open={!!editing || creating} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{creating ? "Create Entry" : "Edit Entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={(form.date as string) || ""} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <Label>Version</Label>
                <Input value={(form.version as string) || ""} onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))} placeholder="v1.5.0" />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={(form.category as string) || "feature"} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="deprecation">Deprecation</SelectItem>
                  <SelectItem value="fix">Fix</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={(form.title as string) || ""} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={4} value={(form.description as string) || ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={String(form.sort_order ?? 0)} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.is_published !== false} onCheckedChange={(v) => setForm((p) => ({ ...p, is_published: v }))} />
                <Label>Published</Label>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={createEntry.isPending || updateEntry.isPending}>
              {creating ? "Create Entry" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
