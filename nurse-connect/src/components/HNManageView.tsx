import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Users, UserPlus, Search, Edit3, Trash2, Loader2
} from "lucide-react";
import { AddNurseForm } from "@/components/AddNurseForm";
import { EditNurseForm } from "@/components/EditNurseForm";

interface Nurse {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  division_id: string | null;
  current_ward_id: string | null;
  current_department_id: string;
  experience_years: number;
  exam_score_percentage: number | null;
  photo_url: string | null;
  divisions?: { name: string; acuity_level?: number };
  wards?: { name: string };
  departments?: { name: string };
}

export const HNManageView = (props: { departmentId: string | null; departmentName: string | null }) => {
  const { session } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [acuityLevels, setAcuityLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [nurseToRemove, setNurseToRemove] = useState<Nurse | null>(null);
  const [removingNurse, setRemovingNurse] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newDivisionId, setNewDivisionId] = useState("");
  const [newWardId, setNewWardId] = useState("");
  const [newExperience, setNewExperience] = useState("");
  const [newExamScore, setNewExamScore] = useState("");
  const [wards, setWards] = useState<any[]>([]);
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", age: "", gender: "", division_id: "", ward_id: "" });

  const fetchData = useCallback(async (deptId: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
      const token = (session as any)?.access_token;
      const [nursesRes, divsRes, wardsRes] = await Promise.all([
        fetch(`${API_BASE}/db/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ table: "nurses", action: "select", filters: [{ field: "is_active", op: "eq", value: true }, { field: "current_department_id", op: "eq", value: deptId }] }),
        }),
        fetch(`${API_BASE}/db/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ table: "divisions", action: "select" }),
        }),
        fetch(`${API_BASE}/db/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ table: "wards", action: "select", filters: [{ field: "department_id", op: "eq", value: deptId }] }),
        }),
      ]);
      if (nursesRes.ok) setNurses((await nursesRes.json()).data || []);
      if (divsRes.ok) setAcuityLevels((await divsRes.json()).data || []);
      if (wardsRes.ok) setWards((await wardsRes.json()).data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching manage view data", err);
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (props.departmentId) fetchData(props.departmentId);
    else setLoading(false);
  }, [props.departmentId, fetchData]);

  const handleAddNurse = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast({ title: "Validation Error", description: "Name and phone are required.", variant: "destructive" });
      return;
    }
    const phoneDigits = newPhone.replace(/\D/g, "");
    if (!props.departmentId) return;

    setSaving(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
      const token = (session as any)?.access_token;
      const res = await fetch(`${API_BASE}/db/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          table: "nurses",
          action: "insert",
          payload: {
            name: newName.trim(),
            phone: phoneDigits,
            age: newAge ? parseInt(newAge) : null,
            gender: newGender || null,
            division_id: newDivisionId || null,
            current_ward_id: newWardId || null,
            current_department_id: props.departmentId,
            experience_years: newExperience ? parseInt(newExperience) : 0,
            exam_score_percentage: newExamScore ? parseFloat(newExamScore) : null,
          }
        }),
      });
      if (!res.ok) throw new Error("Failed to add nurse");
      toast({ title: "Nurse Added" });
      setNewName(""); setNewPhone(""); setNewAge(""); setNewGender(""); setNewDivisionId(""); setNewWardId(""); setNewExperience(""); setNewExamScore("");
      setShowAdd(false);
      fetchData(props.departmentId);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEditNurse = (n: Nurse) => {
    setEditingNurse(n);
    setEditForm({
      name: n.name,
      phone: n.phone,
      age: n.age?.toString() || "",
      gender: n.gender || "",
      division_id: n.division_id || "",
      ward_id: n.current_ward_id || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingNurse || !props.departmentId) return;
    setSaving(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
      const token = (session as any)?.access_token;
      const res = await fetch(`${API_BASE}/db/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          table: "nurses",
          action: "update",
          filters: [{ field: "id", op: "eq", value: editingNurse.id }],
          payload: {
            name: editForm.name.trim(),
            phone: editForm.phone.replace(/\D/g, ""),
            age: editForm.age ? parseInt(editForm.age) : null,
            gender: editForm.gender || null,
            division_id: editForm.division_id || null,
            current_ward_id: editForm.ward_id || null,
          }
        }),
      });
      if (!res.ok) throw new Error("Failed to update nurse");
      toast({ title: "Nurse Updated" });
      setEditingNurse(null);
      fetchData(props.departmentId);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!nurseToRemove || !props.departmentId) return;
    setRemovingNurse(true);
    try {
      const token = (session as any)?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
      await fetch(`${apiBase}/functions/nurses/${nurseToRemove.id}/deactivate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      toast({ title: "Nurse Removed" });
      setNurseToRemove(null);
      fetchData(props.departmentId);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRemovingNurse(false);
    }
  };

  const filtered = nurses.filter((n) => {
    const q = search.toLowerCase();
    return n.name.toLowerCase().includes(q) || n.phone.includes(q);
  });

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!props.departmentId) return <div className="p-14 text-center">No Department Assigned</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Manage Nurses</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{props.departmentName} · {nurses.length} active nurses</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search nurses..." className="pl-10 w-48 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="pink" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <UserPlus size={16} className="mr-1" /> Add Nurse
          </Button>
        </div>
      </div>

      {showAdd && (
        <AddNurseForm 
          newName={newName} setNewName={setNewName}
          newPhone={newPhone} setNewPhone={setNewPhone}
          newAge={newAge} setNewAge={setNewAge}
          newGender={newGender} setNewGender={setNewGender}
          newDivisionId={newDivisionId} setNewDivisionId={setNewDivisionId}
          newWardId={newWardId} setNewWardId={setNewWardId}
          newExperience={newExperience} setNewExperience={setNewExperience}
          newExamScore={newExamScore} setNewExamScore={setNewExamScore}
          acuityLevels={acuityLevels}
          wards={wards}
          saving={saving}
          onSave={handleAddNurse}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card border">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No nurses found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card shadow-card border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Ward</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Phone</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Exp</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((n) => (
                <tr key={n.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{n.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.wards?.name || "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.experience_years}y</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditNurse(n)}><Edit3 size={14} /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => setNurseToRemove(n)}><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!nurseToRemove} onOpenChange={(open) => !open && setNurseToRemove(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Remove Nurse</DialogTitle>
            <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNurseToRemove(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removingNurse}>
              {removingNurse ? <Loader2 size={16} className="mr-2 animate-spin" /> : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingNurse} onOpenChange={(open) => !open && setEditingNurse(null)}>
        <EditNurseForm 
          editingNurse={editingNurse}
          editForm={editForm}
          setEditForm={setEditForm}
          wards={wards}
          acuityLevels={acuityLevels}
          saving={saving}
          onSave={handleSaveEdit}
          onCancel={() => setEditingNurse(null)}
        />
      </Dialog>
    </div>
  );
};
