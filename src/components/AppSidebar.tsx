import {
  Zap, Key, BarChart3, History, CreditCard, Globe, Settings, LogOut,
  BookOpen, ChevronsUpDown, Shield, Webhook, Calendar, GitBranch, Users,
} from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useCredits } from "@/hooks/useCredits";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

const mainItems = [
  { title: "Playground", url: "/", icon: Zap },
  { title: "API Keys", url: "/api-keys", icon: Key },
  { title: "Usage", url: "/usage", icon: BarChart3 },
  { title: "Job History", url: "/jobs", icon: History },
  { title: "Webhooks", url: "/webhooks", icon: Webhook },
  { title: "Schedules", url: "/schedules", icon: Calendar },
  { title: "Pipelines", url: "/pipelines", icon: GitBranch },
  { title: "Docs", url: "/docs", icon: BookOpen },
];

const settingsItems = [
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Team", url: "/settings/team", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdminRole();
  const credits = useCredits();
  const isActive = (path: string) => location.pathname === path;

  const email = user?.email ?? "";
  const initials = email.split("@")[0].slice(0, 2).toUpperCase();

  const barColor = credits.percentUsed > 90
    ? "bg-destructive"
    : credits.percentUsed > 70
      ? "bg-warning"
      : "bg-primary";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={collapsed ? "p-2 space-y-2" : "p-4 space-y-2"}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Globe className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col flex-1">
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Nebula Crawl
              </span>
              <span className="text-[10px] text-muted-foreground">v1.0.0</span>
            </div>
          )}
          {!collapsed && <ThemeToggle />}
        </div>
        {collapsed && (
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        )}
        <OrgSwitcher collapsed={collapsed} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-medium">Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-medium">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={`space-y-3 ${collapsed ? "p-2" : "p-4"}`}>
        {!collapsed && !credits.loading && (
          <div className="rounded-xl border border-border p-3 bg-card">
            <div className="text-[11px] uppercase tracking-[0.07em] text-muted-foreground mb-1">Credits remaining</div>
            <div className="text-lg font-bold text-foreground tracking-tight">{credits.creditsRemaining.toLocaleString()}</div>
            <div className="mt-2 h-1.5 rounded-full bg-accent overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-150 ${barColor}`}
                style={{ width: `${Math.max(0, 100 - credits.percentUsed)}%` }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {credits.creditsUsed.toLocaleString()} / {credits.creditsTotal.toLocaleString()} used
            </div>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-accent transition-colors duration-150 outline-none ${collapsed ? "justify-center" : ""}`}>
              <Avatar className="h-7 w-7 shrink-0 rounded-lg bg-primary/15 text-primary">
                <AvatarFallback className="rounded-lg bg-primary/15 text-primary text-[10px] font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <span className="flex-1 truncate text-xs text-foreground">{email}</span>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-foreground">Account</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <NavLink to="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" /> Account Settings
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink to="/billing" className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" /> Manage Subscriptions
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
