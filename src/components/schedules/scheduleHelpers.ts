import { supabase } from "@/integrations/supabase/client";
import { PRESETS } from "./ScheduleFormFields";

export interface ScheduleData {
  id: string;
  name: string;
  description: string | null;
  job_type: string;
  config_json: Record<string, unknown>;
  cron_expression: string;
  timezone: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: string | null;
  run_count: number;
  enable_diff: boolean;
  last_content_hash: string | null;
  last_diff_json: Record<string, unknown> | null;
  created_at: string;
}

export interface RunData {
  id: string;
  schedule_id: string;
  job_id: string | null;
  job_type: string;
  status: string;
  content_changed: boolean;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export async function invokeSchedulesApi(method: string, path = "", body?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schedules-manage`;
  const url = path ? `${baseUrl}/${path}` : baseUrl;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Unknown error");
  return json.data;
}

export const cronLabel = (cron: string) => {
  const preset = PRESETS.find((p) => p.cron === cron);
  return preset ? preset.label : cron;
};

export const presetFromCron = (cron: string): string => {
  const preset = PRESETS.find((p) => p.cron === cron);
  return preset ? preset.value : "custom";
};
