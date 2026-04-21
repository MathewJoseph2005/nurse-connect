/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Edit3, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

const AdminProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("admins")
          .select("id, name, email, phone")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          setProfile(data as any);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const initials = profile.name
    ? profile.name.split(" ").map((w) => w[0]).join("").toUpperCase()
    : "AD";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4 md:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin-dashboard")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Profile</h1>
            <p className="text-xs text-muted-foreground">View your administrator information</p>
          </div>
        </div>
      </header>

      {/* Profile Card */}
      <main className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="bg-card rounded-lg border p-6 md:p-8 shadow-sm space-y-6">
          {/* Profile Header */}
          <div className="flex items-start gap-4 border-b pb-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10 text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">Administrator</p>
            </div>
          </div>

          {/* Personal Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-base text-foreground font-medium">{profile.email || "—"}</p>
                <div className="border-b mt-2"></div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="text-base text-foreground font-medium">{profile.phone || "—"}</p>
                <div className="border-b mt-2"></div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin-dashboard")}
            >
              Back
            </Button>
            <Button
              onClick={() => navigate("/admin-profile/edit")}
              className="flex-1"
            >
              <Edit3 size={16} className="mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminProfile;
