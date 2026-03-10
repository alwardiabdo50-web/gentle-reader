import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AdminLayout } from "@/components/AdminLayout";
import PlaygroundPage from "@/pages/PlaygroundPage";
import ApiKeysPage from "@/pages/ApiKeysPage";
import UsagePage from "@/pages/UsagePage";
import JobsPage from "@/pages/JobsPage";
import BillingPage from "@/pages/BillingPage";
import SettingsPage from "@/pages/SettingsPage";
import DocsPage from "@/pages/DocsPage";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/NotFound";
import AdminOverviewPage from "@/pages/admin/AdminOverviewPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminUserDetailPage from "@/pages/admin/AdminUserDetailPage";
import AdminJobsPage from "@/pages/admin/AdminJobsPage";
import AdminBillingPage from "@/pages/admin/AdminBillingPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
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
                      <Route path="/billing" element={<AdminBillingPage />} />
                    </Routes>
                  </AdminLayout>
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Routes>
                      <Route path="/" element={<PlaygroundPage />} />
                      <Route path="/api-keys" element={<ApiKeysPage />} />
                      <Route path="/usage" element={<UsagePage />} />
                      <Route path="/jobs" element={<JobsPage />} />
                      <Route path="/billing" element={<BillingPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
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
);

export default App;
