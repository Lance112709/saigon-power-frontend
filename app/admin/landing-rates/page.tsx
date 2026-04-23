"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Globe, Save, RefreshCw, CheckCircle } from "lucide-react";

type Plan = {
  id: number;
  term_months: number;
  plan_name: string;
  provider: string;
  rate: number;
  badge: string | null;
  sort_order: number;
};

const BADGE_OPTIONS = [
  { value: "",           label: "None" },
  { value: "Lowest",     label: "Lowest" },
  { value: "Best Value", label: "Best Value" },
  { value: "Popular",    label: "Popular" },
];

export default function LandingRatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [edits, setEdits] = useState<Record<number, Partial<Plan>>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLandingPlans();
      setPlans(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const field = (id: number, key: keyof Plan, fallback: any) =>
    edits[id]?.[key] !== undefined ? edits[id][key] : fallback;

  const change = (id: number, key: keyof Plan, value: any) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const save = async (plan: Plan) => {
    const patch = edits[plan.id];
    if (!patch || Object.keys(patch).length === 0) return;
    setSaving(s => ({ ...s, [plan.id]: true }));
    try {
      await api.updateLandingPlan(plan.id, patch);
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, ...patch } : p));
      setEdits(prev => { const n = { ...prev }; delete n[plan.id]; return n; });
      setSaved(s => ({ ...s, [plan.id]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [plan.id]: false })), 2000);
    } finally {
      setSaving(s => ({ ...s, [plan.id]: false }));
    }
  };

  const isDirty = (id: number) => edits[id] && Object.keys(edits[id]).length > 0;

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F1D5E] flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F1D5E]">Landing Page Rates</h1>
            <p className="text-sm text-slate-400">Update the plans shown on your public website at /en</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Preview link */}
      <div className="bg-[#EEF1FA] border border-[#0F1D5E]/10 rounded-2xl px-5 py-3 flex items-center justify-between">
        <p className="text-sm text-[#0F1D5E] font-medium">Changes go live immediately on your landing page.</p>
        <a href="/en" target="_blank"
          className="text-sm font-semibold text-[#0F1D5E] hover:underline flex items-center gap-1">
          Preview /en <Globe className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Plans */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400 text-sm">
          Loading plans...
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-red-200 p-10 text-center">
          <p className="text-red-600 font-semibold mb-1">Failed to load plans</p>
          <p className="text-xs text-slate-400 mb-4">{error}</p>
          <button onClick={load} className="px-4 py-2 bg-[#0F1D5E] text-white rounded-xl text-sm font-semibold">
            Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0F1D5E]/8 flex items-center justify-center">
                    <span className="text-sm font-black text-[#0F1D5E]">{plan.term_months}mo</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{plan.term_months}-Month Plan</p>
                    <p className="text-xs text-slate-400">Sort order: {plan.sort_order}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {saved[plan.id] && (
                    <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
                      <CheckCircle className="w-4 h-4" /> Saved!
                    </div>
                  )}
                  <button
                    onClick={() => save(plan)}
                    disabled={!isDirty(plan.id) || saving[plan.id]}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      isDirty(plan.id)
                        ? "bg-[#0F1D5E] text-white hover:bg-[#0F1D5E]/90"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}>
                    {saving[plan.id] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Rate */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Rate (¢/kWh) *
                  </label>
                  <input
                    type="number" step="0.1" min="0"
                    value={field(plan.id, "rate", plan.rate)}
                    onChange={e => change(plan.id, "rate", parseFloat(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 focus:border-[#0F1D5E]/40"
                  />
                </div>

                {/* Plan Name */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={field(plan.id, "plan_name", plan.plan_name)}
                    onChange={e => change(plan.id, "plan_name", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 focus:border-[#0F1D5E]/40"
                  />
                </div>

                {/* Provider */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Provider
                  </label>
                  <input
                    type="text"
                    value={field(plan.id, "provider", plan.provider)}
                    onChange={e => change(plan.id, "provider", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 focus:border-[#0F1D5E]/40"
                  />
                </div>

                {/* Badge */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Badge
                  </label>
                  <select
                    value={field(plan.id, "badge", plan.badge) ?? ""}
                    onChange={e => change(plan.id, "badge", e.target.value || null)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 focus:border-[#0F1D5E]/40 bg-white"
                  >
                    {BADGE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">Preview on website:</p>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold text-slate-700">
                    {field(plan.id, "plan_name", plan.plan_name)}
                  </span>
                  <span className="text-slate-400 text-xs">
                    {field(plan.id, "provider", plan.provider)} · {plan.term_months} mo
                  </span>
                  {(field(plan.id, "badge", plan.badge)) && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase">
                      {field(plan.id, "badge", plan.badge)}
                    </span>
                  )}
                  <span className="text-xl font-black text-[#0F1D5E]">
                    {field(plan.id, "rate", plan.rate)}¢
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
