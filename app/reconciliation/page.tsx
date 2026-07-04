"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  DollarSign, AlertTriangle, CheckCircle, TrendingDown, Copy, HelpCircle,
  RefreshCw, X, Search, Download, Banknote,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

// Validated categorical palette (CVD-safe order) — one fixed color per provider.
const SERIES_COLORS = ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7"];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function downloadFile(path: string, filename: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

/** "2026-05-01" → "May 2026" (no Date() — avoids timezone off-by-one) */
function fmtMonth(d: string | null | undefined) {
  if (!d || d.length < 7) return d ?? "";
  const y = d.slice(0, 4), m = parseInt(d.slice(5, 7), 10);
  return `${MONTHS[m - 1] ?? ""} ${y}`;
}

const STATUS_META: Record<string, { label: string; badge: string; icon: any }> = {
  missing:    { label: "Missing Payment", badge: "bg-red-100 text-red-800",       icon: AlertTriangle },
  short_paid: { label: "Wrong Rate",      badge: "bg-orange-100 text-orange-800", icon: TrendingDown },
  over_paid:  { label: "Duplicate",       badge: "bg-purple-100 text-purple-800", icon: Copy },
  unexpected: { label: "Needs Review",    badge: "bg-amber-100 text-amber-800",   icon: HelpCircle },
  matched:    { label: "Matched",         badge: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
};

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const issueCount = (r: any) =>
  (r.missing_count ?? 0) + (r.short_paid_count ?? 0) + (r.over_paid_count ?? 0);
const totalItems = (r: any) => issueCount(r) + (r.matched_count ?? 0) + (r.unexpected_count ?? 0);

/** "2026-05" → "May '26" for chart ticks */
function shortMonth(m: string) {
  return `${MONTHS[parseInt(m.slice(5, 7), 10) - 1]?.slice(0, 3)} '${m.slice(2, 4)}`;
}

function PaymentsReceived({ runs, onSelectRun }: { runs: any[]; onSelectRun: (r: any) => void }) {
  const [rangeMonths, setRangeMonths] = useState(12);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Fixed provider order (by all-time received) → stable colors regardless of filters
  const providers = useMemo(() => {
    const totals = new Map<string, number>();
    runs.forEach(r => {
      const n = r.suppliers?.name ?? "Unknown";
      totals.set(n, (totals.get(n) ?? 0) + (r.total_actual ?? 0));
    });
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [runs]);
  const colorOf = (name: string) => SERIES_COLORS[providers.indexOf(name) % SERIES_COLORS.length];

  const months = useMemo(() => {
    const all = Array.from(new Set(runs.map(r => r.billing_month.slice(0, 7)))).sort();
    return rangeMonths > 0 ? all.slice(-rangeMonths) : all;
  }, [runs, rangeMonths]);

  const runAt = useMemo(() => {
    const m = new Map<string, any>();
    runs.forEach(r => m.set(`${r.billing_month.slice(0, 7)}|${r.suppliers?.name ?? "Unknown"}`, r));
    return m;
  }, [runs]);

  const chartData = useMemo(() => months.map(m => {
    const row: any = { month: m, label: shortMonth(m), total: 0 };
    providers.forEach(p => {
      const run = runAt.get(`${m}|${p}`);
      const v = run ? (run.total_actual ?? 0) : 0;
      row[p] = v;
      if (!hidden.has(p)) row.total += v;
    });
    return row;
  }), [months, providers, runAt, hidden]);

  const visibleProviders = providers.filter(p => !hidden.has(p));
  const rangeTotal = chartData.reduce((s, r) => s + r.total, 0);

  const toggle = (p: string) => setHidden(prev => {
    const next = new Set(prev);
    next.has(p) ? next.delete(p) : next.add(p);
    return next;
  });

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, e: any) => s + (e.value || 0), 0);
    return (
      <div className="bg-[#0F1D5E] text-white rounded-xl px-3.5 py-2.5 shadow-xl text-xs space-y-1">
        <p className="font-bold text-sm">{label}</p>
        {[...payload].reverse().filter((e: any) => e.value > 0).map((e: any) => (
          <p key={e.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: e.fill }} />
            <span className="text-white/80">{e.dataKey}</span>
            <span className="ml-auto font-semibold tabular-nums pl-4">{fmt(e.value)}</span>
          </p>
        ))}
        <p className="border-t border-white/20 pt-1 flex justify-between font-bold">
          <span>Total</span><span className="tabular-nums">{fmt(total)}</span>
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#EEF1FA] flex items-center justify-center">
            <Banknote className="w-4.5 h-4.5 text-[#0F1D5E]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F1D5E]">Payments Received by Month</h2>
            <p className="text-xs text-slate-400">
              {fmt(rangeTotal)} across {months.length} month{months.length !== 1 ? "s" : ""} — click a provider to show/hide it, click any amount below to open its reconciliation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {[{ v: 6, l: "6 mo" }, { v: 12, l: "12 mo" }, { v: 0, l: "All" }].map(o => (
            <button key={o.v} onClick={() => setRangeMonths(o.v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                rangeMonths === o.v ? "bg-[#0F1D5E] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>{o.l}</button>
          ))}
        </div>
      </div>

      {/* Legend / provider filter chips */}
      <div className="px-5 pt-4 flex flex-wrap gap-2">
        {providers.map(p => {
          const off = hidden.has(p);
          return (
            <button key={p} onClick={() => toggle(p)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                off ? "bg-white border-slate-200 text-slate-300" : "border-transparent text-slate-700"
              }`}
              style={off ? {} : { background: `${colorOf(p)}18`, borderColor: `${colorOf(p)}40` }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: off ? "#cbd5e1" : colorOf(p) }} />
              {p}
            </button>
          );
        })}
      </div>

      {/* Stacked monthly chart */}
      <div className="px-3 pt-2">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eef1f6" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
              tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0F1D5E08" }} />
            {visibleProviders.map(p => (
              <Bar key={p} dataKey={p} stackId="received" fill={colorOf(p)}
                stroke="#ffffff" strokeWidth={1} maxBarSize={44} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Month × provider matrix */}
      <div className="overflow-x-auto border-t border-slate-100 mt-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50">Month</th>
              {visibleProviders.map(p => (
                <th key={p} className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: colorOf(p) }} />{p}
                  </span>
                </th>
              ))}
              <th className="px-5 py-2.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {[...months].reverse().map(m => {
              const rowTotal = visibleProviders.reduce((s, p) => s + (runAt.get(`${m}|${p}`)?.total_actual ?? 0), 0);
              return (
                <tr key={m} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-5 py-2.5 font-semibold text-[#0F1D5E] whitespace-nowrap sticky left-0 bg-white">{fmtMonth(`${m}-01`)}</td>
                  {visibleProviders.map(p => {
                    const run = runAt.get(`${m}|${p}`);
                    return (
                      <td key={p} className="px-4 py-2.5 text-right tabular-nums">
                        {run ? (
                          <button onClick={() => onSelectRun(run)}
                            className="text-slate-700 hover:text-[#0F1D5E] hover:underline font-medium"
                            title={`Open ${p} — ${fmtMonth(`${m}-01`)}`}>
                            {fmt(run.total_actual)}
                          </button>
                        ) : <span className="text-slate-200">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-5 py-2.5 text-right font-bold text-[#0F1D5E] tabular-nums">{fmt(rowTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReconciliationPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [providerFilter, setProviderFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [searchEsiid, setSearchEsiid] = useState("");
  const [rerunning, setRerunning] = useState(false);

  const [resolveModal, setResolveModal] = useState<{ itemIds: string[]; bulk: boolean } | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [resolving, setResolving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadRuns = async () => {
    try {
      const data = await api.getRuns();
      // hide empty legacy runs
      const real = (data || []).filter((r: any) => totalItems(r) > 0);
      real.sort((a: any, b: any) =>
        b.billing_month.localeCompare(a.billing_month) ||
        (a.suppliers?.name ?? "").localeCompare(b.suppliers?.name ?? ""));
      setRuns(real);
      return real;
    } catch { return []; }
  };

  useEffect(() => {
    loadRuns().then((real) => {
      if (real.length > 0) setSelectedRun((cur: any) => cur ?? real[0]);
    });
  }, []);

  const providers = useMemo(() => {
    const names = new Set<string>();
    runs.forEach(r => names.add(r.suppliers?.name ?? "Unknown"));
    return ["All", ...Array.from(names).sort()];
  }, [runs]);

  const visibleRuns = useMemo(
    () => runs.filter(r => providerFilter === "All" || (r.suppliers?.name ?? "Unknown") === providerFilter),
    [runs, providerFilter]);

  // Portfolio snapshot: each provider's most recent run
  const latestBySupplier = useMemo(() => {
    const seen = new Map<string, any>();
    for (const r of runs) {
      const key = r.suppliers?.code ?? r.supplier_id ?? "?";
      if (!seen.has(key)) seen.set(key, r); // runs sorted newest-first
    }
    return Array.from(seen.values());
  }, [runs]);

  const kpi = useMemo(() => {
    const received = latestBySupplier.reduce((s, r) => s + (r.total_actual ?? 0), 0);
    const missing = latestBySupplier.reduce((s, r) => s + (r.missing_count ?? 0), 0);
    const wrongRate = latestBySupplier.reduce((s, r) => s + (r.short_paid_count ?? 0), 0);
    const underpaid = latestBySupplier.reduce(
      (s, r) => s + Math.max(0, -(r.total_discrepancy ?? 0)), 0);
    const months = latestBySupplier.map(r => fmtMonth(r.billing_month));
    const monthRange = months.length
      ? Array.from(new Set(months)).slice(0, 2).join(" / ") + (new Set(months).size > 2 ? " …" : "")
      : "";
    return { received, missing, wrongRate, underpaid, monthRange };
  }, [latestBySupplier]);

  const loadItems = useCallback(async (run: any, status: string, severity: string, resolved: boolean) => {
    if (!run) return;
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const data = await api.getRunItems(
        run.id, status || undefined, severity || undefined, resolved ? undefined : false);
      data.sort((a: any, b: any) => {
        const so = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
        if (so !== 0) return so;
        return Math.abs(b.discrepancy_amount ?? 0) - Math.abs(a.discrepancy_amount ?? 0);
      });
      setItems(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedRun) loadItems(selectedRun, statusFilter, severityFilter, showResolved);
  }, [selectedRun, statusFilter, severityFilter, showResolved, loadItems]);

  const rerunSelectedMonth = async () => {
    if (!selectedRun) return;
    setRerunning(true);
    try {
      await api.triggerReconciliation(selectedRun.billing_month);
      const real = await loadRuns();
      const again = real.find((r: any) =>
        r.billing_month === selectedRun.billing_month &&
        r.suppliers?.name === selectedRun.suppliers?.name);
      setSelectedRun(again ?? real[0] ?? null);
    } catch {}
    setRerunning(false);
  };

  const openResolve = (itemIds: string[], bulk = false) => {
    setResolveNote("");
    setResolveModal({ itemIds, bulk });
  };

  const doResolve = async () => {
    if (!resolveModal) return;
    setResolving(true);
    try {
      if (resolveModal.itemIds.length === 1 && !resolveModal.bulk) {
        await api.resolveItem(resolveModal.itemIds[0], resolveNote);
      } else {
        await (api as any).bulkResolveItems(resolveModal.itemIds, resolveNote);
      }
      setResolveModal(null);
      if (selectedRun) loadItems(selectedRun, statusFilter, severityFilter, showResolved);
    } catch {}
    setResolving(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const shownItems = useMemo(() => {
    if (!searchEsiid.trim()) return items;
    const q = searchEsiid.replace(/\D/g, "");
    return items.filter((i: any) => (i.esiid ?? "").includes(q));
  }, [items, searchEsiid]);

  const unresolvedItems = shownItems.filter(i => !i.is_resolved);

  const toggleAll = () => {
    if (selectedIds.size === unresolvedItems.length && unresolvedItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unresolvedItems.map((i: any) => i.id)));
    }
  };

  const selectClass = "border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

  const allTimeReceived = runs.reduce((s, r) => s + (r.total_actual ?? 0), 0);

  const heroTile = "rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-3.5";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1D5E] via-[#182a80] to-[#2a3f9e] text-white p-6 shadow-lg">
        <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 right-40 w-80 h-80 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Commission Reconciliation</h1>
            <p className="text-white/60 mt-1 text-sm">
              Every statement upload reconciles automatically — review and resolve flagged items here.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {runs.length > 0 && (
              <button
                onClick={() => {
                  const months = runs.map(r => r.billing_month.slice(0, 7));
                  const start = months.reduce((a, b) => (a < b ? a : b));
                  const end = months.reduce((a, b) => (a > b ? a : b));
                  downloadFile(`/api/v1/reconciliation/export?start=${start}&end=${end}&format=xlsx`,
                    `reconciliation_${start}_${end}.xlsx`).catch(() => alert("Export failed"));
                }}
                title="Excel report: every provider, every month, plus all open issues"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
              >
                <Download className="w-4 h-4" /> Export All
              </button>
            )}
            {selectedRun && (
              <button
                onClick={rerunSelectedMonth}
                disabled={rerunning}
                title="Re-check this month against the current deal book (after fixing deals or backfilling ESI IDs)"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0F1D5E] text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${rerunning ? "animate-spin" : ""}`} />
                {rerunning ? "Re-checking…" : `Re-check ${fmtMonth(selectedRun.billing_month)}`}
              </button>
            )}
          </div>
        </div>

        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <div className={heroTile}>
            <p className="text-xs text-white/60 font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Latest Statements
            </p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{fmt(kpi.received)}</p>
            <p className="text-[11px] text-white/50 mt-0.5 truncate">
              {latestBySupplier.length} providers · {kpi.monthRange}
            </p>
          </div>
          <div className={heroTile}>
            <p className="text-xs text-white/60 font-medium flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5" /> All-Time Received
            </p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{fmt(allTimeReceived)}</p>
            <p className="text-[11px] text-white/50 mt-0.5">verified across every statement</p>
          </div>
          <div className={heroTile}>
            <p className="text-xs text-white/60 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Missing Payments
            </p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${kpi.missing > 0 ? "text-amber-300" : "text-emerald-300"}`}>
              {kpi.missing}
            </p>
            <p className="text-[11px] text-white/50 mt-0.5">active accounts not on latest statement</p>
          </div>
          <div className={heroTile}>
            <p className="text-xs text-white/60 font-medium flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-300" /> Under Expected
            </p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${kpi.underpaid > 0.01 ? "text-rose-300" : "text-emerald-300"}`}>
              {fmt(kpi.underpaid)}
            </p>
            <p className="text-[11px] text-white/50 mt-0.5">{kpi.wrongRate} wrong-rate accounts · latest month</p>
          </div>
        </div>
      </div>

      {/* Payments received by month × provider */}
      {runs.length > 0 && <PaymentsReceived runs={runs} onSelectRun={setSelectedRun} />}

      {/* Runs + Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Runs list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#0F1D5E]">Statement Months</h2>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {providers.map(p => (
                <button
                  key={p}
                  onClick={() => setProviderFilter(p)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    providerFilter === p
                      ? "bg-[#0F1D5E] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {p === "All" ? "All providers" : p}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {visibleRuns.length === 0 ? (
              <p className="p-5 text-slate-400 text-sm">
                No reconciliations yet — upload a commission statement and one is created automatically.
              </p>
            ) : visibleRuns.map((run: any) => {
              const selected = selectedRun?.id === run.id;
              const issues = issueCount(run);
              return (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={`w-full text-left px-5 py-3.5 border-b border-slate-100 last:border-0 transition-colors border-l-4 ${
                    selected
                      ? "bg-[#EEF1FA] border-l-[#0F1D5E]"
                      : issues > 0
                        ? "border-l-red-300 hover:bg-slate-50"
                        : "border-l-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-[#0F1D5E]">{fmtMonth(run.billing_month)}</span>
                    <span className="text-sm font-semibold text-slate-700 tabular-nums">{fmt(run.total_actual)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{run.suppliers?.name ?? "Unknown provider"}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {(run.missing_count ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3" />{run.missing_count} missing
                      </span>
                    )}
                    {(run.short_paid_count ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                        <TrendingDown className="w-3 h-3" />{run.short_paid_count} wrong rate
                      </span>
                    )}
                    {(run.over_paid_count ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        <Copy className="w-3 h-3" />{run.over_paid_count} duplicate
                      </span>
                    )}
                    {issues === 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3 h-3" />all clear
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Items */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#0F1D5E]">
                  {selectedRun
                    ? `${selectedRun.suppliers?.name ?? "Provider"} — ${fmtMonth(selectedRun.billing_month)}`
                    : "Select a month"}
                </h2>
                {selectedRun && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Expected {fmt(selectedRun.total_expected)} · Received {fmt(selectedRun.total_actual)} ·{" "}
                    <span className={selectedRun.total_discrepancy < -0.01 ? "text-red-600 font-semibold" : "text-emerald-600 font-semibold"}>
                      {selectedRun.total_discrepancy < 0 ? "−" : "+"}{fmt(Math.abs(selectedRun.total_discrepancy))}
                    </span>
                  </p>
                )}
              </div>
              {selectedRun && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const sup = selectedRun.suppliers?.code ?? "run";
                      const m = selectedRun.billing_month.slice(0, 7);
                      downloadFile(`/api/v1/reconciliation/runs/${selectedRun.id}/export?format=xlsx`,
                        `reconciliation_${sup}_${m}.xlsx`).catch(() => alert("Export failed"));
                    }}
                    title="Download this month as Excel"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5" /> Excel
                  </button>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      value={searchEsiid}
                      onChange={e => setSearchEsiid(e.target.value)}
                      placeholder="Find ESI ID…"
                      className={`${selectClass} pl-8 w-36`}
                    />
                  </div>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
                    <option value="">All issues</option>
                    <option value="missing">Missing payment</option>
                    <option value="short_paid">Wrong rate</option>
                    <option value="over_paid">Duplicate</option>
                    <option value="unexpected">Needs review</option>
                    <option value="matched">Matched</option>
                  </select>
                  <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className={selectClass}>
                    <option value="">All severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showResolved}
                      onChange={e => setShowResolved(e.target.checked)}
                      className="rounded"
                    />
                    Resolved
                  </label>
                </div>
              )}
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{selectedIds.size} selected</span>
                <button
                  onClick={() => openResolve([...selectedIds], true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                >
                  Resolve Selected
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            {!selectedRun ? (
              <p className="p-8 text-center text-slate-400 text-sm">Select a statement month on the left.</p>
            ) : loading ? (
              <p className="p-8 text-center text-slate-400 text-sm">Loading…</p>
            ) : shownItems.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-medium">Nothing needs attention for these filters.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        onChange={toggleAll}
                        checked={unresolvedItems.length > 0 && selectedIds.size === unresolvedItems.length}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Account &amp; Explanation</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Received</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Difference</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {shownItems.map((item: any) => {
                    const meta = STATUS_META[item.status] ?? STATUS_META.unexpected;
                    const Icon = meta.icon;
                    const diff = item.discrepancy_amount ?? 0;
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-100 last:border-0 align-top ${item.is_resolved ? "opacity-40" : ""}`}
                      >
                        <td className="px-4 py-3">
                          {!item.is_resolved && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={() => toggleSelect(item.id)}
                              onClick={e => e.stopPropagation()}
                              className="rounded"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-700 font-semibold">{item.esiid}</span>
                          {item.service_points?.customers?.business_name && (
                            <span className="block text-xs text-slate-500">{item.service_points.customers.business_name}</span>
                          )}
                          {item.resolution_notes?.startsWith("ROOT CAUSE:") && !item.is_resolved && (
                            <p className="text-xs text-slate-500 mt-1 max-w-md whitespace-normal leading-relaxed">
                              {item.resolution_notes.replace("ROOT CAUSE: ", "")}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#0F1D5E] tabular-nums">{fmt(item.expected_amount)}</td>
                        <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{fmt(item.actual_amount)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold tabular-nums ${
                            diff < -0.005 ? "text-red-600" : diff > 0.005 ? "text-emerald-600" : "text-slate-400"
                          }`}>
                            {diff < 0 ? "−" : diff > 0 ? "+" : ""}{fmt(Math.abs(diff))}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${meta.badge}`}>
                            <Icon className="w-3 h-3" />{meta.label}
                          </span>
                          {item.severity && item.severity !== "low" && item.status !== "matched" && (
                            <span className={`block mt-1 text-[11px] font-semibold uppercase tracking-wide ${
                              item.severity === "critical" ? "text-red-600" :
                              item.severity === "high" ? "text-orange-500" : "text-yellow-600"
                            }`}>
                              {item.severity}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!item.is_resolved ? (
                            <button
                              onClick={() => openResolve([item.id], false)}
                              className="text-xs text-[#0F1D5E] font-semibold hover:underline whitespace-nowrap"
                            >
                              Resolve
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                              <CheckCircle className="w-3 h-3" /> Done
                            </span>
                          )}
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

      {/* Resolve modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">
                {resolveModal.bulk ? `Resolve ${resolveModal.itemIds.length} Items` : "Resolve Item"}
              </h3>
              <button onClick={() => setResolveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Resolution Note <span className="font-normal">(optional)</span>
              </label>
              <textarea
                value={resolveNote}
                onChange={e => setResolveNote(e.target.value)}
                rows={3}
                placeholder="e.g. Confirmed correct with supplier statement"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setResolveModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={doResolve}
                disabled={resolving}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {resolving ? "Resolving…" : "Mark Resolved"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
