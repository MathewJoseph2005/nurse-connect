/* eslint-disable @typescript-eslint/no-explicit-any */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
const TOKEN_KEY = "nurseflow_access_token";
const USER_KEY = "nurseflow_user";

type Filter = {
  field: string;
  op: "eq" | "neq" | "gte" | "in" | "not";
  value: any;
  operator?: string;
};

const authListeners = new Set<(event: string, session: any) => void>();

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function emitAuth(event: string, session: any) {
  for (const listener of authListeners) listener(event, session);
}

function setSession(token: string | null, user: any | null) {
  if (token && user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    emitAuth("SIGNED_IN", { access_token: token, user });
    return;
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  emitAuth("SIGNED_OUT", null);
}

async function apiRequest(path: string, init: RequestInit = {}) {
  const token = getStoredToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Request failed");
  }
  return json;
}

class QueryBuilder {
  private table: string;
  private filters: Filter[] = [];
  private orders: Array<{ field: string; ascending?: boolean }> = [];
  private maxLimit?: number;
  private selectOptions?: { count?: string; head?: boolean; single?: boolean; maybeSingle?: boolean };

  constructor(table: string) {
    this.table = table;
  }

  select(_columns: string, options?: { count?: string; head?: boolean }) {
    this.selectOptions = options;
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, op: "eq", value });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ field, op: "neq", value });
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push({ field, op: "gte", value });
    return this;
  }

  in(field: string, value: any[]) {
    this.filters.push({ field, op: "in", value });
    return this;
  }

  not(field: string, operator: string, value: any) {
    this.filters.push({ field, op: "not", operator, value });
    return this;
  }

  order(field: string, opts?: { ascending?: boolean }) {
    this.orders.push({ field, ascending: opts?.ascending });
    return this;
  }

  limit(value: number) {
    this.maxLimit = value;
    return this;
  }

  async maybeSingle() {
    const res = await apiRequest("/db/query", {
      method: "POST",
      body: JSON.stringify({
        table: this.table,
        action: "select",
        filters: this.filters,
        orders: this.orders,
        limit: 1,
        options: { ...(this.selectOptions || {}), maybeSingle: true },
      }),
    });
    return { data: res.data, error: null, count: res.count };
  }

  async single() {
    const res = await apiRequest("/db/query", {
      method: "POST",
      body: JSON.stringify({
        table: this.table,
        action: "select",
        filters: this.filters,
        orders: this.orders,
        limit: 1,
        options: { ...(this.selectOptions || {}), single: true },
      }),
    });
    return { data: res.data, error: null, count: res.count };
  }

  then(resolve: (value: any) => any, reject?: (reason: any) => any) {
    const promise = apiRequest("/db/query", {
      method: "POST",
      body: JSON.stringify({
        table: this.table,
        action: "select",
        filters: this.filters,
        orders: this.orders,
        limit: this.maxLimit,
        options: this.selectOptions || {},
      }),
    })
      .then((res) => ({ data: res.data, error: null, count: res.count }))
      .catch((error) => ({ data: null, error, count: 0 }));

    return promise.then(resolve, reject);
  }

  async insert(payload: any) {
    const res = await apiRequest("/db/query", {
      method: "POST",
      body: JSON.stringify({ table: this.table, action: "insert", payload }),
    });
    return { data: res.data, error: null };
  }

  update(payload: any) {
    const run = async () => {
      await apiRequest("/db/query", {
        method: "POST",
        body: JSON.stringify({ table: this.table, action: "update", payload, filters: this.filters }),
      });
      return { data: null, error: null };
    };
    return {
      eq: async (field: string, value: any) => {
        this.eq(field, value);
        return run();
      },
      then: (resolve: (value: any) => any, reject?: (reason: any) => any) => run().then(resolve, reject),
    };
  }

  delete() {
    const run = async () => {
      await apiRequest("/db/query", {
        method: "POST",
        body: JSON.stringify({ table: this.table, action: "delete", filters: this.filters }),
      });
      return { data: null, error: null };
    };
    return {
      eq: async (field: string, value: any) => {
        this.eq(field, value);
        return run();
      },
      in: async (field: string, value: any[]) => {
        this.in(field, value);
        return run();
      },
      then: (resolve: (value: any) => any, reject?: (reason: any) => any) => run().then(resolve, reject),
    };
  }

  async upsert(payload: any) {
    await apiRequest("/db/query", {
      method: "POST",
      body: JSON.stringify({ table: this.table, action: "upsert", payload }),
    });
    return { data: null, error: null };
  }
}

export const supabase = {
  auth: {
    async signUp(args: { email: string; password: string; options?: { data?: any } }) {
      try {
        const res = await apiRequest("/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            email: args.email,
            password: args.password,
            name: args.options?.data?.full_name || args.options?.data?.name || "User",
            phone: args.options?.data?.phone || null,
            role: args.options?.data?.role || "nurse",
          }),
        });
        setSession(res.session.access_token, res.user);
        return { data: { user: res.user, session: res.session }, error: null };
      } catch (error: any) {
        return { data: { user: null, session: null }, error };
      }
    },

    async signInWithPassword(args: { email: string; password: string }) {
      try {
        const res = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify(args),
        });
        setSession(res.session.access_token, res.user);
        return { data: { user: res.user, session: res.session }, error: null };
      } catch (error: any) {
        return { data: { user: null, session: null }, error };
      }
    },

    async getSession() {
      const token = getStoredToken();
      const user = getStoredUser();
      if (!token || !user) return { data: { session: null }, error: null };
      return { data: { session: { access_token: token, user } }, error: null };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      authListeners.add(callback);
      const token = getStoredToken();
      const user = getStoredUser();
      callback("INITIAL_SESSION", token && user ? { access_token: token, user } : null);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback);
            },
          },
        },
      };
    },

    async signOut() {
      setSession(null, null);
      return { error: null };
    },
  },

  from(table: string) {
    return new QueryBuilder(table);
  },

  async rpc(name: string, params: any) {
    try {
      const res = await apiRequest(`/db/rpc/${name}`, {
        method: "POST",
        body: JSON.stringify(params || {}),
      });
      return { data: res.data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  channel(_name: string) {
    return {
      on() {
        return this;
      },
      subscribe() {
        return { id: "noop-channel" };
      },
    };
  },

  removeChannel() {
    return;
  },

  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: File) {
          try {
            const token = getStoredToken();
            const form = new FormData();
            form.append("file", file);
            form.append("path", path);
            const res = await fetch(`${API_BASE}/storage/${bucket}/upload`, {
              method: "POST",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              body: form,
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Upload failed");
            return { data: { path: json.path }, error: null };
          } catch (error: any) {
            return { data: null, error };
          }
        },

        getPublicUrl(path: string) {
          return { data: { publicUrl: `${API_BASE}/storage/public/${bucket}/${path}` } };
        },
      };
    },
  },
};