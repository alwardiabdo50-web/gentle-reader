/**
 * Color conversion utilities for HSL string <-> Hex
 * HSL strings are in the format used by CSS variables: "174 72% 50%"
 */

export function hslStringToHex(hslStr: string): string {
  const parts = hslStr.trim().replace(/%/g, "").split(/\s+/);
  if (parts.length < 3) return "#000000";

  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n * 255)))
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToHslString(hex: string): string {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(l * 100)}%`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Check if an HSL string contains alpha (e.g. "0 0% 100% / 0.10") */
export function hasAlpha(hslStr: string): boolean {
  return hslStr.includes("/");
}

/** Parse alpha from an HSL string, returns the base HSL and alpha separately */
export function parseHslAlpha(hslStr: string): { base: string; alpha: string | null } {
  if (!hasAlpha(hslStr)) return { base: hslStr.trim(), alpha: null };
  const [base, alpha] = hslStr.split("/").map((s) => s.trim());
  return { base, alpha };
}

/** Recombine base HSL with optional alpha */
export function combineHslAlpha(base: string, alpha: string | null): string {
  if (!alpha) return base;
  return `${base} / ${alpha}`;
}
