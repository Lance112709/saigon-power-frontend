"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PhoneCall, RefreshCw, ArrowRight, CheckCircle2, Undo2, RotateCcw } from "lucide-react";

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
  lead_id: string | null;
  entity_key: string;
  entity_url: string;
};

type ResolvedEntry = Entry & {
  resolution_id: string;
  resolved_by_name: string | null;
  resolved_at: string | null;
  note: string | null;
  still_due: boolean;
};

const fmtResolvedAt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

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
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedEntry[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Last resolved row, kept for a few seconds so a misclick can be undone
  const [undo, setUndo] = useState<{ entry: Entry; index: number; id: string | null } | null>(null);

  const showResolved = priorityFilter === "resolved";

  const load = async (pf?: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    if (pf === "resolved") {
      const data = await api.getResolvedCallList().catch(() => []);
      setResolved(data);
    } else {
      const params: Record<string, string> = { limit: "100" };
      if (pf) params.priority_filter = pf;
      const data = await api.getCallList(params).catch(() => []);
      setEntries(data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(priorityFilter); }, [priorityFilter]);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(t);
  }, [undo]);

  const rowKey = (e: Entry) => `${e.entity_key}|${e.end_date ?? ""}`;

  const resolve = async (e: Entry) => {
    const key = rowKey(e);
    setResolving(key);
    setError(null);
    try {
      const res = await api.resolveCallListEntry(e.entity_key, e.end_date);
      const index = entries.findIndex(x => rowKey(x) === key);
      setEntries(prev => prev.filter(x => rowKey(x) !== key));
      setUndo({ entry: e, index, id: res?.id ?? null });
    } catch (err) {
      const msg = err instanceof Error ? err.message.replace(/^\d+:/, "") : "Could not resolve";
      setError(msg);
    } finally {
      setResolving(null);
    }
  };

  const undoResolve = async () => {
    if (!undo) return;
    const { entry, index, id } = undo;
    setUndo(null);
    try {
      if (id) await api.unresolveCallListEntry(id);
      setEntries(prev => {
        const next = prev.filter(x => rowKey(x) !== rowKey(entry));
        next.splice(Math.min(index < 0 ? next.length : index, next.length), 0, entry);
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message.replace(/^\d+:/, "") : "Could not undo";
      setError(msg);
    }
  };

  // "Put back" from the Resolved tab — the customer returns to Who To Call
  const restore = async (r: ResolvedEntry) => {
    setRestoring(r.resolution_id);
    setError(null);
    try {
      await api.unresolveCallListEntry(r.resolution_id);
      setResolved(prev => prev.filter(x => x.resolution_id !== r.resolution_id));
    } catch (err) {
      const msg = err instanceof Error ? err.message.replace(/^\d+:/, "") : "Could not put back";
      setError(msg);
    } finally {
      setRestoring(null);
    }
  };

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
            <p className="text-sm text-slate-400">{today} · Active customers with deals expiring or due for check-in · click <span className="font-semibold text-emerald-600">Resolved</span> once you have handled a customer · they move to the <span className="font-semibold text-slate-500">Resolved</span> tab</p>
          </div>
        </div>
        <button onClick={() => load(priorityFilter, true)} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Stat strip */}
      {!loading && !showResolved && (
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
          { label: "Resolved", value: "resolved" },
        ].map(f => (
          <button key={f.label} onClick={() => setPriorityFilter(f.value)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              priorityFilter === f.value
                ? f.value === "resolved" ? "bg-emerald-600 text-white" : "bg-[#0F1D5E] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            {f.value === "resolved" && <CheckCircle2 className="w-4 h-4" />}
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs font-semibold text-red-600 hover:underline">Dismiss</button>
        </div>
      )}

      {undo && !showResolved && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span><span className="font-semibold">{undo.entry.name}</span> marked resolved and removed from the list.</span>
          </span>
          <button onClick={undoResolve}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-emerald-300 bg-white text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">Loading customers...</div>
        ) : showResolved ? (
          resolved.length === 0 ? (
            <div className="p-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">Nothing resolved yet.</p>
              <p className="text-slate-300 text-xs mt-1">Customers you mark Resolved on the call list will show up here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["#", "Customer", "Phone", "Agent", "Supplier / Plan", "Contract End", "Resolved By", "Resolved On", "Status", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resolved.map((r, i) => (
                    <tr key={r.resolution_id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer"
                      onClick={() => router.push(r.entity_url)}>
                      <td className="px-4 py-3 text-xs font-bold text-slate-400 w-8">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#0F1D5E] whitespace-nowrap">{r.name}</p>
                        {r.sgp_customer_id && <p className="font-mono text-xs text-slate-400">{r.sgp_customer_id}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">{r.phone}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{r.sales_agent || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <p className="font-medium">{r.supplier || "—"}</p>
                        {r.plan_name && <p className="text-slate-400">{r.plan_name}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <DaysLeftBadge days={r.days_left} />
                        {r.end_date && <p className="text-xs text-slate-400 mt-0.5">{r.end_date}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{r.resolved_by_name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtResolvedAt(r.resolved_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          r.still_due ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          <CheckCircle2 className="w-3 h-3" /> {r.still_due ? "Resolved" : "Renewed / closed"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.still_due && (
                          <button
                            onClick={ev => { ev.stopPropagation(); restore(r); }}
                            disabled={restoring === r.resolution_id}
                            title="Put this customer back on the Who To Call list"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                            <RotateCcw className="w-3.5 h-3.5" />
                            {restoring === r.resolution_id ? "Restoring…" : "Put back"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
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
                  {["#", "Customer", "Phone", "Agent", "Supplier / Plan", "Expires", "Score", "Why Call", "Action", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={rowKey(e)}
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
                    <td className="px-4 py-3">
                      <button
                        onClick={ev => { ev.stopPropagation(); resolve(e); }}
                        disabled={resolving === rowKey(e)}
                        title="Done with this customer — remove from the list"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 disabled:opacity-50 transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {resolving === rowKey(e) ? "Saving…" : "Resolved"}
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
