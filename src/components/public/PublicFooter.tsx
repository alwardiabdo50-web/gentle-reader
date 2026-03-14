import { Link } from "react-router-dom";
import { Globe } from "lucide-react";

const footerSections = [
{
  title: "Product",
  links: [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "API Reference", href: "/docs" }]

},
{
  title: "Resources",
  links: [
  { label: "Documentation", href: "/docs" },
  { label: "Quick Start", href: "/docs" },
  { label: "Status", href: "#" },
  { label: "Changelog", href: "#" }]

},
{
  title: "Legal",
  links: [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Contact", href: "/contact" }]

}];


export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Globe className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Nebula Crawl</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The web scraping API built for developers. Fast, reliable, and scalable.
            </p>
          </div>

          {footerSections.map((section) =>
          <div key={section.title}>
              <h4 className="text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground mb-4">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) =>
              <li key={link.label}>
                    {link.href.startsWith("/") ?
                <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">{link.label}</Link> :

                <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">{link.label}</a>
                }
                  </li>
              )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Nebula Crawl. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150">GitHub</a>
            <a href="https://twitter.com" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150">Twitter</a>
          </div>
        </div>
      </div>
    </footer>);

}