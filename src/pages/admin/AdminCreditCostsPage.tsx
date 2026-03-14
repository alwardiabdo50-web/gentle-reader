import { useState } from "react";
import { useAdminCreditCosts, useAdminCreditCostMutations } from "@/hooks/useAdminData";
import { usePlans } from "@/hooks/usePlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, Coins } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CreditCost {
  id: string;
  label: string;
  base_cost: number;
  plan_overrides: Record<string, number>;
  is_addon: boolean;
  sort_order: number;
  is_active: boolean;
}

export default function AdminCreditCostsPage() {
  const { data, isLoading } = useAdminCreditCosts();
  const { data: plansData } = usePlans(true);
  const { updateCost, createCost, deleteCost } = useAdminCreditCostMutations();
  const [editing, setEditing] = useState<CreditCost | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const costs: CreditCost[] = data?.costs ?? [];
  const plans = plansData ?? [];

  const openEdit = (cost: CreditCost) => {
    setEditing(cost);
    setCreating(false);
    setForm({ ...cost });
  };

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm({ id: "", label: "", base_cost: 1, plan_overrides: {}, is_addon: false, sort_order: 0 });
  };

  const closeDialog = () => {
    setEditing(null);
    setCreating(false);
    setForm({});
  };

  const handleSave = async () => {
    const payload = {
      label: form.label as string,
      base_cost: Number(form.base_cost) || 1,
      plan_overrides: form.plan_overrides as Record<string, number>,
      is_addon: !!form.is_addon,
      sort_order: Number(form.sort_order) || 0,
    };

    try {
      if (creating) {
        await createCost.mutateAsync({ ...payload, id: form.id as string });
        toast({ title: "Credit cost created" });
      } else if (editing) {
        await updateCost.mutateAsync({ costId: editing.id, ...payload });
        toast({ title: "Credit cost updated" });
      }
      closeDialog();
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (costId: string) => {
    if (!confirm(`Deactivate credit cost "${costId}"?`)) return;
    try {
      await deleteCost.mutateAsync(costId);
      toast({ title: "Credit cost deactivated" });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const updateOverride = (planId: string, value: string) => {
    const overrides = { ...(form.plan_overrides as Record<string, number>) };
    if (value === "" || value === undefined) {
      delete overrides[planId];
    } else {
      overrides[planId] = Number(value);
    }
    setForm((p) => ({ ...p, plan_overrides: overrides }));
  };

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">API Credit Costs</h1>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Endpoint
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Per-endpoint credit pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Base Cost</TableHead>
                  <TableHead>Plan Overrides</TableHead>
                  <TableHead>Add-on</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium text-foreground">{cost.label}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground font-mono">{cost.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{cost.base_cost} credit{cost.base_cost !== 1 ? "s" : ""}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(cost.plan_overrides ?? {}).map(([plan, val]) => (
                          <Badge key={plan} variant="secondary" className="text-[10px]">
                            {plan}: {val === 0 ? "—" : val}
                          </Badge>
                        ))}
                        {Object.keys(cost.plan_overrides ?? {}).length === 0 && (
                          <span className="text-[10px] text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cost.is_addon ? <Badge variant="outline" className="text-[10px]">Add-on</Badge> : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cost.is_active ? "default" : "secondary"}>
                        {cost.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cost)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {cost.is_active && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(cost.id)}>
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
            <DialogTitle>{creating ? "Add Endpoint" : `Edit ${editing?.label}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {creating && (
              <div>
                <Label>Endpoint ID (slug)</Label>
                <Input value={(form.id as string) || ""} onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))} placeholder="e.g. batch_scrape" />
              </div>
            )}
            <div>
              <Label>Display Label</Label>
              <Input value={(form.label as string) || ""} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Base Cost (credits)</Label>
                <Input type="number" value={String(form.base_cost ?? 1)} onChange={(e) => setForm((p) => ({ ...p, base_cost: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={String(form.sort_order ?? 0)} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_addon} onCheckedChange={(v) => setForm((p) => ({ ...p, is_addon: v }))} />
              <Label>Add-on (displayed as "+N credit")</Label>
            </div>

            <div>
              <Label className="mb-2 block">Plan Overrides</Label>
              <p className="text-[10px] text-muted-foreground mb-2">Set to 0 to mark as unavailable ("—") on that plan. Leave empty to use base cost.</p>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <div key={plan.id} className="flex items-center gap-3">
                    <span className="text-sm text-foreground w-24 shrink-0 capitalize">{plan.name}</span>
                    <Input
                      type="number"
                      placeholder="Base cost"
                      className="w-28"
                      value={String((form.plan_overrides as Record<string, number>)?.[plan.id] ?? "")}
                      onChange={(e) => updateOverride(plan.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={updateCost.isPending || createCost.isPending}>
              {creating ? "Create" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
