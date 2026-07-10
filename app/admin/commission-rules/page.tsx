"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  BookOpenCheck, Plus, X, History, Calculator, ChevronDown, ChevronUp,
} from "lucide-react";

const RULE_TYPES = [
  { v: "rate_per_kwh", l: "Rate per kWh (mils)", hint: "Provider pays a $/kWh rate on usage — the standard residual." },
  { v: "flat_fee", l: "Flat fee", hint: "Fixed dollars per account per month, regardless of usage." },
  { v: "tiered", l: "Tiered", hint: "The $/kWh rate depends on the account's monthly usage." },
  { v: "hybrid", l: "Hybrid", hint: "Flat dollars plus a $/kWh rate on top." },
];

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

type Tier = { min_kwh: string; max_kwh: string; rate: string };

export default function CommissionRulesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  // new-version modal state
  const [modal, setModal] = useState<any>(null); // supplier row
  const [ruleType, setRuleType] = useState("rate_per_kwh");
  const [rate, setRate] = useState("0.008");
  const [rateSource, setRateSource] = useState<"fixed" | "deal_adder">("fixed");
  const [flatAmount, setFlatAmount] = useState("0");
  const [tiers, setTiers] = useState<Tier[]>([{ min_kwh: "0", max_kwh: "", rate: "0.008" }]);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sups, current] = await Promise.all([api.getSuppliers(), api.getCommissionRules()]);
      setSuppliers((sups || []).filter((s: any) => s.is_active !== false));
      setRules(current || []);
    } catch { /* rules table may not exist yet */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const ruleBySupplier = useMemo(() => {
    const m: Record<string, any> = {};
    for (const r of rules) if (!m[r.supplier_id]) m[r.supplier_id] = r;
    return m;
  }, [rules]);

  const buildConfig = useCallback(() => {
    if (ruleType === "rate_per_kwh") {
      return rateSource === "deal_adder"
        ? { rate_source: "deal_adder" }
        : { rate: parseFloat(rate) || 0, rate_source: "fixed" };
    }
    if (ruleType === "flat_fee") return { flat_amount: parseFloat(flatAmount) || 0 };
    if (ruleType === "tiered") {
      return { tiers: tiers.map(t => ({
        min_kwh: parseFloat(t.min_kwh) || 0,
        max_kwh: t.max_kwh === "" ? null : parseFloat(t.max_kwh),
        rate: parseFloat(t.rate) || 0,
      })) };
    }
    return {
      flat_amount: parseFloat(flatAmount) || 0,
      ...(rateSource === "deal_adder"
        ? { rate_source: "deal_adder" }
        : { rate: parseFloat(rate) || 0, rate_source: "fixed" }),
    };
  }, [ruleType, rate, rateSource, flatAmount, tiers]);

  // live preview against sample accounts
  useEffect(() => {
    if (!modal) return;
    const t = setTimeout(() => {
      api.previewCommissionRule({
        rule_type: ruleType,
        config: buildConfig(),
        samples: [{ kwh: 500, adder: 0.008 }, { kwh: 1100, adder: 0.008 }, { kwh: 2500, adder: 0.008 }],
      }).then((r: any) => setPreview(r?.results || [])).catch(() => setPreview([]));
    }, 300);
    return () => clearTimeout(t);
  }, [modal, ruleType, buildConfig]);

  const openModal = (sup: any) => {
    const cur = ruleBySupplier[sup.id];
    setModal(sup);
    setError("");
    setNotes("");
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    if (cur) {
      setRuleType(cur.rule_type);
      const cfg = cur.config || {};
      setRate(String(cfg.rate ?? sup.default_adder ?? "0.008"));
      setRateSource(cfg.rate_source === "deal_adder" ? "deal_adder" : "fixed");
      setFlatAmount(String(cfg.flat_amount ?? "0"));
      setTiers((cfg.tiers || [{ min_kwh: 0, max_kwh: null, rate: 0.008 }]).map((t: any) => ({
        min_kwh: String(t.min_kwh ?? 0), max_kwh: t.max_kwh == null ? "" : String(t.max_kwh),
        rate: String(t.rate ?? 0),
      })));
    } else {
      setRuleType("rate_per_kwh");
      setRate(String(sup.default_adder ?? "0.008"));
      setRateSource("fixed");
      setFlatAmount("0");
      setTiers([{ min_kwh: "0", max_kwh: "", rate: String(sup.default_adder ?? "0.008") }]);
    }
  };

  const save = async () => {
    if (!modal) return;
    setSaving(true);
    setError("");
    try {
      await api.createCommissionRule({
        supplier_id: modal.id,
        name: `${modal.name} — ${RULE_TYPES.find(r => r.v === ruleType)?.l}`,
        rule_type: ruleType,
        config: buildConfig(),
        effective_from: effectiveFrom,
        notes,
      });
      setModal(null);
      setHistory({});
      await load();
    } catch (e: any) {
      setError(String(e?.message ?? e).slice(0, 200));
    }
    setSaving(false);
  };

  const toggleHistory = async (supplierId: string) => {
    if (historyFor === supplierId) { setHistoryFor(null); return; }
    setHistoryFor(supplierId);
    if (!history[supplierId]) {
      try {
        const h = await api.getCommissionRuleHistory(supplierId);
        setHistory(prev => ({ ...prev, [supplierId]: h || [] }));
      } catch {
        setHistory(prev => ({ ...prev, [supplierId]: [] }));
      }
    }
  };

  const describeRule = (r: any) => {
    const cfg = r.config || {};
    if (r.rule_type === "rate_per_kwh")
      return cfg.rate_source === "deal_adder" ? "Per-deal contracted adder" : `${cfg.rate} $/kWh on all usage`;
    if (r.rule_type === "flat_fee") return `${fmt(cfg.flat_amount)} flat per account/month`;
    if (r.rule_type === "tiered")
      return (cfg.tiers || []).map((t: any) =>
        `${t.min_kwh}${t.max_kwh != null ? `–${t.max_kwh}` : "+"} kWh → ${t.rate}`).join(" · ");
    return `${fmt(cfg.flat_amount)} + ${cfg.rate_source === "deal_adder" ? "deal adder" : `${cfg.rate} $/kWh`}`;
  };

  const inputClass = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1D5E] via-[#182a80] to-[#2a3f9e] text-white p-6 shadow-lg">
        <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <BookOpenCheck className="w-6 h-6" /> Commission Rules
          </h1>
          <p className="text-white/60 mt-1 text-sm max-w-2xl">
            What each provider is contracted to pay. The audit engine checks every statement
            against the rule in force for that month. Changes create a new version — history
            is never overwritten, so old months always audit against the rule that governed them.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="p-8 text-center text-slate-400 text-sm">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {suppliers.map(sup => {
            const rule = ruleBySupplier[sup.id];
            const open = historyFor === sup.id;
            return (
              <div key={sup.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[#0F1D5E]">{sup.name}</h2>
                    {rule ? (
                      <>
                        <p className="text-sm text-slate-700 mt-1.5 font-medium">{describeRule(rule)}</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          v{rule.version} · effective {String(rule.effective_from).slice(0, 10)}
                          {rule.notes && ` · ${rule.notes}`}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1.5">
                        No rule — the audit uses each deal&apos;s contracted adder
                        {sup.default_adder != null && <> (default {sup.default_adder} $/kWh)</>}.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button onClick={() => openModal(sup)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#182a80]">
                      <Plus className="w-3.5 h-3.5" /> {rule ? "New version" : "Set rule"}
                    </button>
                    <button onClick={() => toggleHistory(sup.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-[#0F1D5E]">
                      <History className="w-3.5 h-3.5" /> History
                      {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/60">
                    {!history[sup.id] ? (
                      <p className="text-xs text-slate-400">Loading…</p>
                    ) : history[sup.id].length === 0 ? (
                      <p className="text-xs text-slate-400">No versions yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {history[sup.id].map((h: any) => (
                          <div key={h.id} className="flex items-start gap-3 text-xs">
                            <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${h.effective_to ? "bg-slate-300" : "bg-emerald-500"}`} />
                            <div>
                              <p className="font-semibold text-slate-700">
                                v{h.version} · {describeRule(h)}
                              </p>
                              <p className="text-slate-400">
                                {String(h.effective_from).slice(0, 10)} → {h.effective_to ? String(h.effective_to).slice(0, 10) : "current"}
                                {h.created_by && ` · by ${h.created_by}`}
                                {h.notes && ` · ${h.notes}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New version modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">{modal.name} — new rule version</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Rule type</label>
              <select value={ruleType} onChange={e => setRuleType(e.target.value)} className={inputClass}>
                {RULE_TYPES.map(rt => <option key={rt.v} value={rt.v}>{rt.l}</option>)}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">{RULE_TYPES.find(rt => rt.v === ruleType)?.hint}</p>
            </div>

            {(ruleType === "rate_per_kwh" || ruleType === "hybrid") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Rate source</label>
                  <select value={rateSource} onChange={e => setRateSource(e.target.value as any)} className={inputClass}>
                    <option value="fixed">Fixed rate for all accounts</option>
                    <option value="deal_adder">Each deal&apos;s contracted adder</option>
                  </select>
                </div>
                {rateSource === "fixed" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Rate ($/kWh, e.g. 0.008)</label>
                    <input value={rate} onChange={e => setRate(e.target.value)} type="number" step="0.001" className={inputClass} />
                  </div>
                )}
              </div>
            )}

            {(ruleType === "flat_fee" || ruleType === "hybrid") && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Flat amount ($/account/month)</label>
                <input value={flatAmount} onChange={e => setFlatAmount(e.target.value)} type="number" step="0.01" className={inputClass} />
              </div>
            )}

            {ruleType === "tiered" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500">Usage tiers</label>
                {tiers.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={t.min_kwh} onChange={e => setTiers(ts => ts.map((x, j) => j === i ? { ...x, min_kwh: e.target.value } : x))}
                      type="number" placeholder="min kWh" className={`${inputClass} w-24`} />
                    <span className="text-slate-400 text-xs">to</span>
                    <input value={t.max_kwh} onChange={e => setTiers(ts => ts.map((x, j) => j === i ? { ...x, max_kwh: e.target.value } : x))}
                      type="number" placeholder="∞" className={`${inputClass} w-24`} />
                    <span className="text-slate-400 text-xs">kWh →</span>
                    <input value={t.rate} onChange={e => setTiers(ts => ts.map((x, j) => j === i ? { ...x, rate: e.target.value } : x))}
                      type="number" step="0.001" placeholder="$/kWh" className={`${inputClass} flex-1`} />
                    {tiers.length > 1 && (
                      <button onClick={() => setTiers(ts => ts.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setTiers(ts => [...ts, { min_kwh: "", max_kwh: "", rate: "" }])}
                  className="text-xs font-semibold text-[#0F1D5E] hover:underline">+ Add tier</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Effective from</label>
                <input value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} type="date" className={inputClass} />
                <p className="text-[11px] text-slate-400 mt-1">Months before this date keep auditing against the prior version.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. New broker agreement" className={inputClass} />
              </div>
            </div>

            {/* Live preview */}
            <div className="rounded-xl bg-[#EEF1FA] px-4 py-3">
              <p className="text-xs font-bold text-[#0F1D5E] flex items-center gap-1.5 mb-2">
                <Calculator className="w-3.5 h-3.5" /> Preview — expected commission per account
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {preview.map((p: any, i: number) => (
                  <div key={i} className="bg-white rounded-lg px-2 py-2">
                    <p className="text-[11px] text-slate-400">{p.kwh} kWh</p>
                    <p className="text-sm font-bold text-[#0F1D5E] tabular-nums">
                      {p.computable ? fmt(p.expected_amount) : "n/a"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={save} disabled={saving || !effectiveFrom}
                className="flex-1 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#182a80] disabled:opacity-50">
                {saving ? "Saving…" : "Save New Version"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
