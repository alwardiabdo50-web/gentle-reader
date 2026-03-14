import { useEffect } from "react";
import { useSiteSettings } from "./useSiteSettings";

/**
 * Reads theme palette from site_settings and injects CSS variable overrides
 * into a <style> tag. Falls back to index.css defaults when no DB values exist.
 */
export function useThemeColors() {
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    const theme = settings?.theme;
    if (!theme) return;

    const styleId = "dynamic-theme-vars";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const buildVars = (palette: Record<string, string>) =>
      Object.entries(palette)
        .map(([key, value]) => `  --${key}: ${value};`)
        .join("\n");

    const lightVars = theme.light ? buildVars(theme.light) : "";
    const darkVars = theme.dark ? buildVars(theme.dark) : "";

    const css = [
      lightVars ? `:root {\n${lightVars}\n}` : "",
      darkVars ? `.dark {\n${darkVars}\n}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    styleEl.textContent = css;

    return () => {
      // Cleanup on unmount
      if (styleEl && styleEl.parentNode) {
        styleEl.textContent = "";
      }
    };
  }, [settings?.theme]);
}
