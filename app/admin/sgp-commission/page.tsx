"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Trophy, X, RefreshCw, Download, ShieldCheck, AlertTriangle, Settings2,
  ChevronRight, FileSignature, History, Search,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const CLASSIFICATIONS = ["SGP_AGENT", "REFERRAL_PARTNER", "INTERNAL_EMPLOYEE", "TEAM_LEADER", "INACTIVE_AGENT"];
const AGREEMENT_STATUSES = ["NOT_SENT", "SENT", "PENDING_SIGNATURE", "SIGNED", "APPROVED", "REJECTED", "EXPIRED", "TERMINATED"];

const TIER_BADGE: Record<number, string> = {
  1: "bg-slate-100 text-slate-700", 2: "bg-blue-100 text-blue-700",
  3: "bg-violet-100 text-violet-700", 4: "bg-amber-100 text-amber-700",
  5: "bg-emerald-100 text-emerald-800",
};
const AGREEMENT_BADGE: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700", SIGNED: "bg-blue-100 text-blue-700",
  PENDING_SIGNATURE: "bg-amber-100 text-amber-700", SENT: "bg-amber-50 text-amber-600",
  NOT_SENT: "bg-slate-100 text-slate-500", REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-red-50 text-red-600", TERMINATED: "bg-red-100 text-red-800",
};

export default function SgpCommissionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<any>(null);        // agent detail payload
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [overrideModal, setOverrideModal] = useState(false);
  const [overrideTier, setOverrideTier] = useState(1);
  const [overrideReason, setOverrideReason] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([api.sgpAgents(), api.sgpSettings()]);
      setAgents(a || []);
      setSettings(s);
    } catch (e: any) {
      setErr("SGP tables not found — run migration 009 in Supabase first.");
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try { setDetail(await api.sgpAgent(id)); } catch { setDetail(null); }
    setDetailLoading(false);
  };

  const patchAgent = async (id: string, patch: any) => {
    setSaving(true);
    setErr("");
    try {
      await api.sgpUpdateAgent(id, patch);
      await Promise.all([load(), openDetail(id)]);
    } catch (e: any) { setErr(String(e?.message ?? e).slice(0, 200)); }
    setSaving(false);
  };

  const runEvaluate = async (agentId?: string) => {
    setEvaluating(true);
    setErr("");
    try {
      const r = await api.sgpEvaluate(agentId ? { agent_id: agentId } : {});
      setEvalResult(r);
      await load();
      if (detail?.agent?.id) await openDetail(detail.agent.id);
    } catch (e: any) { setErr(String(e?.message ?? e).slice(0, 200)); }
    setEvaluating(false);
  };

  const doOverride = async () => {
    if (!detail?.agent?.id) return;
    setSaving(true);
    setErr("");
    try {
      await api.sgpOverrideTier(detail.agent.id, { tier: overrideTier, reason: overrideReason });
      setOverrideModal(false);
      setOverrideReason("");
      await Promise.all([load(), openDetail(detail.agent.id)]);
    } catch (e: any) { setErr(String(e?.message ?? e).slice(0, 200)); }
    setSaving(false);
  };

  const downloadExport = async () => {
    const token = localStorage.getItem("auth_token");
    try {
      const res = await fetch(`${API_BASE}/api/v1/sgp/export`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "sgp_agent_commission.xlsx"; a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Export failed"); }
  };

  const shown = useMemo(() => agents.filter(a =>
    (!classFilter || (a.classification || "") === classFilter) &&
    (!tierFilter || String(a.current_tier || "") === tierFilter) &&
    (!q || (a.name || "").toLowerCase().includes(q.toLowerCase()))
  ), [agents, classFilter, tierFilter, q]);

  const sgpCount = agents.filter(a => a.classification === "SGP_AGENT").length;
  const approvedCount = agents.filter(a => a.eligible).length;
  const inputClass = "border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1D5E] via-[#182a80] to-[#2a3f9e] text-white p-6 shadow-lg">
        <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-amber-300" /> SGP Agent Commission
            </h1>
            <p className="text-white/60 mt-1 text-sm max-w-2xl">
              Permanent tier splits for approved SGP Agents: 50/50 at signing, rising 5% per earned tier to the
              70/30 maximum. A tier is unlocked forever by reaching its monthly GP target in 3 separate months.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => runEvaluate()} disabled={evaluating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0F1D5E] text-sm font-semibold hover:bg-white/90 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${evaluating ? "animate-spin" : ""}`} />
              {evaluating ? "Evaluating…" : "Recalculate tiers"}
            </button>
            <button onClick={downloadExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/20">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-3 mt-6 max-w-xl">
          {[{ l: "SGP Agents", v: sgpCount }, { l: "Approved & Eligible", v: approvedCount },
            { l: "All Agents", v: agents.length }].map(s => (
            <div key={s.l} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-3">
              <p className="text-2xl font-bold tabular-nums">{s.v}</p>
              <p className="text-xs text-white/60">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {err && <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-3 text-sm text-red-700 font-medium">{err}</div>}

      {evalResult && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-sm text-emerald-800">
          Evaluated {evalResult.evaluated} SGP agent(s).
          {(evalResult.results || []).filter((r: any) => (r.promoted_to || []).length).map((r: any) =>
            ` ${r.name} promoted to tier ${r.promoted_to.join(", ")}.`).join("")}
          {(evalResult.warnings || []).length > 0 && (
            <span className="block mt-1 text-amber-700">{evalResult.warnings.slice(0, 3).join(" · ")}</span>
          )}
        </div>
      )}

      {/* Settings */}
      {settings && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex flex-wrap items-center gap-4">
          <span className="text-sm font-bold text-[#0F1D5E] flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Program settings
          </span>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Qualification basis
            <select value={settings.qualification_basis} className={inputClass}
              onChange={async e => { await api.sgpUpdateSettings({ qualification_basis: e.target.value }); load(); }}>
              <option value="PROVIDER_PAID_GP">Provider-paid GP (default)</option>
              <option value="FINALIZED_GP">Finalized GP (excludes disputed accounts)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Promotion takes effect
            <select value={settings.promotion_effective_rule} className={inputClass}
              onChange={async e => { await api.sgpUpdateSettings({ promotion_effective_rule: e.target.value }); load(); }}>
              <option value="NEXT_COMMISSION_PERIOD">Next commission period (default)</option>
              <option value="IMMEDIATE">Immediately (qualifying month itself)</option>
              <option value="NEXT_CALENDAR_MONTH">Next calendar month</option>
              <option value="NEXT_DEAL">Next deal only</option>
            </select>
          </label>
        </div>
      )}

      {/* Agent table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-bold text-[#0F1D5E]">Agents</h2>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find agent…"
              className={`${inputClass} pl-8 w-40`} />
          </div>
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className={inputClass}>
            <option value="">All classifications</option>
            {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
          <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className={inputClass}>
            <option value="">All tiers</option>
            {[1, 2, 3, 4, 5].map(t => <option key={t} value={t}>Tier {t}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          {loading ? <p className="p-8 text-center text-slate-400 text-sm">Loading…</p> : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-slate-100">
                  {["Agent", "Classification", "Agreement", "Tier", "Split", "Next Tier Progress", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map(a => (
                  <tr key={a.id} onClick={() => openDetail(a.id)}
                    className="border-b border-slate-100 hover:bg-slate-50/70 cursor-pointer">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700">{a.name}</span>
                      {(a.flags || []).length > 0 && (
                        <span title={a.flags.join("; ")}>
                          <AlertTriangle className="inline w-3.5 h-3.5 text-amber-500 ml-1.5" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{(a.classification || "unclassified").replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${AGREEMENT_BADGE[a.agreement_status] || AGREEMENT_BADGE.NOT_SENT}`}>
                        {(a.agreement_status || "NOT_SENT").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.current_tier ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIER_BADGE[a.current_tier]}`}>
                          T{a.current_tier} · {a.tier_name}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#0F1D5E] tabular-nums">
                      {a.agent_split != null ? `${a.agent_split}/${a.company_split}` : "—"}
                    </td>
                    <td className="px-4 py-3 w-56">
                      {a.next_tier ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-[#2a78d6]"
                              style={{ width: `${Math.min(100, a.next_tier.have / a.next_tier.needed * 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 whitespace-nowrap tabular-nums">
                            {a.next_tier.have}/{a.next_tier.needed} → {a.next_tier.split}%
                          </span>
                        </div>
                      ) : a.current_tier === 5 ? (
                        <span className="text-xs font-bold text-emerald-600">MAX TIER</span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
          onClick={() => setDetail(null)}>
          <div className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            {detailLoading || !detail ? (
              <p className="p-10 text-center text-slate-400 text-sm">Loading…</p>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#0F1D5E]">{detail.agent.name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {(detail.agent.classification || "unclassified").replace(/_/g, " ")}
                      {detail.agent.current_tier && <> · Tier {detail.agent.current_tier} since {String(detail.agent.tier_effective_from || "").slice(0, 10)}</>}
                    </p>
                    {!detail.eligible && detail.agent.classification === "SGP_AGENT" && (
                      <p className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Agent is {detail.eligibility_reason}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Classification + agreement controls */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-sm font-bold text-[#0F1D5E] flex items-center gap-2">
                    <FileSignature className="w-4 h-4" /> Classification & Agreement
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-slate-500 space-y-1 block">
                      <span>Classification</span>
                      <select value={detail.agent.classification || ""} disabled={saving}
                        onChange={e => patchAgent(detail.agent.id, { classification: e.target.value })}
                        className={`${inputClass} w-full`}>
                        <option value="" disabled>unclassified</option>
                        {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-slate-500 space-y-1 block">
                      <span>Agreement status</span>
                      <select value={detail.agent.agreement_status || "NOT_SENT"} disabled={saving}
                        onChange={e => patchAgent(detail.agent.id, { agreement_status: e.target.value })}
                        className={`${inputClass} w-full`}>
                        {AGREEMENT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-slate-500 space-y-1 block">
                      <span>Agreement effective date (required before approval)</span>
                      <input type="date" defaultValue={String(detail.agent.agreement_effective_at || "").slice(0, 10)}
                        onBlur={e => e.target.value && patchAgent(detail.agent.id, { agreement_effective_at: e.target.value })}
                        className={`${inputClass} w-full`} />
                    </label>
                    <label className="text-xs text-slate-500 space-y-1 block">
                      <span>Agreement document URL</span>
                      <input defaultValue={detail.agent.agreement_doc_url || ""}
                        onBlur={e => e.target.value !== (detail.agent.agreement_doc_url || "") &&
                          patchAgent(detail.agent.id, { agreement_doc_url: e.target.value })}
                        placeholder="link to signed agreement" className={`${inputClass} w-full`} />
                    </label>
                  </div>
                  {detail.agent.agreement_approved_at && (
                    <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Approved {String(detail.agent.agreement_approved_at).slice(0, 10)}
                    </p>
                  )}
                </div>

                {/* Tier progress */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#0F1D5E] flex items-center gap-2">
                      <Trophy className="w-4 h-4" /> Tier Progress
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={() => runEvaluate(detail.agent.id)} disabled={evaluating}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
                        Recalculate
                      </button>
                      <button onClick={() => { setOverrideTier(detail.agent.current_tier || 1); setOverrideModal(true); }}
                        className="px-3 py-1.5 rounded-lg bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#182a80]">
                        Override tier
                      </button>
                    </div>
                  </div>
                  {(detail.progress || []).map((t: any) => (
                    <div key={t.tier} className={`rounded-xl px-4 py-3 ${t.completed ? "bg-emerald-50" : "bg-slate-50"}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700">
                          Tier {t.tier} · {t.name} — {t.split}%
                          {t.completed && <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full uppercase">Permanent</span>}
                        </span>
                        <span className="text-xs text-slate-500">
                          {t.tier === 1 ? "granted at approval" :
                            `${fmt(t.threshold)}/mo × ${t.needed} months`}
                        </span>
                      </div>
                      {t.tier > 1 && !t.completed && (
                        <>
                          <div className="mt-2 h-2 rounded-full bg-white overflow-hidden">
                            <div className="h-full rounded-full bg-[#2a78d6]"
                              style={{ width: `${Math.min(100, t.months.length / t.needed * 100)}%` }} />
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5">
                            {t.months.length} of {t.needed} qualifying months
                            {t.months.length > 0 && <> — {t.months.map((m: any) => `${m.month} (${fmt(m.gp)})`).join(", ")}</>}
                          </p>
                        </>
                      )}
                      {t.tier > 1 && t.completed && t.months.length > 0 && (
                        <p className="text-xs text-emerald-700/70 mt-1">
                          Qualified: {t.months.map((m: any) => m.month).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* History */}
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-bold text-[#0F1D5E] flex items-center gap-2 mb-3">
                    <History className="w-4 h-4" /> Promotion History
                  </h3>
                  {(detail.history || []).length === 0 ? (
                    <p className="text-xs text-slate-400">No tier events yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.history.map((h: any) => (
                        <div key={h.id} className="flex items-start gap-3 text-xs">
                          <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${h.automatic ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <div>
                            <p className="font-semibold text-slate-700">
                              {h.previous_tier ? `Tier ${h.previous_tier} → ` : ""}Tier {h.new_tier}
                              <span className="text-slate-400 font-normal"> · effective {String(h.effective_from).slice(0, 10)}</span>
                            </p>
                            <p className="text-slate-400">{h.reason} — {h.automatic ? "automatic" : `by ${h.promoted_by}`}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Override modal */}
      {overrideModal && detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">Manual Tier Override</h3>
              <button onClick={() => setOverrideModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Manual changes are audit-logged with your identity. The 70/30 split (Tier 5) is the hard maximum.
            </p>
            <label className="block text-xs font-semibold text-slate-500 space-y-1">
              <span>Tier</span>
              <select value={overrideTier} onChange={e => setOverrideTier(parseInt(e.target.value))}
                className={`${inputClass} w-full`}>
                {[1, 2, 3, 4, 5].map(t => <option key={t} value={t}>Tier {t}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-500 space-y-1">
              <span>Reason (required)</span>
              <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} rows={3}
                placeholder="e.g. negotiated starting tier per signed agreement addendum"
                className={`${inputClass} w-full resize-none`} />
            </label>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setOverrideModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={doOverride} disabled={saving || !overrideReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#182a80] disabled:opacity-50">
                {saving ? "Saving…" : "Apply Override"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
