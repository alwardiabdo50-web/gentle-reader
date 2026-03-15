import { DOMParser } from "npm:linkedom@0.16.11";
import { Readability } from "npm:@mozilla/readability@0.6.0";
import TurndownService from "npm:turndown@7.2.0";
import { extractBranding } from "./branding-extract.ts";
import { renderWithPlaywright, type PlaywrightRenderRequest } from "./playwright-service.ts";

export interface ScrapeAction {
  type: "click" | "scroll" | "wait" | "type" | "press" | "screenshot";
  selector?: string;
  value?: string;
  direction?: "up" | "down";
  pixels?: number;
  milliseconds?: number;
  key?: string;
}

export interface ScrapeLocation {
  country?: string;
  languages?: string[];
}

export interface ScrapeRequest {
  url: string;
  formats?: string[];
  render_javascript?: boolean;
  only_main_content?: boolean;
  timeout_ms?: number;
  wait_until?: string;
  screenshot?: boolean;
  mobile?: boolean;
  headers?: Record<string, string>;
  cookies?: Array<{ name: string; value: string; domain?: string }>;
  proxy?: string | null;
  remove_selectors?: string[];
  actions?: ScrapeAction[];
  location?: ScrapeLocation;
}

export interface ScrapeResult {
  url: string;
  final_url: string;
  title: string;
  status_code: number;
  html?: string;
  rawHtml?: string;
  markdown?: string;
  metadata?: Record<string, unknown>;
  links?: Array<{ href: string; text: string }>;
  images?: Array<{ src: string; alt: string }>;
  screenshot_url?: string;
  branding?: import("./branding-extract.ts").BrandingResult;
  timings: { navigation_ms: number; extraction_ms: number; total_ms: number };
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
];

function pickUserAgent(): string {
  return DEFAULT_USER_AGENTS[Math.floor(Math.random() * DEFAULT_USER_AGENTS.length)];
}

function buildCookieHeader(cookies?: ScrapeRequest["cookies"]): string | null {
  if (!cookies || cookies.length === 0) return null;
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

function toAbsoluteUrl(href: string, baseUrl: string): string | null {
  const raw = href.trim();
  if (!raw) return null;
  if (raw.startsWith("javascript:") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return null;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractMetadata(document: Document, finalUrl: string): Record<string, unknown> {
  const meta: Record<string, unknown> = {};

  const title = document.querySelector("title")?.textContent?.trim();
  if (title) meta.title = title;

  const description =
    document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ||
    document.querySelector('meta[property="og:description"]')?.getAttribute("content")?.trim();
  if (description) meta.description = description;

  const lang = document.documentElement?.getAttribute("lang")?.trim();
  if (lang) meta.language = lang;

  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim();
  if (canonical) meta.canonical_url = toAbsoluteUrl(canonical, finalUrl) ?? canonical;

  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim();
  if (ogTitle) meta.og_title = ogTitle;

  const ogType = document.querySelector('meta[property="og:type"]')?.getAttribute("content")?.trim();
  if (ogType) meta.og_type = ogType;

  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content")?.trim();
  if (ogImage) meta.og_image = toAbsoluteUrl(ogImage, finalUrl) ?? ogImage;

  return meta;
}

function extractLinks(root: ParentNode, finalUrl: string): Array<{ href: string; text: string }> {
  const anchors = (root as any).querySelectorAll?.("a[href]") as ArrayLike<Element> | undefined;
  if (!anchors) return [];

  const out: Array<{ href: string; text: string }> = [];
  const seen = new Set<string>();

  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const hrefRaw = a.getAttribute("href") ?? "";
    const href = toAbsoluteUrl(hrefRaw, finalUrl);
    if (!href) continue;
    if (seen.has(href)) continue;

    const text = (a.textContent ?? "").trim().slice(0, 200);
    seen.add(href);
    out.push({ href, text });
  }

  return out;
}

function extractImages(root: ParentNode, finalUrl: string): Array<{ src: string; alt: string }> {
  const imgs = (root as any).querySelectorAll?.("img[src]") as ArrayLike<Element> | undefined;
  if (!imgs) return [];

  const out: Array<{ src: string; alt: string }> = [];
  const seen = new Set<string>();

  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i];
    const srcRaw = img.getAttribute("src") ?? "";
    const src = toAbsoluteUrl(srcRaw, finalUrl);
    if (!src) continue;
    if (seen.has(src)) continue;

    const alt = (img.getAttribute("alt") ?? "").trim().slice(0, 200);
    seen.add(src);
    out.push({ src, alt });
  }

  return out;
}

function toMarkdown(html: string): string {
  const td = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });

  td.addRule("removeEmptyLinks", {
    filter: (node) => node.nodeName === "A" && !(node as any).textContent?.trim(),
    replacement: () => "",
  });

  return td.turndown(html);
}

function ensureReadabilityCompatibleDocument(document: Document, url: string): void {
  const u = new URL(url);

  (document as any).URL = url;
  (document as any).baseURI = url;
  (document as any).documentURI = url;
  (document as any).location = {
    href: url,
    origin: u.origin,
    protocol: u.protocol,
    host: u.host,
    hostname: u.hostname,
    port: u.port,
    pathname: u.pathname,
    search: u.search,
    hash: u.hash,
  };
}

// ---------------------------------------------------------------------------
// Screenshot upload helper
// ---------------------------------------------------------------------------

async function uploadScreenshot(base64: string, jobUrl: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return null;

    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const filename = `screenshots/${crypto.randomUUID()}.png`;

    const res = await fetch(`${supabaseUrl}/storage/v1/object/branding/${filename}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "image/png",
        "x-upsert": "true",
      },
      body: bytes,
    });

    if (!res.ok) return null;

    return `${supabaseUrl}/storage/v1/object/public/branding/${filename}`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Static fetch (existing behaviour)
// ---------------------------------------------------------------------------

async function staticFetch(
  req: ScrapeRequest,
  warnings: string[]
): Promise<{ rawHtml: string; finalUrl: string; statusCode: number; navMs: number }> {
  const navStart = Date.now();
  const controller = new AbortController();
  const timeoutMs = Math.min(req.timeout_ms ?? 30000, 60000);
  const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);

  const headers = new Headers(req.headers ?? {});
  if (!headers.has("accept")) headers.set("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
  if (!headers.has("user-agent")) headers.set("user-agent", pickUserAgent());

  if (req.location?.languages && req.location.languages.length > 0 && !headers.has("accept-language")) {
    headers.set("accept-language", req.location.languages.join(", "));
  } else if (req.location?.country && !headers.has("accept-language")) {
    headers.set("accept-language", `${req.location.country}`);
  }

  const cookieHeader = buildCookieHeader(req.cookies);
  if (cookieHeader && !headers.has("cookie")) headers.set("cookie", cookieHeader);

  let res: Response;
  try {
    res = await fetch(req.url, {
      method: "GET",
      redirect: "follow",
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (String(err).includes("timeout") || String(err).includes("AbortError")) {
      throw new Error("timeout");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const navMs = Date.now() - navStart;
  const finalUrl = res.url || req.url;
  const statusCode = res.status;

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    warnings.push(`Non-HTML content-type: ${contentType || "unknown"}`);
  }

  const rawHtml = await res.text();
  return { rawHtml, finalUrl, statusCode, navMs };
}

// ---------------------------------------------------------------------------
// Playwright-powered fetch
// ---------------------------------------------------------------------------

async function playwrightFetch(
  req: ScrapeRequest,
  serviceUrl: string,
  warnings: string[]
): Promise<{ rawHtml: string; finalUrl: string; statusCode: number; navMs: number; screenshotBase64?: string }> {
  const navStart = Date.now();

  const renderReq: PlaywrightRenderRequest = {
    url: req.url,
    wait_until: req.wait_until || "networkidle",
    timeout_ms: req.timeout_ms ?? 30000,
    mobile: req.mobile,
    headers: req.headers,
    cookies: req.cookies,
    actions: req.actions,
    screenshot: req.screenshot,
    remove_selectors: req.remove_selectors,
  };

  const authSecret = Deno.env.get("PLAYWRIGHT_SERVICE_SECRET");
  const rendered = await renderWithPlaywright(serviceUrl, renderReq, authSecret);

  const navMs = Date.now() - navStart;

  return {
    rawHtml: rendered.html,
    finalUrl: rendered.final_url,
    statusCode: rendered.status_code,
    navMs,
    screenshotBase64: rendered.screenshot_base64,
  };
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

export async function performScrape(req: ScrapeRequest): Promise<ScrapeResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const formats = req.formats ?? ["markdown"];

  const playwrightServiceUrl = Deno.env.get("PLAYWRIGHT_SERVICE_URL");
  const usePlaywright = req.render_javascript === true && !!playwrightServiceUrl;

  // Warnings for unsupported features when Playwright is NOT available
  if (req.render_javascript && !playwrightServiceUrl) {
    warnings.push("JavaScript rendering requested but PLAYWRIGHT_SERVICE_URL is not configured; returning static HTML.");
  }
  if (req.screenshot && !usePlaywright) {
    warnings.push("Screenshot requested but requires JavaScript rendering with a configured Playwright service.");
  }
  if (req.proxy) {
    warnings.push("Proxy requested but is not supported in this runtime.");
  }
  if (req.actions && req.actions.length > 0 && !usePlaywright) {
    warnings.push("Actions require JavaScript rendering with a configured Playwright service. Actions were not executed.");
  }

  // --- Fetch (static or Playwright) ---
  let rawHtml: string;
  let finalUrl: string;
  let statusCode: number;
  let navMs: number;
  let screenshotBase64: string | undefined;

  if (usePlaywright) {
    const result = await playwrightFetch(req, playwrightServiceUrl!, warnings);
    rawHtml = result.rawHtml;
    finalUrl = result.finalUrl;
    statusCode = result.statusCode;
    navMs = result.navMs;
    screenshotBase64 = result.screenshotBase64;
  } else {
    const result = await staticFetch(req, warnings);
    rawHtml = result.rawHtml;
    finalUrl = result.finalUrl;
    statusCode = result.statusCode;
    navMs = result.navMs;
  }

  // --- Parse & extract ---
  const extractStart = Date.now();
  const doc = new DOMParser().parseFromString(rawHtml, "text/html");
  if (!doc) throw new Error("Failed to parse HTML");

  // Remove selectors (for static path; Playwright already did this)
  if (!usePlaywright) {
    for (const sel of req.remove_selectors ?? []) {
      try {
        const nodes = doc.querySelectorAll(sel);
        nodes.forEach((n: any) => n.remove());
      } catch {
        warnings.push(`Invalid remove_selectors selector ignored: ${sel}`);
      }
    }
  }

  const metadata = extractMetadata(doc, finalUrl);

  let mainHtml: string | null = null;
  let title = (metadata.title as string | undefined) ?? finalUrl;

  if (req.only_main_content) {
    try {
      ensureReadabilityCompatibleDocument(doc, finalUrl);
      const article = new Readability(doc as any, { keepClasses: false }).parse();

      if (article?.content) {
        mainHtml = article.content;
        if (article.title) title = article.title;
      } else {
        warnings.push("Readability could not extract main content; falling back to full document body.");
      }
    } catch (err) {
      warnings.push(`Readability failed; falling back to full document body. (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  const htmlForOutput = mainHtml ?? doc.body?.innerHTML ?? rawHtml;

  // Extract links & images from the content HTML
  const contentDoc = new DOMParser().parseFromString(`<html><body>${htmlForOutput}</body></html>`, "text/html");
  const links = contentDoc ? extractLinks(contentDoc, finalUrl) : [];
  const images = contentDoc ? extractImages(contentDoc, finalUrl) : [];

  const markdown = toMarkdown(htmlForOutput);

  const extractMs = Date.now() - extractStart;

  // --- Upload screenshot if available ---
  let screenshotUrl: string | undefined;
  if (screenshotBase64) {
    const uploaded = await uploadScreenshot(screenshotBase64, req.url);
    if (uploaded) {
      screenshotUrl = uploaded;
    } else {
      warnings.push("Screenshot was captured but failed to upload to storage.");
    }
  }

  // --- Build result ---
  const result: ScrapeResult = {
    url: req.url,
    final_url: finalUrl,
    title: title || finalUrl,
    status_code: statusCode,
    screenshot_url: screenshotUrl,
    timings: {
      navigation_ms: navMs,
      extraction_ms: extractMs,
      total_ms: Date.now() - startTime,
    },
    warnings,
  };

  if (formats.includes("html")) result.html = htmlForOutput;
  if (formats.includes("rawHtml")) result.rawHtml = rawHtml;
  if (formats.includes("markdown")) result.markdown = markdown;
  if (formats.includes("metadata")) result.metadata = metadata;
  if (formats.includes("links")) result.links = links;
  if (formats.includes("images")) result.images = images;
  if (formats.includes("branding")) {
    const fullDoc = new DOMParser().parseFromString(rawHtml, "text/html");
    if (fullDoc) {
      result.branding = extractBranding(fullDoc, finalUrl);
    }
  }

  return result;
}
