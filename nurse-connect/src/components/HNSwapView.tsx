import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const HNSwapView = () => {
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    const fetchSwaps = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
        const token = (session as any)?.access_token;
        const res = await fetch(`${API_BASE}/db/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            table: "shift_swap_requests",
            action: "select",
            filters: [{ field: "status", op: "in", value: ["pending_admin", "pending"] }],
          }),
        });
        if (!res.ok) throw new Error("Failed to fetch swaps");
        const json = await res.json();
        setSwaps(json.data || []);
      } catch (err) {
        console.error("Error fetching swaps", err);
      }
      setLoading(false);
    };
    fetchSwaps();
  }, [session]);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    try {
      const token = (session as any)?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
      const res = await fetch(`${apiBase}/functions/handle-swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ swap_id: id, action: status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: `Swap ${status}` });
      setSwaps((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-foreground">Pending Swap Requests</h2>
      {swaps.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-card border">
          <p className="text-sm text-muted-foreground">No pending swap requests.</p>
        </div>
      ) : (
        swaps.map((r) => (
          <div key={r.id} className="rounded-xl bg-card p-5 shadow-card border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{r.requester?.name} &lt;-&gt; {r.target?.name}</p>
                <p className="text-xs text-muted-foreground">Request for shift swap</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleAction(r.id, "approved")}>Approve</Button>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleAction(r.id, "rejected")}>Reject</Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
