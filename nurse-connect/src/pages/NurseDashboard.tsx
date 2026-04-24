/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Calendar, Clock, ArrowLeftRight, Bell, User, LogOut, Menu, X,
  Activity, Building2, ChevronRight, Loader2, BellRing, Camera, Edit3, MoreVertical
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import logo from "@/assets/logo.svg";
import { subscribeToPush, isPushSupported } from "@/lib/pushNotifications";

const SHIFT_LABELS: Record<string, string> = {
  day:     "Day Shift (6AM â€“ 6PM)",
  night:   "Night Shift (6PM â€“ 6AM)",
  morning: "Morning (6AM â€“ 2PM)",
  evening: "Evening (2PM â€“ 10PM)",
};

const WORKLOAD_MAP: Record<string, { label: string; width: string }> = {
  low: { label: "Low", width: "w-1/5" },
  medium: { label: "Medium", width: "w-3/5" },
  high: { label: "High", width: "w-full" },
};

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

interface NurseProfile {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  division_id: string | null;
  current_department_id: string | null;
  experience_years: number | null;
  exam_score_percentage: number | null;
  previous_departments: string[] | null;
  divisions: { name: string } | null;
  departments: { name: string } | null;
}

const NurseDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedule" | "swap" | "notifications" | "profile">("schedule");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [nurseProfile, setNurseProfile] = useState<NurseProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPushBanner, setShowPushBanner] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setProfileMenuOpen(false);
    if (profileMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [profileMenuOpen]);

  // Prompt for push notifications
  useEffect(() => {
    if (!user) return;
    if (!isPushSupported()) return;
    if (Notification.permission === "granted") return;
    if (localStorage.getItem("push_dismissed")) return;
    setShowPushBanner(true);
  }, [user]);

  const handleEnablePush = async () => {
    if (!user) return;
    const success = await subscribeToPush(user.id);
    if (success) {
      toast({ title: "Notifications Enabled", description: "You'll receive duty reminders on this device." });
    } else {
      toast({ title: "Could not enable", description: "Please allow notifications in your browser settings.", variant: "destructive" });
    }
    setShowPushBanner(false);
  };

  const handleDismissPush = () => {
    localStorage.setItem("push_dismissed", "true");
    setShowPushBanner(false);
  };

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("nurses")
        .select("id, name, phone, age, gender, division_id, current_department_id, experience_years, exam_score_percentage, previous_departments, divisions:divisions(name), departments:departments(name)")
        .eq("user_id", user.id)
        .maybeSingle();
      setNurseProfile(data as unknown as NurseProfile | null);
      setProfileLoading(false);
    };

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    };

    fetchProfile();
    fetchUnread();

    // Realtime subscription for notifications
    const channel = supabase
      .channel('nurse-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setUnreadCount((c) => c + 1);
          toast({
            title: (payload.new as any).title || "New Notification",
            description: (payload.new as any).message || "",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = nurseProfile?.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "N";

  const firstName = nurseProfile?.name?.split(" ")[0] || "Nurse";

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            {[
              { key: "schedule" as const, icon: Calendar, label: "My Schedule" },
              { key: "swap" as const, icon: ArrowLeftRight, label: "Shift Swap" },
              { key: "notifications" as const, icon: Bell, label: "Notifications" },
              { key: "profile" as const, icon: User, label: "My Profile" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === item.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
              >
                <item.icon size={18} />
                {item.label}
                {item.key === "notifications" && unreadCount > 0 && (
                  <Badge className="ml-auto bg-accent text-accent-foreground text-xs">{unreadCount}</Badge>
                )}
              </button>
            ))}
          </nav>

          <div className="border-t p-3">
            <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:px-6 relative">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden"><Menu size={22} /></button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Welcome, <span className="text-primary">{firstName}</span></h1>
            <p className="text-xs text-muted-foreground">
              {nurseProfile?.divisions?.name
                ? <span className="font-semibold">{nurseProfile.divisions.name}</span>
                : "No Acuity"}
              {" â€¢ "}{nurseProfile?.departments?.name || "Unassigned"}
            </p>
          </div>

          {/* Profile Menu */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary hover:bg-primary/20 transition-colors"
            >
              {initials}
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg z-50">
                {/* Profile Info */}
                <div className="border-b px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{nurseProfile?.name || "Nurse"}</p>
                  <p className="text-xs text-muted-foreground">{nurseProfile?.phone}</p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate("/nurse-profile");
                      setProfileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <User size={16} />
                    <span>View Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate("/nurse-profile/edit");
                      setProfileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <Edit3 size={16} />
                    <span>Edit Profile</span>
                  </button>

                  <div className="border-t my-1"></div>

                  <button
                    onClick={() => {
                      handleSignOut();
                      setProfileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {showPushBanner && (
          <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 p-4 md:mx-6">
            <BellRing className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Enable Push Notifications</p>
              <p className="text-xs text-muted-foreground">Get duty reminders 12h, 6h, and 3h before your shifts.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={handleDismissPush} className="text-xs">Dismiss</Button>
              <Button size="sm" onClick={handleEnablePush} className="text-xs">Enable</Button>
            </div>
          </div>
        )}

        <div className="p-4 md:p-6">
          {activeTab === "schedule" && nurseProfile && <ScheduleView nurseId={nurseProfile.id} deptName={nurseProfile.departments?.name || "Unassigned"} />}
          {activeTab === "swap" && nurseProfile && (
            <SwapView
              nurseId={nurseProfile.id}
              divisionId={nurseProfile.division_id}
              departmentId={nurseProfile.current_department_id}
            />
          )}
          {activeTab === "notifications" && user && <NotificationsView userId={user.id} onRead={() => setUnreadCount((c) => Math.max(0, c - 1))} />}
          {activeTab === "profile" && nurseProfile && <ProfileView profile={nurseProfile} />}
        </div>
      </main>
    </div>
  );
};

// â”€â”€â”€ Schedule View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ScheduleView = ({ nurseId, deptName }: { nurseId: string; deptName: string }) => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [workload, setWorkload] = useState<string>("low");

  const now = useMemo(() => new Date(), []);
  const weekNum = getISOWeek(now);
  const year = now.getFullYear();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("schedules")
        .select("id, duty_date, shift_type, department:departments(name)")
        .eq("nurse_id", nurseId)
        .eq("week_number", weekNum)
        .eq("year", year)
        .order("duty_date");

      setSchedules(data || []);

      // Fetch workload
      const { data: wl } = await supabase.rpc("get_nurse_workload", { nurse_uuid: nurseId });
      if (wl) setWorkload(wl);

      setLoading(false);
    };
    fetch();
  }, [nurseId, now, weekNum, year]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Build full week view (Mon-Sun) marking days off
  const monday = getDateOfISOWeek(weekNum, year);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const scheduleByDate = new Map<string, any>();
  for (const s of schedules) {
    scheduleByDate.set(s.duty_date, s);
  }

  const wl = WORKLOAD_MAP[workload] || WORKLOAD_MAP.low;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Shifts This Week</p><p className="text-xl font-bold text-foreground">{schedules.length}</p></div>
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20"><Activity className="h-5 w-5 text-accent" /></div>
            <div><p className="text-xs text-muted-foreground">Workload</p><p className="text-xl font-bold text-foreground">{wl.label}</p></div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted"><div className={`h-2 rounded-full bg-accent ${wl.width}`} /></div>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Current Dept</p><p className="text-xl font-bold text-foreground">{deptName}</p></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-card shadow-card">
        <div className="border-b p-5"><h2 className="text-lg font-bold text-foreground">Weekly Schedule</h2></div>
        <div className="divide-y">
          {weekDays.map((dateStr) => {
            const entry = scheduleByDate.get(dateStr);
            const d = new Date(dateStr + "T00:00:00");
            const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
            const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const isOff = !entry;

            return (
              <div key={dateStr} className={`flex items-center justify-between px-5 py-4 ${isOff ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-4">
                  <div className="w-24">
                    <p className="text-sm font-bold text-foreground">{dayName}</p>
                    <p className="text-xs text-muted-foreground">{dateLabel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isOff ? "Off" : SHIFT_LABELS[entry.shift_type] || entry.shift_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isOff ? "-" : entry.department?.name || "Unknown"}
                    </p>
                  </div>
                </div>
                <Badge variant={isOff ? "secondary" : "default"} className={isOff ? "" : "bg-primary/10 text-primary border-0"}>
                  {isOff ? "Day Off" : "Scheduled"}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ Swap View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SwapView = ({
  nurseId,
  divisionId,
  departmentId,
}: {
  nurseId: string;
  divisionId: string | null;
  departmentId: string | null;
}) => {
  const [mySchedules, setMySchedules] = useState<any[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [availableNurses, setAvailableNurses] = useState<any[]>([]);
  const [swapHistory, setSwapHistory] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const weekNum = getISOWeek(now);
  const year = now.getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      // My upcoming schedules
      const { data: myScheds } = await supabase
        .from("schedules")
        .select("id, duty_date, shift_type, department:departments(name)")
        .eq("nurse_id", nurseId)
        .eq("week_number", weekNum)
        .eq("year", year)
        .gte("duty_date", now.toISOString().split("T")[0])
        .order("duty_date");

      setMySchedules(myScheds || []);
      if (myScheds && myScheds.length > 0) {
        setSelectedSchedule(myScheds[0].id);
      }

      // Incoming requests
      const { data: incoming } = await supabase
        .from("shift_swap_requests")
        .select(`
          id, status, created_at,
          requester:nurses!shift_swap_requests_requester_nurse_id_fkey(name),
          requester_schedule:schedules!shift_swap_requests_requester_schedule_id_fkey(duty_date, shift_type, department:departments(name))
        `)
        .eq("target_nurse_id", nurseId)
        .eq("status", "pending_target")
        .order("created_at", { ascending: false });

      setIncomingRequests(incoming || []);

      // Swap history (both sent and received)
      const queryStr = `
        id, status, created_at, requester_nurse_id, target_nurse_id,
        requester:nurses!shift_swap_requests_requester_nurse_id_fkey(name),
        target:nurses!shift_swap_requests_target_nurse_id_fkey(name),
        requester_schedule:schedules!shift_swap_requests_requester_schedule_id_fkey(duty_date, shift_type, department:departments(name))
      `;
      
      const [sentRes, receivedRes] = await Promise.all([
        supabase.from("shift_swap_requests").select(queryStr).eq("requester_nurse_id", nurseId).order("created_at", { ascending: false }).limit(10),
        supabase.from("shift_swap_requests").select(queryStr).eq("target_nurse_id", nurseId).order("created_at", { ascending: false }).limit(10)
      ]);

      const history = [...(sentRes.data || []), ...(receivedRes.data || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setSwapHistory(history);
      setLoading(false);
    };
    fetchData();
  }, [nurseId, now, weekNum, year]);

  // When a schedule is selected, find nurses in the SAME DEPARTMENT and SAME ACUITY
  // who are also scheduled on the same date (different shift = swap candidate)
  useEffect(() => {
    if (!selectedSchedule) return;

    const selected = mySchedules.find((s) => s.id === selectedSchedule);
    if (!selected) return;

    const fetchAvailable = async () => {
      let query = supabase
        .from("schedules")
        .select("id, duty_date, shift_type, nurse_id, nurse:nurses(id, name, division_id, current_department_id), department:departments(name)")
        .eq("duty_date", selected.duty_date)
        .eq("week_number", weekNum)
        .eq("year", year)
        .neq("nurse_id", nurseId);

      // Filter by same department at the database level
      if (departmentId) {
        query = query.eq("department_id", departmentId);
      }

      const { data } = await query;

      // Also filter client-side by same acuity (division_id) if nurse has one
      const candidates = (data || []).filter((s: any) => {
        if (!divisionId) return true;          // no acuity set â†’ show all same-dept
        return s.nurse?.division_id === divisionId;
      });

      setAvailableNurses(candidates);
    };
    fetchAvailable();
  }, [selectedSchedule, mySchedules, divisionId, departmentId, nurseId, weekNum, year]);

  const handleSwapRequest = async (targetSchedule: any) => {
    setRequesting(targetSchedule.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiBase}/functions/swaps/nurse-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          requester_schedule_id: selectedSchedule!,
          target_schedule_id: targetSchedule.id,
          target_nurse_id: targetSchedule.nurse_id,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");
      toast({ title: "Swap Requested", description: `Request sent to ${targetSchedule.nurse?.name}` });
      // Refresh to show in history
      setSwapHistory((prev) => [{
        id: result.swap_id,
        status: "pending_target",
        requester_nurse_id: nurseId,
        target_nurse_id: targetSchedule.nurse_id,
        target: { name: targetSchedule.nurse?.name },
        requester_schedule: { duty_date: selected.duty_date, shift_type: selected.shift_type, department: { name: selected.department?.name } }
      }, ...prev].slice(0, 10));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRequesting(null);
    }
  };

  const handleIncomingResponse = async (swapId: string, action: "accepted" | "rejected") => {
    setRequesting(swapId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

      const res = await fetch(`${apiBase}/functions/swaps/nurse-respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ swap_id: swapId, action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to respond");
      toast({ title: "Success", description: `Swap request ${action}` });
      
      // Update UI
      setIncomingRequests((prev) => prev.filter((r) => r.id !== swapId));
      setSwapHistory((prev) => prev.map((h) => h.id === swapId ? { ...h, status: result.status } : h));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRequesting(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const selected = mySchedules.find((s) => s.id === selectedSchedule);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-xl bg-card p-6 shadow-card">
        <h2 className="text-lg font-bold text-foreground">Request Shift Swap</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a shift you'd like to swap. Only nurses in your <strong>department</strong> with the same <strong>Acuity level</strong> are shown as eligible swap partners.
        </p>

        {mySchedules.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No upcoming shifts to swap.</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {mySchedules.map((s) => {
                const d = new Date(s.duty_date + "T00:00:00");
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSchedule(s.id)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      s.id === selectedSchedule
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {" â€” "}
                    {SHIFT_LABELS[s.shift_type]?.split(" ")[0] || s.shift_type}
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className="mt-4 rounded-lg border bg-background p-4">
                <p className="text-xs font-medium text-muted-foreground">YOUR SHIFT</p>
                <p className="mt-1 text-sm font-bold text-foreground">
                  {new Date(selected.duty_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  {" â€” "}
                  {SHIFT_LABELS[selected.shift_type] || selected.shift_type}
                  {" at "}
                  {selected.department?.name || "Unknown"}
                </p>
              </div>
            )}

            <h3 className="mt-6 text-sm font-bold text-foreground">Available Nurses for Swap</h3>
            {availableNurses.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed bg-muted/30 p-6 text-center">
                <p className="text-sm font-medium text-foreground">No eligible swap partners found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No nurses in your department with the same acuity level are scheduled on this date.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {availableNurses.map((ns) => (
                  <div key={ns.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
                        {ns.nurse?.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{ns.nurse?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {SHIFT_LABELS[ns.shift_type]?.split(" ")[0] || ns.shift_type} â€¢ {ns.department?.name || "Unknown"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="pink"
                      size="sm"
                      disabled={requesting === ns.id}
                      onClick={() => handleSwapRequest(ns)}
                    >
                      {requesting === ns.id ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
                      Request Swap <ChevronRight size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {incomingRequests.length > 0 && (
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 shadow-card">
          <h2 className="text-lg font-bold text-primary">Incoming Swap Requests</h2>
          <div className="mt-4 space-y-3">
            {incomingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-lg bg-background p-4 shadow-sm border">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {req.requester?.name || "A nurse"} wants to swap
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Date: {req.requester_schedule?.duty_date} <br/>
                    Their Shift: {req.requester_schedule?.shift_type} ({req.requester_schedule?.department?.name})
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 border-destructive/20"
                    disabled={requesting === req.id}
                    onClick={() => handleIncomingResponse(req.id, "rejected")}
                  >
                    Decline
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white"
                    disabled={requesting === req.id}
                    onClick={() => handleIncomingResponse(req.id, "accepted")}
                  >
                    {requesting === req.id ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-card p-6 shadow-card">
        <h2 className="text-lg font-bold text-foreground">Swap History</h2>
        {swapHistory.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No swap requests yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {swapHistory.map((h) => {
              const isMine = h.requester_nurse_id === nurseId;
              const otherPersonName = isMine ? h.target?.name : h.requester?.name;
              let statusLabel = h.status.charAt(0).toUpperCase() + h.status.slice(1);
              let statusColor = "bg-accent/20 text-accent border-0";

              if (h.status === "approved") {
                statusColor = "bg-primary/10 text-primary border-0";
              } else if (h.status === "rejected") {
                statusColor = "bg-destructive/10 text-destructive border-0";
              } else if (h.status === "pending_target") {
                statusLabel = "Pending Target Nurse";
                statusColor = "bg-amber-100 text-amber-700 border-0 dark:bg-amber-900/30 dark:text-amber-400";
              } else if (h.status === "pending_admin" || h.status === "pending") {
                statusLabel = "Pending Head Nurse";
                statusColor = "bg-blue-100 text-blue-700 border-0 dark:bg-blue-900/30 dark:text-blue-400";
              }

              return (
                <div key={h.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {isMine ? "Sent" : "Received"}
                      </Badge>
                      <p className="text-sm font-medium text-foreground">
                        Swap with {otherPersonName || "Unknown"}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {h.requester_schedule?.duty_date} â€¢ {h.requester_schedule?.shift_type} ({h.requester_schedule?.department?.name})
                    </p>
                  </div>
                  <Badge className={statusColor}>
                    {statusLabel}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// â”€â”€â”€ Notifications View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const NotificationsView = ({ userId, onRead }: { userId: string; onRead: () => void }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications(data || []);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    onRead();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return "Yesterday";
    return `${diffD} days ago`;
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <h2 className="text-lg font-bold text-foreground">Notifications</h2>
      {notifications.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.is_read && markAsRead(n.id)}
            className={`flex items-start gap-3 rounded-xl p-4 shadow-card cursor-pointer transition-colors ${
              !n.is_read ? "border-l-4 border-accent bg-accent/5" : "bg-card"
            }`}
          >
            <Bell className={`mt-0.5 h-5 w-5 flex-shrink-0 ${!n.is_read ? "text-accent" : "text-muted-foreground"}`} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{n.title}</p>
              <p className="text-sm text-foreground">{n.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatTime(n.created_at)}</p>
            </div>
            {!n.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-accent flex-shrink-0" />}
          </div>
        ))
      )}
    </div>
  );
};

// â”€â”€â”€ Profile View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ProfileView = ({ profile }: { profile: NurseProfile }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    // Fetch current photo_url from nurses table
    const fetchPhoto = async () => {
      const { data } = await supabase
        .from("nurses")
        .select("photo_url")
        .eq("id", profile.id)
        .maybeSingle();
      if (data?.photo_url) setPhotoUrl(data.photo_url);
    };
    fetchPhoto();
  }, [profile.id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB allowed.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/profile.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("nurse-photos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("nurse-photos").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase.from("nurses").update({ photo_url: publicUrl } as any).eq("id", profile.id);
    setPhotoUrl(publicUrl);
    setUploading(false);
    toast({ title: "Photo updated!", description: "Your profile photo has been saved." });
  };

  const fields = [
    { label: "Phone", value: profile.phone },
    { label: "Age", value: profile.age ? String(profile.age) : "â€”" },
    { label: "Gender", value: profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : "â€”" },
    { label: "Acuity Level", value: profile.divisions?.name || "Not assigned" },
    { label: "Current Dept", value: profile.departments?.name || "Not assigned" },
    { label: "Exam Score", value: profile.exam_score_percentage ? `${profile.exam_score_percentage}%` : "â€”" },
    { label: "Experience", value: profile.experience_years ? `${profile.experience_years} years` : "â€”" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="rounded-xl bg-card p-6 shadow-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative group">
            <Avatar className="h-16 w-16 text-2xl">
              {photoUrl ? (
                <AvatarImage src={photoUrl} alt={profile.name} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">{initials}</AvatarFallback>
            </Avatar>
            <label
              htmlFor="photo-upload"
              className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
            <p className="text-sm text-muted-foreground">Registered Nurse</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/nurse-profile/edit")}
            className="w-full sm:w-auto"
          >
            <Edit3 size={16} className="mr-2" />
            Edit Profile
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {fields.map((item) => (
            <div key={item.label} className="rounded-lg bg-background p-3">
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-sm font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getDateOfISOWeek(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

export default NurseDashboard;
