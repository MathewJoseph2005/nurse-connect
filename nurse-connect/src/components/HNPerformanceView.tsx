import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Star, Loader2
} from "lucide-react";

interface Nurse {
  id: string;
  name: string;
  photo_url: string | null;
  divisions?: { name: string };
}

interface Evaluation {
  nurse_id: string;
  attendance_score: number;
  quality_score: number;
  reliability_score: number;
  overall_score: number;
  remarks: string;
  evaluation_period: string;
}

export const HNPerformanceView = (props: { departmentId?: string | null }) => {
  const { user, session } = useAuth();
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [loading, setLoading] = useState(true);
  
  const [selectedNurse, setSelectedNurse] = useState<Nurse | null>(null);
  const [attendance, setAttendance] = useState("");
  const [quality, setQuality] = useState("");
  const [reliability, setReliability] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !props.departmentId) return;
    const fetchData = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
        const token = (session as any)?.access_token;

        const [nursesRes, evalsRes] = await Promise.all([
          fetch(`${API_BASE}/db/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ 
              table: "nurses", 
              action: "select", 
              filters: [{ field: "is_active", op: "eq", value: true }, { field: "current_department_id", op: "eq", value: props.departmentId }] 
            }),
          }),
          fetch(`${API_BASE}/db/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ table: "performance_evaluations", action: "select", orders: [{ field: "created_at", ascending: false }] }),
          }),
        ]);

        const nursesJson = await nursesRes.json();
        const evalsJson = await evalsRes.json();

        if (nursesRes.ok) setNurses(nursesJson.data || []);
        const evalMap: Record<string, Evaluation> = {};
        if (evalsRes.ok && evalsJson.data) {
          for (const ev of evalsJson.data) {
            if (!evalMap[ev.nurse_id]) evalMap[ev.nurse_id] = ev;
          }
        }
        setEvaluations(evalMap);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching performance data", err);
        setLoading(false);
      }
    };
    fetchData();
  }, [user, session, props.departmentId]);

  const handleOpenEvaluation = (nurse: Nurse) => {
    setSelectedNurse(nurse);
    const ev = evaluations[nurse.id];
    setAttendance(ev?.attendance_score.toString() || "");
    setQuality(ev?.quality_score.toString() || "");
    setReliability(ev?.reliability_score.toString() || "");
    setRemarks(ev?.remarks || "");
  };

  const handleSaveEvaluation = async () => {
    if (!selectedNurse || !user) return;
    setSaving(true);
    
    const att = Number(attendance);
    const qual = Number(quality);
    const rel = Number(reliability);
    const overall = Math.round((att + qual + rel) / 3);

    const payload: Evaluation = {
      nurse_id: selectedNurse.id,
      attendance_score: att,
      quality_score: qual,
      reliability_score: rel,
      overall_score: overall,
      remarks,
      evaluation_period: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })
    };

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
      const token = (session as any)?.access_token;
      await fetch(`${API_BASE}/db/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          table: "performance_evaluations", 
          action: "insert", 
          payload: { ...payload, evaluated_by: user.id } 
        }),
      });
      toast({ title: "Evaluation Saved" });
      setEvaluations(prev => ({ ...prev, [selectedNurse.id]: payload }));
      setSelectedNurse(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

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
            const score = ev?.overall_score ?? null;
            return (
              <div key={n.id} className="rounded-xl bg-card p-5 shadow-card cursor-pointer hover:border-primary/50 transition-colors border-2 border-transparent" onClick={() => handleOpenEvaluation(n)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {n.photo_url ? <AvatarImage src={n.photo_url} className="object-cover" /> : null}
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">{n.name.split(" ").map(w => w[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold text-foreground">{n.name}</p>
                      <p className="text-xs text-muted-foreground">{n.divisions?.name || "No Acuity"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-accent" fill="currentColor" />
                    <span className="text-sm font-bold">{score !== null ? `${score}%` : "N/A"}</span>
                  </div>
                </div>
                {score !== null && (
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${score}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedNurse} onOpenChange={(open) => !open && setSelectedNurse(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Evaluate {selectedNurse?.name}</DialogTitle>
            <DialogDescription>Record performance metrics (0-100).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Attendance</Label><Input type="number" value={attendance} onChange={e => setAttendance(e.target.value)} /></div>
              <div className="space-y-2"><Label>Quality</Label><Input type="number" value={quality} onChange={e => setQuality(e.target.value)} /></div>
              <div className="space-y-2"><Label>Reliability</Label><Input type="number" value={reliability} onChange={e => setReliability(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Remarks</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedNurse(null)}>Cancel</Button>
            <Button variant="pink" onClick={handleSaveEvaluation} disabled={saving}>
              {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : "Save Evaluation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
