import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AdminLayout } from "@/components/AdminLayout";
import { PublicLayout } from "@/components/public/PublicLayout";
import PlaygroundPage from "@/pages/PlaygroundPage";
import OverviewPage from "@/pages/OverviewPage";
import ApiKeysPage from "@/pages/ApiKeysPage";
import UsagePage from "@/pages/UsagePage";
import JobsPage from "@/pages/JobsPage";
import BillingPage from "@/pages/BillingPage";
import SettingsPage from "@/pages/SettingsPage";
import DocsPage from "@/pages/DocsPage";
import WebhooksPage from "@/pages/WebhooksPage";
import SchedulesPage from "@/pages/SchedulesPage";
import PipelinesPage from "@/pages/PipelinesPage";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/NotFound";
import HomePage from "@/pages/public/HomePage";
import PricingPage from "@/pages/public/PricingPage";
import StatusPage from "@/pages/public/StatusPage";
import TeamPage from "@/pages/TeamPage";
import AdminOverviewPage from "@/pages/admin/AdminOverviewPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminUserDetailPage from "@/pages/admin/AdminUserDetailPage";
import AdminJobsPage from "@/pages/admin/AdminJobsPage";
import AdminBillingPage from "@/pages/admin/AdminBillingPage";
import AdminContactsPage from "@/pages/admin/AdminContactsPage";
import AdminPlansPage from "@/pages/admin/AdminPlansPage";
import AdminCreditCostsPage from "@/pages/admin/AdminCreditCostsPage";
import PublicDocsPage from "@/pages/public/PublicDocsPage";
import ContactPage from "@/pages/public/ContactPage";
import ChangelogPage from "@/pages/public/ChangelogPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
            <Route path="/pricing" element={<PublicLayout><PricingPage /></PublicLayout>} />
            <Route path="/status" element={<PublicLayout><StatusPage /></PublicLayout>} />
            <Route path="/docs" element={<PublicLayout><PublicDocsPage /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
            <Route path="/changelog" element={<PublicLayout><ChangelogPage /></PublicLayout>} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Admin */}
            <Route
              path="/admin/*"
              element={
                <AdminProtectedRoute>
                  <AdminLayout>
                    <Routes>
                      <Route path="/" element={<AdminOverviewPage />} />
                      <Route path="/users" element={<AdminUsersPage />} />
                      <Route path="/users/:userId" element={<AdminUserDetailPage />} />
                      <Route path="/jobs" element={<AdminJobsPage />} />
                      <Route path="/contacts" element={<AdminContactsPage />} />
                      <Route path="/billing" element={<AdminBillingPage />} />
                      <Route path="/plans" element={<AdminPlansPage />} />
                      <Route path="/credit-costs" element={<AdminCreditCostsPage />} />
                    </Routes>
                  </AdminLayout>
                </AdminProtectedRoute>
              }
            />

            {/* Authenticated dashboard */}
            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Routes>
                      <Route path="/" element={<OverviewPage />} />
                      <Route path="/playground" element={<PlaygroundPage />} />
                      <Route path="/api-keys" element={<ApiKeysPage />} />
                      <Route path="/usage" element={<UsagePage />} />
                      <Route path="/jobs" element={<JobsPage />} />
                      <Route path="/billing" element={<BillingPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/settings/team" element={<TeamPage />} />
                      <Route path="/webhooks" element={<WebhooksPage />} />
                      <Route path="/schedules" element={<SchedulesPage />} />
                      <Route path="/pipelines" element={<PipelinesPage />} />
                      <Route path="/docs" element={<DocsPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
