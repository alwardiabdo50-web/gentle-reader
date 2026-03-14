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

export function useAdminUsers(page = 1, search = "", plan = "all") {
  return useQuery({
    queryKey: ["admin", "users", page, search, plan],
    queryFn: () => fetchAdminData("users", { page: String(page), search, plan }),
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

export function useAdminContacts(page = 1, status = "all") {
  return useQuery({
    queryKey: ["admin", "contacts", page, status],
    queryFn: () => fetchAdminData("contacts", { page: String(page), status }),
  });
}

export async function fetchAdminContactsExport(status = "all") {
  return fetchAdminData("contacts-export", { status });
}

async function postAdminAction(body: Record<string, string>) {
  const session = (await supabase.auth.getSession()).data.session;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/admin-stats`;

  const res = await fetch(url, {
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

export function useAdminPlans() {
  return useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => fetchAdminData("plans"),
  });
}

export function useAdminCreditCosts() {
  return useQuery({
    queryKey: ["admin", "credit-costs"],
    queryFn: () => fetchAdminData("credit-costs"),
  });
}

export function useAdminCreditCostMutations() {
  const queryClient = useQueryClient();

  const updateCost = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      postAdminAction({ action: "credit-cost-update", ...body } as Record<string, string>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "credit-costs"] });
      queryClient.invalidateQueries({ queryKey: ["api-credit-costs"] });
    },
  });

  const createCost = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      postAdminAction({ action: "credit-cost-create", ...body } as Record<string, string>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "credit-costs"] });
      queryClient.invalidateQueries({ queryKey: ["api-credit-costs"] });
    },
  });

  const deleteCost = useMutation({
    mutationFn: (costId: string) =>
      postAdminAction({ action: "credit-cost-delete", costId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "credit-costs"] });
      queryClient.invalidateQueries({ queryKey: ["api-credit-costs"] });
    },
  });

  return { updateCost, createCost, deleteCost };
}

export function useAdminPlanMutations() {
  const queryClient = useQueryClient();

  const updatePlan = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      postAdminAction({ action: "plan-update", ...body } as Record<string, string>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });

  const createPlan = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      postAdminAction({ action: "plan-create", ...body } as Record<string, string>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });

  const deletePlan = useMutation({
    mutationFn: (planId: string) =>
      postAdminAction({ action: "plan-delete", planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });

  return { updatePlan, createPlan, deletePlan };
}

export function useAdminChangelog() {
  return useQuery({
    queryKey: ["admin", "changelog"],
    queryFn: () => fetchAdminData("changelog"),
  });
}

export function useAdminChangelogMutations() {
  const queryClient = useQueryClient();

  const createEntry = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      postAdminAction({ action: "changelog-create", ...body } as Record<string, string>),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "changelog"] }),
  });

  const updateEntry = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      postAdminAction({ action: "changelog-update", ...body } as Record<string, string>),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "changelog"] }),
  });

  const deleteEntry = useMutation({
    mutationFn: (entryId: string) =>
      postAdminAction({ action: "changelog-delete", entryId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "changelog"] }),
  });

  return { createEntry, updateEntry, deleteEntry };
}

export function useAdminContactActions() {
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ contactId, status }: { contactId: string; status: string }) =>
      postAdminAction({ action: "contact-update", contactId, status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "contacts"] }),
  });

  const deleteContact = useMutation({
    mutationFn: (contactId: string) =>
      postAdminAction({ action: "contact-delete", contactId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "contacts"] }),
  });

  return { updateStatus, deleteContact };
}
