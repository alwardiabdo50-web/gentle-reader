import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Plus, Copy, Trash2, CheckCircle2, AlertCircle, Loader2, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
  org_id: string | null;
}

export default function ApiKeysPage() {
  const { user, activeOrg } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const isOrgOwner = activeOrg?.role === "owner";
  const canCreateKeys = !activeOrg || isOrgOwner;

  const fetchKeys = async () => {
    let query = supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, is_active, created_at, org_id")
      .order("created_at", { ascending: false });

    if (activeOrg) {
      query = query.eq("org_id", activeOrg.id);
    } else {
      query = query.is("org_id", null);
    }

    const { data, error } = await query;
    if (data) setKeys(data);
    if (error) toast.error(error.message);
    setLoading(false);
  };

  useEffect(() => {
    fetchKeys();
  }, [activeOrg]);

  const handleCreate = async () => {
    if (!newKeyName.trim() || !user) return;
    setCreating(true);
    try {
      // Generate a random token
      const rawToken = `nc_live_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
      const prefix = rawToken.slice(0, 13);
      // Simple hash for demo - in production use server-side hashing
      const encoder = new TextEncoder();
      const data = encoder.encode(rawToken);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const { error } = await supabase.from("api_keys").insert({
        user_id: user.id,
        name: newKeyName,
        key_prefix: prefix,
        key_hash: hashHex,
        org_id: activeOrg?.id ?? null,
      });

      if (error) throw error;
      setCreatedToken(rawToken);
      setNewKeyName("");
      fetchKeys();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", id);
    if (error) toast.error(error.message);
    else fetchKeys();
  };

  const handleCopyToken = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeOrg ? (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                Shared keys for <span className="font-medium text-foreground">{activeOrg.name}</span>
                {!isOrgOwner && " (read-only)"}
              </span>
            ) : (
              "Manage your API keys. Tokens are shown only once at creation."
            )}
          </p>
        </div>
        {canCreateKeys && (
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setCreatedToken(null);
                setNewKeyName("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" /> New Key
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{createdToken ? "Key Created" : "Create API Key"}</DialogTitle>
            </DialogHeader>
            {!createdToken ? (
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="key-name" className="text-xs text-muted-foreground">Key name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g. Production Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={!newKeyName.trim() || creating}>
                    {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Create Key
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="flex items-start gap-2 p-3 rounded-lg border border-warning/20 bg-warning/10">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-warning">Copy this token now. It won't be shown again.</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-sidebar p-2.5 rounded border border-border break-all">
                    {createdToken}
                  </code>
                  <Button variant="ghost" size="sm" onClick={handleCopyToken}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Copied
                  </p>
                )}
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setDialogOpen(false)}>Done</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-sidebar">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Prefix</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Last Used</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Created</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No API keys yet. Create one to get started.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-muted-foreground" />
                    {k.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.key_prefix}...</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {k.last_used_at ? formatDate(k.last_used_at) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(k.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                      k.is_active
                        ? "border-primary/30 text-primary bg-primary/10"
                        : "border-destructive/30 text-destructive bg-destructive/10"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${k.is_active ? "bg-primary" : "bg-destructive"}`} />
                      {k.is_active ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {k.is_active && canCreateKeys && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs"
                        onClick={() => handleRevoke(k.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
