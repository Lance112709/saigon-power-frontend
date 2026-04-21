"use client";
import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth, Role } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Plus, Trash2, RefreshCw, Shield, Copy, Check } from "lucide-react";

const ROLES: Role[] = ["admin", "manager", "csr", "sales_agent"];
const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin", manager: "Manager", csr: "CSR", sales_agent: "Sales Agent",
};
const ROLE_COLOR: Record<Role, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700",
  csr: "bg-purple-100 text-purple-700",
  sales_agent: "bg-amber-100 text-amber-700",
};

const PERMISSIONS: { key: string; label: string; group: string; adminLocked?: boolean }[] = [
  { key: "view_all_leads",     label: "Leads & Customers",     group: "CRM" },
  { key: "view_all_customers", label: "Imported Customers",    group: "CRM" },
  { key: "view_all_deals",     label: "All Deals",             group: "CRM" },
  { key: "view_proposals",     label: "Proposals",             group: "CRM" },
  { key: "view_commissions",   label: "Commission Reports",    group: "Finance" },
  { key: "view_revenue",       label: "Revenue / Accounting",  group: "Finance" },
  { key: "view_forecast",      label: "Revenue Forecast",      group: "Finance" },
  { key: "view_uploads",       label: "Upload Statements",     group: "Operations" },
  { key: "view_reconciliation",label: "Reconciliation",        group: "Operations" },
  { key: "export_data",        label: "Export / Download Data",group: "Operations" },
  { key: "manage_users",       label: "User Management",       group: "Admin", adminLocked: true },
];

const GROUPS = ["CRM", "Finance", "Operations", "Admin"];

export default function UsersPage() {
  const { user, can } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // "role:perm" being saved

  // Create user form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", role: "csr", sales_agent_name: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [tempPw, setTempPw] = useState<{ name: string; email: string; pw: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoadingUsers(true);
    const [u, m] = await Promise.allSettled([api.getUsers(), api.getAllPermissions()]);
    if (u.status === "fulfilled") setUsers(u.value);
    if (m.status === "fulfilled") setMatrix(m.value);
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    if (!can("manage_users")) { router.push("/dashboard"); return; }
    load();
  }, [can, router, load]);

  const togglePermission = async (role: Role, permission: string, current: boolean) => {
    const key = `${role}:${permission}`;
    setSaving(key);
    const next = !current;
    setMatrix(m => ({ ...m, [role]: { ...m[role], [permission]: next } }));
    try {
      await api.updatePermission(role, permission, next);
    } catch {
      setMatrix(m => ({ ...m, [role]: { ...m[role], [permission]: current } }));
    }
    setSaving(null);
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const data = await api.createUser({
        ...form,
        sales_agent_name: form.role === "sales_agent" ? form.sales_agent_name : undefined,
      });
      setTempPw({ name: `${form.first_name} ${form.last_name}`, email: form.email, pw: data.temp_password });
      setForm({ first_name: "", last_name: "", email: "", role: "csr", sales_agent_name: "" });
      setShowCreate(false);
      await load();
    } catch (err: any) {
      const raw = err?.message || "Failed";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      try { setCreateError(JSON.parse(body)?.detail ?? body); } catch { setCreateError(body); }
    }
    setCreating(false);
  };

  const toggleStatus = async (u: any) => {
    const next = u.status === "active" ? "inactive" : "active";
    try {
      await api.updateUser(u.id, { status: next });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: next } : x));
    } catch {}
  };

  const changeRole = async (u: any, role: string) => {
    try {
      await api.updateUser(u.id, { role });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role } : x));
    } catch {}
  };

  const resetPw = async (u: any) => {
    if (!confirm(`Reset password for ${u.first_name} ${u.last_name}?`)) return;
    try {
      const data = await api.resetUserPassword(u.id);
      setTempPw({ name: `${u.first_name} ${u.last_name}`, email: u.email, pw: data.temp_password });
    } catch {}
  };

  const deleteUser = async (u: any) => {
    if (!confirm(`Delete ${u.first_name} ${u.last_name}? This cannot be undone.`)) return;
    try {
      await api.deleteUser(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch {}
  };

  const copyPw = () => {
    if (tempPw) navigator.clipboard.writeText(tempPw.pw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E] flex items-center gap-2">
            <Shield className="w-6 h-6" /> User Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage team access and role permissions</p>
        </div>
        <button onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F1D5E] text-white text-sm font-semibold rounded-xl hover:bg-[#0F1D5E]/90 transition-colors">
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      {/* Temp password reveal */}
      {tempPw && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-emerald-700 mb-2">User created — share these credentials</p>
          <p className="text-sm text-slate-600"><span className="font-semibold">Name:</span> {tempPw.name}</p>
          <p className="text-sm text-slate-600"><span className="font-semibold">Email:</span> {tempPw.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-slate-600 font-semibold">Temp Password:</span>
            <code className="bg-white border border-emerald-200 rounded-lg px-3 py-1 text-sm font-mono font-bold text-emerald-700">{tempPw.pw}</code>
            <button onClick={copyPw} className="text-emerald-600 hover:text-emerald-700">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">User will be prompted to set a new password on first login.</p>
          <button onClick={() => setTempPw(null)} className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline">Dismiss</button>
        </div>
      )}

      {/* Create user form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-[#0F1D5E] mb-4">Create New User</h3>
          <form onSubmit={createUser} className="grid grid-cols-3 gap-4">
            {[
              { label: "First Name *", field: "first_name", placeholder: "John" },
              { label: "Last Name *", field: "last_name", placeholder: "Smith" },
              { label: "Email *", field: "email", placeholder: "john@saigonpower.com" },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <label className="block text-xs text-slate-500 mb-1">{label}</label>
                <input required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20"
                  placeholder={placeholder}
                  value={(form as any)[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Role *</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20"
                value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </div>
            {form.role === "sales_agent" && (
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Agent Name (must match deal records exactly)</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20"
                  placeholder="e.g. Lance Nguyen"
                  value={form.sales_agent_name}
                  onChange={e => setForm(f => ({ ...f, sales_agent_name: e.target.value }))}
                />
              </div>
            )}
            {createError && <p className="col-span-3 text-xs text-red-600">{createError}</p>}
            <div className="col-span-3 flex gap-3">
              <button type="submit" disabled={creating}
                className="px-5 py-2 bg-[#0F1D5E] text-white text-xs font-semibold rounded-xl hover:bg-[#0F1D5E]/90 disabled:opacity-50">
                {creating ? "Creating..." : "Create User"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-5 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-xl hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0F1D5E]">Team Members ({users.length})</h3>
          <button onClick={load} className="text-slate-400 hover:text-[#0F1D5E] transition-colors"><RefreshCw className="w-4 h-4" /></button>
        </div>
        {loadingUsers ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Name", "Email", "Role", "Status", "Created", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-[#0F1D5E] whitespace-nowrap">
                      {u.first_name} {u.last_name}
                      {u.id === user?.id && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.id === user?.id ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLOR[u.role as Role]}`}>{ROLE_LABEL[u.role as Role]}</span>
                      ) : (
                        <select value={u.role} onChange={e => changeRole(u, e.target.value)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${ROLE_COLOR[u.role as Role]} bg-transparent`}>
                          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => u.id !== user?.id && toggleStatus(u)} disabled={u.id === user?.id}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors
                          ${u.status === "active" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}
                          ${u.id === user?.id ? "cursor-default opacity-60" : "cursor-pointer"}`}>
                        {u.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => resetPw(u)} className="text-slate-300 hover:text-amber-500 transition-colors" title="Reset password">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== user?.id && (
                          <button onClick={() => deleteUser(u)} className="text-slate-300 hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Editable Permission Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-[#0F1D5E]">Permission Matrix</h3>
          <p className="text-xs text-slate-400 mt-0.5">Toggle to grant or revoke access per role. Changes apply immediately.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 w-56">Permission</th>
                {ROLES.map(r => (
                  <th key={r} className="px-4 py-3 text-center text-xs font-semibold">
                    <span className={`px-2.5 py-1 rounded-full ${ROLE_COLOR[r]}`}>{ROLE_LABEL[r]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map(group => {
                const perms = PERMISSIONS.filter(p => p.group === group);
                return (
                  <React.Fragment key={group}>
                    <tr className="bg-slate-50/60">
                      <td colSpan={5} className="px-5 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">{group}</td>
                    </tr>
                    {perms.map(({ key, label, adminLocked }) => (
                      <tr key={key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="px-5 py-3 text-sm text-slate-700 font-medium">{label}</td>
                        {ROLES.map(role => {
                          const isAdmin = role === "admin";
                          const granted = isAdmin ? true : (matrix[role]?.[key] ?? false);
                          const isSaving = saving === `${role}:${key}`;
                          const locked = isAdmin || adminLocked;

                          return (
                            <td key={role} className="px-4 py-3 text-center">
                              {locked ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100">
                                  <Check className="w-4 h-4 text-emerald-600" />
                                </span>
                              ) : (
                                <button
                                  onClick={() => !isSaving && togglePermission(role, key, granted)}
                                  disabled={isSaving}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
                                    ${granted ? "bg-emerald-500" : "bg-slate-200"}
                                    ${isSaving ? "opacity-60 cursor-wait" : "cursor-pointer hover:opacity-90"}`}
                                  title={`${granted ? "Revoke" : "Grant"} ${label} for ${ROLE_LABEL[role]}`}
                                >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
                                    ${granted ? "translate-x-6" : "translate-x-1"}`} />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
          <p className="text-xs text-amber-700">
            <strong>Note:</strong> Admin always has full access and cannot be restricted. Backend security rules for sensitive financial data (commissions, reconciliation) are enforced server-side regardless of UI permissions.
          </p>
        </div>
      </div>
    </div>
  );
}
