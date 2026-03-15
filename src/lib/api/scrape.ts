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
    rawHtml?: string;
    metadata?: Record<string, unknown>;
    links?: Array<{ href: string; text: string }>;
    images?: Array<{ src: string; alt: string }>;
    screenshot_url?: string;
    timings: { navigation_ms: number; extraction_ms: number; total_ms: number };
    warnings: string[];
  };
  error?: { code: string; message: string };
  meta?: { job_id: string; credits_used: number; cache_hit?: boolean };
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
    cache_hits?: number;
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

// --- Pipeline ---

export interface PipelineRequest {
  url: string;
  pipeline_id?: string;
  scrape_options?: ScrapeOptions;
  extract?: {
    prompt?: string;
    schema?: Record<string, unknown>;
    model?: string;
  };
  transform?: {
    prompt: string;
    model?: string;
  };
}

export interface PipelineResponse {
  success: boolean;
  data?: {
    url: string;
    stages: {
      scrape: { title: string; markdown: string; cache_hit: boolean };
      extract: { data: unknown; validation: { valid: boolean; warnings: string[] } };
      transform?: { data: unknown };
    };
    final_output: unknown;
  };
  error?: { code: string; message: string };
  meta?: { run_id: string; pipeline_id: string | null; credits_used: number };
}

export async function runPipeline(
  request: PipelineRequest,
  apiKey: string
): Promise<PipelineResponse> {
  const { data, error } = await supabase.functions.invoke<PipelineResponse>("pipeline", {
    body: request,
    headers: { "X-API-Key": apiKey },
  });

  if (error) {
    return { success: false, error: { code: "NETWORK_ERROR", message: error.message } };
  }

  return data as PipelineResponse;
}
