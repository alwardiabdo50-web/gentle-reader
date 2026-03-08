/**
 * Shared crawl utilities: URL normalization, domain checks, pattern matching, frontier logic.
 */

/** Normalize a URL for deduplication: lowercase scheme+host, strip fragment, sort params, strip trailing slash */
export function normalizeUrl(raw: string): string | null {
  let u = raw.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (!parsed.hostname || parsed.hostname.length < 3) return null;
    // Remove fragment
    parsed.hash = "";
    // Sort search params
    parsed.searchParams.sort();
    // Normalize to string, strip trailing slash on path-only
    let result = parsed.toString();
    if (parsed.pathname === "/" && !parsed.search) {
      result = result.replace(/\/$/, "");
    }
    return result;
  } catch {
    return null;
  }
}

/** Extract domain from URL */
export function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Check if a URL is on the same domain (or subdomain if allowed) */
export function isSameDomain(
  candidateUrl: string,
  rootUrl: string,
  includeSubdomains: boolean
): boolean {
  const candidateDomain = getDomain(candidateUrl);
  const rootDomain = getDomain(rootUrl);
  if (!candidateDomain || !rootDomain) return false;

  if (candidateDomain === rootDomain) return true;

  if (includeSubdomains) {
    return candidateDomain.endsWith(`.${rootDomain}`);
  }

  return false;
}

/** Check URL against include patterns (if any provided, URL must match at least one) */
export function matchesIncludePatterns(url: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) return true;
  return patterns.some((p) => url.includes(p));
}

/** Check URL against exclude patterns (if any match, URL is excluded) */
export function matchesExcludePatterns(url: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some((p) => url.includes(p));
}

/** Known destructive or useless URL patterns to skip */
const BLOCKED_PATTERNS = [
  "/logout", "/signout", "/sign-out", "/log-out",
  "/delete", "/remove", "/unsubscribe",
  "javascript:", "mailto:", "tel:", "data:",
  ".pdf", ".zip", ".tar", ".gz", ".exe", ".dmg",
  ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp",
  ".mp3", ".mp4", ".avi", ".mov",
];

/** Check if URL should be blocked */
export function isBlockedUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return BLOCKED_PATTERNS.some((p) => lower.includes(p));
}

/** Extract links from mock/real HTML content, returning absolute URLs */
export function extractLinks(html: string, baseUrl: string): string[] {
  const linkRegex = /href=["']([^"']+)["']/gi;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;

    try {
      const absolute = new URL(href, baseUrl).toString();
      if (absolute.startsWith("http")) links.push(absolute);
    } catch {
      // skip invalid
    }
  }

  return [...new Set(links)];
}

export interface CrawlConfig {
  rootUrl: string;
  normalizedRootUrl: string;
  maxPages: number;
  maxDepth: number;
  sameDomainOnly: boolean;
  includeSubdomains: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  renderJavascript: boolean;
  onlyMainContent: boolean;
  timeoutMs: number;
}

/** Determine if a discovered URL is crawlable given the config */
export function isCrawlable(url: string, config: CrawlConfig): boolean {
  const normalized = normalizeUrl(url);
  if (!normalized) return false;
  if (isBlockedUrl(normalized)) return false;
  if (config.sameDomainOnly && !isSameDomain(normalized, config.normalizedRootUrl, config.includeSubdomains)) return false;
  if (!matchesIncludePatterns(normalized, config.includePatterns)) return false;
  if (matchesExcludePatterns(normalized, config.excludePatterns)) return false;
  return true;
}
