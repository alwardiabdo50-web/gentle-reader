import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Users, Mail, Clock, Building2, AlertCircle } from "lucide-react";

interface Member {
  id: string;
  user_id: string;
  role: string;
  email: string;
  full_name: string | null;
  joined_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
}

export default function TeamPage() {
  const { activeOrg, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  const isOwner = activeOrg?.role === "owner";

  const fetchMembers = async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("org-members-manage", {
        body: { action: "list", org_id: activeOrg.id },
      });
      if (error) throw error;
      setMembers(data?.members || []);
      setInvitations(data?.invitations || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeOrg) fetchMembers();
  }, [activeOrg]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !activeOrg) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("org-members-manage", {
        body: { action: "invite", org_id: activeOrg.id, email: inviteEmail.trim(), role: inviteRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeOrg) return;
    try {
      const { data, error } = await supabase.functions.invoke("org-members-manage", {
        body: { action: "remove", org_id: activeOrg.id, member_id: memberId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Member removed");
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!activeOrg) return;
    try {
      const { data, error } = await supabase.functions.invoke("org-members-manage", {
        body: { action: "remove", org_id: activeOrg.id, invitation_id: invitationId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Invitation cancelled");
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel invitation");
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!activeOrg) return;
    try {
      const { data, error } = await supabase.functions.invoke("org-members-manage", {
        body: { action: "change_role", org_id: activeOrg.id, member_id: memberId, role: newRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Role updated");
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    }
  };

  if (!activeOrg) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your organization's team members.</p>
        </div>
        <div className="rounded-lg border border-border p-8 text-center">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-sm font-medium mb-1">No Organization Selected</h3>
          <p className="text-xs text-muted-foreground">
            Switch to an organization using the switcher in the sidebar, or create a new one.
          </p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage members of <span className="font-medium text-foreground">{activeOrg.name}</span>
          </p>
        </div>
        {isOwner && (
          <Button className="gap-1.5" onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4" /> Invite Member
          </Button>
        )}
      </div>

      {/* Members */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" /> Members ({members.length})
          </h3>
        </div>
        <div className="divide-y divide-border">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {(m.full_name || m.email).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {m.full_name || m.email}
                    {m.user_id === user?.id && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && m.user_id !== user?.id ? (
                  <Select value={m.role} onValueChange={(v) => handleChangeRole(m.id, v)}>
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className="text-xs capitalize">{m.role}</Badge>
                )}
                {isOwner && m.user_id !== user?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveMember(m.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" /> Pending Invitations ({invitations.length})
            </h3>
          </div>
          <div className="divide-y divide-border">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{inv.email}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {inv.role} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleCancelInvitation(inv.id)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Info */}
      {!isOwner && (
        <div className="flex items-start gap-2 rounded-lg border border-border p-4 bg-muted/30">
          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            You're a <span className="font-medium capitalize">{activeOrg.role}</span> in this organization.
            Only owners can invite members and manage roles.
          </p>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invitation to join {activeOrg.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Email address</Label>
              <Input
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member — Can use shared API keys</SelectItem>
                  <SelectItem value="viewer">Viewer — Read-only access</SelectItem>
                  <SelectItem value="owner">Owner — Full admin access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
              {inviting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}