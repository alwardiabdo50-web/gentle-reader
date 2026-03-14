/**
 * Extract branding information (colors, fonts, logos) from a parsed HTML document.
 */

export interface BrandingResult {
  colors: {
    theme_color: string | null;
    css_variables: Record<string, string>;
    dominant: string[];
  };
  fonts: {
    families: string[];
    stylesheets: string[];
  };
  logos: {
    favicon: string | null;
    apple_touch_icon: string | null;
    og_image: string | null;
    detected: string[];
  };
  typography: {
    h1: { font_size?: string; font_weight?: string; font_family?: string } | null;
    body: { font_size?: string; font_weight?: string; font_family?: string } | null;
  };
}

function toAbsoluteUrl(href: string, baseUrl: string): string | null {
  if (!href?.trim()) return null;
  try {
    return new URL(href.trim(), baseUrl).toString();
  } catch {
    return null;
  }
}

export function extractBranding(doc: any, finalUrl: string): BrandingResult {
  const result: BrandingResult = {
    colors: { theme_color: null, css_variables: {}, dominant: [] },
    fonts: { families: [], stylesheets: [] },
    logos: { favicon: null, apple_touch_icon: null, og_image: null, detected: [] },
    typography: { h1: null, body: null },
  };

  // --- Colors ---
  // Theme color from meta tag
  const themeColor = doc.querySelector?.('meta[name="theme-color"]')?.getAttribute?.("content")?.trim();
  if (themeColor) result.colors.theme_color = themeColor;

  // CSS custom properties from inline styles
  const styleEls = doc.querySelectorAll?.("style") ?? [];
  const cssVars: Record<string, string> = {};
  const colorRegex = /--([a-zA-Z0-9_-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)/g;
  const fontRegex = /font-family\s*:\s*([^;}"]+)/gi;
  const detectedFonts = new Set<string>();

  for (let i = 0; i < styleEls.length; i++) {
    const cssText = styleEls[i]?.textContent ?? "";

    // Extract CSS variables that look like colors
    let match;
    while ((match = colorRegex.exec(cssText)) !== null) {
      cssVars[`--${match[1]}`] = match[2];
    }

    // Extract font families
    while ((match = fontRegex.exec(cssText)) !== null) {
      const families = match[1].split(",").map((f: string) => f.trim().replace(/^["']|["']$/g, ""));
      families.forEach((f: string) => {
        if (f && !["inherit", "initial", "unset", "revert"].includes(f.toLowerCase())) {
          detectedFonts.add(f);
        }
      });
    }
  }

  result.colors.css_variables = cssVars;

  // Extract dominant colors from CSS vars
  const colorValues = Object.values(cssVars).filter(v =>
    v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl")
  );
  result.colors.dominant = [...new Set(colorValues)].slice(0, 10);

  // --- Fonts ---
  // Google Fonts / external font stylesheets
  const linkEls = doc.querySelectorAll?.('link[rel="stylesheet"]') ?? [];
  for (let i = 0; i < linkEls.length; i++) {
    const href = linkEls[i]?.getAttribute?.("href") ?? "";
    if (href.includes("fonts.googleapis.com") || href.includes("fonts.gstatic.com") || href.includes("use.typekit.net")) {
      result.fonts.stylesheets.push(href);

      // Extract font family names from Google Fonts URL
      const familyMatch = href.match(/family=([^&]+)/);
      if (familyMatch) {
        const families = decodeURIComponent(familyMatch[1]).split("|");
        families.forEach((f: string) => {
          const name = f.split(":")[0].replace(/\+/g, " ");
          if (name) detectedFonts.add(name);
        });
      }
    }
  }

  result.fonts.families = [...detectedFonts].slice(0, 20);

  // --- Logos ---
  // Favicon
  const faviconEl = doc.querySelector?.('link[rel="icon"]') ?? doc.querySelector?.('link[rel="shortcut icon"]');
  if (faviconEl) {
    result.logos.favicon = toAbsoluteUrl(faviconEl.getAttribute?.("href") ?? "", finalUrl);
  }

  // Apple touch icon
  const appleIcon = doc.querySelector?.('link[rel="apple-touch-icon"]');
  if (appleIcon) {
    result.logos.apple_touch_icon = toAbsoluteUrl(appleIcon.getAttribute?.("href") ?? "", finalUrl);
  }

  // OG image
  const ogImage = doc.querySelector?.('meta[property="og:image"]')?.getAttribute?.("content")?.trim();
  if (ogImage) {
    result.logos.og_image = toAbsoluteUrl(ogImage, finalUrl);
  }

  // Common logo selectors
  const logoSelectors = [
    'img[class*="logo"]', 'img[id*="logo"]', 'img[alt*="logo"]',
    'a[class*="logo"] img', 'header img', '.navbar-brand img',
    '[class*="brand"] img', 'svg[class*="logo"]',
  ];

  for (const sel of logoSelectors) {
    try {
      const el = doc.querySelector?.(sel);
      if (el) {
        const src = el.getAttribute?.("src") ?? el.getAttribute?.("href");
        if (src) {
          const abs = toAbsoluteUrl(src, finalUrl);
          if (abs && !result.logos.detected.includes(abs)) {
            result.logos.detected.push(abs);
          }
        }
      }
    } catch { /* selector may not be valid in linkedom */ }
  }

  result.logos.detected = result.logos.detected.slice(0, 5);

  // --- Typography ---
  // Try to get h1 and body styles from inline style attributes
  const h1El = doc.querySelector?.("h1");
  if (h1El) {
    const style = h1El.getAttribute?.("style") ?? "";
    result.typography.h1 = {
      font_size: extractStyleProp(style, "font-size") ?? undefined,
      font_weight: extractStyleProp(style, "font-weight") ?? undefined,
      font_family: extractStyleProp(style, "font-family") ?? undefined,
    };
  }

  const bodyEl = doc.querySelector?.("body");
  if (bodyEl) {
    const style = bodyEl.getAttribute?.("style") ?? "";
    result.typography.body = {
      font_size: extractStyleProp(style, "font-size") ?? undefined,
      font_weight: extractStyleProp(style, "font-weight") ?? undefined,
      font_family: extractStyleProp(style, "font-family") ?? undefined,
    };
  }

  return result;
}

function extractStyleProp(style: string, prop: string): string | null {
  const regex = new RegExp(`${prop}\\s*:\\s*([^;]+)`, "i");
  const match = style.match(regex);
  return match ? match[1].trim() : null;
}
