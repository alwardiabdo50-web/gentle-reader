import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
      {/* Admin sidebar */}
      <aside className="w-60 shrink-0 border-r border-border flex flex-col surface-1">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm text-foreground tracking-tight">Admin Console</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {adminNav.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/admin"}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              activeClassName="bg-accent text-foreground font-medium"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <NavLink
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
