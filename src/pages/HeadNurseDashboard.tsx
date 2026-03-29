/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Calendar, Users, ArrowLeftRight, ClipboardCheck, UserPlus, LogOut,
  Menu, X, Check, XCircle, Search, Star, Trash2, Loader2, Wand2
} from "lucide-react";
import logo from "@/assets/logo.png";

type Tab = "schedule" | "swaps" | "performance" | "manage";

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const HeadNurseDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("schedule");
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const [hnProfile, setHnProfile] = useState<{ name: string; department_name: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("head_nurses")
        .select("name, departments:departments(name)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setHnProfile({
          name: data.name,
          department_name: (data.departments as any)?.name ?? null,
        });
      }
    };
    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = hnProfile?.name
    ? hnProfile.name.split(" ").map((w) => w[0]).join("").toUpperCase()
    : "HN";

  const tabs = [
    { key: "schedule" as const, icon: Calendar, label: "Weekly Schedule" },
    { key: "swaps" as const, icon: ArrowLeftRight, label: "Swap Requests" },
    { key: "performance" as const, icon: ClipboardCheck, label: "Performance" },
    { key: "manage" as const, icon: UserPlus, label: "Manage Nurses" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-card shadow-card transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b p-4">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg" />
            <div>
              <p className="text-sm font-bold text-foreground">Caritas Hospital</p>
              <p className="text-xs text-muted-foreground">{hnProfile?.name || "Head Nurse"}</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto md:hidden"><X size={20} /></button>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setSidebarOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === t.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
              >
                <t.icon size={18} />{t.label}
              </button>
            ))}
          </nav>
          <div className="border-t p-3">
            <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"><LogOut size={18} /> Sign Out</button>
          </div>
        </div>
      </aside>

      <main className="flex-1">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:px-6">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden"><Menu size={22} /></button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Head Nurse <span className="text-primary">Dashboard</span></h1>
            {hnProfile?.department_name && (
              <p className="text-xs text-muted-foreground">{hnProfile.department_name}</p>
            )}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{initials}</div>
        </header>

        <div className="p-4 md:p-6">
          {activeTab === "schedule" && <HNScheduleView />}
          {activeTab === "swaps" && <HNSwapView />}
          {activeTab === "performance" && <HNPerformanceView />}
          {activeTab === "manage" && <HNManageView />}
        </div>
      </main>
    </div>
  );
};

// ─── Schedule View ──────────────────────────────────────────────

interface ScheduleRow {
  id: string;
  duty_date: string;
  shift_type: string;
  nurse: { id: string; name: string; division_id: string | null } | null;
  department: { id: string; name: string } | null;
}

const SHIFT_LABELS: Record<string, string> = {
  morning: "Morning (6AM-2PM)",
  evening: "Evening (2PM-10PM)",
  night: "Night (10PM-6AM)",
};

const HNScheduleView = () => {
  const [search, setSearch] = useState("");
  const [scheduleData, setScheduleData] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const now = new Date();
  const [selectedWeek, setSelectedWeek] = useState(getISOWeek(now));
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("schedules")
      .select("id, duty_date, shift_type, nurse:nurses(id, name, division_id), department:departments(id, name)")
      .eq("week_number", selectedWeek)
      .eq("year", selectedYear)
      .order("duty_date")
      .order("shift_type");

    if (error) {
      console.error("Error fetching schedules:", error);
    } else {
      setScheduleData((data as unknown as ScheduleRow[]) || []);
    }
    setLoading(false);
  }, [selectedWeek, selectedYear]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

      const requestGenerate = async (forceAssignRemaining = false) => {
        const response = await fetch(`${apiBase}/functions/generate-schedule`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            week_number: selectedWeek,
            year: selectedYear,
            force_assign_remaining: forceAssignRemaining,
          }),
        });
        const payload = await response.json();
        return { response, payload };
      };

      let { response: res, payload: result } = await requestGenerate(false);

      if (!res.ok && result?.code === "INSUFFICIENT_NURSES" && result?.can_force_generate) {
        const confirmFallback = window.confirm(
          `${result.error}\n\n${result.prompt || "Would you like to continue with available nurses?"}`
        );
        if (!confirmFallback) {
          toast({
            title: "Not enough nurses to auto-generate",
            description: "Add more nurses or use one-click fallback generation.",
            variant: "destructive",
          });
          return;
        }

        const fallbackResult = await requestGenerate(true);
        res = fallbackResult.response;
        result = fallbackResult.payload;
      }

      if (!res.ok) {
        throw new Error(result?.error || "Unable to generate schedule");
      }

      toast({
        title: "Schedule Generated",
        description: result?.fallback_used
          ? `Created ${result.stats.total_entries} entries using available nurses (fallback mode).`
          : `Created ${result.stats.total_entries} shift entries for ${result.stats.nurses_scheduled} nurses.`,
      });
      await fetchSchedule();
    } catch (error: any) {
      toast({ title: "Cannot Auto-Generate", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">Weekly Schedule</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground">Week:</Label>
            <Input type="number" min={1} max={53} value={selectedWeek} onChange={(e) => setSelectedWeek(Number(e.target.value))} className="w-20 h-9" />
            <Label className="text-xs text-muted-foreground ml-1">Year:</Label>
            <Input type="number" min={2024} max={2030} value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-24 h-9" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search nurse or dept..." className="pl-10 w-52 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="pink" size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Wand2 size={16} className="mr-1" />}
            {generating ? "Generating..." : "Auto-Generate"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm font-medium text-foreground">No schedule for Week {selectedWeek}, {selectedYear}</p>
          <p className="mt-1 text-xs text-muted-foreground">Click "Auto-Generate" to create a fair schedule automatically.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Nurse</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Shift</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{s.nurse?.name || "Unknown"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.department?.name || "Unknown"}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        s.shift_type === "morning"
                          ? "bg-primary/10 text-primary border-0"
                          : s.shift_type === "evening"
                          ? "bg-accent/20 text-accent border-0"
                          : "bg-muted text-foreground border-0"
                      }
                    >
                      {SHIFT_LABELS[s.shift_type] || s.shift_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(s.duty_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            {filtered.length} entries • {new Set(filtered.map((s) => s.nurse?.id)).size} nurses
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Swap View ──────────────────────────────────────────────────

const HNSwapView = () => {
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSwaps = async () => {
      const { data, error } = await supabase
        .from("shift_swap_requests")
        .select(`
          id, status, created_at, review_notes,
          requester:nurses!shift_swap_requests_requester_nurse_id_fkey(name),
          target:nurses!shift_swap_requests_target_nurse_id_fkey(name),
          requester_schedule:schedules!shift_swap_requests_requester_schedule_id_fkey(duty_date, shift_type, department:departments(name)),
          target_schedule:schedules!shift_swap_requests_target_schedule_id_fkey(duty_date, shift_type, department:departments(name))
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!error) setSwaps(data || []);
      setLoading(false);
    };
    fetchSwaps();
  }, []);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiBase}/functions/handle-swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ swap_id: id, action: status }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");
      toast({ title: `Swap ${status}` });
      setSwaps((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-foreground">Pending Swap Requests</h2>
      {swaps.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card">
          <ArrowLeftRight className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No pending swap requests</p>
        </div>
      ) : (
        swaps.map((r) => (
          <div key={r.id} className="rounded-xl bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">
                  {r.requester?.name || "Unknown"} ↔ {r.target?.name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.requester_schedule?.shift_type} — {r.requester_schedule?.department?.name} ⟷{" "}
                  {r.target_schedule?.shift_type} — {r.target_schedule?.department?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Date: {r.requester_schedule?.duty_date}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="hero" size="sm" onClick={() => handleAction(r.id, "approved")}>
                  <Check size={14} className="mr-1" /> Approve
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleAction(r.id, "rejected")}>
                  <XCircle size={14} className="mr-1" /> Reject
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ─── Performance View ───────────────────────────────────────────

const HNPerformanceView = () => {
  const [nurses, setNurses] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [nursesRes, evalsRes] = await Promise.all([
        supabase
          .from("nurses")
          .select("id, name, division_id, current_department_id, experience_years, divisions:divisions(name), departments:departments(name)")
          .eq("is_active", true),
        supabase
          .from("performance_evaluations")
          .select("nurse_id, overall_score, attendance_score, quality_score, reliability_score, evaluation_period, remarks")
          .order("created_at", { ascending: false }),
      ]);

      if (!nursesRes.error) setNurses(nursesRes.data || []);

      // Group evaluations by nurse_id, keep latest
      const evalMap: Record<string, any> = {};
      if (!evalsRes.error && evalsRes.data) {
        for (const ev of evalsRes.data) {
          if (!evalMap[ev.nurse_id]) {
            evalMap[ev.nurse_id] = ev;
          }
        }
      }
      setEvaluations(evalMap);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-foreground">Nurse Performance</h2>
      {nurses.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No active nurses found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {nurses.map((n) => {
            const ev = evaluations[n.id];
            const score = ev?.overall_score ? Number(ev.overall_score) : null;
            const attendanceScore = ev?.attendance_score ? Number(ev.attendance_score) : null;
            const qualityScore = ev?.quality_score ? Number(ev.quality_score) : null;
            const reliabilityScore = ev?.reliability_score ? Number(ev.reliability_score) : null;

            return (
              <div key={n.id} className="rounded-xl bg-card p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {n.name.split(" ").map((w: string) => w[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{n.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {n.divisions?.name || "No Division"} • {n.departments?.name || "Unassigned"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-accent" fill="currentColor" />
                    <span className="text-sm font-bold text-foreground">{score !== null ? `${score}%` : "N/A"}</span>
                  </div>
                </div>
                {score !== null ? (
                  <>
                    <div className="mt-3 h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${score}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                      <span>Attendance: {attendanceScore ?? "—"}%</span>
                      <span>Quality: {qualityScore ?? "—"}%</span>
                      <span>Reliability: {reliabilityScore ?? "—"}%</span>
                    </div>
                    {ev?.remarks && (
                      <p className="mt-2 text-xs text-muted-foreground italic">"{ev.remarks}"</p>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">No evaluation recorded yet</p>
                )}
                <div className="mt-2 text-xs text-muted-foreground">
                  Experience: {n.experience_years || 0} yrs
                  {ev?.evaluation_period && <span> • Period: {ev.evaluation_period}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Manage Nurses View ─────────────────────────────────────────

const HNManageView = () => {
  const [showAdd, setShowAdd] = useState(false);
  const [nurses, setNurses] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newDivisionId, setNewDivisionId] = useState("");
  const [newDeptId, setNewDeptId] = useState("");
  const [newExperience, setNewExperience] = useState("");
  const [newExamScore, setNewExamScore] = useState("");

  const fetchData = useCallback(async () => {
    const [nursesRes, divsRes, deptsRes] = await Promise.all([
      supabase.from("nurses").select("id, name, phone, age, gender, experience_years, exam_score_percentage, division_id, current_department_id, is_active, divisions:divisions(name), departments:departments(name)").eq("is_active", true),
      supabase.from("divisions").select("id, name"),
      supabase.from("departments").select("id, name"),
    ]);
    setNurses(nursesRes.data || []);
    setDivisions(divsRes.data || []);
    setDepartments(deptsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddNurse = async () => {
    if (!newName || !newPhone) {
      toast({ title: "Missing fields", description: "Name and phone are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("nurses").insert({
      name: newName,
      phone: newPhone,
      age: newAge ? parseInt(newAge) : null,
      gender: newGender as any || null,
      division_id: newDivisionId || null,
      current_department_id: newDeptId || null,
      experience_years: newExperience ? parseInt(newExperience) : 0,
      exam_score_percentage: newExamScore ? parseFloat(newExamScore) : null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Nurse Added", description: `${newName} has been added to the system.` });
      setNewName(""); setNewPhone(""); setNewAge(""); setNewGender(""); setNewDivisionId(""); setNewDeptId(""); setNewExperience(""); setNewExamScore("");
      setShowAdd(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleRemove = async (nurse: any) => {
    // Optimistically remove from UI so the row disappears immediately.
    const previousNurses = nurses;
    setNurses((prev) => prev.filter((n) => n.id !== nurse.id));

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    const { error } = await supabase.from("nurses").update({ is_active: false }).eq("id", nurse.id);
    if (error) {
      setNurses(previousNurses);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    const { error: removalError } = await supabase.from("nurse_removals").insert({
      nurse_id: nurse.id,
      nurse_name: nurse.name,
      reason: "Removed by Head Nurse",
      removed_by: userId!,
    });

    if (removalError) {
      toast({ title: "Warning", description: "Nurse was removed but removal log could not be saved.", variant: "destructive" });
    }

    toast({ title: "Nurse Removed", description: `${nurse.name} has been deactivated.` });
    fetchData();
  };

  const filtered = nurses.filter((n) => {
    const q = search.toLowerCase();
    return n.name.toLowerCase().includes(q) || n.phone.includes(q);
  });

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">Manage Nurses</h2>
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
        <div className="rounded-xl bg-card p-6 shadow-card">
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
              <Label>Division</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newDivisionId} onChange={(e) => setNewDivisionId(e.target.value)}>
                <option value="">Select division</option>
                {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newDeptId} onChange={(e) => setNewDeptId(e.target.value)}>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Experience (years)</Label><Input type="number" placeholder="0" value={newExperience} onChange={(e) => setNewExperience(e.target.value)} /></div>
            <div className="space-y-2"><Label>Exam Score (%)</Label><Input type="number" placeholder="0-100" value={newExamScore} onChange={(e) => setNewExamScore(e.target.value)} /></div>
          </div>
          <Button variant="hero" className="mt-4" onClick={handleAddNurse} disabled={saving}>
            {saving && <Loader2 size={16} className="mr-1 animate-spin" />}
            Save Nurse
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">{search ? "No nurses match your search." : "No active nurses. Add a nurse above to get started."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Division</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Phone</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Exp</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((n) => (
                <tr key={n.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{n.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.divisions?.name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.departments?.name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.experience_years || 0} yrs</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemove(n)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            {filtered.length} active nurses
          </div>
        </div>
      )}
    </div>
  );
};

export default HeadNurseDashboard;
