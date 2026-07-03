"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  DollarSign, AlertTriangle, CheckCircle, TrendingDown, Copy, HelpCircle,
  RefreshCw, X, Search,
} from "lucide-react";

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

function StatCard({ title, value, sub, icon: Icon, tone = "navy" }: {
  title: string; value: string; sub?: string; icon: any; tone?: "navy" | "good" | "bad" | "warn";
}) {
  const tones: Record<string, { chip: string; icon: string; value: string }> = {
    navy: { chip: "bg-[#EEF1FA]", icon: "text-[#0F1D5E]", value: "text-[#0F1D5E]" },
    good: { chip: "bg-emerald-50", icon: "text-emerald-600", value: "text-emerald-700" },
    bad:  { chip: "bg-red-50", icon: "text-red-600", value: "text-red-700" },
    warn: { chip: "bg-orange-50", icon: "text-orange-600", value: "text-orange-700" },
  };
  const t = tones[tone];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl ${t.chip} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${t.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] text-slate-500 font-medium">{title}</p>
        <p className={`text-[26px] leading-8 font-bold mt-0.5 tabular-nums ${t.value}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1 truncate">{sub}</p>}
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

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E]">Commission Reconciliation</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Every statement upload reconciles automatically — review and resolve flagged items here.
          </p>
        </div>
        {selectedRun && (
          <button
            onClick={rerunSelectedMonth}
            disabled={rerunning}
            title="Re-check this month against the current deal book (after fixing deals or backfilling ESI IDs)"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[#0F1D5E] text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${rerunning ? "animate-spin" : ""}`} />
            {rerunning ? "Re-checking…" : `Re-check ${fmtMonth(selectedRun.billing_month)}`}
          </button>
        )}
      </div>

      {/* Portfolio snapshot — latest statement per provider */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Received — Latest Statements"
          value={fmt(kpi.received)}
          sub={kpi.monthRange && `${latestBySupplier.length} providers · ${kpi.monthRange}`}
          icon={DollarSign}
        />
        <StatCard
          title="Missing Payments"
          value={String(kpi.missing)}
          sub="active accounts not on latest statement"
          icon={AlertTriangle}
          tone={kpi.missing > 0 ? "bad" : "good"}
        />
        <StatCard
          title="Wrong Rate"
          value={String(kpi.wrongRate)}
          sub="accounts paid below contract rate"
          icon={TrendingDown}
          tone={kpi.wrongRate > 0 ? "warn" : "good"}
        />
        <StatCard
          title="Under Expected"
          value={fmt(kpi.underpaid)}
          sub="latest month, all providers"
          icon={kpi.underpaid > 0.01 ? TrendingDown : CheckCircle}
          tone={kpi.underpaid > 0.01 ? "bad" : "good"}
        />
      </div>

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
