/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Edit3, Loader2, Camera } from "lucide-react";
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
  photo_url?: string;
}

const NurseProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<NurseProfile | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("nurses")
          .select(
            "id, name, phone, age, gender, division_id, current_department_id, experience_years, exam_score_percentage, photo_url, divisions:divisions(name), departments:departments(name)"
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB allowed.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/profile.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("nurse-photos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("nurse-photos").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase.from("nurses").update({ photo_url: publicUrl } as any).eq("id", profile.id);
    setProfile({ ...profile, photo_url: publicUrl });
    setUploading(false);
    toast({ title: "Photo updated!", description: "Your profile photo has been saved." });
  };

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
            <div className="relative group">
              <Avatar className="h-16 w-16">
                {profile.photo_url ? (
                  <AvatarImage src={profile.photo_url} alt={profile.name} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="photo-upload"
                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </div>
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
                <p className="text-base text-foreground font-medium">{profile.phone || "-"}</p>
                <div className="border-b mt-2"></div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Age</label>
                <p className="text-base text-foreground font-medium">{profile.age || "-"}</p>
                <div className="border-b mt-2"></div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Gender</label>
                <p className="text-base text-foreground font-medium capitalize">
                  {profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : "-"}
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
                  {profile.divisions?.name || "-"}
                </p>
                <div className="border-b mt-2"></div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Dept</label>
                <p className="text-base text-foreground font-medium">
                  {profile.departments?.name || "-"}
                </p>
                <div className="border-b mt-2"></div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Exam Score</label>
                <p className="text-base text-foreground font-medium">
                  {profile.exam_score_percentage ? `${profile.exam_score_percentage}%` : "-"}
                </p>
                <div className="border-b mt-2"></div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Experience</label>
                <p className="text-base text-foreground font-medium">
                  {profile.experience_years ? `${profile.experience_years} years` : "-"}
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
