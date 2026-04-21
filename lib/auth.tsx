"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Role = "admin" | "manager" | "csr" | "sales_agent";

export type PermAction =
  | "view_commissions"
  | "view_revenue"
  | "view_all_deals"
  | "view_all_leads"
  | "view_all_customers"
  | "export_data"
  | "manage_users"
  | "view_proposals"
  | "view_forecast"
  | "view_reconciliation"
  | "view_uploads";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  sales_agent_name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  permissions: Record<string, boolean>;
  login: (email: string, password: string) => Promise<{ mustReset: boolean }>;
  logout: () => void;
  can: (action: PermAction) => boolean;
  reloadPermissions: () => Promise<void>;
}

// Hardcoded admin fallback — admin always has full access
const ADMIN_PERMS: Record<string, boolean> = {
  view_commissions: true, view_revenue: true, view_all_deals: true,
  view_all_leads: true, view_all_customers: true, export_data: true,
  manage_users: true, view_proposals: true, view_forecast: true,
  view_reconciliation: true, view_uploads: true,
};

function parseToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) return null;
    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      sales_agent_name: payload.sales_agent_name,
    };
  } catch {
    return null;
  }
}

function setAuthCookie(token: string) {
  document.cookie = `auth_token=${token}; path=/; max-age=43200; SameSite=Lax`;
}
function clearAuthCookie() {
  document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

async function fetchPermissions(token: string): Promise<Record<string, boolean>> {
  try {
    const res = await fetch(`${API}/api/v1/auth/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return res.json();
  } catch {}
  return {};
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const reloadPermissions = useCallback(async () => {
    const stored = localStorage.getItem("auth_token");
    if (!stored) return;
    const parsed = parseToken(stored);
    if (!parsed) return;
    const perms = parsed.role === "admin" ? ADMIN_PERMS : await fetchPermissions(stored);
    setPermissions(perms);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("auth_token");
    if (stored) {
      const parsed = parseToken(stored);
      if (parsed) {
        setToken(stored);
        setUser(parsed);
        setAuthCookie(stored);
        const perms = parsed.role === "admin" ? Promise.resolve(ADMIN_PERMS) : fetchPermissions(stored);
        Promise.resolve(perms).then(setPermissions);
      } else {
        localStorage.removeItem("auth_token");
        clearAuthCookie();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    const { access_token, must_reset_password, user: u } = data;
    localStorage.setItem("auth_token", access_token);
    setAuthCookie(access_token);
    setToken(access_token);
    setUser(u);
    const perms = u.role === "admin" ? ADMIN_PERMS : await fetchPermissions(access_token);
    setPermissions(perms);
    return { mustReset: must_reset_password };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    clearAuthCookie();
    setToken(null);
    setUser(null);
    setPermissions({});
    router.push("/login");
  }, [router]);

  const can = useCallback((action: PermAction): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return permissions[action] === true;
  }, [user, permissions]);

  return (
    <AuthContext.Provider value={{ user, token, loading, permissions, login, logout, can, reloadPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
