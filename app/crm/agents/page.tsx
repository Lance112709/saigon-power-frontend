"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { UserPlus, Trash2, AlertCircle, Pencil, X, Save, Plus, DollarSign, ShieldCheck, Zap } from "lucide-react";

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
  { value: "per_kwh",       label: "$/kWh / mo" },
  { value: "flat_monthly",  label: "$/account / mo" },
  { value: "flat_per_deal", label: "$ one-time / deal" },
  { value: "percentage",    label: "% of commission" },
];

const PLAN_TYPES = [
  "Month-Month",
  "Fixed Rate",
  "FreeNight & Weekend",
  "Solar Buy-Back",
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
  exclude_plan_types: [] as string[],
};

export default function AgentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "admin" || user?.role === "manager";

  const [agents, setAgents]       = useState<any[]>([]);
  const [form, setForm]           = useState(EMPTY);
  const [error, setError]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkSuccess, setBulkSuccess]   = useState(false);

  // Edit modal state
  const [editAgent, setEditAgent]   = useState<any | null>(null);
  const [editForm, setEditForm]     = useState(EMPTY);
  const [editRules, setEditRules]   = useState(EMPTY_RULES);
  const [editError, setEditError]     = useState("");
  const [editSuccess, setEditSuccess] = useState(false);
  const [editSaving, setEditSaving]   = useState(false);
  const [activeTab, setActiveTab]     = useState<"info" | "commission">("info");

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
      exclude_plan_types: rules.exclude_plan_types || [],
    });
    setEditError("");
    setActiveTab(tab);
  };

  const toggleExcludePlanType = (pt: string) => {
    setEditRules(r => ({
      ...r,
      exclude_plan_types: r.exclude_plan_types.includes(pt)
        ? r.exclude_plan_types.filter(x => x !== pt)
        : [...r.exclude_plan_types, pt],
    }));
  };

  // Bulk apply: Month-Month excluded for ALL agents; Inhouse Agents earn on Month-Month
  const bulkApplyMonthMonth = async () => {
    if (!confirm(
      "This will set \"No commission on Month-Month plans\" for all agents.\n\n" +
      "Inhouse Agents will still earn commission on Month-Month.\n\nContinue?"
    )) return;
    setBulkApplying(true);
    setBulkSuccess(false);
    try {
      await Promise.all(agents.map(a => {
        const rules = a.commission_rules || {};
        const existing = rules.exclude_plan_types || [];
        const isInhouse = a.agent_type === "Inhouse Agent";
        // Inhouse: remove Month-Month from exclusions (they earn on it)
        // Everyone else: add Month-Month to exclusions
        const newExcludes = isInhouse
          ? existing.filter((x: string) => x !== "Month-Month")
          : Array.from(new Set([...existing, "Month-Month"]));
        const updated = { ...rules, exclude_plan_types: newExcludes };
        return (api as any).updateSalesAgent(a.id, { commission_rules: updated });
      }));
      await load();
      setBulkSuccess(true);
      setTimeout(() => setBulkSuccess(false), 4000);
    } catch { }
    setBulkApplying(false);
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
    setEditError("");
    setEditSuccess(false);

    if (!editForm.name.trim()) { setEditError("Name is required"); setActiveTab("info"); return; }
    if (!editForm.agent_type)  { setEditError("Agent type is required"); setActiveTab("info"); return; }

    setEditSaving(true);
    try {
      const commission_rules = {
        default_type:        editRules.default_type || "per_kwh",
        default_rate:        editRules.default_rate !== "" ? parseFloat(String(editRules.default_rate)) : null,
        overrides:           (editRules.overrides || [])
                               .filter(o => o.supplier && o.rate !== "")
                               .map(o => ({ supplier: o.supplier, type: o.type, rate: parseFloat(String(o.rate)) })),
        exclude_plan_types:  editRules.exclude_plan_types || [],
      };

      const res = await api.updateSalesAgent(editAgent.id, { ...editForm, commission_rules });
      if (!res || (typeof res === "object" && "error" in res)) {
        throw new Error(String((res as any)?.error || "Save failed"));
      }

      // Reload agents from DB to guarantee table reflects saved state
      await load();
      setEditSuccess(true);
      setTimeout(() => { setEditSuccess(false); setEditAgent(null); }, 1500);
    } catch (err: any) {
      const msg = err?.message || "Failed to save. Please try again.";
      const body = msg.includes(":") ? msg.slice(msg.indexOf(":") + 1).trim() : msg;
      let display = body;
      try { display = JSON.parse(body)?.detail ?? body; } catch {}
      setEditError(display || "Unknown error — check your connection and try again.");
    } finally {
      setEditSaving(false);
    }
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

      {/* ── Global Commission Policy ── */}
      {isManager && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Global Commission Policy</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Apply a rule across all agents at once. Individual agent settings can still override.
                </p>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <X className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-semibold text-red-700">No commission on <strong>Month-Month</strong> plans</span>
                    <span className="text-[10px] text-red-400">— all agents</span>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700"><strong>Inhouse Agents</strong> still earn on Month-Month</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="shrink-0">
              {bulkSuccess ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
                  <ShieldCheck className="w-4 h-4" /> Applied to all agents!
                </div>
              ) : (
                <button
                  onClick={bulkApplyMonthMonth}
                  disabled={bulkApplying}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 transition-colors disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  {bulkApplying ? "Applying..." : "Apply to All Agents"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
                    {["Name", "Type", "Commission", "Plan Exclusions", "Actions"].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.map(a => {
                    const rules = a.commission_rules || {};
                    const hasRate = rules.default_rate != null && rules.default_rate !== "";
                    const hasCommission = hasRate || (rules.exclude_plan_types || []).length > 0 || (rules.overrides || []).length > 0;
                    const exclusions: string[] = rules.exclude_plan_types || [];
                    const isInhouse = a.agent_type === "Inhouse Agent";
                    return (
                      <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-[#0F1D5E]">{a.name}</p>
                          {a.agent_code && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#EEF1FA] text-[#0F1D5E]">{a.agent_code}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {a.agent_type ? (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isInhouse ? "bg-emerald-100 text-emerald-700" : "bg-[#EEF1FA] text-[#0F1D5E]"
                            }`}>{a.agent_type}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          {hasRate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
                              <DollarSign className="w-3 h-3" />
                              {commLabel(rules.default_type, rules.default_rate)}
                            </span>
                          ) : hasCommission ? (
                            <span className="text-xs text-amber-600 font-semibold">Exclusions only</span>
                          ) : (
                            <span className="text-xs text-slate-300 italic">Not set</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {exclusions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {exclusions.map(ex => (
                                <span key={ex} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-semibold">
                                  <X className="w-2.5 h-2.5" />{ex}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {isManager && (
                              <>
                                <button onClick={() => openEdit(a, "commission")}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors">
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

      {/* ── Edit Modal ── */}
      {editAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-[#0F1D5E]">{editAgent.name}</h3>
                {editAgent.agent_code && <span className="font-mono text-xs text-slate-400">{editAgent.agent_code}</span>}
              </div>
              <button onClick={() => setEditAgent(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex border-b border-slate-100 shrink-0">
              {([{ key: "info", label: "Agent Info" }, { key: "commission", label: "Commission Structure" }] as const).map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-5 py-3 text-sm font-semibold transition-colors border-b-2 ${
                    activeTab === t.key ? "border-[#0F1D5E] text-[#0F1D5E]" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}>{t.label}</button>
              ))}
            </div>

            {editError && (
              <div className="mx-6 mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 shrink-0">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {editError}
              </div>
            )}
            {editSuccess && (
              <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 font-semibold shrink-0">
                ✓ Commission structure saved successfully!
              </div>
            )}

            <div className="overflow-y-auto flex-1 px-6 py-5">
              {/* Info Tab */}
              {activeTab === "info" && (
                <div className="space-y-4">
                  <div><label className={labelCls}>Name <span className="text-red-500">*</span></label>
                    <input className={inputCls} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><label className={labelCls}>Agent Type <span className="text-red-500">*</span></label>
                    <select className={inputCls} value={editForm.agent_type} onChange={e => setEditForm(f => ({ ...f, agent_type: e.target.value }))}>
                      <option value="">— Select type —</option>
                      {AGENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select></div>
                  <div><label className={labelCls}>Email</label>
                    <input type="email" className={inputCls} value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><label className={labelCls}>Phone</label>
                    <input type="tel" className={inputCls} value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
                </div>
              )}

              {/* Commission Tab */}
              {activeTab === "commission" && (
                <div className="space-y-5">
                  {/* Plan type exclusions */}
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
                    <div>
                      <p className="text-xs font-bold text-red-700 uppercase tracking-wider">No Commission Plan Types</p>
                      <p className="text-xs text-red-400 mt-0.5">Agent earns $0 commission on deals with these rate types.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {PLAN_TYPES.map(pt => {
                        const excluded = editRules.exclude_plan_types.includes(pt);
                        return (
                          <button key={pt} type="button" onClick={() => toggleExcludePlanType(pt)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors text-left ${
                              excluded
                                ? "bg-red-100 border-red-300 text-red-700"
                                : "bg-white border-slate-200 text-slate-500 hover:border-red-200"
                            }`}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              excluded ? "bg-red-500 border-red-500" : "border-slate-300"
                            }`}>
                              {excluded && <X className="w-2.5 h-2.5 text-white" />}
                            </div>
                            {pt}
                          </button>
                        );
                      })}
                    </div>
                    {editForm.agent_type === "Inhouse Agent" && editRules.exclude_plan_types.includes("Month-Month") && (
                      <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        ⚠ This is an Inhouse Agent — Month-Month is typically excluded from their exclusion list.
                      </p>
                    )}
                  </div>

                  {/* Default rate */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Default Commission Rate</p>
                    <p className="text-xs text-slate-400">Applies to all non-excluded plans and suppliers.</p>
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
                        <p className="text-xs text-slate-400 mt-0.5">Different rate for specific REPs</p>
                      </div>
                      <button onClick={addOverride}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEF1FA] text-[#0F1D5E] text-xs font-semibold hover:bg-[#0F1D5E] hover:text-white transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Override
                      </button>
                    </div>
                    {editRules.overrides.length === 0 ? (
                      <div className="text-center py-5 border-2 border-dashed border-slate-200 rounded-xl">
                        <p className="text-xs text-slate-400">No supplier overrides set.</p>
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
                              <input type="number" step="0.0001" min="0" className={inputCls}
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
                  {(editRules.default_rate !== "" || editRules.exclude_plan_types.length > 0) && (
                    <div className="bg-[#EEF1FA] rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-[#0F1D5E]">Summary</p>
                      {editRules.exclude_plan_types.length > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">No commission on</span>
                          <span className="font-semibold text-red-600">{editRules.exclude_plan_types.join(", ")}</span>
                        </div>
                      )}
                      {editRules.default_rate !== "" && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">All other plans</span>
                          <span className="font-semibold text-[#0F1D5E]">
                            {commLabel(editRules.default_type, parseFloat(editRules.default_rate))}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-5 pt-4 border-t border-slate-100 shrink-0">
              <button onClick={() => setEditAgent(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={saveEdit} disabled={editSaving}
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
