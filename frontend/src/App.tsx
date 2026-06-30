import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StaffRoute } from "@/components/StaffRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import DocumentsPage from "@/pages/DocumentsPage";
import DocumentDetailPage from "@/pages/DocumentDetailPage";
import DepartmentsPage from "@/pages/DepartmentsPage";
import ProjectsPage from "@/pages/ProjectsPage";
import StaffPage from "@/pages/StaffPage";
import PendingDeletesPage from "@/pages/PendingDeletesPage";
import AuditPage from "@/pages/AuditPage";
import NotificationsPage from "@/pages/NotificationsPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="documents/:id" element={<DocumentDetailPage />} />
              <Route path="staff" element={<StaffRoute><StaffPage /></StaffRoute>} />
              <Route path="pending-deletes" element={<PendingDeletesPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
