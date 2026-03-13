import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface OrgInfo {
  id: string;
  name: string;
  role: string;
  plan: string;
  monthly_credits: number;
  credits_used: number;
  extra_credits: number;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  activeOrg: OrgInfo | null;
  setActiveOrg: (orgId: string | null) => void;
  orgs: OrgInfo[];
  refreshOrgs: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  activeOrg: null,
  setActiveOrg: () => {},
  orgs: [],
  refreshOrgs: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<OrgInfo[]>([]);
  const [activeOrg, setActiveOrgState] = useState<OrgInfo | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshOrgs = useCallback(async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase.functions.invoke("org-manage", { method: "GET" });
      if (!error && data?.orgs) {
        setOrgs(data.orgs);
        // Restore active org from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("active_org_id")
          .eq("user_id", session.user.id)
          .single();
        if (profile?.active_org_id) {
          const found = data.orgs.find((o: OrgInfo) => o.id === profile.active_org_id);
          if (found) setActiveOrgState(found);
        }
      }
    } catch (e) {
      console.error("Failed to fetch orgs:", e);
    }
  }, [session?.user]);

  useEffect(() => {
    if (session?.user) refreshOrgs();
  }, [session?.user, refreshOrgs]);

  const setActiveOrg = useCallback(async (orgId: string | null) => {
    if (!session?.user) return;
    const found = orgId ? orgs.find(o => o.id === orgId) ?? null : null;
    setActiveOrgState(found);
    // Persist to profile
    await supabase
      .from("profiles")
      .update({ active_org_id: orgId })
      .eq("user_id", session.user.id);
  }, [session?.user, orgs]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      signOut,
      activeOrg,
      setActiveOrg,
      orgs,
      refreshOrgs,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
