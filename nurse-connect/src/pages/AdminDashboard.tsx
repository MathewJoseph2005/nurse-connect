/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, UserPlus, Calendar, ArrowLeftRight, Activity, LogOut,
  Menu, X, Loader2, Search, Wand2, Check, XCircle, Plus, Shield, User, Edit3, ChevronDown, Trash2
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logo from "@/assets/logo.svg";

type Tab = "overview" | "nurses" | "head_nurses" | "admins" | "schedules" | "swaps" | "logs";

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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [adminProfile, setAdminProfile] = useState<{ name: string; photo_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("admins")
        .select("name, photo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setAdminProfile({
          name: data.name,
          photo_url: data.photo_url || null,
        });
      }
    };
    fetchProfile();
  }, [user]);

  const initials = adminProfile?.name
    ? adminProfile.name.split(" ").map((w) => w[0]).join("").toUpperCase()
    : "AD";

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setProfileMenuOpen(false);
    if (profileMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [profileMenuOpen]);

  const tabs = [
    { key: "overview" as const, icon: LayoutDashboard, label: "Overview" },
    { key: "nurses" as const, icon: Users, label: "All Nurses" },
    { key: "head_nurses" as const, icon: UserPlus, label: "Head Nurses" },
    { key: "admins" as const, icon: Shield, label: "Admins" },
    { key: "schedules" as const, icon: Calendar, label: "Schedules" },
    { key: "logs" as const, icon: Activity, label: "Activity Logs" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-card shadow-card transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b p-4">
            <Link to="/">
              <img src={logo} alt="Logo" className="h-12 w-auto object-contain" />
            </Link>
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
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:px-6 relative">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden"><Menu size={22} /></button>
          <h1 className="text-lg font-bold text-foreground">Admin <span className="text-primary">Dashboard</span></h1>

          {/* Profile Menu */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary hover:bg-primary/20 transition-colors overflow-hidden"
            >
              <Avatar className="h-full w-full">
                {adminProfile?.photo_url ? (
                  <AvatarImage src={adminProfile.photo_url} alt={adminProfile.name} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-transparent text-sm font-bold">{initials}</AvatarFallback>
              </Avatar>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg z-50">
                {/* Profile Info */}
                <div className="border-b px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{adminProfile?.name || "Administrator"}</p>
                  <p className="text-xs text-muted-foreground">Super Admin</p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate("/admin-profile");
                      setProfileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <User size={16} />
                    <span>View Profile</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-4 md:p-6">
          {activeTab === "overview" && <AdminOverview />}
          {activeTab === "nurses" && <AdminNurses />}
          {activeTab === "head_nurses" && <AdminHeadNurses />}
          {activeTab === "admins" && <AdminAdmins />}
          {activeTab === "schedules" && <AdminSchedules />}
          {activeTab === "logs" && <AdminLogs />}
        </div>
      </main>
    </div>
  );
};

// --- Overview ---------------------------------------------------

function AdminOverview() {
  const [stats, setStats] = useState({ nurses: 0, shifts: 0, pendingSwaps: 0, departments: 0 });
  const [divisionDist, setDivisionDist] = useState<{ name: string; count: number }[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [nursesRes, headNursesRes, shiftsRes, swapsRes, deptsRes, nursesDivRes, headNursesDivRes, logsRes] = await Promise.all([
        supabase.from("nurses").select("id", { count: "exact", head: true }),
        supabase.from("head_nurses").select("id", { count: "exact", head: true }),
        supabase.from("schedules").select("id", { count: "exact", head: true }).gte("duty_date", new Date().toISOString().split("T")[0]),
        supabase.from("shift_swap_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("departments").select("id", { count: "exact", head: true }),
        supabase.from("nurses").select("division_id, divisions:divisions(name)"),
        supabase.from("head_nurses").select("division_id, divisions:divisions(name)"),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      setStats({
        nurses: (nursesRes.count || 0) + (headNursesRes.count || 0),
        shifts: shiftsRes.count || 0,
        pendingSwaps: swapsRes.count || 0,
        departments: deptsRes.count || 0,
      });

      // Calculate division distribution (including both nurses and head nurses)
      const divCounts: Record<string, { name: string; count: number }> = {};
      for (const n of [...(nursesDivRes.data || []), ...(headNursesDivRes.data || [])] as any[]) {
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


// --- Head Nurses ------------------------------------------------

function AdminHeadNurses() {
  const [headNurses, setHeadNurses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "", confirmPassword: "", department_id: "", division_id: "", ward_id: "" });
  const [editingHN, setEditingHN] = useState<any>(null);
  const [editForm, setEditForm] = useState({ experience_years: "", exam_score_percentage: "" });
  const navigate = useNavigate();
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    const [hnRes, deptRes, divRes, wardsRes] = await Promise.all([
      supabase.from("head_nurses").select("id, name, username, department_id, division_id, experience_years, exam_score_percentage, departments:departments(name), divisions:divisions(name), wards:wards(name), created_at"),
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("divisions").select("id, name").order("name"),
      supabase.from("wards").select("id, name, department_id").order("name"),
    ]);
    setHeadNurses(hnRes.data || []);
    setDepartments(deptRes.data || []);
    setDivisions(divRes.data || []);
    setWards(wardsRes.data || []);
    const loadedHn = hnRes.data || [];
    setHeadNurses(loadedHn);
    setExpandedDepts(new Set(loadedHn.map((r: any) => r.departments?.name || "Unassigned")));
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
      const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
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
            division_id: form.division_id || null,
            ward_id: form.ward_id || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create head nurse");
      toast({ title: "Head Nurse Created", description: `${form.name} can now log in with username "${form.username}".` });
      setForm({ name: "", username: "", password: "", confirmPassword: "", department_id: "", division_id: "", ward_id: "" });
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const toggleDept = (name: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const groupedHeadNurses = headNurses.reduce((acc: Record<string, any[]>, hn) => {
    const key = hn.departments?.name || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(hn);
    return acc;
  }, {});

  const hnDeptNames = Object.keys(groupedHeadNurses).sort();

  const handleEditHN = (hn: any) => {
    setEditingHN(hn);
    setEditForm({
      experience_years: hn.experience_years?.toString() || "0",
      exam_score_percentage: hn.exam_score_percentage?.toString() || "",
    });
  };

  const handleSaveHNEdit = async () => {
    if (!editingHN) return;
    setCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
      
      const res = await fetch(`${apiBase}/db/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          table: "head_nurses",
          action: "update",
          filters: [{ field: "id", op: "eq", value: editingHN.id }],
          payload: {
            experience_years: parseInt(editForm.experience_years) || 0,
            exam_score_percentage: editForm.exam_score_percentage ? parseFloat(editForm.exam_score_percentage) : null,
          }
        }),
      });

      if (!res.ok) throw new Error("Failed to update head nurse");
      toast({ title: "Head Nurse Updated", description: "Profile has been updated successfully." });
      setEditingHN(null);
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
        <div className="flex flex-wrap gap-2">
          <Button variant="hero" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} className="mr-1" /> Add Head Nurse
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/assign-headnurse-department")}>
            <Wand2 size={16} className="mr-1" /> Assign Department
          </Button>
        </div>
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
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ward</label>
              <Select value={form.ward_id} onValueChange={(v) => setForm({ ...form, ward_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Ward" /></SelectTrigger>
                <SelectContent>
                  {wards
                    .filter((w) => !form.department_id || String(w.department_id) === String(form.department_id))
                    .map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Acuity (Division)</label>
              <Select value={form.division_id} onValueChange={(v) => setForm({ ...form, division_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Acuity" /></SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => (
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
        <div className="space-y-3">
          {hnDeptNames.map((dept) => (
            <div key={dept} className="rounded-xl bg-card shadow-card overflow-hidden">
              <button
                onClick={() => toggleDept(dept)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors border-b"
              >
                <div className="flex items-center gap-3">
                  <ChevronDown
                    size={18}
                    className={`text-primary transition-transform ${expandedDepts.has(dept) ? "rotate-180" : ""}`}
                  />
                  <div className="text-left">
                    <p className="font-semibold text-foreground">{dept}</p>
                    <p className="text-xs text-muted-foreground">
                      {groupedHeadNurses[dept].length} Head Nurse{groupedHeadNurses[dept].length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{groupedHeadNurses[dept].length}</Badge>
              </button>

              {expandedDepts.has(dept) && (
                <div className="overflow-x-auto bg-muted/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Username</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Ward</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Acuity</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Created</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {groupedHeadNurses[dept].map((hn) => (
                        <tr key={hn.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{hn.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{hn.username}</td>
                          <td className="px-4 py-3 text-muted-foreground">{hn.wards?.name || "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{hn.divisions?.name || "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{new Date(hn.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditHN(hn)}>
                              <Edit3 size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Head Nurse Dialog */}
      <Dialog open={!!editingHN} onOpenChange={(open) => !open && setEditingHN(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Head Nurse</DialogTitle>
            <DialogDescription>Update profile for {editingHN?.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Experience (Years)</label>
              <Input 
                type="number" 
                value={editForm.experience_years} 
                onChange={(e) => setEditForm({ ...editForm, experience_years: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam Score (%)</label>
              <Input 
                type="number" 
                step="0.01"
                value={editForm.exam_score_percentage} 
                onChange={(e) => setEditForm({ ...editForm, exam_score_percentage: e.target.value })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingHN(null)}>Cancel</Button>
            <Button variant="hero" onClick={handleSaveHNEdit} disabled={creating}>
              {creating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// --- Nurses -----------------------------------------------------

function AdminNurses() {
  const [nurses, setNurses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [nurseToRemove, setNurseToRemove] = useState<any>(null);
  const [removingNurse, setRemovingNurse] = useState(false);
  const [togglingNurse, setTogglingNurse] = useState<string | null>(null);
  const [editingNurse, setEditingNurse] = useState<any>(null);
  const [editForm, setEditForm] = useState({ experience_years: "", exam_score_percentage: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [nursesRes, headNursesRes] = await Promise.all([
      supabase
        .from("nurses")
        .select("id, name, phone, is_active, experience_years, exam_score_percentage, divisions:divisions(name), departments:departments(name), wards:wards(name)")
        .order("name"),
      supabase
        .from("head_nurses")
        .select("id, name, username, experience_years, exam_score_percentage, departments:departments(name), divisions:divisions(name), wards:wards(name)")
        .order("name")
    ]);

    const nursesData = (nursesRes.data || []).map(n => ({ ...n, role: 'nurse' }));
    const headNursesData = (headNursesRes.data || []).map(hn => ({
      id: hn.id,
      name: hn.name,
      phone: hn.username,
      is_active: true,
      divisions: hn.divisions,
      departments: hn.departments,
      wards: hn.wards,
      role: 'head_nurse'
    }));

    const combined = [...headNursesData, ...nursesData].sort((a, b) => a.name.localeCompare(b.name));
    
    setNurses(combined);
    setExpandedDepts(new Set(combined.map((r: any) => r.departments?.name || "Unassigned")));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleStatus = async (nurse: any) => {
    if (nurse.role === 'head_nurse') {
      toast({ title: "Error", description: "Cannot deactivate head nurses from here", variant: "destructive" });
      return;
    }
    
    setTogglingNurse(nurse.id);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";

    try {
      const res = await fetch(`${apiBase}/functions/nurses/${nurse.id}/toggle-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to toggle nurse status");
      toast({ 
        title: "Status Updated", 
        description: `${nurse.name} is now ${nurse.is_active ? "Inactive" : "Active"}.` 
      });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setTogglingNurse(null);
    }
  };

  const handleRemove = async () => {
    if (!nurseToRemove) return;
    setRemovingNurse(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";

    try {
      const res = await fetch(`${apiBase}/functions/nurses/${nurseToRemove.id}/deactivate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to remove nurse");
      toast({ title: "Nurse removed", description: `${nurseToRemove.name} has been permanently deleted.` });
      setNurseToRemove(null);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRemovingNurse(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const filtered = nurses.filter((n) => {
    const q = search.toLowerCase();
    return n.name.toLowerCase().includes(q) || (n.divisions?.name || "").toLowerCase().includes(q) || (n.departments?.name || "").toLowerCase().includes(q);
  });

  const toggleDept = (name: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const groupedNurses = filtered.reduce((acc: Record<string, any[]>, n) => {
    const key = n.departments?.name || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  const nurseDeptNames = Object.keys(groupedNurses).sort();

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
        <div className="space-y-3">
          {nurseDeptNames.map((dept) => (
            <div key={dept} className="rounded-xl bg-card shadow-card overflow-hidden">
              <button
                onClick={() => toggleDept(dept)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors border-b"
              >
                <div className="flex items-center gap-3">
                  <ChevronDown
                    size={18}
                    className={`text-primary transition-transform ${expandedDepts.has(dept) ? "rotate-180" : ""}`}
                  />
                  <div className="text-left">
                    <p className="font-semibold text-foreground">{dept}</p>
                    <p className="text-xs text-muted-foreground">
                      {groupedNurses[dept].length} Nurse{groupedNurses[dept].length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{groupedNurses[dept].length}</Badge>
              </button>

              {expandedDepts.has(dept) && (
                <div className="overflow-x-auto bg-muted/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Division</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Ward</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Phone</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {groupedNurses[dept].map((n) => (
                        <tr key={n.id} className={`transition-colors ${n.role === 'head_nurse' ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'}`}>
                          <td className="px-4 py-3 font-medium text-foreground">
                            {n.name}
                            {n.role === 'head_nurse' && (
                              <Badge variant="hero" className="ml-2 text-[10px] h-4 px-1.5 py-0">Head Nurse</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{n.divisions?.name || "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{n.wards?.name || "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{n.phone}</td>
                          <td className="px-4 py-3">
                            <Badge className={n.is_active ? "bg-primary/10 text-primary border-0" : "bg-destructive/10 text-destructive border-0"}>
                              {n.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {n.role === 'nurse' && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className={`h-8 w-8 p-0 ${n.is_active ? "text-destructive hover:bg-destructive/10" : "text-primary hover:bg-primary/10"}`}
                                    onClick={() => handleToggleStatus(n)}
                                    disabled={togglingNurse === n.id}
                                  >
                                    {togglingNurse === n.id ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : n.is_active ? (
                                      <X size={14} />
                                    ) : (
                                      <Check size={14} />
                                    )}
                                  </Button>
                                  {n.is_active && (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-primary hover:bg-primary/10 h-8 w-8 p-0" 
                                        onClick={() => {
                                          setEditingNurse(n);
                                          setEditForm({
                                            experience_years: n.experience_years?.toString() || "0",
                                            exam_score_percentage: n.exam_score_percentage?.toString() || "",
                                          });
                                        }}
                                      >
                                        <Edit3 size={14} />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0" 
                                        onClick={() => setNurseToRemove(n)}
                                      >
                                        <Trash2 size={14} />
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!nurseToRemove} onOpenChange={(open) => !open && setNurseToRemove(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Remove Nurse
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-bold text-foreground">{nurseToRemove?.name}</span>? 
              This action is <span className="font-bold text-destructive underline">permanent</span> and will delete the nurse and their account from the database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button variant="outline" onClick={() => setNurseToRemove(null)} disabled={removingNurse}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removingNurse}>
              {removingNurse ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Trash2 size={16} className="mr-2" />}
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Nurse Dialog */}
      <Dialog open={!!editingNurse} onOpenChange={(open) => !open && setEditingNurse(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Nurse Stats</DialogTitle>
            <DialogDescription>Update stats for {editingNurse?.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Experience (Years)</label>
              <Input 
                type="number" 
                value={editForm.experience_years} 
                onChange={(e) => setEditForm({ ...editForm, experience_years: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam Score (%)</label>
              <Input 
                type="number" 
                step="0.01"
                value={editForm.exam_score_percentage} 
                onChange={(e) => setEditForm({ ...editForm, exam_score_percentage: e.target.value })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNurse(null)}>Cancel</Button>
            <Button variant="hero" onClick={async () => {
              if (!editingNurse) return;
              setSavingEdit(true);
              try {
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData.session?.access_token;
                const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
                
                const res = await fetch(`${apiBase}/db/query`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({
                    table: "nurses",
                    action: "update",
                    filters: [{ field: "id", op: "eq", value: editingNurse.id }],
                    payload: {
                      experience_years: parseInt(editForm.experience_years) || 0,
                      exam_score_percentage: editForm.exam_score_percentage ? parseFloat(editForm.exam_score_percentage) : null,
                    }
                  }),
                });

                if (!res.ok) throw new Error("Failed to update nurse");
                toast({ title: "Nurse Updated", description: "Stats have been updated successfully." });
                setEditingNurse(null);
                await fetchData();
              } catch (err: any) {
                toast({ title: "Error", description: err.message, variant: "destructive" });
              } finally {
                setSavingEdit(false);
              }
            }} disabled={savingEdit}>
              {savingEdit ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Check size={14} className="mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// --- Schedules --------------------------------------------------

const SHIFT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  day:     { bg: "bg-amber-50 border-amber-200",   text: "text-amber-700",  dot: "bg-amber-400" },
  night:   { bg: "bg-indigo-50 border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-500" },
  morning: { bg: "bg-blue-50 border-blue-200",     text: "text-blue-700",   dot: "bg-blue-400" },
  evening: { bg: "bg-rose-50 border-rose-200",     text: "text-rose-600",   dot: "bg-rose-400" },
};

const WEEK_OPTIONS = Array.from({ length: 53 }, (_, i) => i + 1);
const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028];

function AdminSchedules() {
  const [schedules, setSchedules]     = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedWard, setSelectedWard] = useState("all");
  const [selectedShift, setSelectedShift] = useState("all");
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const now = new Date();
  const [selectedWeek, setSelectedWeek] = useState(String(getISOWeek(now)));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  useEffect(() => {
    Promise.all([
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("wards").select("id, name, department_id").order("name"),
    ]).then(([{ data: ddata }, { data: wdata }]) => {
      setDepartments(ddata || []);
      setWards(wdata || []);
    });
  }, []);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("schedules")
        .select("id, duty_date, shift_type, nurse:nurses(name), department:departments(id, name), ward:wards(id, name)")
        .eq("week_number", Number(selectedWeek))
        .eq("year", Number(selectedYear))
        .order("duty_date")
        .order("shift_type");
      const rows = (data as any[]) || [];
      setSchedules(rows);
      // Auto-expand all departments on load
      const deptNames = new Set(rows.map((r) => r.department?.name).filter(Boolean));
      setExpandedDepts(deptNames as Set<string>);
      setLoading(false);
    };
    fetchSchedule();
  }, [selectedWeek, selectedYear]);

  const toggleDept = (name: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Filter schedules
  const filtered = schedules.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = (s.nurse?.name || "").toLowerCase().includes(q) || (s.department?.name || "").toLowerCase().includes(q);
    const matchesDept  = selectedDept === "all"  || s.department?.name === selectedDept;
    const matchesWard  = selectedWard === "all" || s.ward?.id === selectedWard;
    const matchesShift = selectedShift === "all" || s.shift_type === selectedShift;
    return matchesSearch && matchesDept && matchesWard && matchesShift;
  });

  // Group by department -> date -> shift
  const grouped = filtered.reduce((acc: Record<string, any[]>, s) => {
    const key = s.department?.name || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const deptNames = Object.keys(grouped).sort();
  const totalNurses = new Set(filtered.map((s) => s.nurse?.name)).size;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* -- Header + Filter Bar -- */}
      <div className="rounded-xl bg-card shadow-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-foreground">Schedules</h2>
            {!loading && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Week {selectedWeek} · {selectedYear} · {filtered.length} shifts · {totalNurses} nurses
              </p>
            )}
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap gap-2">
          {/* Week */}
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="h-9 w-28">
              <SelectValue placeholder="Week" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {WEEK_OPTIONS.map((w) => (
                <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-9 w-24">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Department */}
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="h-9 w-52">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Ward */}
          <Select value={selectedWard} onValueChange={setSelectedWard}>
            <SelectTrigger className="h-9 w-52">
              <SelectValue placeholder="All Wards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Wards</SelectItem>
              {wards.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Shift */}
          <Select value={selectedShift} onValueChange={setSelectedShift}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="All Shifts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shifts</SelectItem>
              <SelectItem value="day">Day Shift (6AM - 6PM)</SelectItem>
              <SelectItem value="night">Night Shift (6PM - 6AM)</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search nurse..."
              className="pl-9 h-9 w-44"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* -- Content -- */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : deptNames.length === 0 ? (
        <div className="rounded-xl bg-card p-14 text-center shadow-card">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">No schedule found</p>
          <p className="text-xs text-muted-foreground">Try a different week, year, or filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {deptNames.map((deptName) => {
            const deptRows = grouped[deptName];
            const isOpen   = expandedDepts.has(deptName);

            const byDate = deptRows.reduce((acc: Record<string, any[]>, s) => {
              const date = s.duty_date;
              if (!acc[date]) acc[date] = [];
              acc[date].push(s);
              return acc;
            }, {});
            const sortedDates = Object.keys(byDate).sort();

            const deptNurseCount  = new Set(deptRows.map((r) => r.nurse?.name)).size;
            const deptShiftCounts = deptRows.reduce((acc: Record<string, number>, r) => {
              acc[r.shift_type] = (acc[r.shift_type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            return (
              <div key={deptName} className="rounded-lg bg-card shadow-card border border-border/40 overflow-hidden hover:shadow-lg transition-shadow">
                {/* Department header */}
                <button
                  onClick={() => toggleDept(deptName)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                      <Calendar size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-foreground">{deptName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{deptRows.length} shifts • {deptNurseCount} nurses</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-2">
                    <ChevronDown
                      size={18}
                      className={`text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {/* Shift badges row */}
                <div className="px-5 py-3 bg-muted/20 border-t border-border/30 flex flex-wrap gap-2">
                  {Object.entries(deptShiftCounts).map(([shift, count]) => {
                    const c = SHIFT_COLORS[shift] || SHIFT_COLORS.night;
                    return (
                      <span
                        key={shift}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${c.bg} ${c.text}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                        {shift === "day" ? "Day" : shift === "night" ? "Night" : shift === "morning" ? "Morning" : "Evening"} {String.fromCharCode(0x2500)}{count}
                      </span>
                    );
                  })}
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-border/30 max-h-96 overflow-y-auto">
                    {sortedDates.map((date) => {
                      const dayRows  = byDate[date];
                      const dayLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric",
                      });
                      const shiftOrder: Record<string, number> = { day: 0, night: 1, morning: 2, evening: 3 };
                      const sortedRows = [...dayRows].sort(
                        (a, b) => (shiftOrder[a.shift_type] ?? 9) - (shiftOrder[b.shift_type] ?? 9)
                      );

                      return (
                        <div key={date} className="border-b border-border/20 last:border-b-0">
                          <div className="sticky top-0 z-10 flex items-center justify-between bg-secondary/40 backdrop-blur-sm px-5 py-3 border-y border-border/40">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background shadow-sm border border-border/50">
                                <Calendar size={16} className="text-primary" />
                              </div>
                              <span className="text-sm font-bold text-foreground">{dayLabel}</span>
                            </div>
                            <Badge variant="outline" className="text-xs font-medium bg-background shadow-sm">
                              {dayRows.length} {dayRows.length === 1 ? 'shift' : 'shifts'}
                            </Badge>
                          </div>
                          <div className="divide-y divide-border/10 bg-background/50">
                            {sortedRows.map((s) => {
                              const c = SHIFT_COLORS[s.shift_type] || SHIFT_COLORS.night;
                              return (
                                <div
                                  key={s.id}
                                  className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 border border-border/50">
                                      <User size={14} className="text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-semibold text-foreground">
                                      {s.nurse?.name || "Unknown"}
                                    </span>
                                  </div>
                                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${c.bg} ${c.text} shadow-sm`}>
                                    <span className={`mr-1.5 h-2 w-2 rounded-full ${c.dot}`} />
                                    {SHIFT_LABELS[s.shift_type] || s.shift_type}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- Swaps ------------------------------------------------------

function AdminSwaps() {
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("shift_swap_requests")
        .select(`
          id, status, created_at,
          requester:nurses!shift_swap_requests_requester_nurse_id_fkey(name, divisions:divisions(name)),
          target:nurses!shift_swap_requests_target_nurse_id_fkey(name, divisions:divisions(name)),
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in space-y-4">
      <h2 className="text-lg font-bold text-foreground">All Swap Requests</h2>
      <p className="text-sm text-muted-foreground">Swap requests are automatically approved after mutual agreement.</p>
      {swaps.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card">
          <ArrowLeftRight className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No swap requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {swaps.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4 shadow-card">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{s.requester?.name || "?"}</p>
                  <ArrowLeftRight size={12} className="text-muted-foreground" />
                  <p className="text-sm font-bold text-foreground">{s.target?.name || "?"}</p>
                </div>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[10px] h-4 px-1">{s.requester?.divisions?.name || "No Acuity"}</Badge>
                    <span className="text-muted-foreground">
                      {s.requester_schedule?.duty_date} ({s.requester_schedule?.shift_type}) - {s.requester_schedule?.department?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[10px] h-4 px-1">{s.target?.divisions?.name || "No Acuity"}</Badge>
                    <span className="text-muted-foreground">
                      {s.target_schedule?.duty_date} ({s.target_schedule?.shift_type}) - {s.target_schedule?.department?.name}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground italic">Requested {formatTimeAgo(s.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  className={
                    s.status === "approved" ? "bg-primary/10 text-primary border-0" : 
                    s.status === "rejected" ? "bg-destructive/10 text-destructive border-0" :
                    "bg-amber-100 text-amber-700 border-0 dark:bg-amber-900/30 dark:text-amber-400"
                  }
                >
                  {s.status === "pending_target" ? "Pending Mutual Agreement" : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Logs -------------------------------------------------------

function AdminLogs() {
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

// --- Admins -----------------------------------------------------

function AdminAdmins() {
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
      const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
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
