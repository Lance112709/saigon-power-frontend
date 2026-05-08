"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  DollarSign, AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Play, X,
  ChevronRight,
} from "lucide-react";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return "";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

const STATUS_LABELS: Record<string, string> = {
  matched: "Matched", short_paid: "Short Paid", over_paid: "Over Paid",
  missing: "Missing", unexpected: "Unexpected",
};

const ROW_BG: Record<string, string> = {
  matched: "bg-emerald-50/60",
  short_paid: "bg-red-50/60",
  over_paid: "bg-blue-50/60",
  missing: "bg-red-100/70",
  unexpected: "",
};

const STATUS_BADGE: Record<string, string> = {
  matched: "bg-emerald-100 text-emerald-700",
  short_paid: "bg-red-100 text-red-700",
  over_paid: "bg-blue-100 text-blue-700",
  missing: "bg-red-200 text-red-800",
  unexpected: "bg-slate-100 text-slate-600",
};

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function StatCard({ title, value, sub, icon: Icon, valueColor = "text-[#0F1D5E]" }: {
  title: string; value: string; sub?: string; icon: any; valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl bg-[#EEF1FA] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#0F1D5E]" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className={`text-2xl font-bold mt-0.5 ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function ReconciliationPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [billingMonth, setBillingMonth] = useState("");
  const [running, setRunning] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const [resolveModal, setResolveModal] = useState<{ itemIds: string[]; bulk: boolean } | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [resolving, setResolving] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadRuns = async () => {
    try {
      const data = await api.getRuns();
      setRuns(data);
    } catch {}
  };

  useEffect(() => { loadRuns(); }, []);

  const loadItems = useCallback(async (run: any, status: string, severity: string, resolved: boolean) => {
    if (!run) return;
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const data = await api.getRunItems(
        run.id,
        status || undefined,
        severity || undefined,
        resolved ? undefined : false,
      );
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

  const selectRun = (run: any) => {
    setSelectedRun(run);
    setSelectedIds(new Set());
  };

  const triggerRun = async () => {
    if (!billingMonth) return;
    setRunning(true);
    try {
      const result = await api.triggerReconciliation(billingMonth);
      await loadRuns();
      if (result?.run_id) {
        setSelectedRun({ id: result.run_id, billing_month: billingMonth, ...result });
      }
    } catch {}
    setRunning(false);
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

  const unresolvedItems = items.filter(i => !i.is_resolved);

  const toggleAll = () => {
    if (selectedIds.size === unresolvedItems.length && unresolvedItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unresolvedItems.map((i: any) => i.id)));
    }
  };

  const criticalCount = selectedRun
    ? (selectedRun.missing_count ?? 0) + (selectedRun.short_paid_count ?? 0)
    : 0;
  const underpaidAmt = selectedRun && selectedRun.total_discrepancy < 0
    ? Math.abs(selectedRun.total_discrepancy)
    : 0;

  const selectClass = "border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">

      {/* Header + run trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E]">Commission Reconciliation</h1>
          <p className="text-slate-500 mt-1 text-sm">Compare expected vs actual commissions and flag discrepancies</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={billingMonth ? billingMonth.substring(0, 7) : ""}
            onChange={e => setBillingMonth(e.target.value ? `${e.target.value}-01` : "")}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20"
          />
          <button
            onClick={triggerRun}
            disabled={running || !billingMonth}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {running ? "Running…" : "Run Reconciliation"}
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {selectedRun && criticalCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {criticalCount} issue{criticalCount !== 1 ? "s" : ""} require attention
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {selectedRun.missing_count} missing · {selectedRun.short_paid_count} short paid
              {underpaidAmt > 0 && ` · ${fmt(underpaidAmt)} total underpaid`}
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {selectedRun && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Expected"
            value={fmt(selectedRun.total_expected)}
            icon={DollarSign}
          />
          <StatCard
            title="Total Received"
            value={fmt(selectedRun.total_actual)}
            icon={CheckCircle}
            valueColor={
              selectedRun.total_actual >= selectedRun.total_expected
                ? "text-emerald-600"
                : "text-red-600"
            }
          />
          <StatCard
            title="Net Difference"
            value={fmt(selectedRun.total_discrepancy)}
            icon={selectedRun.total_discrepancy < 0 ? TrendingDown : TrendingUp}
            valueColor={selectedRun.total_discrepancy < 0 ? "text-red-600" : "text-emerald-600"}
            sub={`${selectedRun.matched_count ?? 0} matched · ${selectedRun.over_paid_count ?? 0} over`}
          />
          <StatCard
            title="Issues"
            value={String(criticalCount)}
            icon={AlertTriangle}
            valueColor={criticalCount > 0 ? "text-red-600" : "text-emerald-600"}
            sub={`${selectedRun.missing_count ?? 0} missing · ${selectedRun.short_paid_count ?? 0} short`}
          />
        </div>
      )}

      {/* Runs + Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Runs list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#0F1D5E]">Reconciliation Runs</h2>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {runs.length === 0 ? (
              <p className="p-5 text-slate-400 text-sm">No runs yet.</p>
            ) : runs.map((run: any) => (
              <button
                key={run.id}
                onClick={() => selectRun(run)}
                className={`w-full text-left px-5 py-3.5 border-b border-slate-100 last:border-0 transition-colors ${
                  selectedRun?.id === run.id ? "bg-[#EEF1FA]" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#0F1D5E]">{run.billing_month}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{run.suppliers?.name ?? "All suppliers"}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className={`text-xs font-semibold ${run.total_discrepancy < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {fmt(run.total_discrepancy)}
                  </span>
                  {(run.missing_count ?? 0) > 0 && (
                    <span className="text-xs text-red-500">{run.missing_count} missing</span>
                  )}
                  {(run.short_paid_count ?? 0) > 0 && (
                    <span className="text-xs text-orange-500">{run.short_paid_count} short</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-[#0F1D5E]">
                {selectedRun ? `Items — ${selectedRun.billing_month}` : "Select a run"}
              </h2>
              {selectedRun && (
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
                    <option value="">All Statuses</option>
                    <option value="missing">Missing</option>
                    <option value="short_paid">Short Paid</option>
                    <option value="over_paid">Over Paid</option>
                    <option value="matched">Matched</option>
                    <option value="unexpected">Unexpected</option>
                  </select>
                  <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className={selectClass}>
                    <option value="">All Severities</option>
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
                    Show resolved
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
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            {!selectedRun ? (
              <p className="p-8 text-center text-slate-400 text-sm">Select a reconciliation run to view items.</p>
            ) : loading ? (
              <p className="p-8 text-center text-slate-400 text-sm">Loading…</p>
            ) : items.length === 0 ? (
              <p className="p-8 text-center text-slate-400 text-sm">No items match the current filters.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        onChange={toggleAll}
                        checked={
                          unresolvedItems.length > 0 &&
                          selectedIds.size === unresolvedItems.length
                        }
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ESIID</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actual</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Diff</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 last:border-0 ${
                        item.is_resolved ? "opacity-40" : ROW_BG[item.status] ?? ""
                      }`}
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
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.esiid}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#0F1D5E]">{fmt(item.expected_amount)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(item.actual_amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${
                          (item.discrepancy_amount ?? 0) < 0 ? "text-red-600" :
                          (item.discrepancy_amount ?? 0) > 0 ? "text-emerald-600" : "text-slate-400"
                        }`}>
                          {fmt(item.discrepancy_amount)}
                        </span>
                        {item.discrepancy_percentage != null && (
                          <span className="block text-xs text-slate-400">
                            {fmtPct(item.discrepancy_percentage)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[item.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${
                          item.severity === "critical" ? "text-red-600" :
                          item.severity === "high" ? "text-orange-500" :
                          item.severity === "medium" ? "text-yellow-600" : "text-slate-400"
                        }`}>
                          {item.severity}
                        </span>
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
                  ))}
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
                {resolveModal.bulk
                  ? `Resolve ${resolveModal.itemIds.length} Items`
                  : "Resolve Item"}
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
