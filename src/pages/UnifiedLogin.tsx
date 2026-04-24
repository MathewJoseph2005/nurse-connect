/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

const UnifiedLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, role: authRole, loading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && authRole) {
      if (authRole === "nurse") {
        navigate("/nurse-dashboard", { replace: true });
      } else if (authRole === "head_nurse") {
        navigate("/headnurse-dashboard", { replace: true });
      } else if (authRole === "admin") {
        navigate("/admin-dashboard", { replace: true });
      }
    }
  }, [authLoading, user, authRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email || !password) {
        toast({
          title: "Error",
          description: "Please enter email and password",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

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
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm px-4 py-4">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Caritas Hospital" className="h-10 w-10 rounded-lg" />
            <div>
              <span className="block text-lg font-bold text-white leading-tight">Caritas Hospital</span>
              <span className="block text-xs text-white/70 leading-none">Nurses Connect</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
          {/* Form Container */}
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">Login</h1>
              <p className="text-sm text-muted-foreground">Enter your credentials to access the portal</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email/Username Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email or Username
                </Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter your email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>

            {/* Additional Info */}
            <div className="mt-6 rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Tip:</span> Use your email, username, or phone number to login. The system will automatically recognize your role.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-8 py-4 rounded-b-xl">
            <p className="text-center text-xs text-muted-foreground">
              © 2024 Caritas Hospital. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedLogin;
