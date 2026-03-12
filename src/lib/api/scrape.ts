import { supabase } from "@/integrations/supabase/client";

export interface ScrapeOptions {
  formats?: string[];
  render_javascript?: boolean;
  only_main_content?: boolean;
  timeout_ms?: number;
  wait_until?: string;
  screenshot?: boolean;
  mobile?: boolean;
  headers?: Record<string, string>;
  remove_selectors?: string[];
  cache_ttl?: number;
}

export interface ScrapeResponse {
  success: boolean;
  data?: {
    url: string;
    final_url: string;
    title: string;
    status_code: number;
    markdown?: string;
    html?: string;
    metadata?: Record<string, unknown>;
    links?: Array<{ href: string; text: string }>;
    screenshot_url?: string;
    timings: { navigation_ms: number; extraction_ms: number; total_ms: number };
    warnings: string[];
  };
  error?: { code: string; message: string };
  meta?: { job_id: string; credits_used: number };
}

/**
 * Call the /v1/scrape endpoint using an API key.
 */
export async function scrapeUrl(
  url: string,
  apiKey: string,
  options?: ScrapeOptions
): Promise<ScrapeResponse> {
  const { data, error } = await supabase.functions.invoke<ScrapeResponse>("scrape", {
    body: { url, ...options },
    headers: { "X-API-Key": apiKey },
  });

  if (error) {
    return { success: false, error: { code: "NETWORK_ERROR", message: error.message } };
  }

  return data as ScrapeResponse;
}

// --- Batch Scrape ---

export interface BatchScrapeOptions extends ScrapeOptions {}

export interface BatchScrapeResultItem {
  url: string;
  final_url: string;
  title: string;
  status_code: number;
  markdown?: string;
  html?: string;
  metadata?: Record<string, unknown>;
  links?: Array<{ href: string; text: string }>;
  timings: { navigation_ms: number; extraction_ms: number; total_ms: number };
  warnings: string[];
}

export interface BatchScrapeErrorItem {
  url: string;
  code: string;
  message: string;
}

export interface BatchScrapeResponse {
  success: boolean;
  data: (BatchScrapeResultItem | null)[];
  errors: (BatchScrapeErrorItem | null)[];
  meta?: {
    job_id: string;
    total: number;
    completed: number;
    failed: number;
    credits_used: number;
  };
  error?: { code: string; message: string };
}

/**
 * Call the /v1/batch-scrape endpoint using an API key.
 * Accepts up to 100 URLs and processes them in parallel.
 */
export async function batchScrapeUrls(
  urls: string[],
  apiKey: string,
  options?: BatchScrapeOptions
): Promise<BatchScrapeResponse> {
  const { data, error } = await supabase.functions.invoke<BatchScrapeResponse>("batch-scrape", {
    body: { urls, ...options },
    headers: { "X-API-Key": apiKey },
  });

  if (error) {
    return { success: false, data: [], errors: [], error: { code: "NETWORK_ERROR", message: error.message } };
  }

  return data as BatchScrapeResponse;
}
