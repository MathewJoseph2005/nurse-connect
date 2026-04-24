/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Phone, Lock, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

const NurseLogin = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, role: authRole, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && authRole === "nurse") {
      navigate("/nurse-dashboard", { replace: true });
    }
  }, [authLoading, user, authRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        // Validate password confirmation
        if (password !== confirmPassword) {
          toast({
            title: "Registration Failed",
            description: "Passwords do not match",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Check if phone was pre-entered by head nurse
        const { data: phoneExists, error: checkError } = await supabase.rpc(
          "check_nurse_phone_exists",
          { phone_number: phone }
        );

        if (checkError) throw checkError;
        if (!phoneExists) {
          toast({
            title: "Registration Failed",
            description: "Your phone number was not found in the system. Please contact your Head Nurse to be added first.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Sign up using phone as email identifier
        const email = `${phone.replace(/[^0-9]/g, "")}@nurse.local`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, phone, role: "nurse" } },
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          // Role assignment and nurse linking are handled automatically by database trigger
          toast({ title: "Registration Successful", description: "Welcome to Caritas Hospital!" });
          // Navigation handled by auth context useEffect
        }
      } else {
        // Login
        const email = `${phone.replace(/[^0-9]/g, "")}@nurse.local`;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Navigation handled by useEffect once auth role loads
      }
    } catch (error: any) {
      toast({
        title: isRegister ? "Registration Failed" : "Login Failed",
        description: error.message || "An error occurred",
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
            <img src={logo} alt="Nurses Connect" className="h-16 w-16 rounded-xl" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">{isRegister ? "Nurse Registration" : "Nurse Login"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{isRegister ? "Register with your hospital phone number" : "Access your duty schedule"}</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="pl-10" required />
              </div>
            </div>
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" className="pl-10" required />
                </div>
              </div>
            )}
            <Button type="submit" variant="hero" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRegister ? "Register" : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-primary hover:underline">
              {isRegister ? (
                <span>Already have an account? <strong>Sign In</strong></span>
              ) : (
                <span className="flex items-center justify-center gap-1"><UserPlus size={14} /> Create an account</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NurseLogin;
