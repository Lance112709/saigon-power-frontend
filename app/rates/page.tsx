"use client";
import { useState, useEffect } from "react";
import { Tag } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Plan {
  id: number;
  term_months: number;
  plan_name: string;
  provider: string;
  rate: number;
  badge: string | null;
  sort_order: number;
}

const BADGE_COLORS: Record<string, string> = {
  "Lowest":     "bg-green-100 text-green-700",
  "Best Value": "bg-blue-100 text-blue-700",
  "Popular":    "bg-amber-100 text-amber-700",
};

export default function RatesPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/landing-plans`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) setPlans(data);
        setFetchedAt(new Date());
      })
      .catch(() => setFetchedAt(new Date()))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E]">Today's Rates</h1>
          <p className="text-slate-500 mt-1 text-sm">Current energy plan pricing — use these when quoting customers</p>
        </div>
        {fetchedAt && (
          <span className="text-xs text-slate-400 mt-1">
            Updated {fetchedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
              <div className="h-10 bg-slate-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-sm">
          No rates available. An admin can add plans under Landing Page Rates.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EEF1FA] text-[#0F1D5E]">
                  <Tag className="w-3 h-3" />
                  {plan.term_months} Month{plan.term_months !== 1 ? "s" : ""}
                </span>
                {plan.badge && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${BADGE_COLORS[plan.badge] ?? "bg-slate-100 text-slate-600"}`}>
                    {plan.badge}
                  </span>
                )}
              </div>

              <div>
                <p className="text-[2.25rem] font-black text-[#0F1D5E] leading-none">
                  {plan.rate != null ? plan.rate.toFixed(1) : "—"}
                  <span className="text-lg font-semibold text-slate-400 ml-1">¢/kWh</span>
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-1">
                <p className="text-sm font-semibold text-slate-700">{plan.plan_name || "—"}</p>
                <p className="text-xs text-slate-400">{plan.provider || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center pt-2">
        Rates are updated by your admin. Contact your manager if pricing looks incorrect.
      </p>
    </div>
  );
}
