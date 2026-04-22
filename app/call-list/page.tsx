"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PhoneCall, RefreshCw, ArrowRight } from "lucide-react";

type Entry = {
  name: string;
  phone: string;
  sgp_customer_id: string | null;
  sales_agent: string | null;
  supplier: string | null;
  plan_name: string | null;
  end_date: string | null;
  days_left: number | null;
  priority_score: number;
  reason: string;
  action: string;
  lead_id: string;
  entity_url: string;
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-red-500" : score >= 50 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums ${score >= 75 ? "text-red-600" : score >= 50 ? "text-amber-600" : "text-emerald-600"}`}>{score}</span>
    </div>
  );
}

function DaysLeftBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-slate-400">—</span>;
  const urgent = days <= 7;
  const warn = days <= 30;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
      urgent ? "bg-red-100 text-red-600" : warn ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
    }`}>
      {days === 0 ? "Today" : `${days}d`}
    </span>
  );
}

export default function CallListPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined);

  const load = async (pf?: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const params: Record<string, string> = { limit: "100" };
    if (pf) params.priority_filter = pf;
    const data = await api.getCallList(params).catch(() => []);
    setEntries(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(priorityFilter); }, [priorityFilter]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const urgentCount = entries.filter(e => (e.days_left ?? 999) <= 7).length;
  const within30    = entries.filter(e => (e.days_left ?? 999) <= 30).length;
  const within60    = entries.filter(e => (e.days_left ?? 999) <= 60 && (e.days_left ?? 999) > 30).length;

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F1D5E] flex items-center justify-center">
            <PhoneCall className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F1D5E]">Who To Call Today</h1>
            <p className="text-sm text-slate-400">{today} · Active customers with deals expiring or due for check-in</p>
          </div>
        </div>
        <button onClick={() => load(priorityFilter, true)} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Stat strip */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Customers", value: entries.length,  color: "text-[#0F1D5E]" },
            { label: "Expiring ≤7 Days",  value: urgentCount,   color: "text-red-600" },
            { label: "Expiring ≤30 Days", value: within30,      color: "text-amber-600" },
            { label: "Expiring 31–60 Days", value: within60,    color: "text-slate-500" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { label: "All Customers", value: undefined },
          { label: "High Priority", value: "high" },
        ].map(f => (
          <button key={f.label} onClick={() => setPriorityFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              priorityFilter === f.value ? "bg-[#0F1D5E] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">Loading customers...</div>
        ) : entries.length === 0 ? (
          <div className="p-16 text-center">
            <PhoneCall className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">No customers to call right now.</p>
            <p className="text-slate-300 text-xs mt-1">Customers with active deals will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["#", "Customer", "Phone", "Agent", "Supplier / Plan", "Expires", "Score", "Why Call", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={`${e.lead_id}-${i}`}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer"
                    onClick={() => router.push(e.entity_url)}>
                    <td className="px-4 py-3 text-xs font-bold text-slate-400 w-8">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#0F1D5E] whitespace-nowrap">{e.name}</p>
                      {e.sgp_customer_id && <p className="font-mono text-xs text-slate-400">{e.sgp_customer_id}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">{e.phone}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{e.sales_agent || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <p className="font-medium">{e.supplier || "—"}</p>
                      {e.plan_name && <p className="text-slate-400">{e.plan_name}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <DaysLeftBadge days={e.days_left} />
                      {e.end_date && <p className="text-xs text-slate-400 mt-0.5">{e.end_date}</p>}
                    </td>
                    <td className="px-4 py-3 w-32"><ScoreBar score={e.priority_score} /></td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      <span className="text-xs leading-relaxed">{e.reason}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={ev => { ev.stopPropagation(); router.push(e.entity_url); }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border ${
                          e.priority_score >= 75
                            ? "bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                            : e.priority_score >= 50
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                            : "bg-[#EEF1FA] text-[#0F1D5E] hover:bg-[#0F1D5E]/10 border-[#0F1D5E]/10"
                        }`}>
                        {e.action} <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
