import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ThemePalette {
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface SiteSettings {
  seo: { title: string; description: string; keywords: string; og_image: string };
  socials: { twitter: string; github: string; linkedin: string; discord: string; youtube: string };
  branding: { favicon_url: string; logo_url: string; hero_image_url: string };
  maintenance: { enabled: boolean; message: string };
  theme: ThemePalette | null;
}

const defaults: SiteSettings = {
  seo: { title: "", description: "", keywords: "", og_image: "" },
  socials: { twitter: "", github: "", linkedin: "", discord: "", youtube: "" },
  branding: { favicon_url: "", logo_url: "", hero_image_url: "" },
  maintenance: { enabled: false, message: "" },
  theme: null,
};

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SiteSettings> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value");
      if (error) throw error;
      const result = { ...defaults };
      data?.forEach((row: { key: string; value: unknown }) => {
        if (row.key in result) {
          let val = row.value;
          if (typeof val === "string") {
            try { val = JSON.parse(val); } catch { /* keep as-is */ }
          }
          (result as Record<string, unknown>)[row.key] = val;
        }
      });
      return result;
    },
    staleTime: 60_000,
  });
}
