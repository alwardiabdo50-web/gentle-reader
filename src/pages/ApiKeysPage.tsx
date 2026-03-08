import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Plus, Copy, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsed: string | null;
  isActive: boolean;
  createdAt: string;
}

const MOCK_KEYS: ApiKey[] = [
  {
    id: "key_01",
    name: "Production Key",
    prefix: "nc_live_8f3k",
    lastUsed: "2026-03-08T10:30:00Z",
    isActive: true,
    createdAt: "2026-02-15T08:00:00Z",
  },
  {
    id: "key_02",
    name: "Development Key",
    prefix: "nc_live_2m9x",
    lastUsed: "2026-03-07T14:00:00Z",
    isActive: true,
    createdAt: "2026-03-01T12:00:00Z",
  },
  {
    id: "key_03",
    name: "Old Testing Key",
    prefix: "nc_live_0a1b",
    lastUsed: null,
    isActive: false,
    createdAt: "2026-01-10T09:00:00Z",
  },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(MOCK_KEYS);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    if (!newKeyName.trim()) return;
    const token = `nc_live_${Math.random().toString(36).slice(2, 14)}`;
    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: newKeyName,
      prefix: token.slice(0, 13),
      lastUsed: null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setKeys([newKey, ...keys]);
    setCreatedToken(token);
    setNewKeyName("");
  };

  const handleRevoke = (id: string) => {
    setKeys(keys.map((k) => (k.id === id ? { ...k, isActive: false } : k)));
  };

  const handleCopyToken = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your API keys. Tokens are shown only once at creation.
          </p>
        </div>
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
            <Button className="gap-1.5 glow-primary">
              <Plus className="h-4 w-4" /> New Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {createdToken ? "Key Created" : "Create API Key"}
              </DialogTitle>
            </DialogHeader>

            {!createdToken ? (
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="key-name" className="text-xs text-muted-foreground">
                    Key name
                  </Label>
                  <Input
                    id="key-name"
                    placeholder="e.g. Production Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={!newKeyName.trim()}>
                    Create Key
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="flex items-start gap-2 p-3 rounded-lg border border-nebula-warning/30 bg-nebula-warning/5">
                  <AlertCircle className="h-4 w-4 text-nebula-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-nebula-warning">
                    Copy this token now. It won't be shown again.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-muted p-2.5 rounded border border-border break-all">
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
                  <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                    Done
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Keys table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border surface-2">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Prefix</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Last Used</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Created</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  {k.name}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.prefix}...</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {k.lastUsed ? formatDate(k.lastUsed) : "Never"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(k.createdAt)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                      k.isActive
                        ? "border-primary/30 text-primary bg-primary/10"
                        : "border-destructive/30 text-destructive bg-destructive/10"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${k.isActive ? "bg-primary" : "bg-destructive"}`} />
                    {k.isActive ? "Active" : "Revoked"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {k.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs"
                      onClick={() => handleRevoke(k.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Revoke
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
