import { DOMParser } from "npm:linkedom@0.16.11";
import { Readability } from "npm:@mozilla/readability@0.6.0";
import TurndownService from "npm:turndown@7.2.0";
import { extractBranding } from "./branding-extract.ts";

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
  markdown?: string;
  metadata?: Record<string, unknown>;
  links?: Array<{ href: string; text: string }>;
  screenshot_url?: string;
  branding?: import("./branding-extract.ts").BrandingResult;
  timings: { navigation_ms: number; extraction_ms: number; total_ms: number };
  warnings: string[];
}

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
  // Domain scoping is ignored in this simple implementation; caller controls which cookies they pass.
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

function toMarkdown(html: string): string {
  const td = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });

  // Remove empty links/images that can bloat output.
  td.addRule("removeEmptyLinks", {
    filter: (node) => node.nodeName === "A" && !(node as any).textContent?.trim(),
    replacement: () => "",
  });

  return td.turndown(html);
}

function ensureReadabilityCompatibleDocument(document: Document, url: string): void {
  const u = new URL(url);

  // Patch the minimal set of fields Readability expects (similar to JSDOM { url }).
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

export async function performScrape(req: ScrapeRequest): Promise<ScrapeResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  const formats = req.formats ?? ["markdown"];

  if (req.render_javascript) {
    warnings.push("JavaScript rendering requested but is not supported in this runtime; returning static HTML.");
  }
  if (req.screenshot) {
    warnings.push("Screenshot requested but is not supported in this runtime.");
  }
  if (req.proxy) {
    warnings.push("Proxy requested but is not supported in this runtime.");
  }
  if (req.actions && req.actions.length > 0) {
    warnings.push("Actions (click, scroll, type, etc.) require JavaScript rendering which is not supported in this runtime. Actions were recorded but not executed.");
  }

  // --- Fetch ---
  const navStart = Date.now();
  const controller = new AbortController();
  const timeoutMs = Math.min(req.timeout_ms ?? 30000, 60000);
  const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);

  const headers = new Headers(req.headers ?? {});
  if (!headers.has("accept")) headers.set("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
  if (!headers.has("user-agent")) headers.set("user-agent", pickUserAgent());

  // Geo-targeting: set Accept-Language from location
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

  // --- Parse & extract ---
  const extractStart = Date.now();
  const doc = new DOMParser().parseFromString(rawHtml, "text/html");
  if (!doc) throw new Error("Failed to parse HTML");

  // Optional: remove selectors
  for (const sel of req.remove_selectors ?? []) {
    try {
      const nodes = doc.querySelectorAll(sel);
      nodes.forEach((n) => n.remove());
    } catch {
      warnings.push(`Invalid remove_selectors selector ignored: ${sel}`);
    }
  }

  const metadata = extractMetadata(doc, finalUrl);

  let mainHtml: string | null = null;
  let title = (metadata.title as string | undefined) ?? finalUrl;

  if (req.only_main_content) {
    try {
      ensureReadabilityCompatibleDocument(doc, finalUrl);
      const article = new Readability(doc as any, {
        // Keep output smaller + cleaner for Markdown
        keepClasses: false,
      }).parse();

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

  // Links are extracted from whichever HTML we’re returning as content.
  const contentDoc = new DOMParser().parseFromString(`<html><body>${htmlForOutput}</body></html>`, "text/html");
  const links = contentDoc ? extractLinks(contentDoc, finalUrl) : [];

  const markdown = toMarkdown(htmlForOutput);

  const extractMs = Date.now() - extractStart;

  const result: ScrapeResult = {
    url: req.url,
    final_url: finalUrl,
    title: title || finalUrl,
    status_code: statusCode,
    timings: {
      navigation_ms: navMs,
      extraction_ms: extractMs,
      total_ms: Date.now() - startTime,
    },
    warnings,
  };

  if (formats.includes("html")) result.html = htmlForOutput;
  if (formats.includes("markdown")) result.markdown = markdown;
  if (formats.includes("metadata")) result.metadata = metadata;
  if (formats.includes("links")) result.links = links;

  return result;
}
