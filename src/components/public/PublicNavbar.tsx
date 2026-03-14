import { Link } from "react-router-dom";
import { Globe, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Status", href: "/status" },
  { label: "Changelog", href: "/changelog" },
  { label: "Contact", href: "/contact" },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Globe className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            Nebula Crawl
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors duration-150">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {session ? (
            <Button size="sm" asChild>
              <Link to="/app">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth">Get Started Free</Link>
              </Button>
            </>
          )}
        </div>

        <button className="md:hidden text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="block text-[13px] text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
              {link.label}
            </a>
          ))}
          <div className="flex gap-3 pt-2">
            {session ? (
              <Button size="sm" asChild><Link to="/app" onClick={() => setMobileOpen(false)}>Dashboard</Link></Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild><Link to="/auth" onClick={() => setMobileOpen(false)}>Log in</Link></Button>
                <Button size="sm" asChild><Link to="/auth" onClick={() => setMobileOpen(false)}>Get Started</Link></Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
