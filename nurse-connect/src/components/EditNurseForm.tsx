import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check } from "lucide-react";
import {
  DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

interface EditNurseFormProps {
  editingNurse: any;
  editForm: {
    name: string;
    phone: string;
    age: string;
    gender: string;
    division_id: string;
    ward_id: string;
  };
  setEditForm: (v: any) => void;
  wards: any[];
  acuityLevels: any[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const EditNurseForm: React.FC<EditNurseFormProps> = ({
  editingNurse,
  editForm,
  setEditForm,
  wards,
  acuityLevels,
  saving,
  onSave,
  onCancel
}) => {
  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Edit Nurse Details</DialogTitle>
        <DialogDescription>Update information for {editingNurse?.name}.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 py-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Full Name</Label>
          <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Age</Label>
          <Input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Gender</Label>
          <select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ward</Label>
          <select value={editForm.ward_id} onChange={(e) => setEditForm({ ...editForm, ward_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Select Ward</option>
            {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Acuity Level</Label>
          <select value={editForm.division_id} onChange={(e) => setEditForm({ ...editForm, division_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Select Acuity</option>
            {acuityLevels.map((lvl) => <option key={lvl.id} value={lvl.id}>{lvl.name}</option>)}
          </select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="pink" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
