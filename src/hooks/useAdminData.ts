import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchAdminData(action: string, params?: Record<string, string>) {
  const searchParams = new URLSearchParams({ action, ...params });
  const session = (await supabase.auth.getSession()).data.session;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/admin-stats?${searchParams.toString()}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch admin data");
  }

  const json = await res.json();
  return json.data;
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => fetchAdminData("overview"),
    refetchInterval: 30000,
  });
}

export function useAdminUsers(page = 1, search = "") {
  return useQuery({
    queryKey: ["admin", "users", page, search],
    queryFn: () => fetchAdminData("users", { page: String(page), search }),
  });
}

export function useAdminUserDetail(userId: string) {
  return useQuery({
    queryKey: ["admin", "user-detail", userId],
    queryFn: () => fetchAdminData("user-detail", { userId }),
    enabled: !!userId,
  });
}

export function useAdminJobs(page = 1, type = "all", status = "all") {
  return useQuery({
    queryKey: ["admin", "jobs", page, type, status],
    queryFn: () => fetchAdminData("jobs", { page: String(page), type, status }),
  });
}

export function useAdminBilling() {
  return useQuery({
    queryKey: ["admin", "billing"],
    queryFn: () => fetchAdminData("billing"),
  });
}

export function useAdminContacts(page = 1) {
  return useQuery({
    queryKey: ["admin", "contacts", page],
    queryFn: () => fetchAdminData("contacts", { page: String(page) }),
  });
}
