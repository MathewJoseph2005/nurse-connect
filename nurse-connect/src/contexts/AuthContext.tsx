import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/integrations/api/client";

type Session = { access_token: string; user: User };
type User = { id: string; email?: string };

type AppRole = "admin" | "head_nurse" | "nurse";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (token: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) throw new Error("Failed to fetch role");
      const data = await res.json();
      return (data.role as AppRole) ?? null;
    } catch (error) {
      console.error("Error fetching role:", error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth listener
    const { data: { subscription } } = api.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.access_token) {
          setLoading(true);
          // IMPORTANT: Use setTimeout to avoid deadlock in onAuthStateChange
          setTimeout(async () => {
            try {
              const userRole = await fetchRole(session.access_token);
              setRole(userRole);
            } catch (err) {
              console.error("Auth listener role fetch error:", err);
              setRole(null);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await api.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
