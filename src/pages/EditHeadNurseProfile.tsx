/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import logo from "@/assets/logo.png";

interface HeadNurseProfile {
  id: string;
  name: string;
  phone: string | null;
  gender: string | null;
  division_id: string | null;
  department_id: string | null;
  exam_score_percentage: number | null;
  experience_years: number | null;
  divisions: { id: string; name: string } | null;
  departments: { id: string; name: string } | null;
}

interface Division {
  id: string;
  name: string;
}

interface Division {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

const EditHeadNurseProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [examScore, setExamScore] = useState("");

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch head nurse profile
        const { data: profile } = await supabase
          .from("head_nurses")
          .select(
            "id, name, phone, gender, division_id, department_id, exam_score_percentage, experience_years, divisions:divisions(id, name), departments:departments(id, name)"
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          setName(profile.name || "");
          setPhone(profile.phone || "");
          setGender(profile.gender || "");
          setDivisionId(profile.division_id || "");
          setDepartmentId(profile.department_id || "");
          setExperienceYears(profile.experience_years?.toString() || "");
          setExamScore(profile.exam_score_percentage?.toString() || "");
        }

        // Fetch divisions
        const { data: divs } = await supabase.from("divisions").select("id, name");
        if (divs) setDivisions(divs);

        // Fetch departments
        const { data: depts } = await supabase.from("departments").select("id, name");
        if (depts) setDepartments(depts);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!user) throw new Error("User session not found");

      const updateData: any = {
        name,
      };

      // Add optional fields
      if (phone) updateData.phone = phone;
      if (gender) updateData.gender = gender;
      if (divisionId) updateData.division_id = divisionId;
      if (departmentId) updateData.department_id = departmentId;
      if (experienceYears) updateData.experience_years = parseInt(experienceYears);
      if (examScore) updateData.exam_score_percentage = parseFloat(examScore);

      const result = await supabase
        .from("head_nurses")
        .update(updateData)
        .eq("user_id", user.id)
        .select();

      // Check for errors from the API
      if (result.error) {
        throw new Error(result.error.message || "Failed to update profile");
      }

      toast({
        title: "Success",
        description: "Your profile has been updated successfully",
      });

      // Navigate back after a short delay to show the success message
      setTimeout(() => {
        navigate("/headnurse-dashboard");
      }, 1000);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: error?.message || "Unable to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4 md:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/headnurse-dashboard")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Edit Profile</h1>
            <p className="text-xs text-muted-foreground">Update your professional information</p>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="bg-card rounded-lg border p-6 md:p-8 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Personal Information</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="pt-6 border-t">
              <h2 className="text-lg font-semibold text-foreground mb-4">Professional Information</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="division" className="text-muted-foreground">Division (Admin Only)</Label>
                  <div className="relative opacity-50 pointer-events-none">
                    <Select value={divisionId} onValueChange={setDivisionId} disabled>
                      <SelectTrigger id="division">
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        {divisions.map((div) => (
                          <SelectItem key={div.id} value={div.id}>
                            {div.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">Division can only be changed by administrators</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-muted-foreground">Current Department (Admin Only)</Label>
                  <div className="relative opacity-50 pointer-events-none">
                    <Select value={departmentId} onValueChange={setDepartmentId} disabled>
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">Department can only be changed by administrators</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Experience (Years)</Label>
                  <Input
                    id="experience"
                    type="number"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    placeholder="Enter years of experience"
                    min="0"
                    max="60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="examScore">Exam Score (%)</Label>
                  <Input
                    id="examScore"
                    type="number"
                    value={examScore}
                    onChange={(e) => setExamScore(e.target.value)}
                    placeholder="Enter exam score"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/headnurse-dashboard")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-blue-500 hover:bg-blue-600">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default EditHeadNurseProfile;
