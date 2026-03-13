import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  ArrowLeft,
  Shield,
} from "lucide-react";

const adminNav = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Jobs", url: "/admin/jobs", icon: Briefcase },
  { title: "Billing", url: "/admin/billing", icon: CreditCard },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 border-r border-border flex flex-col bg-sidebar">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm text-foreground tracking-tight">Admin Console</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {adminNav.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/admin"}
              className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] text-sidebar-foreground hover:bg-accent hover:text-foreground transition-colors duration-150"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <NavLink
            to="/"
            className="flex items-center gap-2 px-3 py-[7px] rounded-lg text-[13px] text-sidebar-foreground hover:bg-accent hover:text-foreground transition-colors duration-150"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </NavLink>
        </div>
      </aside>

      <main className="flex-1 overflow-auto px-8 py-10">
        <div className="max-w-[1200px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
