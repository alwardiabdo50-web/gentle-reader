export interface CrawlThrottleConfig {
  globalRps: number;
  domainMinIntervalMs: number;
  domainMaxConcurrent: number;
  jitterMs: number;
}

const DEFAULT_CONFIG: CrawlThrottleConfig = {
  globalRps: 1.5,
  domainMinIntervalMs: 800,
  domainMaxConcurrent: 1,
  jitterMs: 200,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "unknown-domain";
  }
}

function clampNumber(value: number, fallback: number, min: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, value);
}

export class CrawlThrottle {
  private readonly config: CrawlThrottleConfig;
  private readonly globalMinIntervalMs: number;
  private globalNextAllowedAt = 0;
  private readonly domainNextAllowedAt = new Map<string, number>();
  private readonly domainActiveCount = new Map<string, number>();

  constructor(config?: Partial<CrawlThrottleConfig>) {
    const merged = { ...DEFAULT_CONFIG, ...(config ?? {}) };
    this.config = {
      globalRps: clampNumber(merged.globalRps, DEFAULT_CONFIG.globalRps, 0.1),
      domainMinIntervalMs: clampNumber(merged.domainMinIntervalMs, DEFAULT_CONFIG.domainMinIntervalMs, 0),
      domainMaxConcurrent: Math.floor(clampNumber(merged.domainMaxConcurrent, DEFAULT_CONFIG.domainMaxConcurrent, 1)),
      jitterMs: clampNumber(merged.jitterMs, DEFAULT_CONFIG.jitterMs, 0),
    };

    this.globalMinIntervalMs = Math.ceil(1000 / this.config.globalRps);
  }

  getSettings() {
    return {
      globalRps: this.config.globalRps,
      globalMinIntervalMs: this.globalMinIntervalMs,
      domainMinIntervalMs: this.config.domainMinIntervalMs,
      domainMaxConcurrent: this.config.domainMaxConcurrent,
      jitterMs: this.config.jitterMs,
    };
  }

  async schedule<T>(url: string, task: () => Promise<T>): Promise<T> {
    const domain = getDomain(url);

    while (true) {
      const now = Date.now();
      const activeForDomain = this.domainActiveCount.get(domain) ?? 0;

      const waitForDomainConcurrency =
        activeForDomain >= this.config.domainMaxConcurrent ? 50 : 0;
      const waitForGlobalRate = Math.max(0, this.globalNextAllowedAt - now);
      const waitForDomainRate = Math.max(0, (this.domainNextAllowedAt.get(domain) ?? 0) - now);

      const waitMs = Math.max(waitForDomainConcurrency, waitForGlobalRate, waitForDomainRate);
      if (waitMs <= 0) break;

      await sleep(waitMs);
    }

    const startAt = Date.now();
    const jitter = this.config.jitterMs > 0
      ? Math.floor(Math.random() * this.config.jitterMs)
      : 0;

    this.globalNextAllowedAt = Math.max(this.globalNextAllowedAt, startAt) + this.globalMinIntervalMs + jitter;
    this.domainNextAllowedAt.set(
      domain,
      Math.max(this.domainNextAllowedAt.get(domain) ?? 0, startAt) + this.config.domainMinIntervalMs + jitter,
    );
    this.domainActiveCount.set(domain, (this.domainActiveCount.get(domain) ?? 0) + 1);

    try {
      return await task();
    } finally {
      const nextActive = Math.max(0, (this.domainActiveCount.get(domain) ?? 1) - 1);
      if (nextActive === 0) {
        this.domainActiveCount.delete(domain);
      } else {
        this.domainActiveCount.set(domain, nextActive);
      }
    }
  }
}
