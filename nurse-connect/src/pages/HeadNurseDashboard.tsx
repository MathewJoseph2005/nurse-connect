/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Menu, X, User, Calendar, ArrowLeftRight, ClipboardCheck, UserPlus } from "lucide-react";
import logo from "@/assets/logo.svg";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Import Refactored Sub-Components
import { HNScheduleView } from "@/components/HNScheduleView";
import { HNSwapView } from "@/components/HNSwapView";
import { HNPerformanceView } from "@/components/HNPerformanceView";
import { HNManageView } from "@/components/HNManageView";

interface HeadNurseProfile {
  id: string;
  name: string;
  department_id: string | null;
  department_name: string | null;
  ward_id: string | null;
  photo_url: string | null;
}

type Tab = "schedule" | "swaps" | "performance" | "manage";

const HeadNurseDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("schedule");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { signOut, user, session } = useAuth();
  const navigate = useNavigate();

  const [hnProfile, setHnProfile] = useState<HeadNurseProfile | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setProfileMenuOpen(false);
    if (profileMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
        const token = (session as any)?.access_token;
        const res = await fetch(`${API_BASE}/db/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            table: "head_nurses",
            action: "select",
            filters: [{ field: "user_id", op: "eq", value: user.id }],
            options: { maybeSingle: true },
          }),
        });
        if (!res.ok) return;
        const json = await res.json();
        const row = json.data;
        if (row) {
          setHnProfile({
            id: row.id,
            name: row.name,
            department_id: row.department_id || null,
            department_name: row.departments?.name ?? null,
            ward_id: row.ward_id || null,
            photo_url: row.photo_url || null,
          });
        }
      } catch (err) {
        console.error("Error fetching head nurse profile", err);
      }
    };
    fetchProfile();
  }, [user, session]);

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
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-card shadow-card transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b p-4">
            <Link to="/">
              <img src={logo} alt="Logo" className="h-12 w-auto object-contain" />
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto md:hidden text-muted-foreground hover:text-foreground transition-colors">
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setSidebarOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === t.key ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <t.icon size={18} />
                {t.label}
              </button>
            ))}
          </nav>
          <div className="border-t p-3">
            <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/80 backdrop-blur-md px-4 py-3 md:px-6">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground hover:text-foreground p-1 transition-colors">
            <Menu size={22} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Head Nurse <span className="text-primary font-extrabold">Dashboard</span></h1>
            {hnProfile?.department_name && (
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-widest">{hnProfile.department_name}</p>
            )}
          </div>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary hover:bg-primary/20 transition-all shadow-inner border border-primary/20 overflow-hidden ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="h-full w-full">
                {hnProfile?.photo_url ? (
                  <AvatarImage src={hnProfile.photo_url} alt={hnProfile.name} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-transparent text-sm font-bold">{initials}</AvatarFallback>
              </Avatar>
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-xl border border-border bg-card shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="border-b px-4 py-4 bg-muted/30 rounded-t-xl">
                  <p className="text-sm font-bold text-foreground leading-none">{hnProfile?.name || "Head Nurse"}</p>
                  <p className="text-xs text-muted-foreground mt-1.5 truncate">{user?.email}</p>
                  <Badge variant="outline" className="mt-2.5 text-[10px] border-primary/20 bg-primary/5 text-primary">{hnProfile?.department_name || "Staff"}</Badge>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate("/head-nurse-profile");
                      setProfileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                  >
                    <User size={16} />
                    <span>My Profile</span>
                  </button>
                  <div className="my-1 border-t border-border/50 mx-2" />
                  <button onClick={handleSignOut} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors">
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {activeTab === "schedule" && (
            <HNScheduleView 
              departmentId={hnProfile?.department_id} 
              wardId={hnProfile?.ward_id} 
            />
          )}
          {activeTab === "swaps" && <HNSwapView />}
          {activeTab === "performance" && (
            <HNPerformanceView departmentId={hnProfile?.department_id} />
          )}
          {activeTab === "manage" && (
            <HNManageView 
              departmentId={hnProfile?.department_id} 
              departmentName={hnProfile?.department_name} 
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default HeadNurseDashboard;
