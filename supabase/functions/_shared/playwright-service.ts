/**
 * ============================================================================
 * REFERENCE: Self-hosted Playwright Rendering Microservice
 * ============================================================================
 *
 * This file is NOT deployed as an edge function. It's a standalone Node.js
 * server you deploy on any VPS, Railway, Fly.io, etc.
 *
 * Setup:
 *   1. Create a new Node.js project
 *   2. npm init -y
 *   3. npm install express playwright cors
 *   4. Copy this file as index.js (change imports to require if needed)
 *   5. npx playwright install chromium
 *   6. Deploy & set PLAYWRIGHT_SERVICE_URL secret to your deployment URL
 *
 * Optional: Set RENDER_SECRET env var for authentication, then pass it as
 * Authorization: Bearer <secret> from the edge function.
 *
 * Endpoint:
 *   POST /render
 *   Body: { url, wait_until, timeout_ms, mobile, headers, cookies, actions, screenshot, remove_selectors }
 *   Response: { html, screenshot_base64?, final_url, status_code }
 * ============================================================================
 */

// ---- Uncomment below to use as a standalone Node.js file ----
/*
import express from "express";
import cors from "cors";
import { chromium, type Page, type BrowserContext } from "playwright";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const PORT = parseInt(process.env.PORT || "3000", 10);
const RENDER_SECRET = process.env.RENDER_SECRET || "";

// Pre-launch a persistent browser for performance
let browserPromise: ReturnType<typeof chromium.launch> | null = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }
  return browserPromise;
}

interface RenderRequest {
  url: string;
  wait_until?: "load" | "domcontentloaded" | "networkidle" | "commit";
  timeout_ms?: number;
  mobile?: boolean;
  headers?: Record<string, string>;
  cookies?: Array<{ name: string; value: string; domain?: string }>;
  actions?: Array<{
    type: "click" | "scroll" | "wait" | "type" | "press" | "screenshot";
    selector?: string;
    value?: string;
    direction?: "up" | "down";
    pixels?: number;
    milliseconds?: number;
    key?: string;
  }>;
  screenshot?: boolean;
  remove_selectors?: string[];
}

async function executeActions(page: Page, actions: RenderRequest["actions"]) {
  if (!actions || actions.length === 0) return;

  for (const action of actions) {
    try {
      switch (action.type) {
        case "click":
          if (action.selector) await page.click(action.selector, { timeout: 5000 });
          break;
        case "scroll":
          const pixels = action.pixels || 500;
          const direction = action.direction === "up" ? -pixels : pixels;
          await page.evaluate((d) => window.scrollBy(0, d), direction);
          break;
        case "wait":
          await page.waitForTimeout(action.milliseconds || 1000);
          break;
        case "type":
          if (action.selector && action.value) {
            await page.fill(action.selector, action.value);
          }
          break;
        case "press":
          if (action.key) await page.keyboard.press(action.key);
          break;
        case "screenshot":
          // Handled separately — no-op in the action loop
          break;
      }
    } catch (err) {
      console.warn(`Action ${action.type} failed:`, err instanceof Error ? err.message : err);
    }
  }
}

app.post("/render", async (req, res) => {
  // Auth check
  if (RENDER_SECRET) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${RENDER_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const body = req.body as RenderRequest;
  if (!body.url) {
    return res.status(400).json({ error: "url is required" });
  }

  let context: BrowserContext | null = null;

  try {
    const browser = await getBrowser();
    const timeoutMs = Math.min(body.timeout_ms || 30000, 60000);

    context = await browser.newContext({
      userAgent: body.mobile
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      viewport: body.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      extraHTTPHeaders: body.headers,
    });

    // Set cookies
    if (body.cookies && body.cookies.length > 0) {
      const parsedUrl = new URL(body.url);
      await context.addCookies(
        body.cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain || parsedUrl.hostname,
          path: "/",
        }))
      );
    }

    const page = await context.newPage();

    const waitUntil = body.wait_until || "networkidle";
    const response = await page.goto(body.url, {
      waitUntil: waitUntil as any,
      timeout: timeoutMs,
    });

    // Execute actions
    await executeActions(page, body.actions);

    // Remove selectors
    if (body.remove_selectors && body.remove_selectors.length > 0) {
      await page.evaluate((selectors) => {
        for (const sel of selectors) {
          document.querySelectorAll(sel).forEach((el) => el.remove());
        }
      }, body.remove_selectors);
    }

    const html = await page.content();
    const finalUrl = page.url();
    const statusCode = response?.status() ?? 0;

    let screenshot_base64: string | undefined;
    if (body.screenshot) {
      const buf = await page.screenshot({ fullPage: true, type: "png" });
      screenshot_base64 = buf.toString("base64");
    }

    res.json({ html, final_url: finalUrl, status_code: statusCode, screenshot_base64 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Render error:", message);
    res.status(500).json({ error: message });
  } finally {
    if (context) await context.close().catch(() => {});
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Playwright render service running on port ${PORT}`);
});
*/

// Type exports used by the edge function pipeline
export interface PlaywrightRenderRequest {
  url: string;
  wait_until?: string;
  timeout_ms?: number;
  mobile?: boolean;
  headers?: Record<string, string>;
  cookies?: Array<{ name: string; value: string; domain?: string }>;
  actions?: Array<{
    type: "click" | "scroll" | "wait" | "type" | "press" | "screenshot";
    selector?: string;
    value?: string;
    direction?: "up" | "down";
    pixels?: number;
    milliseconds?: number;
    key?: string;
  }>;
  screenshot?: boolean;
  remove_selectors?: string[];
}

export interface PlaywrightRenderResponse {
  html: string;
  final_url: string;
  status_code: number;
  screenshot_base64?: string;
}

/**
 * Call the self-hosted Playwright microservice to render a page with JS.
 */
export async function renderWithPlaywright(
  serviceUrl: string,
  req: PlaywrightRenderRequest,
  authSecret?: string
): Promise<PlaywrightRenderResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authSecret) {
    headers["Authorization"] = `Bearer ${authSecret}`;
  }

  const controller = new AbortController();
  const timeout = Math.min((req.timeout_ms ?? 30000) + 10000, 70000); // Give service extra time
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${serviceUrl.replace(/\/$/, "")}/render`, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Playwright service returned ${res.status}: ${body}`);
    }

    return (await res.json()) as PlaywrightRenderResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}
