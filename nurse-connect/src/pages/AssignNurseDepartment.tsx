/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Check, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Nurse {
  id: string;
  name: string;
  phone: string;
  current_department_id: string | null;
  departments?: { name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

const AssignNurseDepartment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedNurses, setSelectedNurses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch departments
      const { data: depts } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (depts) setDepartments(depts);

      // Fetch nurses
      const { data: nurseList } = await supabase
        .from("nurses")
        .select(
          "id, name, phone, current_department_id, departments:departments(name)"
        )
        .order("name");
      if (nurseList) setNurses(nurseList as any);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDepartment = async () => {
    if (!selectedDepartmentId || selectedNurses.size === 0) {
      toast({
        title: "Error",
        description: "Please select a department and at least one nurse",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Update all selected nurses with the new department
      const nurseIds = Array.from(selectedNurses);
      
      for (const nurseId of nurseIds) {
        const result = await supabase
          .from("nurses")
          .update({ current_department_id: selectedDepartmentId })
          .eq("id", nurseId)
          .select();

        console.log("Update result:", result);
        if (result.error) {
          throw new Error(result.error.message || JSON.stringify(result.error));
        }
      }

      toast({
        title: "Success",
        description: `Department assigned to ${nurseIds.length} nurse(s)!`,
      });

      // Reset selections
      setSelectedNurses(new Set());
      setSelectedDepartmentId("");

      // Refresh the nurse list
      await fetchData();
    } catch (error: any) {
      console.error("Error assigning department:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign department",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNurse = (nurseId: string) => {
    const newSelected = new Set(selectedNurses);
    if (newSelected.has(nurseId)) {
      newSelected.delete(nurseId);
    } else {
      newSelected.add(nurseId);
    }
    setSelectedNurses(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedNurses.size === filteredNurses.length) {
      setSelectedNurses(new Set());
    } else {
      setSelectedNurses(new Set(filteredNurses.map((n) => n.id)));
    }
  };

  const filteredNurses = nurses.filter(
    (nurse) =>
      nurse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nurse.phone.includes(searchQuery)
  );

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
            <h1 className="text-lg font-bold text-foreground">Assign Department</h1>
            <p className="text-xs text-muted-foreground">
              Assign departments to nurses
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Assignment Controls */}
          <div className="bg-card rounded-lg border p-6 mb-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-3 items-end">
              <div className="space-y-2">
                <Label htmlFor="department">Select Department</Label>
                <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Choose a department" />
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

              <div className="space-y-2">
                <Label>
                  Selected Nurses: <span className="font-bold text-primary">{selectedNurses.size}</span>
                </Label>
              </div>

              <Button
                onClick={handleAssignDepartment}
                disabled={saving || selectedNurses.size === 0 || !selectedDepartmentId}
                className="w-full"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Department
              </Button>
            </div>
          </div>

          {/* Nurses Table */}
          <div className="bg-card rounded-lg border shadow-sm">
            {/* Search */}
            <div className="border-b p-4">
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={
                          filteredNurses.length > 0 &&
                          selectedNurses.size === filteredNurses.length
                        }
                        onChange={handleSelectAll}
                        className="cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Current Department</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNurses.length > 0 ? (
                    filteredNurses.map((nurse) => (
                      <TableRow key={nurse.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedNurses.has(nurse.id)}
                            onChange={() => handleToggleNurse(nurse.id)}
                            className="cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{nurse.name}</TableCell>
                        <TableCell>{nurse.phone}</TableCell>
                        <TableCell>
                          {nurse.departments?.name || (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {selectedNurses.has(nurse.id) ? (
                            <Check size={18} className="text-green-500" />
                          ) : (
                            <X size={18} className="text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No nurses found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="border-t p-4 text-sm text-muted-foreground">
              Showing {filteredNurses.length} of {nurses.length} nurses
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AssignNurseDepartment;
