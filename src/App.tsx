import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import WelcomePage from "./pages/WelcomePage";
import NurseLogin from "./pages/NurseLogin";
import { HeadNurseLogin, AdminLogin } from "./pages/RoleLogin";
import NurseDashboard from "./pages/NurseDashboard";
import HeadNurseDashboard from "./pages/HeadNurseDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/nurse-login" element={<NurseLogin />} />
            <Route path="/headnurse-login" element={<HeadNurseLogin />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/nurse-dashboard" element={
              <ProtectedRoute allowedRoles={["nurse"]}>
                <NurseDashboard />
              </ProtectedRoute>
            } />
            <Route path="/headnurse-dashboard" element={
              <ProtectedRoute allowedRoles={["head_nurse"]}>
                <HeadNurseDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin-dashboard" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
