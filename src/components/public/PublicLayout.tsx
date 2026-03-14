import { useEffect } from "react";
import { PublicNavbar } from "./PublicNavbar";
import { PublicFooter } from "./PublicFooter";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { AlertTriangle } from "lucide-react";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    if (!settings?.seo) return;
    const { title, description, keywords, og_image } = settings.seo;

    if (title) document.title = title;

    const setMeta = (name: string, content: string) => {
      if (!content) return;
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.name = name;
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta("description", description);
    setMeta("keywords", keywords);

    if (og_image) {
      let ogEl = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
      if (!ogEl) {
        ogEl = document.createElement("meta");
        ogEl.setAttribute("property", "og:image");
        document.head.appendChild(ogEl);
      }
      ogEl.content = og_image;
    }
  }, [settings?.seo]);

  // Dynamically set favicon
  useEffect(() => {
    if (!settings?.branding?.favicon_url) return;
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = settings.branding.favicon_url;
  }, [settings?.branding?.favicon_url]);

  const maintenanceEnabled = settings?.maintenance?.enabled;
  const maintenanceMessage = settings?.maintenance?.message;

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      {maintenanceEnabled && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5 text-center text-sm text-destructive flex items-center justify-center gap-2 mt-16">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{maintenanceMessage || "We're currently performing maintenance. Some features may be unavailable."}</span>
        </div>
      )}
      <main className={`flex-1 ${maintenanceEnabled ? "" : "pt-16"}`}>{children}</main>
      <PublicFooter />
    </div>
  );
}
