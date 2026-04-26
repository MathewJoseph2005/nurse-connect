import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface AddNurseFormProps {
  newName: string;
  setNewName: (v: string) => void;
  newPhone: string;
  setNewPhone: (v: string) => void;
  newAge: string;
  setNewAge: (v: string) => void;
  newGender: string;
  setNewGender: (v: string) => void;
  newDivisionId: string;
  setNewDivisionId: (v: string) => void;
  newWardId: string;
  setNewWardId: (v: string) => void;
  newExperience: string;
  setNewExperience: (v: string) => void;
  newExamScore: string;
  setNewExamScore: (v: string) => void;
  acuityLevels: any[];
  wards: any[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const AddNurseForm: React.FC<AddNurseFormProps> = ({
  newName, setNewName,
  newPhone, setNewPhone,
  newAge, setNewAge,
  newGender, setNewGender,
  newDivisionId, setNewDivisionId,
  newWardId, setNewWardId,
  newExperience, setNewExperience,
  newExamScore, setNewExamScore,
  acuityLevels,
  wards,
  saving,
  onSave,
  onCancel
}) => {
  return (
    <div className="rounded-xl bg-card p-6 shadow-card border">
      <h3 className="text-sm font-bold text-foreground mb-4">Add New Nurse</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Full Name</Label><Input placeholder="Enter name" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Phone Number</Label><Input placeholder="Enter phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></div>
        <div className="space-y-2"><Label>Age</Label><Input type="number" placeholder="Age" value={newAge} onChange={(e) => setNewAge(e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newGender} onChange={(e) => setNewGender(e.target.value)}>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Acuity Level</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newDivisionId} onChange={(e) => setNewDivisionId(e.target.value)}>
            <option value="">Select acuity level</option>
            {acuityLevels.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Ward</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newWardId} onChange={(e) => setNewWardId(e.target.value)}>
            <option value="">Select ward</option>
            {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="space-y-2"><Label>Experience (years)</Label><Input type="number" placeholder="0" value={newExperience} onChange={(e) => setNewExperience(e.target.value)} /></div>
        <div className="space-y-2"><Label>Exam Score (%)</Label><Input type="number" placeholder="0-100" value={newExamScore} onChange={(e) => setNewExamScore(e.target.value)} /></div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="pink" onClick={onSave} disabled={saving}>
          {saving && <Loader2 size={16} className="mr-1 animate-spin" />}
          Save Nurse
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
