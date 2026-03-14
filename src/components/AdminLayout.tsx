import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  Mail,
  ArrowLeft,
  Shield,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Coins,
  FileText,
  Settings,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const adminNav = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Jobs", url: "/admin/jobs", icon: Briefcase },
  { title: "Contacts", url: "/admin/contacts", icon: Mail },
  { title: "Billing", url: "/admin/billing", icon: CreditCard },
  { title: "Plans", url: "/admin/plans", icon: CreditCard },
  { title: "API Credits", url: "/admin/credit-costs", icon: Coins },
  { title: "Changelog", url: "/admin/changelog", icon: FileText },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

function SidebarNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 justify-center">
          <Shield className={`${collapsed ? "h-6 w-6" : "h-5 w-5"} text-primary shrink-0`} />
          {!collapsed && (
            <span className="font-semibold text-sm text-foreground tracking-tight">Admin Console</span>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {adminNav.map((item) =>
          collapsed ? (
            <Tooltip key={item.url} delayDuration={0}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/admin"}
                  className="flex items-center justify-center p-2.5 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-colors duration-150"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  onClick={onNavigate}
                >
                  <item.icon className="h-6 w-6" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.title}
              </TooltipContent>
            </Tooltip>
          ) : (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/admin"}
              className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] text-sidebar-foreground hover:bg-accent hover:text-foreground transition-colors duration-150"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              onClick={onNavigate}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          )
        )}
      </nav>

      <div className="p-3 border-t border-border">
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to="/app"
                className="flex items-center justify-center p-2.5 rounded-lg text-foreground/70 hover:bg-accent hover:text-foreground transition-colors duration-150"
                onClick={onNavigate}
              >
                <ArrowLeft className="h-6 w-6" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Back to Dashboard
            </TooltipContent>
          </Tooltip>
        ) : (
          <NavLink
            to="/app"
            className="flex items-center gap-2 px-3 py-[7px] rounded-lg text-[13px] text-sidebar-foreground hover:bg-accent hover:text-foreground transition-colors duration-150"
            onClick={onNavigate}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </NavLink>
        )}
      </div>
    </>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex shrink-0 border-r border-border flex-col bg-sidebar transition-[width] duration-200 overflow-hidden whitespace-nowrap ${
          collapsed ? "w-[60px]" : "w-60"
        }`}
      >
        <SidebarNav collapsed={collapsed} />
        <div className="p-2 border-t border-border flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-sidebar-foreground hover:text-foreground"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 flex items-center justify-between border-b border-border px-4 shrink-0 bg-sidebar">
          {/* Mobile menu trigger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0 bg-sidebar">
              <div className="flex flex-col h-full">
                <SidebarNav onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <div className="hidden md:block" />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto px-4 py-6 md:px-8 md:py-10">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
