import { useAuth } from "@/contexts/AuthContext";
import { Building2, Check, ChevronsUpDown, Plus, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { canAccessFeature } from "@/lib/plan-limits";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const { activeOrg, setActiveOrg, orgs, refreshOrgs } = useAuth();
  const { plan } = useCredits();
  const canCreateOrg = canAccessFeature(plan, "organizations");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("org-manage", {
        body: { action: "create", name: newName.trim() },
      });
      if (error) throw error;
      toast.success("Organization created");
      setCreateOpen(false);
      setNewName("");
      await refreshOrgs();
      if (data?.org?.id) setActiveOrg(data.org.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-sidebar-accent transition-colors outline-none ${collapsed ? "justify-center" : ""}`}>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
              {activeOrg ? (
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-xs font-medium text-foreground">
                  {activeOrg ? activeOrg.name : "Personal"}
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="start" className="w-56">
          <DropdownMenuItem onClick={() => setActiveOrg(null)} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Personal Account
            {!activeOrg && <Check className="ml-auto h-4 w-4 text-primary" />}
          </DropdownMenuItem>
          {orgs.length > 0 && <DropdownMenuSeparator />}
          {orgs.map((org) => (
            <DropdownMenuItem key={org.id} onClick={() => setActiveOrg(org.id)} className="cursor-pointer">
              <Building2 className="mr-2 h-4 w-4" />
              <span className="flex-1 truncate">{org.name}</span>
              {activeOrg?.id === org.id && <Check className="ml-auto h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {canCreateOrg ? (
            <DropdownMenuItem onClick={() => setCreateOpen(true)} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Create Organization
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled className="cursor-not-allowed opacity-60">
              <Lock className="mr-2 h-4 w-4" />
              Create Organization
              <span className="ml-auto rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">Standard+</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>Create a new team to share API keys and billing.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Organization name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
