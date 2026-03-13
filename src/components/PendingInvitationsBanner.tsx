import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X, UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PendingInvitation {
  id: string;
  org_name: string;
  role: string;
  email: string;
  created_at: string;
}

export function PendingInvitationsBanner() {
  const { user, refreshOrgs } = useAuth();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const fetchInvitations = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("org-members-manage", {
        body: { action: "my-invitations" },
      });
      if (!error && data?.invitations) {
        setInvitations(data.invitations);
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [user]);

  const handleAccept = async (invitationId: string) => {
    setLoading(invitationId);
    try {
      const { data, error } = await supabase.functions.invoke("org-members-manage", {
        body: { action: "accept", invitation_id: invitationId },
      });
      if (error) throw error;
      toast.success("Invitation accepted!");
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      await refreshOrgs();
    } catch (e: any) {
      toast.error(e.message || "Failed to accept invitation");
    } finally {
      setLoading(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setLoading(invitationId + "-decline");
    try {
      const { data, error } = await supabase.functions.invoke("org-members-manage", {
        body: { action: "decline", invitation_id: invitationId },
      });
      if (error) throw error;
      toast.success("Invitation declined");
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    } catch (e: any) {
      toast.error(e.message || "Failed to decline invitation");
    } finally {
      setLoading(null);
    }
  };

  if (invitations.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3"
        >
          <UserPlus className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm text-foreground flex-1">
            You've been invited to join <strong>{inv.org_name}</strong> as{" "}
            <span className="capitalize">{inv.role}</span>.
          </span>
          <Button
            size="sm"
            variant="default"
            onClick={() => handleAccept(inv.id)}
            disabled={loading !== null}
            className="h-7 text-xs"
          >
            <Check className="h-3 w-3 mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDecline(inv.id)}
            disabled={loading !== null}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Decline
          </Button>
        </div>
      ))}
    </div>
  );
}
