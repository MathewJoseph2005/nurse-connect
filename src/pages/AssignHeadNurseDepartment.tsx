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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface HeadNurse {
  id: string;
  name: string;
  username: string;
  phone: string | null;
  department_id: string | null;
  departments?: { name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

const AssignHeadNurseDepartment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [headNurses, setHeadNurses] = useState<HeadNurse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedHeadNurses, setSelectedHeadNurses] = useState<Set<string>>(new Set());

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

      // Fetch head nurses
      const { data: headNurseList } = await supabase
        .from("head_nurses")
        .select(
          "id, name, username, phone, department_id, departments:departments(name)"
        )
        .order("name");
      if (headNurseList) setHeadNurses(headNurseList as any);
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
    if (!selectedDepartmentId || selectedHeadNurses.size === 0) {
      toast({
        title: "Error",
        description: "Please select a department and at least one head nurse",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Update all selected head nurses with the new department
      const headNurseIds = Array.from(selectedHeadNurses);
      
      for (const headNurseId of headNurseIds) {
        const result = await supabase
          .from("head_nurses")
          .update({ department_id: selectedDepartmentId })
          .eq("id", headNurseId)
          .select();

        console.log("Update result:", result);
        if (result.error) {
          throw new Error(result.error.message || JSON.stringify(result.error));
        }
      }

      toast({
        title: "Success",
        description: `Department assigned to ${headNurseIds.length} head nurse(s)!`,
      });

      // Reset selections
      setSelectedHeadNurses(new Set());
      setSelectedDepartmentId("");

      // Refresh the head nurse list
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

  const handleToggleHeadNurse = (headNurseId: string) => {
    const newSelected = new Set(selectedHeadNurses);
    if (newSelected.has(headNurseId)) {
      newSelected.delete(headNurseId);
    } else {
      newSelected.add(headNurseId);
    }
    setSelectedHeadNurses(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedHeadNurses.size === filteredHeadNurses.length) {
      setSelectedHeadNurses(new Set());
    } else {
      setSelectedHeadNurses(new Set(filteredHeadNurses.map((h) => h.id)));
    }
  };

  const filteredHeadNurses = headNurses.filter(
    (hn) =>
      hn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hn.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (hn.phone && hn.phone.includes(searchQuery))
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
            onClick={() => navigate("/admin-dashboard")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Assign Department to Head Nurses</h1>
            <p className="text-xs text-muted-foreground">
              Manage which departments head nurses oversee
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
                  Selected Head Nurses: <span className="font-bold text-primary">{selectedHeadNurses.size}</span>
                </Label>
              </div>

              <Button
                onClick={handleAssignDepartment}
                disabled={saving || selectedHeadNurses.size === 0 || !selectedDepartmentId}
                className="w-full"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Department
              </Button>
            </div>
          </div>

          {/* Head Nurses Table */}
          <div className="bg-card rounded-lg border shadow-sm">
            {/* Search */}
            <div className="border-b p-4">
              <Input
                placeholder="Search by name, username, or phone..."
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
                          filteredHeadNurses.length > 0 &&
                          selectedHeadNurses.size === filteredHeadNurses.length
                        }
                        onChange={handleSelectAll}
                        className="cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Current Department</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHeadNurses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No head nurses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHeadNurses.map((hn) => (
                      <TableRow key={hn.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedHeadNurses.has(hn.id)}
                            onChange={() => handleToggleHeadNurse(hn.id)}
                            className="cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{hn.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{hn.username}</TableCell>
                        <TableCell className="text-sm">{hn.phone || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {hn.departments?.name || "Not assigned"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              hn.department_id
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {hn.department_id ? "Assigned" : "Unassigned"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Info */}
            {filteredHeadNurses.length > 0 && (
              <div className="border-t p-4 text-sm text-muted-foreground">
                {filteredHeadNurses.length} head nurse(s) found
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AssignHeadNurseDepartment;
