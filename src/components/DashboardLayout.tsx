import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PendingInvitationsBanner } from "@/components/PendingInvitationsBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAdminRole();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border px-4 shrink-0 bg-sidebar">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-sidebar-foreground hover:bg-accent hover:text-foreground transition-colors duration-150"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Admin</span>
                </NavLink>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto px-4 py-6 md:px-8 md:py-10">
            <div className="max-w-[1200px] mx-auto">
              <PendingInvitationsBanner />
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
