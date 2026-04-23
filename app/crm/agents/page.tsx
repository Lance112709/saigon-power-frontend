"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { UserPlus, Trash2, AlertCircle, Pencil, X, Save } from "lucide-react";

const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 placeholder:text-slate-400";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1";

const AGENT_TYPES = [
  "Inhouse Agent", "Outside Agent", "Realtor",
  "Insurance Agent", "Loan Officer", "Regular Referral",
];

const EMPTY = { name: "", email: "", phone: "", agent_type: "" };

export default function AgentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [agents, setAgents] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit modal state
  const [editAgent, setEditAgent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const load = async () => {
    try { setAgents(await api.getSalesAgents()); } catch { }
  };
  useEffect(() => { load(); }, []);

  const set = (k: keyof typeof EMPTY, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setEdit = (k: keyof typeof EMPTY, v: string) => setEditForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!form.agent_type)  { setError("Agent Type is required"); return; }
    setSaving(true); setError("");
    try {
      const agent = await api.createSalesAgent(form);
      setAgents(prev => [...prev, agent]);
      setForm(EMPTY);
    } catch (err: any) {
      const raw = err?.message || "Failed to save";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      try { setError(JSON.parse(body)?.detail ?? body); } catch { setError(body); }
    }
    setSaving(false);
  };

  const openEdit = (a: any) => {
    setEditAgent(a);
    setEditForm({ name: a.name || "", email: a.email || "", phone: a.phone || "", agent_type: a.agent_type || "" });
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { setEditError("Name is required"); return; }
    if (!editForm.agent_type)  { setEditError("Agent Type is required"); return; }
    setEditSaving(true); setEditError("");
    try {
      const updated = await (api as any).updateSalesAgent(editAgent.id, editForm);
      setAgents(prev => prev.map(a => a.id === editAgent.id ? { ...a, ...updated } : a));
      setEditAgent(null);
    } catch (err: any) {
      const raw = err?.message || "Failed to save";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      try { setEditError(JSON.parse(body)?.detail ?? body); } catch { setEditError(body); }
    }
    setEditSaving(false);
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await api.deleteSalesAgent(id);
      setAgents(prev => prev.filter(a => a.id !== id));
    } catch { }
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1D5E]">Sales Agents</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage the agents available in the deal form</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Add Agent Form */}
        <div className="col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0F1D5E] mb-4">Add New Agent</h2>
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 mb-4">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Name <span className="text-red-500">*</span></label>
                <input className={inputCls} placeholder="Full name" value={form.name} onChange={e => set("name", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Agent Type <span className="text-red-500">*</span></label>
                <select className={inputCls} value={form.agent_type} onChange={e => set("agent_type", e.target.value)}>
                  <option value="">— Select type —</option>
                  {AGENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={inputCls} placeholder="agent@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" className={inputCls} placeholder="(555) 555-5555" value={form.phone} onChange={e => set("phone", e.target.value)} />
              </div>
              <p className="text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                Agent ID auto-generates as <strong>FirstName + last 4 of phone</strong> on save.
              </p>
            </div>
            <button onClick={submit} disabled={saving}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 transition-colors disabled:opacity-50">
              <UserPlus className="w-4 h-4" />
              {saving ? "Saving..." : "Add Agent"}
            </button>
          </div>
        </div>

        {/* Agents Table */}
        <div className="col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-[#0F1D5E]">All Agents ({agents.length})</h2>
            </div>
            {agents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No agents yet. Add your first agent.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Name", "Agent ID", "Agent Type", "Email", "Phone", "Added", "Actions"].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.map(a => (
                    <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 font-semibold text-[#0F1D5E]">{a.name}</td>
                      <td className="px-4 py-3.5">
                        {a.agent_code ? (
                          <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg bg-[#EEF1FA] text-[#0F1D5E]">
                            {a.agent_code}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {a.agent_type ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EEF1FA] text-[#0F1D5E]">{a.agent_type}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{a.email || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{a.phone || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <button onClick={() => openEdit(a)}
                              className="text-slate-400 hover:text-[#0F1D5E] transition-colors" title="Edit agent">
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => remove(a.id)} disabled={deletingId === a.id}
                            className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50" title="Remove agent">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-[#0F1D5E]">Edit Agent</h3>
              <button onClick={() => setEditAgent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {editError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {editError}
                </div>
              )}

              {/* Agent ID preview */}
              <div className="bg-[#EEF1FA] rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Agent ID</span>
                <span className="font-mono font-black text-[#0F1D5E] text-sm">
                  {editAgent.agent_code || "—"}
                  <span className="ml-2 text-[10px] font-normal text-slate-400">(auto-updates on save)</span>
                </span>
              </div>

              <div>
                <label className={labelCls}>Name <span className="text-red-500">*</span></label>
                <input className={inputCls} value={editForm.name} onChange={e => setEdit("name", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Agent Type <span className="text-red-500">*</span></label>
                <select className={inputCls} value={editForm.agent_type} onChange={e => setEdit("agent_type", e.target.value)}>
                  <option value="">— Select type —</option>
                  {AGENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={inputCls} value={editForm.email} onChange={e => setEdit("email", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" className={inputCls} value={editForm.phone} onChange={e => setEdit("phone", e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-5">
              <button onClick={() => setEditAgent(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={editSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
