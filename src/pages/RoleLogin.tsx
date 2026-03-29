/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

interface RoleLoginProps {
  role: "Head Nurse" | "Admin";
  dashboardPath: string;
  emailDomain: string;
}

const RoleLogin = ({ role, dashboardPath, emailDomain }: RoleLoginProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, role: authRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const expectedRole = role === "Admin" ? "admin" : "head_nurse";

  useEffect(() => {
    if (!authLoading && user && authRole === expectedRole) {
      navigate(dashboardPath, { replace: true });
    }
  }, [authLoading, user, authRole, expectedRole, navigate, dashboardPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedInput = username.trim().toLowerCase();
      const email = normalizedInput.includes("@")
        ? normalizedInput
        : `${normalizedInput}@${emailDomain}`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Navigation is handled by the useEffect once authRole is loaded
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div className="rounded-2xl bg-card p-8 shadow-card">
          <div className="flex flex-col items-center">
            <img src={logo} alt="Caritas Hospital" className="h-16 w-16 rounded-xl" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">{role} Login</h1>
            <p className="mt-1 text-sm text-muted-foreground">Access the {role.toLowerCase()} dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username or full email" className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="pl-10" required />
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const HeadNurseLogin = () => <RoleLogin role="Head Nurse" dashboardPath="/headnurse-dashboard" emailDomain="headnurse.local" />;
export const AdminLogin = () => <RoleLogin role="Admin" dashboardPath="/admin-dashboard" emailDomain="admin.local" />;
