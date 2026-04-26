import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, Wand2, Edit3, Trash2, Loader2, ChevronDown, Settings2, Zap, Calendar
} from "lucide-react";

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

interface ScheduleRow {
  id: string;
  duty_date: string;
  shift_type: string;
  nurse: { id: string; name: string; division_id: string | null } | null;
  department: { id: string; name: string } | null;
}

const SHIFT_LABELS: Record<string, string> = {
  day:     "Day Shift (6AM - 6PM)",
  night:   "Night Shift (6PM - 6AM)",
  morning: "Morning (6AM - 2PM)",
  evening: "Evening (2PM - 10PM)",
};

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export const HNScheduleView = (props: { departmentId?: string | null; wardId?: string | null }) => {
  const { user, session } = useAuth();
  const [search, setSearch] = useState("");
  const [scheduleData, setScheduleData] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [fallbackDialog, setFallbackDialog] = useState({ open: false, message: "", prompt: "" });
  const [overwriteDialog, setOverwriteDialog] = useState({ open: false, message: "", prompt: "" });
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [wardId, setWardId] = useState<string | null>(null);
  const [wardName, setWardName] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const [availableNurses, setAvailableNurses] = useState<Nurse[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRow | null>(null);
  const [selectedNurseId, setSelectedNurseId] = useState<string>("");
  const [selectedShiftType, setSelectedShiftType] = useState<string>("");
  const [editingLoading, setEditingLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const now = new Date();
  const [selectedWeek, setSelectedWeek] = useState(getISOWeek(now));
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  
  const [shiftPattern, setShiftPattern] = useState("12_hours");
  const [maxHoursPerWeek, setMaxHoursPerWeek] = useState(36);

  const [divisions, setDivisions] = useState<any[]>([]);
  const [acuityTargets, setAcuityTargets] = useState<Record<string, number>>({});
  const [showAcuityPanel, setShowAcuityPanel] = useState(true);

  useEffect(() => {
    if (props.departmentId) setDepartmentId(props.departmentId);
    if (props.wardId) setWardId(props.wardId);
  }, [props.departmentId, props.wardId]);

  useEffect(() => {
    if (!user) return;
    const fetchDepartmentDetails = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
        const token = (session as any)?.access_token;
        if (wardId) {
          const wardRes = await fetch(`${API_BASE}/db/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              table: "wards",
              action: "select",
              filters: [{ field: "id", op: "eq", value: wardId }],
              options: { maybeSingle: true }
            })
          });
          const wardJson = await wardRes.json();
          setWardName(wardJson.data?.name || "Ward");
        }
      } catch (err) {
        console.error("Error fetching ward name", err);
      }
    };
    fetchDepartmentDetails();
  }, [wardId, session, user]);

  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
        const token = (session as any)?.access_token;
        const res = await fetch(`${API_BASE}/db/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ table: "divisions", action: "select" }),
        });
        if (!res.ok) return;
        const json = await res.json();
        const data = json.data || [];
        setDivisions(data);
        const initialTargets: Record<string, number> = {};
        data.forEach((d: any) => initialTargets[d.id] = 2);
        setAcuityTargets(initialTargets);
      } catch (err) {
        console.error("Error fetching divisions", err);
      }
    };
    fetchDivisions();
  }, [session]);

  const fetchAvailableNurses = useCallback(async () => {
    if (!departmentId) return;
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
      const token = (session as any)?.access_token;
      const res = await fetch(`${API_BASE}/db/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          table: "nurses",
          action: "select",
          filters: [
            { field: "current_department_id", op: "eq", value: departmentId },
            ...(wardId ? [{ field: "current_ward_id", op: "eq", value: wardId }] : []),
            { field: "is_active", op: "eq", value: true },
          ],
          orders: [{ field: "name", ascending: true }],
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch nurses");
      const json = await res.json();
      setAvailableNurses(json.data || []);
    } catch (err) {
      console.error("Error fetching available nurses", err);
    }
  }, [departmentId, wardId, session]);

  const fetchSchedule = useCallback(async () => {
    if (!departmentId) return;
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
      const token = (session as any)?.access_token;
      const res = await fetch(`${API_BASE}/db/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          table: "schedules",
          action: "select",
          filters: [
            { field: "week_number", op: "eq", value: selectedWeek },
            { field: "year", op: "eq", value: selectedYear },
            { field: "department_id", op: "eq", value: departmentId },
            ...(wardId ? [{ field: "ward_id", op: "eq", value: wardId }] : []),
          ],
          orders: [
            { field: "duty_date", ascending: true },
            { field: "shift_type", ascending: true },
          ],
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch schedules");
      const json = await res.json();
      setScheduleData((json.data as ScheduleRow[]) || []);
    } catch (err) {
      console.error("Error fetching schedules:", err);
    }
    setLoading(false);
  }, [selectedWeek, selectedYear, departmentId, wardId, session]);

  useEffect(() => {
    fetchSchedule();
    fetchAvailableNurses();
  }, [fetchSchedule, fetchAvailableNurses]);

  const handleGenerate = async (forceAssignRemaining = false, confirmOverwrite = false) => {
    const now = new Date();
    const currentWeek = getISOWeek(now);
    const currentYear = now.getFullYear();
    const weekDiff = (selectedYear - currentYear) * 52 + (selectedWeek - currentWeek);

    if (weekDiff < 0) {
      toast({ title: "Invalid Week", description: "Cannot generate schedules for past weeks.", variant: "destructive" });
      return;
    }

    if (weekDiff > 3) {
      toast({ title: "Invalid Week", description: "You can only generate schedules up to 4 weeks in advance.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const token = (session as any)?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
      const response = await fetch(`${apiBase}/functions/generate-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          week_number: selectedWeek,
          year: selectedYear,
          force_assign_remaining: forceAssignRemaining,
          shift_pattern: shiftPattern,
          max_shifts_per_week: Math.round(maxHoursPerWeek / (shiftPattern === "12_hours" ? 12 : 8)),
          confirm_overwrite: confirmOverwrite,
          acuity_requirements: acuityTargets,
          ward_id: wardId,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409 && result?.code === "SCHEDULE_ALREADY_EXISTS") {
          setOverwriteDialog({ open: true, message: result.error, prompt: result.prompt });
          setGenerating(false);
          return;
        }
        if ((result?.code === "INSUFFICIENT_NURSES" || result?.code === "INSUFFICIENT_ACUITY_RESOURCES") && result?.can_force_generate && !forceAssignRemaining) {
          setFallbackDialog({ open: true, message: result.error, prompt: result.prompt });
          setGenerating(false);
          return;
        }
        throw new Error(result?.error || "Unable to generate schedule");
      }
      toast({ title: "Schedule Generated" });
      await fetchSchedule();
    } catch (error: any) {
      toast({ title: "Cannot Auto-Generate", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleEditSchedule = async () => {
    if (!editingSchedule || !selectedNurseId || !selectedShiftType) {
      toast({ title: "Error", description: "Please select a nurse and shift", variant: "destructive" });
      return;
    }
    setEditingLoading(true);
    try {
      const token = (session as any)?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
      const res = await fetch(`${apiBase}/functions/schedules/${editingSchedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nurse_id: selectedNurseId, shift_type: selectedShiftType }),
      });
      if (!res.ok) throw new Error("Failed to update schedule");
      toast({ title: "Schedule Updated" });
      setEditingSchedule(null);
      await fetchSchedule();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setEditingLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    setDeletingId(scheduleId);
    try {
      const token = (session as any)?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
      const res = await fetch(`${apiBase}/functions/schedules/${scheduleId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete schedule");
      toast({ title: "Schedule Removed" });
      await fetchSchedule();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = scheduleData.filter((s) => {
    const nurseName = s.nurse?.name?.toLowerCase() || "";
    const deptName = s.department?.name?.toLowerCase() || "";
    const q = search.toLowerCase();
    return nurseName.includes(q) || deptName.includes(q);
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const toggleDay = (dateStr: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dateStr)) newExpanded.delete(dateStr);
    else newExpanded.add(dateStr);
    setExpandedDays(newExpanded);
  };

  const groupByDate = (data: ScheduleRow[]) => {
    const grouped: { [key: string]: ScheduleRow[] } = {};
    data.forEach((item) => {
      if (!grouped[item.duty_date]) grouped[item.duty_date] = [];
      grouped[item.duty_date].push(item);
    });
    return Object.entries(grouped).sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Weekly Schedule - {wardName || "My Ward"}</h2>
          {selectedYear < now.getFullYear() || selectedYear > now.getFullYear() + 1 ? (
            <p className="text-xs text-destructive mt-0.5">⚠️ Invalid Year</p>
          ) : !departmentId && !loading ? (
            <p className="text-xs text-destructive mt-0.5">⚠️ Head Nurse profile not loaded.</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground">Week:</Label>
            <Input type="number" min={1} max={53} value={selectedWeek} onChange={(e) => setSelectedWeek(Number(e.target.value))} className="w-16 h-9" />
            <Label className="text-xs text-muted-foreground ml-1">Year:</Label>
            <Input type="number" min={now.getFullYear()} max={now.getFullYear() + 1} value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-20 h-9" />
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground">Pattern:</Label>
            <select 
              className="h-9 rounded-md border bg-background px-2 text-sm" 
              value={shiftPattern} 
              onChange={e => {
                const newPattern = e.target.value;
                setShiftPattern(newPattern);
                setMaxHoursPerWeek(newPattern === "12_hours" ? 36 : 40);
              }}
            >
              <option value="12_hours">12-Hour</option>
              <option value="8_hours">8-Hour (3/day)</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-10 w-32 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className={showAcuityPanel ? "bg-primary/10 text-primary border-primary/20" : ""}
            onClick={() => setShowAcuityPanel(!showAcuityPanel)}
          >
            <Settings2 size={16} className="mr-1" />
            Acuity Targets
          </Button>
          <Button variant="pink" size="sm" onClick={() => handleGenerate(false)} disabled={generating}>
            {generating ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Wand2 size={16} className="mr-1" />}
            {generating ? "Generating..." : "Auto-Generate"}
          </Button>
        </div>
      </div>

      {showAcuityPanel && (
        <div className="bg-muted/30 rounded-xl p-4 border border-border animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              Staffing Targets per Shift
            </h3>
            <p className="text-xs text-muted-foreground">How many nurses of each acuity level per shift?</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {divisions.sort((a, b) => (a.acuity_level || 0) - (b.acuity_level || 0)).map((div) => (
              <div key={div.id} className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{div.name}</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={acuityTargets[div.id] || ""}
                  placeholder="0"
                  onChange={(e) => setAcuityTargets({ ...acuityTargets, [div.id]: parseInt(e.target.value) || 0 })}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm font-medium text-foreground">No schedule for Week {selectedWeek}</p>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl bg-card shadow-card overflow-hidden">
          {groupByDate(filtered).map(([dateStr, dayShifts]) => (
            <div key={dateStr} className="border-b last:border-b-0">
              <button onClick={() => toggleDay(dateStr)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <ChevronDown size={18} className={`text-primary transition-transform ${expandedDays.has(dateStr) ? "rotate-180" : ""}`} />
                  <div className="text-left">
                    <p className="font-semibold text-foreground">{formatDate(dateStr)}</p>
                    <p className="text-xs text-muted-foreground">{dayShifts.length} shifts</p>
                  </div>
                </div>
                <Badge variant="secondary">{dayShifts.length}</Badge>
              </button>
              {expandedDays.has(dateStr) && (
                <div className="border-t bg-muted/10 divide-y">
                  {dayShifts.map((s) => (
                    <div key={s.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">{s.nurse?.name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{s.department?.name || "Unknown"}</p>
                      </div>
                      <Badge className={s.shift_type === "day" ? "bg-amber-100 text-amber-700 border-0" : "bg-indigo-100 text-indigo-700 border-0"}>
                        {SHIFT_LABELS[s.shift_type] || s.shift_type}
                      </Badge>
                      <div className="ml-4 flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingSchedule(s); setSelectedNurseId(s.nurse?.id || ""); setSelectedShiftType(s.shift_type); }}><Edit3 size={14} /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSchedule(s.id)} disabled={deletingId === s.id}>
                          {deletingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && setEditingSchedule(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Edit Shift</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nurse</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedNurseId} onChange={(e) => setSelectedNurseId(e.target.value)}>
                <option value="">Select a nurse</option>
                {availableNurses.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Shift Type</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedShiftType} onChange={(e) => setSelectedShiftType(e.target.value)}>
                <option value="day">Day Shift (6AM - 6PM)</option>
                <option value="night">Night Shift (6PM - 6AM)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSchedule(null)}>Cancel</Button>
            <Button onClick={handleEditSchedule} disabled={editingLoading}>
              {editingLoading && <Loader2 size={16} className="mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fallback & Overwrite Dialogs */}
      <Dialog open={fallbackDialog.open} onOpenChange={(open) => !open && setFallbackDialog({ ...fallbackDialog, open: false })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Insufficient Resources</DialogTitle></DialogHeader>
          <p className="text-sm py-4">{fallbackDialog.message}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFallbackDialog({ ...fallbackDialog, open: false })}>Cancel</Button>
            <Button variant="pink" onClick={() => { setFallbackDialog({ ...fallbackDialog, open: false }); handleGenerate(true); }}>Generate Anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overwriteDialog.open} onOpenChange={(open) => !open && setOverwriteDialog({ ...overwriteDialog, open: false })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Overwrite Schedule?</DialogTitle></DialogHeader>
          <p className="text-sm py-4">{overwriteDialog.message}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverwriteDialog({ ...overwriteDialog, open: false })}>Cancel</Button>
            <Button variant="pink" onClick={() => { setOverwriteDialog({ ...overwriteDialog, open: false }); handleGenerate(false, true); }}>Overwrite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
