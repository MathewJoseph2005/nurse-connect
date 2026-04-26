/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.svg";
import loginBg from "@/assets/nurses/nurse-1.jpg";

const UnifiedLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, role: authRole, loading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && authRole) {
      console.log("Redirecting user with role:", authRole);
      const target = authRole === "nurse" ? "/nurse-dashboard" : 
                     authRole === "head_nurse" ? "/headnurse-dashboard" : 
                     authRole === "admin" ? "/admin-dashboard" : null;
      if (target) {
        navigate(target, { replace: true });
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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden font-sans">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url(${loginBg})` }}
      >
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[8px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-900/40" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="group flex items-center justify-center w-20 h-20 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl transition-all hover:scale-105 mb-6">
            <img src={logo} alt="Caritas Hospital" className="h-10 w-auto object-contain brightness-0 invert group-hover:rotate-6 transition-transform" />
          </Link>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Nurse<span className="text-primary">Connect</span></h1>
          <p className="text-slate-300 mt-2 font-medium">Caritas Hospital Staff Portal</p>
        </div>

        {/* Glassmorphism Card */}
        <div className="rounded-[2.5rem] bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] overflow-hidden">
          <div className="p-8 sm:p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
              <p className="text-sm text-slate-300">Enter your credentials to access your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email/Username Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-200">
                  Email or Username
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="name@caritashospital.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="h-14 pl-12 bg-black/20 border-white/10 text-white placeholder:text-slate-400 focus:bg-black/40 focus:border-primary/50 transition-all rounded-2xl"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-200">
                    Password
                  </Label>
                  <a href="#" className="text-xs text-primary hover:text-white transition-colors font-medium">Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-14 pl-12 bg-black/20 border-white/10 text-white placeholder:text-slate-400 focus:bg-black/40 focus:border-primary/50 transition-all rounded-2xl"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Secure Login"
                )}
              </Button>
            </form>
          </div>

          {/* Footer inside card */}
          <div className="bg-black/30 backdrop-blur-md p-6 text-center border-t border-white/10">
             <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-300 hover:text-white transition-colors">
               <ArrowLeft className="w-4 h-4 mr-2" />
               Return to Home
             </Link>
          </div>
        </div>
        
        {/* Floating Help Text */}
        <div className="mt-8 text-center text-sm text-slate-400">
          Having trouble logging in? <br/> Contact IT Support at <a href="tel:04812792500" className="text-white hover:text-primary transition-colors font-semibold">0481 279 2500</a>
        </div>
      </div>
    </div>
  );
};

export default UnifiedLogin;
