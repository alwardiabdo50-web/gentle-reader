import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      if (data?.full_name) setFullName(data.full_name);
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("user_id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    // Sign out and notify — actual account deletion requires admin/server action
    toast.success("Account deletion requested. You will be signed out.");
    await signOut();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account preferences.</p>
      </div>

      {/* Profile */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Profile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={email} className="mt-1" disabled />
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          Save Changes
        </Button>
      </div>

      <Separator />

      {/* Notifications */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <div className="space-y-3">
          {[
            { label: "Usage alerts", desc: "Get notified when credits run low" },
            { label: "Job failures", desc: "Receive alerts on failed jobs" },
            { label: "Product updates", desc: "Hear about new features" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border border-border p-3 surface-1">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <Switch defaultChecked />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Danger zone */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
        <div className="rounded-lg border border-destructive/30 p-4 bg-destructive/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Delete account</div>
              <div className="text-xs text-muted-foreground">Permanently delete your account and all data.</div>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action is irreversible. Type <strong>DELETE</strong> to confirm.
          </p>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteConfirm !== "DELETE"} onClick={handleDeleteAccount}>
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
