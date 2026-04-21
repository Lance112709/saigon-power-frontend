"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PhoneCall, RefreshCw, ArrowRight, User, Building2 } from "lucide-react";

type Entry = {
  name: string;
  type: "Lead" | "Customer";
  phone: string;
  priority_score: number;
  reason: string;
  action: string;
  lead_id: string | null;
  deal_id: string | null;
  entity_url: string;
};

const FILTERS = [
  { label: "All",            type: undefined,     priority: undefined },
  { label: "Leads Only",     type: "leads",       priority: undefined },
  { label: "Customers Only", type: "customers",   priority: undefined },
  { label: "High Priority",  type: undefined,     priority: "high"    },
] as const;

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-red-500" :
    score >= 50 ? "bg-amber-400" :
                  "bg-emerald-500";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums ${
        score >= 75 ? "text-red-600" : score >= 50 ? "text-amber-600" : "text-emerald-600"
      }`}>{score}</span>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  return type === "Customer" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
      <Building2 className="w-3 h-3" /> Customer
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
      <User className="w-3 h-3" /> Lead
    </span>
  );
}

export default function CallListPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState(0);

  const load = async (filterIdx: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const f = FILTERS[filterIdx];
    const params: Record<string, string> = { limit: "30" };
    if (f.type) params.type_filter = f.type;
    if (f.priority) params.priority_filter = f.priority;

    const data = await api.getCallList(params).catch(() => []);
    setEntries(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(activeFilter); }, [activeFilter]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const highCount  = entries.filter(e => e.priority_score >= 75).length;
  const medCount   = entries.filter(e => e.priority_score >= 50 && e.priority_score < 75).length;
  const leadCount  = entries.filter(e => e.type === "Lead").length;
  const custCount  = entries.filter(e => e.type === "Customer").length;

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F1D5E] flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0F1D5E]">Who To Call Today</h1>
              <p className="text-sm text-slate-400">{today}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => load(activeFilter, true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stat strip */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Contacts", value: entries.length, color: "text-[#0F1D5E]" },
            { label: "High Priority",  value: highCount,      color: "text-red-600" },
            { label: "Medium",         value: medCount,       color: "text-amber-600" },
            { label: "Leads / Customers", value: `${leadCount} / ${custCount}`, color: "text-slate-600" },
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
        {FILTERS.map((f, i) => (
          <button
            key={f.label}
            onClick={() => setActiveFilter(i)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeFilter === i
                ? "bg-[#0F1D5E] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">Analyzing contacts...</div>
        ) : entries.length === 0 ? (
          <div className="p-16 text-center">
            <PhoneCall className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">No contacts to prioritize right now.</p>
            <p className="text-slate-300 text-xs mt-1">Add leads and deals to get recommendations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["#", "Name", "Type", "Phone", "Score", "Why Call", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr
                    key={`${e.lead_id ?? e.entity_url}-${i}`}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer"
                    onClick={() => router.push(e.entity_url)}
                  >
                    <td className="px-4 py-3 text-xs font-bold text-slate-400 w-8">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-[#0F1D5E] whitespace-nowrap">{e.name}</td>
                    <td className="px-4 py-3"><TypeBadge type={e.type} /></td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">{e.phone}</td>
                    <td className="px-4 py-3 w-32"><ScoreBar score={e.priority_score} /></td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      <span className="text-xs leading-relaxed">{e.reason}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={ev => { ev.stopPropagation(); router.push(e.entity_url); }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                          e.priority_score >= 75
                            ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                            : e.priority_score >= 50
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                            : "bg-[#EEF1FA] text-[#0F1D5E] hover:bg-[#0F1D5E]/10 border border-[#0F1D5E]/10"
                        }`}
                      >
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
