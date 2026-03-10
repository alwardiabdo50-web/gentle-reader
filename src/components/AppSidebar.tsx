import { useEffect, useState } from "react";
import {
  Zap,
  Key,
  BarChart3,
  History,
  CreditCard,
  Globe,
  Settings,
  LogOut,
  BookOpen,
  ChevronsUpDown,
  User,
  Shield,
} from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Playground", url: "/", icon: Zap },
  { title: "API Keys", url: "/api-keys", icon: Key },
  { title: "Usage", url: "/usage", icon: BarChart3 },
  { title: "Job History", url: "/jobs", icon: History },
  { title: "Docs", url: "/docs", icon: BookOpen },
];

const settingsItems = [
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface Profile {
  plan: string;
  monthly_credits: number;
  extra_credits: number;
  credits_used: number;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user } = useAuth();
  const isActive = (path: string) => location.pathname === path;

  const email = user?.email ?? "";
  const initials = email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, monthly_credits, extra_credits, credits_used")
        .single();
      if (data) setProfile(data as Profile);
    };
    fetchProfile();

    // Realtime subscription for credits updates
    const channel = supabase
      .channel("sidebar-credits")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          setProfile((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              credits_used: (updated.credits_used as number) ?? prev.credits_used,
              monthly_credits: (updated.monthly_credits as number) ?? prev.monthly_credits,
              extra_credits: (updated.extra_credits as number) ?? prev.extra_credits,
              plan: (updated.plan as string) ?? prev.plan,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalCredits = profile ? profile.monthly_credits + profile.extra_credits : 0;
  const remaining = profile ? totalCredits - profile.credits_used : 0;
  const usedPct = totalCredits > 0 ? ((profile?.credits_used ?? 0) / totalCredits) * 100 : 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Globe className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground tracking-tight">
                Nebula Crawl
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">v1.0.0</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
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
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={`space-y-3 ${collapsed ? "p-2" : "p-4"}`}>
        {!collapsed && profile && (
          <div className="rounded-lg border border-border p-3 surface-2">
            <div className="text-xs text-muted-foreground mb-1">Credits remaining</div>
            <div className="text-lg font-bold text-foreground">{remaining.toLocaleString()}</div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.max(0, 100 - usedPct)}%` }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {profile.credits_used.toLocaleString()} / {totalCredits.toLocaleString()} used
            </div>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-sidebar-accent transition-colors outline-none ${collapsed ? "justify-center" : ""}`}>
              <Avatar className="h-7 w-7 shrink-0 rounded-md bg-primary/15 text-primary">
                <AvatarFallback className="rounded-md bg-primary/15 text-primary text-[10px] font-semibold">
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
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink to="/billing" className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                Manage Subscriptions
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
