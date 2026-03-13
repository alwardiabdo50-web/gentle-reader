import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PendingInvitationsBanner } from "@/components/PendingInvitationsBanner";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-4 shrink-0">
            <SidebarTrigger className="mr-4" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded border border-border">
                Starter Plan
              </span>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <PendingInvitationsBanner />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
