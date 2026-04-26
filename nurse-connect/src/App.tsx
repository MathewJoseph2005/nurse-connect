import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import WelcomePage from "./pages/WelcomePage";
import UnifiedLogin from "./pages/UnifiedLogin";
import BootstrapAdmin from "./pages/BootstrapAdmin";
import NurseDashboard from "./pages/NurseDashboard";
import NurseProfile from "./pages/NurseProfile";
import EditNurseProfile from "./pages/EditNurseProfile";
import HeadNurseDashboard from "./pages/HeadNurseDashboard";
import HeadNurseProfile from "./pages/HeadNurseProfile";
import EditHeadNurseProfile from "./pages/EditHeadNurseProfile";
import AssignNurseDepartment from "./pages/AssignNurseDepartment";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProfile from "./pages/AdminProfile";
import EditAdminProfile from "./pages/EditAdminProfile";
import AssignHeadNurseDepartment from "./pages/AssignHeadNurseDepartment";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<UnifiedLogin />} />
            <Route path="/admin-bootstrap" element={<BootstrapAdmin />} />
            <Route path="/nurse-dashboard" element={
              <ProtectedRoute allowedRoles={["nurse"]}>
                <NurseDashboard />
              </ProtectedRoute>
            } />
            <Route path="/nurse-profile" element={
              <ProtectedRoute allowedRoles={["nurse"]}>
                <NurseProfile />
              </ProtectedRoute>
            } />
            <Route path="/nurse-profile/edit" element={
              <ProtectedRoute allowedRoles={["nurse"]}>
                <EditNurseProfile />
              </ProtectedRoute>
            } />
            <Route path="/headnurse-dashboard" element={
              <ProtectedRoute allowedRoles={["head_nurse"]}>
                <HeadNurseDashboard />
              </ProtectedRoute>
            } />
            <Route path="/head-nurse-profile" element={
              <ProtectedRoute allowedRoles={["head_nurse"]}>
                <HeadNurseProfile />
              </ProtectedRoute>
            } />
            <Route path="/head-nurse-profile/edit" element={
              <ProtectedRoute allowedRoles={["head_nurse"]}>
                <EditHeadNurseProfile />
              </ProtectedRoute>
            } />
            <Route path="/assign-nurse-department" element={
              <ProtectedRoute allowedRoles={["head_nurse"]}>
                <AssignNurseDepartment />
              </ProtectedRoute>
            } />
            <Route path="/admin-dashboard" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin-profile" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminProfile />
              </ProtectedRoute>
            } />
            <Route path="/admin-profile/edit" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <EditAdminProfile />
              </ProtectedRoute>
            } />
            <Route path="/assign-headnurse-department" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AssignHeadNurseDepartment />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
