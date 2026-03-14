import { useState } from "react";
import { useAdminPlans, useAdminPlanMutations } from "@/hooks/useAdminData";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Plan } from "@/hooks/usePlans";

const FEATURE_KEYS = ["webhooks", "schedules", "pipelines", "extract", "organizations"] as const;

const emptyPlan: Partial<Plan> & { id: string; name: string } = {
  id: "",
  name: "",
  monthly_price: 0,
  yearly_price: 0,
  monthly_credits: 500,
  max_api_keys: 2,
  rate_limit_rpm: 5,
  features_json: { webhooks: false, schedules: false, pipelines: false, extract: false, organizations: false },
  description: "",
  display_features: [],
  cta_text: "Get Started",
  highlighted: false,
  sort_order: 0,
  is_active: true,
};

export default function AdminPlansPage() {
  const { data, isLoading } = useAdminPlans();
  const { updatePlan, createPlan, deletePlan } = useAdminPlanMutations();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const plans: Plan[] = data?.plans ?? [];

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setCreating(false);
    setForm({ ...plan, display_features_text: (plan.display_features ?? []).join("\n") });
  };

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm({ ...emptyPlan, display_features_text: "" });
  };

  const closeDialog = () => {
    setEditing(null);
    setCreating(false);
    setForm({});
  };

  const handleSave = async () => {
    const displayFeatures = ((form.display_features_text as string) || "")
      .split("\n")
      .map((s: string) => s.trim())
      .filter(Boolean);

    const payload = {
      name: form.name as string,
      monthly_price: Number(form.monthly_price) || 0,
      yearly_price: Number(form.yearly_price) || 0,
      monthly_credits: Number(form.monthly_credits) || 0,
      max_api_keys: Number(form.max_api_keys) || 0,
      rate_limit_rpm: Number(form.rate_limit_rpm) || 0,
      features_json: form.features_json as Record<string, boolean>,
      description: (form.description as string) || "",
      display_features: displayFeatures,
      cta_text: (form.cta_text as string) || "Get Started",
      highlighted: !!form.highlighted,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active !== false,
      original_monthly_price: form.original_monthly_price != null ? Number(form.original_monthly_price) : null,
      original_yearly_price: form.original_yearly_price != null ? Number(form.original_yearly_price) : null,
    };

    try {
      if (creating) {
        await createPlan.mutateAsync({ ...payload, id: form.id as string });
        toast({ title: "Plan created" });
      } else if (editing) {
        await updatePlan.mutateAsync({ planId: editing.id, ...payload });
        toast({ title: "Plan updated" });
      }
      closeDialog();
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm(`Deactivate plan "${planId}"?`)) return;
    try {
      await deletePlan.mutateAsync(planId);
      toast({ title: "Plan deactivated" });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const updateFeature = (key: string, val: boolean) => {
    setForm((prev) => ({
      ...prev,
      features_json: { ...(prev.features_json as Record<string, boolean>), [key]: val },
    }));
  };

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Plan Management</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Plan
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">All Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>API Keys</TableHead>
                  <TableHead>RPM</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">
                      {plan.name}
                      {plan.highlighted && <Badge className="ml-2 text-[10px]" variant="default">Popular</Badge>}
                    </TableCell>
                    <TableCell>${(plan.monthly_price / 100).toFixed(0)}/mo</TableCell>
                    <TableCell>{plan.monthly_credits.toLocaleString()}</TableCell>
                    <TableCell>{plan.max_api_keys === -1 ? "∞" : plan.max_api_keys}</TableCell>
                    <TableCell>{plan.rate_limit_rpm}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(plan.features_json ?? {})
                          .filter(([, v]) => v)
                          .map(([k]) => (
                            <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? "default" : "secondary"}>
                        {plan.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plan)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {plan.is_active && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(plan.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit / Create Dialog */}
      <Dialog open={!!editing || creating} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{creating ? "Create Plan" : `Edit ${editing?.name}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {creating && (
              <div>
                <Label>Plan ID (slug)</Label>
                <Input value={(form.id as string) || ""} onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))} placeholder="e.g. premium" />
              </div>
            )}
            <div>
              <Label>Display Name</Label>
              <Input value={(form.name as string) || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monthly Price (cents)</Label>
                <Input type="number" value={String(form.monthly_price ?? 0)} onChange={(e) => setForm((p) => ({ ...p, monthly_price: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Yearly Price (cents)</Label>
                <Input type="number" value={String(form.yearly_price ?? 0)} onChange={(e) => setForm((p) => ({ ...p, yearly_price: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Original Monthly Price (cents)</Label>
                <Input type="number" value={String(form.original_monthly_price ?? "")} onChange={(e) => setForm((p) => ({ ...p, original_monthly_price: e.target.value ? Number(e.target.value) : null }))} placeholder="Leave empty to hide" />
                <p className="text-[10px] text-muted-foreground">Shown as strikethrough</p>
              </div>
              <div>
                <Label>Original Yearly Price (cents)</Label>
                <Input type="number" value={String(form.original_yearly_price ?? "")} onChange={(e) => setForm((p) => ({ ...p, original_yearly_price: e.target.value ? Number(e.target.value) : null }))} placeholder="Leave empty to hide" />
                <p className="text-[10px] text-muted-foreground">Shown as strikethrough</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Monthly Credits</Label>
                <Input type="number" value={String(form.monthly_credits ?? 0)} onChange={(e) => setForm((p) => ({ ...p, monthly_credits: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Max API Keys</Label>
                <Input type="number" value={String(form.max_api_keys ?? 0)} onChange={(e) => setForm((p) => ({ ...p, max_api_keys: Number(e.target.value) }))} />
                <p className="text-[10px] text-muted-foreground">-1 = unlimited</p>
              </div>
              <div>
                <Label>Rate Limit (RPM)</Label>
                <Input type="number" value={String(form.rate_limit_rpm ?? 0)} onChange={(e) => setForm((p) => ({ ...p, rate_limit_rpm: Number(e.target.value) }))} />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Features</Label>
              <div className="space-y-2">
                {FEATURE_KEYS.map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-foreground">{key}</span>
                    <Switch
                      checked={!!(form.features_json as Record<string, boolean>)?.[key]}
                      onCheckedChange={(v) => updateFeature(key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input value={(form.description as string) || ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <Label>Display Features (one per line)</Label>
              <Textarea rows={4} value={(form.display_features_text as string) || ""} onChange={(e) => setForm((p) => ({ ...p, display_features_text: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CTA Text</Label>
                <Input value={(form.cta_text as string) || ""} onChange={(e) => setForm((p) => ({ ...p, cta_text: e.target.value }))} />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={String(form.sort_order ?? 0)} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={!!form.highlighted} onCheckedChange={(v) => setForm((p) => ({ ...p, highlighted: v }))} />
                <Label>Highlighted</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active !== false} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
                <Label>Active</Label>
              </div>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={updatePlan.isPending || createPlan.isPending}>
              {creating ? "Create Plan" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
