import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Provider {
  id: string;
  name: string;
  base_url: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

interface Model {
  id: string;
  provider_id: string;
  name: string;
  tier: string;
  credit_cost: number;
  min_plan: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

async function postAdmin(body: Record<string, unknown>) {
  const session = (await supabase.auth.getSession()).data.session;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-stats`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Action failed");
  }
  return res.json();
}

async function fetchAdmin(action: string) {
  const session = (await supabase.auth.getSession()).data.session;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-stats?action=${action}`, {
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  const json = await res.json();
  return json.data;
}

const TIER_COLORS: Record<string, string> = {
  free: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cheaper: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  expensive: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

export default function AdminModelsPage() {
  const queryClient = useQueryClient();

  const { data: providersData, isLoading: loadingProviders } = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: () => fetchAdmin("providers"),
  });

  const { data: modelsData, isLoading: loadingModels } = useQuery({
    queryKey: ["admin", "models"],
    queryFn: () => fetchAdmin("models"),
  });

  const providers: Provider[] = providersData?.providers ?? [];
  const models: Model[] = modelsData?.models ?? [];

  // Provider dialog
  const [providerOpen, setProviderOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<Provider | null>(null);
  const [pId, setPId] = useState("");
  const [pName, setPName] = useState("");
  const [pUrl, setPUrl] = useState("");
  const [pDefault, setPDefault] = useState(false);
  const [pSort, setPSort] = useState(0);

  // Model dialog
  const [modelOpen, setModelOpen] = useState(false);
  const [editModel, setEditModel] = useState<Model | null>(null);
  const [mId, setMId] = useState("");
  const [mProviderId, setMProviderId] = useState("");
  const [mName, setMName] = useState("");
  const [mTier, setMTier] = useState("free");
  const [mCost, setMCost] = useState(0);
  const [mMinPlan, setMMinPlan] = useState("free");
  const [mDefault, setMDefault] = useState(false);
  const [mSort, setMSort] = useState(0);

  const providerMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => postAdmin(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      setProviderOpen(false);
      toast.success("Provider saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const modelMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => postAdmin(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
      queryClient.invalidateQueries({ queryKey: ["ai-models"] });
      setModelOpen(false);
      toast.success("Model saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNewProvider = () => {
    setEditProvider(null);
    setPId(""); setPName(""); setPUrl(""); setPDefault(false); setPSort(0);
    setProviderOpen(true);
  };

  const openEditProvider = (p: Provider) => {
    setEditProvider(p);
    setPId(p.id); setPName(p.name); setPUrl(p.base_url); setPDefault(p.is_default); setPSort(p.sort_order);
    setProviderOpen(true);
  };

  const saveProvider = () => {
    if (editProvider) {
      providerMutation.mutate({ action: "provider-update", providerId: editProvider.id, name: pName, base_url: pUrl, is_default: pDefault, sort_order: pSort });
    } else {
      providerMutation.mutate({ action: "provider-create", id: pId, name: pName, base_url: pUrl, is_default: pDefault, sort_order: pSort });
    }
  };

  const openNewModel = () => {
    setEditModel(null);
    setMId(""); setMProviderId(providers[0]?.id ?? ""); setMName(""); setMTier("free"); setMCost(0); setMMinPlan("free"); setMDefault(false); setMSort(0);
    setModelOpen(true);
  };

  const openEditModel = (m: Model) => {
    setEditModel(m);
    setMId(m.id); setMProviderId(m.provider_id); setMName(m.name); setMTier(m.tier); setMCost(m.credit_cost); setMMinPlan(m.min_plan); setMDefault(m.is_default); setMSort(m.sort_order);
    setModelOpen(true);
  };

  const saveModel = () => {
    if (editModel) {
      modelMutation.mutate({ action: "model-update", modelId: editModel.id, provider_id: mProviderId, name: mName, tier: mTier, credit_cost: mCost, min_plan: mMinPlan, is_default: mDefault, sort_order: mSort });
    } else {
      modelMutation.mutate({ action: "model-create", id: mId, provider_id: mProviderId, name: mName, tier: mTier, credit_cost: mCost, min_plan: mMinPlan, is_default: mDefault, sort_order: mSort });
    }
  };

  const deleteModel = (id: string) => {
    modelMutation.mutate({ action: "model-delete", modelId: id });
  };

  const deleteProvider = (id: string) => {
    providerMutation.mutate({ action: "provider-delete", providerId: id });
  };

  if (loadingProviders || loadingModels) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Models</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage providers and models available for extraction & pipelines.</p>
      </div>

      {/* Providers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4" /> Providers</CardTitle>
          <Button size="sm" className="gap-1.5" onClick={openNewProvider}><Plus className="h-3.5 w-3.5" /> Add Provider</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs max-w-xs truncate">{p.base_url}</TableCell>
                  <TableCell>{p.is_default && <Badge variant="outline" className="text-primary">Default</Badge>}</TableCell>
                  <TableCell>
                    <div className={`h-2 w-2 rounded-full ${p.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditProvider(p)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteProvider(p.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Models */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Models ({models.length})</CardTitle>
          <Button size="sm" className="gap-1.5" onClick={openNewModel}><Plus className="h-3.5 w-3.5" /> Add Model</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Min Plan</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.id}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-xs">{m.provider_id}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TIER_COLORS[m.tier] ?? ""}>{m.tier}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">{m.credit_cost}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize text-xs">{m.min_plan}</Badge></TableCell>
                  <TableCell>{m.is_default && <Badge variant="outline" className="text-primary">Default</Badge>}</TableCell>
                  <TableCell>
                    <div className={`h-2 w-2 rounded-full ${m.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModel(m)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteModel(m.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Provider Dialog */}
      <Dialog open={providerOpen} onOpenChange={setProviderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editProvider ? "Edit Provider" : "Add Provider"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            {!editProvider && (
              <div>
                <Label className="text-xs">ID (slug)</Label>
                <Input value={pId} onChange={(e) => setPId(e.target.value)} placeholder="openrouter" className="mt-1" />
              </div>
            )}
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="OpenRouter" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Base URL</Label>
              <Input value={pUrl} onChange={(e) => setPUrl(e.target.value)} placeholder="https://..." className="mt-1 font-mono text-xs" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={pDefault} onCheckedChange={setPDefault} />
                <Label className="text-xs">Default</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Sort</Label>
                <Input type="number" value={pSort} onChange={(e) => setPSort(Number(e.target.value))} className="w-20 h-8" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setProviderOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={saveProvider} disabled={providerMutation.isPending}>
                {providerMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Model Dialog */}
      <Dialog open={modelOpen} onOpenChange={setModelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editModel ? "Edit Model" : "Add Model"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            {!editModel && (
              <div>
                <Label className="text-xs">Model ID</Label>
                <Input value={mId} onChange={(e) => setMId(e.target.value)} placeholder="google/gemini-2.5-flash" className="mt-1 font-mono text-xs" />
              </div>
            )}
            <div>
              <Label className="text-xs">Display Name</Label>
              <Input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Gemini 2.5 Flash" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Provider</Label>
              <Select value={mProviderId} onValueChange={setMProviderId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tier</Label>
                <Select value={mTier} onValueChange={setMTier}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="cheaper">Cheaper</SelectItem>
                    <SelectItem value="expensive">Expensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Credit Cost</Label>
                <Input type="number" value={mCost} onChange={(e) => setMCost(Number(e.target.value))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min Plan</Label>
                <Select value={mMinPlan} onValueChange={setMMinPlan}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="hobby">Hobby</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="scale">Scale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Sort Order</Label>
                <Input type="number" value={mSort} onChange={(e) => setMSort(Number(e.target.value))} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={mDefault} onCheckedChange={setMDefault} />
              <Label className="text-xs">Default model</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setModelOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={saveModel} disabled={modelMutation.isPending}>
                {modelMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
