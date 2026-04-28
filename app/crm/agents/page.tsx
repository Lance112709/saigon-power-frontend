"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { UserPlus, Trash2, AlertCircle, Pencil, X, Save, Plus, DollarSign } from "lucide-react";

const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 placeholder:text-slate-400";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1";

const AGENT_TYPES = [
  "Inhouse Agent", "Outside Agent", "Realtor",
  "Insurance Agent", "Loan Officer", "Regular Referral",
];

const SUPPLIERS = [
  "Budget Power", "Discount Power", "Heritage Power", "Iron Horse",
  "CleanSky Energy", "Reliant", "Chariot", "Direct Energy",
  "Cirro Energy", "True Power", "Hudson Energy", "NRG",
];

const COMM_TYPES = [
  { value: "per_kwh",      label: "$/kWh / mo" },
  { value: "flat_monthly", label: "$/account / mo" },
  { value: "flat_per_deal",label: "$ one-time / deal" },
  { value: "percentage",   label: "% of commission" },
];

function commLabel(type: string, rate: number): string {
  if (!rate && rate !== 0) return "—";
  switch (type) {
    case "per_kwh":       return `$${rate}/kWh`;
    case "flat_monthly":  return `$${rate}/mo`;
    case "flat_per_deal": return `$${rate}/deal`;
    case "percentage":    return `${rate}%`;
    default:              return `${rate}`;
  }
}

const EMPTY = { name: "", email: "", phone: "", agent_type: "" };

const EMPTY_RULES = {
  default_type: "per_kwh",
  default_rate: "",
  overrides: [] as { supplier: string; type: string; rate: string }[],
};

export default function AgentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "admin" || user?.role === "manager";

  const [agents, setAgents] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit modal state
  const [editAgent, setEditAgent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [editRules, setEditRules] = useState(EMPTY_RULES);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "commission">("info");

  const load = async () => {
    try { setAgents(await api.getSalesAgents()); } catch { }
  };
  useEffect(() => { load(); }, []);

  const set = (k: keyof typeof EMPTY, v: string) => setForm(f => ({ ...f, [k]: v }));

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

  const openEdit = (a: any, tab: "info" | "commission" = "info") => {
    setEditAgent(a);
    setEditForm({ name: a.name || "", email: a.email || "", phone: a.phone || "", agent_type: a.agent_type || "" });
    const rules = a.commission_rules || {};
    setEditRules({
      default_type: rules.default_type || "per_kwh",
      default_rate: rules.default_rate != null ? String(rules.default_rate) : "",
      overrides: (rules.overrides || []).map((o: any) => ({
        supplier: o.supplier || "",
        type: o.type || "per_kwh",
        rate: o.rate != null ? String(o.rate) : "",
      })),
    });
    setEditError("");
    setActiveTab(tab);
  };

  const addOverride = () => {
    setEditRules(r => ({ ...r, overrides: [...r.overrides, { supplier: "", type: "per_kwh", rate: "" }] }));
  };

  const removeOverride = (i: number) => {
    setEditRules(r => ({ ...r, overrides: r.overrides.filter((_, idx) => idx !== i) }));
  };

  const setOverride = (i: number, field: string, val: string) => {
    setEditRules(r => ({
      ...r,
      overrides: r.overrides.map((o, idx) => idx === i ? { ...o, [field]: val } : o),
    }));
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { setEditError("Name is required"); setActiveTab("info"); return; }
    if (!editForm.agent_type)  { setEditError("Agent Type is required"); setActiveTab("info"); return; }
    setEditSaving(true); setEditError("");

    const commission_rules = {
      default_type: editRules.default_type,
      default_rate: editRules.default_rate !== "" ? parseFloat(editRules.default_rate) : null,
      overrides: editRules.overrides
        .filter(o => o.supplier && o.rate !== "")
        .map(o => ({ supplier: o.supplier, type: o.type, rate: parseFloat(o.rate) })),
    };

    try {
      const updated = await (api as any).updateSalesAgent(editAgent.id, { ...editForm, commission_rules });
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
    if (!confirm("Remove this agent?")) return;
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
        <p className="text-slate-500 mt-1 text-sm">Manage agents and their custom commission structures</p>
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
                Commission structure can be set after adding the agent.
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
                    {["Name", "Agent ID", "Type", "Commission", "Email / Phone", "Actions"].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.map(a => {
                    const rules = a.commission_rules || {};
                    const hasCommission = rules.default_rate != null && rules.default_rate !== "";
                    const overrideCount = (rules.overrides || []).length;
                    return (
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
                        <td className="px-4 py-3.5">
                          {hasCommission ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
                                <DollarSign className="w-3 h-3" />
                                {commLabel(rules.default_type, rules.default_rate)}
                              </span>
                              {overrideCount > 0 && (
                                <span className="ml-1.5 text-[10px] text-slate-400">+{overrideCount} override{overrideCount > 1 ? "s" : ""}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 italic">Not set</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                          <div>{a.email || "—"}</div>
                          <div className="text-slate-400">{a.phone || ""}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {isManager && (
                              <>
                                <button onClick={() => openEdit(a, "commission")}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                                  title="Set commission">
                                  <DollarSign className="w-3 h-3" /> Commission
                                </button>
                                <button onClick={() => openEdit(a, "info")}
                                  className="text-slate-400 hover:text-[#0F1D5E] transition-colors" title="Edit agent">
                                  <Pencil className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {isAdmin && (
                              <button onClick={() => remove(a.id)} disabled={deletingId === a.id}
                                className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50" title="Remove agent">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-[#0F1D5E]">{editAgent.name}</h3>
                {editAgent.agent_code && (
                  <span className="font-mono text-xs text-slate-400">{editAgent.agent_code}</span>
                )}
              </div>
              <button onClick={() => setEditAgent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 shrink-0">
              {([
                { key: "info", label: "Agent Info" },
                { key: "commission", label: "Commission Structure" },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-5 py-3 text-sm font-semibold transition-colors border-b-2 ${
                    activeTab === t.key
                      ? "border-[#0F1D5E] text-[#0F1D5E]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {editError && (
              <div className="mx-6 mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 shrink-0">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {editError}
              </div>
            )}

            {/* Tab content — scrollable */}
            <div className="overflow-y-auto flex-1 px-6 py-5">

              {/* ── Info Tab ── */}
              {activeTab === "info" && (
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Name <span className="text-red-500">*</span></label>
                    <input className={inputCls} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Agent Type <span className="text-red-500">*</span></label>
                    <select className={inputCls} value={editForm.agent_type} onChange={e => setEditForm(f => ({ ...f, agent_type: e.target.value }))}>
                      <option value="">— Select type —</option>
                      {AGENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" className={inputCls} value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input type="tel" className={inputCls} value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
              )}

              {/* ── Commission Tab ── */}
              {activeTab === "commission" && (
                <div className="space-y-5">

                  {/* Default rate */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Default Commission Rate</p>
                    <p className="text-xs text-slate-400">Applied to all suppliers unless a supplier override is set below.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Commission Type</label>
                        <select className={inputCls} value={editRules.default_type}
                          onChange={e => setEditRules(r => ({ ...r, default_type: e.target.value }))}>
                          {COMM_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>
                          Rate {editRules.default_type === "percentage" ? "(%)" : editRules.default_type === "per_kwh" ? "($/kWh)" : "($)"}
                        </label>
                        <input type="number" step="0.0001" min="0" className={inputCls}
                          placeholder={editRules.default_type === "per_kwh" ? "e.g. 0.0005" : "e.g. 5.00"}
                          value={editRules.default_rate}
                          onChange={e => setEditRules(r => ({ ...r, default_rate: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  {/* Supplier overrides */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Supplier Overrides</p>
                        <p className="text-xs text-slate-400 mt-0.5">Different rate for specific REPs/suppliers</p>
                      </div>
                      <button onClick={addOverride}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEF1FA] text-[#0F1D5E] text-xs font-semibold hover:bg-[#0F1D5E] hover:text-white transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Override
                      </button>
                    </div>

                    {editRules.overrides.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                        <p className="text-xs text-slate-400">No overrides yet. Click "Add Override" to set supplier-specific rates.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {editRules.overrides.map((o, i) => (
                          <div key={i} className="flex items-end gap-2 bg-slate-50 rounded-xl p-3">
                            <div className="flex-1">
                              <label className={labelCls}>Supplier</label>
                              <select className={inputCls} value={o.supplier} onChange={e => setOverride(i, "supplier", e.target.value)}>
                                <option value="">— Select —</option>
                                {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className={labelCls}>Type</label>
                              <select className={inputCls} value={o.type} onChange={e => setOverride(i, "type", e.target.value)}>
                                {COMM_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                            </div>
                            <div className="w-24">
                              <label className={labelCls}>Rate</label>
                              <input type="number" step="0.0001" min="0" className={inputCls} placeholder="0.0000"
                                value={o.rate} onChange={e => setOverride(i, "rate", e.target.value)} />
                            </div>
                            <button onClick={() => removeOverride(i)} className="pb-0.5 text-slate-300 hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  {(editRules.default_rate !== "" || editRules.overrides.some(o => o.rate !== "")) && (
                    <div className="bg-[#EEF1FA] rounded-xl p-4">
                      <p className="text-xs font-bold text-[#0F1D5E] mb-2">Preview</p>
                      <div className="space-y-1 text-xs text-slate-600">
                        {editRules.default_rate !== "" && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Default (all suppliers)</span>
                            <span className="font-semibold text-[#0F1D5E]">
                              {commLabel(editRules.default_type, parseFloat(editRules.default_rate))}
                            </span>
                          </div>
                        )}
                        {editRules.overrides.filter(o => o.supplier && o.rate !== "").map((o, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-slate-500">{o.supplier}</span>
                            <span className="font-semibold text-[#0F1D5E]">{commLabel(o.type, parseFloat(o.rate))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-5 pt-4 border-t border-slate-100 shrink-0">
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
