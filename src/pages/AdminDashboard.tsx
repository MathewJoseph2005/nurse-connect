/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, UserPlus, Calendar, ArrowLeftRight, Activity, LogOut,
  Menu, X, Loader2, Search, Wand2, Check, XCircle, Plus, Shield
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logo from "@/assets/logo.png";

type Tab = "overview" | "nurses" | "head_nurses" | "admins" | "schedules" | "swaps" | "logs";

const SHIFT_LABELS: Record<string, string> = {
  morning: "Morning (6AM-2PM)",
  evening: "Evening (2PM-10PM)",
  night: "Night (10PM-6AM)",
};

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatTimeAgo(ts: string) {
  const diffMs = Date.now() - new Date(ts).getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  return `${diffD}d ago`;
}

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const tabs = [
    { key: "overview" as const, icon: LayoutDashboard, label: "Overview" },
    { key: "nurses" as const, icon: Users, label: "All Nurses" },
    { key: "head_nurses" as const, icon: UserPlus, label: "Head Nurses" },
    { key: "admins" as const, icon: Shield, label: "Admins" },
    { key: "schedules" as const, icon: Calendar, label: "Schedules" },
    { key: "swaps" as const, icon: ArrowLeftRight, label: "Swap Requests" },
    { key: "logs" as const, icon: Activity, label: "Activity Logs" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-card shadow-card transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b p-4">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg" />
            <div><p className="text-sm font-bold text-foreground">Caritas Hospital</p><p className="text-xs text-muted-foreground">Admin Panel</p></div>
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
          <h1 className="text-lg font-bold text-foreground">Admin <span className="text-primary">Dashboard</span></h1>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">AD</div>
        </header>

        <div className="p-4 md:p-6">
          {activeTab === "overview" && <AdminOverview />}
          {activeTab === "nurses" && <AdminNurses />}
          {activeTab === "head_nurses" && <AdminHeadNurses />}
          {activeTab === "admins" && <AdminAdmins />}
          {activeTab === "schedules" && <AdminSchedules />}
          {activeTab === "swaps" && <AdminSwaps />}
          {activeTab === "logs" && <AdminLogs />}
        </div>
      </main>
    </div>
  );
};

// ─── Overview ───────────────────────────────────────────────────

const AdminOverview = () => {
  const [stats, setStats] = useState({ nurses: 0, shifts: 0, pendingSwaps: 0, departments: 0 });
  const [divisionDist, setDivisionDist] = useState<{ name: string; count: number }[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [nursesRes, shiftsRes, swapsRes, deptsRes, divsRes, logsRes] = await Promise.all([
        supabase.from("nurses").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("schedules").select("id", { count: "exact", head: true }).gte("duty_date", new Date().toISOString().split("T")[0]),
        supabase.from("shift_swap_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("departments").select("id", { count: "exact", head: true }),
        supabase.from("nurses").select("division_id, divisions:divisions(name)").eq("is_active", true),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      setStats({
        nurses: nursesRes.count || 0,
        shifts: shiftsRes.count || 0,
        pendingSwaps: swapsRes.count || 0,
        departments: deptsRes.count || 0,
      });

      // Calculate division distribution
      const divCounts: Record<string, { name: string; count: number }> = {};
      for (const n of (divsRes.data || []) as any[]) {
        const divName = n.divisions?.name || "Unassigned";
        if (!divCounts[divName]) divCounts[divName] = { name: divName, count: 0 };
        divCounts[divName].count++;
      }
      setDivisionDist(Object.values(divCounts).sort((a, b) => b.count - a.count));

      setRecentLogs(logsRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const totalNurses = divisionDist.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Nurses", value: String(stats.nurses) },
          { label: "Upcoming Shifts", value: String(stats.shifts) },
          { label: "Pending Swaps", value: String(stats.pendingSwaps) },
          { label: "Departments", value: String(stats.departments) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-card p-5 shadow-card">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="text-sm font-bold text-foreground">Division Distribution</h3>
          <div className="mt-4 space-y-3">
            {divisionDist.length === 0 ? (
              <p className="text-xs text-muted-foreground">No nurses registered yet.</p>
            ) : (
              divisionDist.map((d) => {
                const pct = Math.round((d.count / totalNurses) * 100);
                return (
                  <div key={d.name}>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-bold text-foreground">{d.count} ({pct}%)</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
          <div className="mt-4 space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            ) : (
              recentLogs.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg bg-background p-3">
                  <p className="text-xs text-foreground">{a.description || a.action}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{formatTimeAgo(a.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Head Nurses ────────────────────────────────────────────────

const AdminHeadNurses = () => {
  const [headNurses, setHeadNurses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "", confirmPassword: "", department_id: "" });

  const fetchData = async () => {
    setLoading(true);
    const [hnRes, deptRes] = await Promise.all([
      supabase.from("head_nurses").select("id, name, username, department_id, departments:departments(name), created_at"),
      supabase.from("departments").select("id, name").order("name"),
    ]);
    setHeadNurses(hnRes.data || []);
    setDepartments(deptRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.username || !form.password || !form.confirmPassword) {
      toast({ title: "Missing fields", description: "Name, username, password and confirm password are required.", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "Password mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
      const email = `${form.username.toLowerCase().replace(/\s/g, "")}@headnurse.local`;
      const res = await fetch(`${apiBase}/functions/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          role: "head_nurse",
          name: form.name,
          username: form.username,
          department_id: form.department_id || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create head nurse");
      toast({ title: "Head Nurse Created", description: `${form.name} can now log in with username "${form.username}".` });
      setForm({ name: "", username: "", password: "", confirmPassword: "", department_id: "" });
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">Head Nurses ({headNurses.length})</h2>
        <Button variant="hero" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-1" /> Add Head Nurse
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card p-5 shadow-card space-y-4">
          <h3 className="text-sm font-bold text-foreground">Create Head Nurse Account</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sarah Johnson" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Username *</label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. sjohnson" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password *</label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Confirm Password *</label>
              <Input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Confirm password" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Department</label>
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="hero" size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />}
              {creating ? "Creating..." : "Create Account"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {headNurses.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card">
          <UserPlus className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No head nurses yet. Click "Add Head Nurse" to create one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card shadow-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Username</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Department</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Created</th>
            </tr></thead>
            <tbody className="divide-y">
              {headNurses.map((hn) => (
                <tr key={hn.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{hn.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{hn.username}</td>
                  <td className="px-4 py-3 text-muted-foreground">{hn.departments?.name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(hn.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Nurses ─────────────────────────────────────────────────────

const AdminNurses = () => {
  const [nurses, setNurses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("nurses")
        .select("id, name, phone, is_active, divisions:divisions(name), departments:departments(name)")
        .order("name");
      setNurses(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const filtered = nurses.filter((n) => {
    const q = search.toLowerCase();
    return n.name.toLowerCase().includes(q) || (n.divisions?.name || "").toLowerCase().includes(q) || (n.departments?.name || "").toLowerCase().includes(q);
  });

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">All Nurses ({nurses.length})</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-10 w-60 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No nurses found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card shadow-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Division</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Department</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Phone</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
            </tr></thead>
            <tbody className="divide-y">
              {filtered.map((n) => (
                <tr key={n.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{n.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.divisions?.name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.departments?.name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.phone}</td>
                  <td className="px-4 py-3">
                    <Badge className={n.is_active ? "bg-primary/10 text-primary border-0" : "bg-destructive/10 text-destructive border-0"}>
                      {n.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Schedules ──────────────────────────────────────────────────

const AdminSchedules = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");

  const now = new Date();
  const [selectedWeek, setSelectedWeek] = useState(getISOWeek(now));
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("schedules")
      .select("id, duty_date, shift_type, nurse:nurses(name), department:departments(name)")
      .eq("week_number", selectedWeek)
      .eq("year", selectedYear)
      .order("duty_date")
      .order("shift_type");
    setSchedules((data as any[]) || []);
    setLoading(false);
  }, [selectedWeek, selectedYear]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
      const requestGenerate = async (forceAssignRemaining = false) => {
        const response = await fetch(`${apiBase}/functions/generate-schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

      if (!res.ok) throw new Error(result?.error || "Unable to generate schedule");

      toast({ title: "Schedule Generated", description: `${result.stats.total_entries} entries for ${result.stats.nurses_scheduled} nurses.` });
      await fetchSchedule();
    } catch (err: any) {
      toast({ title: "Cannot Auto-Generate", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const filtered = schedules.filter((s) => {
    const q = search.toLowerCase();
    return (s.nurse?.name || "").toLowerCase().includes(q) || (s.department?.name || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">Schedules</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="number" min={1} max={53} value={selectedWeek} onChange={(e) => setSelectedWeek(Number(e.target.value))} className="w-20 h-9" />
          <Input type="number" min={2024} max={2030} value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-24 h-9" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-10 w-48 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="pink" size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Wand2 size={16} className="mr-1" />}
            {generating ? "Generating..." : "Auto-Generate"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No schedule for Week {selectedWeek}, {selectedYear}.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card shadow-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-foreground">Nurse</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Department</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Shift</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
            </tr></thead>
            <tbody className="divide-y">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{s.nurse?.name || "Unknown"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.department?.name || "Unknown"}</td>
                  <td className="px-4 py-3">
                    <Badge className={s.shift_type === "morning" ? "bg-primary/10 text-primary border-0" : s.shift_type === "evening" ? "bg-accent/20 text-accent border-0" : "bg-muted text-foreground border-0"}>
                      {SHIFT_LABELS[s.shift_type] || s.shift_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.duty_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            {filtered.length} entries • {new Set(filtered.map((s: any) => s.nurse?.name)).size} nurses
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Swaps ──────────────────────────────────────────────────────

const AdminSwaps = () => {
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("shift_swap_requests")
        .select(`
          id, status, created_at,
          requester:nurses!shift_swap_requests_requester_nurse_id_fkey(name),
          target:nurses!shift_swap_requests_target_nurse_id_fkey(name),
          requester_schedule:schedules!shift_swap_requests_requester_schedule_id_fkey(duty_date, shift_type, department:departments(name)),
          target_schedule:schedules!shift_swap_requests_target_schedule_id_fkey(duty_date, shift_type, department:departments(name))
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      setSwaps(data || []);
      setLoading(false);
    };
    fetch();
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
      setSwaps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in space-y-4">
      <h2 className="text-lg font-bold text-foreground">All Swap Requests</h2>
      {swaps.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card">
          <ArrowLeftRight className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No swap requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {swaps.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4 shadow-card">
              <div>
                <p className="text-sm font-medium text-foreground">{s.requester?.name || "?"} ↔ {s.target?.name || "?"}</p>
                <p className="text-xs text-muted-foreground">
                  {s.requester_schedule?.shift_type} — {s.requester_schedule?.department?.name} ⟷ {s.target_schedule?.shift_type} — {s.target_schedule?.department?.name}
                  {" • "}{formatTimeAgo(s.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {s.status === "pending" ? (
                  <>
                    <Button variant="hero" size="sm" onClick={() => handleAction(s.id, "approved")}><Check size={14} className="mr-1" /> Approve</Button>
                    <Button variant="outline" size="sm" onClick={() => handleAction(s.id, "rejected")}><XCircle size={14} className="mr-1" /> Reject</Button>
                  </>
                ) : (
                  <Badge className={s.status === "approved" ? "bg-primary/10 text-primary border-0" : "bg-destructive/10 text-destructive border-0"}>
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Logs ───────────────────────────────────────────────────────

const AdminLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setLogs(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in space-y-4">
      <h2 className="text-lg font-bold text-foreground">Activity Logs</h2>
      {logs.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card">
          <Activity className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No activity logs yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between rounded-lg bg-card p-4 shadow-card">
              <div>
                <p className="text-sm font-medium text-foreground">{log.description || log.action}</p>
                <p className="text-xs text-muted-foreground">Action: {log.action}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Admins ─────────────────────────────────────────────────────

const AdminAdmins = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "" });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admins")
      .select("id, name, username, created_at")
      .order("created_at", { ascending: false });
    setAdmins(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.username || !form.password) {
      toast({ title: "Missing fields", description: "Name, username and password are required.", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
      const email = `${form.username.toLowerCase().replace(/\s/g, "")}@admin.local`;
      const res = await fetch(`${apiBase}/functions/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email,
          password: form.password,
          role: "admin",
          name: form.name,
          username: form.username,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create admin");
      toast({ title: "Admin Created", description: `${form.name} can now log in with username "${form.username}".` });
      setForm({ name: "", username: "", password: "" });
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">Admins ({admins.length})</h2>
        <Button variant="hero" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-1" /> Add Admin
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card p-5 shadow-card space-y-4">
          <h3 className="text-sm font-bold text-foreground">Create Admin Account</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Smith" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Username *</label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. jsmith" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password *</label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="hero" size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />}
              {creating ? "Creating..." : "Create Account"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {admins.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No admins in the database yet. Click "Add Admin" to create one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card shadow-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Username</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Created</th>
            </tr></thead>
            <tbody className="divide-y">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{admin.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{admin.username}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(admin.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
