/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Edit3, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface NurseProfile {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  division_id: string | null;
  current_department_id: string | null;
  experience_years: number | null;
  exam_score_percentage: number | null;
  divisions: { name: string } | null;
  departments: { name: string } | null;
}

const NurseProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<NurseProfile | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("nurses")
          .select(
            "id, name, phone, age, gender, division_id, current_department_id, experience_years, exam_score_percentage, divisions:divisions(name), departments:departments(name)"
          )
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
    : "N";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4 md:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/nurse-dashboard")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Profile</h1>
            <p className="text-xs text-muted-foreground">View your professional information</p>
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
              <p className="text-sm text-muted-foreground">Registered Nurse</p>
            </div>
          </div>

          {/* Personal Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="text-base text-foreground font-medium">{profile.phone || "—"}</p>
                <div className="border-b mt-2"></div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Age</label>
                <p className="text-base text-foreground font-medium">{profile.age || "—"}</p>
                <div className="border-b mt-2"></div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Gender</label>
                <p className="text-base text-foreground font-medium capitalize">
                  {profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : "—"}
                </p>
                <div className="border-b mt-2"></div>
              </div>
            </div>
          </div>

          {/* Professional Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Professional Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Division</label>
                <p className="text-base text-foreground font-medium">
                  {profile.divisions?.name || "—"}
                </p>
                <div className="border-b mt-2"></div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Dept</label>
                <p className="text-base text-foreground font-medium">
                  {profile.departments?.name || "—"}
                </p>
                <div className="border-b mt-2"></div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Exam Score</label>
                <p className="text-base text-foreground font-medium">
                  {profile.exam_score_percentage ? `${profile.exam_score_percentage}%` : "—"}
                </p>
                <div className="border-b mt-2"></div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Experience</label>
                <p className="text-base text-foreground font-medium">
                  {profile.experience_years ? `${profile.experience_years} years` : "—"}
                </p>
                <div className="border-b mt-2"></div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/nurse-dashboard")}
            >
              Back
            </Button>
            <Button
              onClick={() => navigate("/nurse-profile/edit")}
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

export default NurseProfile;
