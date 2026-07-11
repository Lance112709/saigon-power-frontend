"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  DollarSign, AlertTriangle, CheckCircle, TrendingDown, Copy, HelpCircle,
  RefreshCw, X, Search, Download, Banknote, Siren, Scale, ShieldAlert,
  ChevronDown, ChevronUp, History,
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

const WORKFLOW_META: Record<string, { label: string; badge: string }> = {
  open:                { label: "Open",                badge: "bg-red-100 text-red-800" },
  investigating:       { label: "Investigating",       badge: "bg-amber-100 text-amber-800" },
  waiting_on_provider: { label: "Waiting on Provider", badge: "bg-blue-100 text-blue-800" },
  resolved:            { label: "Resolved",            badge: "bg-emerald-100 text-emerald-700" },
  recovered:           { label: "Recovered",           badge: "bg-emerald-100 text-emerald-800" },
  ignored:             { label: "Ignored",             badge: "bg-slate-100 text-slate-500" },
};

const FINDING_ICONS: Record<string, any> = {
  systemic_rate_change: Siren,
  payment_stopped: AlertTriangle,
  clawback_anomaly: ShieldAlert,
};

/** Grouped systemic findings — one card per pattern (e.g. "455 accounts cut
 * from 0.008 to 0.005"). */
function SystemicFindings({ findings, onCreateDispute, onUpdate }: {
  findings: any[];
  onCreateDispute: (f: any) => void;
  onUpdate: (id: string, status: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  if (findings.length === 0) return null;
  return (
    <div className="space-y-3">
      {findings.map(f => {
        const Icon = FINDING_ICONS[f.finding_type] ?? AlertTriangle;
        const critical = f.severity === "critical";
        return (
          <div key={f.id} className={`rounded-2xl border shadow-sm overflow-hidden ${
            critical ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
          }`}>
            <div className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                critical ? "bg-red-100" : "bg-amber-100"
              }`}>
                <Icon className={`w-5 h-5 ${critical ? "text-red-600" : "text-amber-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`text-sm font-bold ${critical ? "text-red-900" : "text-amber-900"}`}>
                    {f.title}
                  </h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/70 text-slate-600">
                    {fmtMonth(f.billing_month)}
                  </span>
                  {f.status !== "open" && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/70 text-slate-600 capitalize">
                      {f.status}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1 leading-relaxed max-w-3xl ${critical ? "text-red-800/80" : "text-amber-800/80"}`}>
                  {f.explanation}
                </p>
                {f.recovery_hint && (
                  <p className="text-[11px] mt-1.5 font-semibold text-slate-600">
                    {f.recovery_hint}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className={`text-xl font-bold tabular-nums ${critical ? "text-red-700" : "text-amber-700"}`}>
                    {fmt(f.estimated_impact)}
                  </p>
                  <p className="text-[11px] text-slate-500">{f.affected_count} accounts</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {f.status !== "disputed" && (
                    <button
                      onClick={async () => { setBusy(f.id); try { await onCreateDispute(f); } finally { setBusy(null); } }}
                      disabled={busy === f.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#182a80] disabled:opacity-50"
                    >
                      <Scale className="w-3.5 h-3.5" /> {busy === f.id ? "Building…" : "Create dispute"}
                    </button>
                  )}
                  <button
                    onClick={() => onUpdate(f.id, "dismissed")}
                    className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-white/60"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Durable exception cases across every provider and month — the work queue. */
function ExceptionCenter({ onCreateDispute }: { onCreateDispute: (supplierId: string, caseIds: string[]) => Promise<void> }) {
  const [cases, setCases] = useState<any[]>([]);
  const [statusChip, setStatusChip] = useState("any_open");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async (chip: string) => {
    setLoading(true);
    setSelected(new Set());
    try {
      const data = await api.getExceptionCases(
        chip === "all" ? {} : { workflow_status: chip });
      setCases(data || []);
    } catch { setCases([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(statusChip); }, [statusChip, load]);

  const setStatus = async (c: any, status: string) => {
    let recovered: number | undefined;
    if (status === "recovered") {
      const v = prompt("How much was recovered for this account ($)?",
        String(c.estimated_loss ?? 0));
      if (v == null) return;
      recovered = parseFloat(v) || 0;
    }
    setSavingId(c.id);
    try {
      await api.updateExceptionCase(c.id, {
        workflow_status: status,
        ...(recovered !== undefined ? { recovered_amount: recovered } : {}),
      });
      await load(statusChip);
    } catch { alert("Update failed"); }
    setSavingId(null);
  };

  const bulkSet = async (status: string) => {
    if (selected.size === 0) return;
    try {
      await api.bulkUpdateCases([...selected], status);
      await load(statusChip);
    } catch { alert("Bulk update failed"); }
  };

  const disputeSelected = async () => {
    const chosen = cases.filter(c => selected.has(c.id));
    const sups = new Set(chosen.map(c => c.supplier_id));
    if (sups.size !== 1) { alert("Select cases from one provider at a time — a dispute goes to a single provider."); return; }
    await onCreateDispute(chosen[0].supplier_id, chosen.map(c => c.id));
  };

  const toggleHistory = async (c: any) => {
    if (expanded === c.id) { setExpanded(null); return; }
    setExpanded(c.id);
    if (!history[c.id]) {
      try {
        const h = await api.getSnapshotHistory(c.esiid, c.supplier_id);
        setHistory(prev => ({ ...prev, [c.id]: h || [] }));
      } catch {
        setHistory(prev => ({ ...prev, [c.id]: [] }));
      }
    }
  };

  const openLoss = cases.reduce((s, c) => s + (c.estimated_loss ?? 0), 0);
  const chips = [
    { v: "any_open", l: "All open" },
    { v: "open", l: "Open" },
    { v: "investigating", l: "Investigating" },
    { v: "waiting_on_provider", l: "Waiting on provider" },
    { v: "recovered", l: "Recovered" },
    { v: "resolved", l: "Resolved" },
    { v: "ignored", l: "Ignored" },
    { v: "all", l: "Everything" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#EEF1FA] flex items-center justify-center">
            <ShieldAlert className="w-4.5 h-4.5 text-[#0F1D5E]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F1D5E]">Exception Center</h2>
            <p className="text-xs text-slate-400">
              {cases.length} case{cases.length !== 1 ? "s" : ""}
              {statusChip !== "recovered" && statusChip !== "resolved" && statusChip !== "ignored" &&
                <> · {fmt(openLoss)} estimated at stake</>} — statuses survive statement re-imports
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map(ch => (
            <button key={ch.v} onClick={() => setStatusChip(ch.v)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                statusChip === ch.v ? "bg-[#0F1D5E] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>{ch.l}</button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="px-5 py-2.5 bg-[#EEF1FA] border-b border-slate-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#0F1D5E]">{selected.size} selected</span>
          <button onClick={disputeSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#182a80]">
            <Scale className="w-3.5 h-3.5" /> Create dispute
          </button>
          <button onClick={() => bulkSet("investigating")}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50">
            Mark investigating
          </button>
          <button onClick={() => bulkSet("ignored")}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50">
            Ignore
          </button>
          <button onClick={() => setSelected(new Set())}
            className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">Clear</button>
        </div>
      )}

      <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
        {loading ? (
          <p className="p-8 text-center text-slate-400 text-sm">Loading…</p>
        ) : cases.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-slate-500 text-sm font-medium">No cases in this view.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" className="rounded"
                    checked={selected.size === cases.length && cases.length > 0}
                    onChange={() => setSelected(selected.size === cases.length
                      ? new Set() : new Set(cases.map(c => c.id)))} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Account</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider · Month</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. $ Lost</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Recovered</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {cases.map(c => {
                const meta = STATUS_META[c.issue_type] ?? STATUS_META.unexpected;
                const wf = WORKFLOW_META[c.workflow_status] ?? WORKFLOW_META.open;
                const isOpen = expanded === c.id;
                return (
                  <>
                    <tr key={c.id} className="border-b border-slate-100 align-top hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded" checked={selected.has(c.id)}
                          onChange={() => setSelected(prev => {
                            const next = new Set(prev);
                            next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                            return next;
                          })} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-700 font-semibold">{c.esiid}</span>
                        {c.customer_name && <span className="block text-xs text-slate-500">{c.customer_name}</span>}
                        {c.agent && <span className="block text-[11px] text-slate-400">agent {c.agent}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        <span className="font-semibold text-slate-700">{c.supplier?.name ?? "—"}</span>
                        <span className="block text-slate-400">{fmtMonth(c.billing_month)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600 tabular-nums">
                        {c.estimated_loss > 0 ? fmt(c.estimated_loss) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 tabular-nums">
                        {c.recovered_amount > 0 ? fmt(c.recovered_amount) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={c.workflow_status}
                          disabled={savingId === c.id}
                          onChange={e => setStatus(c, e.target.value)}
                          className={`text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer ${wf.badge}`}
                        >
                          {Object.entries(WORKFLOW_META).map(([v, m]) => (
                            <option key={v} value={v}>{m.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => toggleHistory(c)} title="Details & payment history"
                          className="text-slate-400 hover:text-[#0F1D5E]">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${c.id}-detail`} className="border-b border-slate-100 bg-slate-50/60">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-2">
                              {c.explanation && (
                                <p className="text-slate-600 leading-relaxed"><span className="font-bold text-slate-700">Why: </span>{c.explanation}</p>
                              )}
                              {c.recommended_action && (
                                <p className="text-slate-600 leading-relaxed"><span className="font-bold text-[#0F1D5E]">Recommended: </span>{c.recommended_action}</p>
                              )}
                              {c.notes && (
                                <p className="text-slate-500 whitespace-pre-line"><span className="font-bold">Notes: </span>{c.notes}</p>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                                <History className="w-3.5 h-3.5" /> Expected vs paid by month
                              </p>
                              {!history[c.id] ? (
                                <p className="text-slate-400">Loading…</p>
                              ) : history[c.id].length === 0 ? (
                                <p className="text-slate-400">No calculation history yet (created by each reconciliation run).</p>
                              ) : (
                                <table className="w-full">
                                  <tbody>
                                    {history[c.id].slice(0, 8).map((s: any) => (
                                      <tr key={s.id} className="text-slate-600">
                                        <td className="py-0.5 pr-3">{fmtMonth(s.billing_month)}</td>
                                        <td className="py-0.5 pr-3 tabular-nums">exp {fmt(s.expected_amount)}</td>
                                        <td className="py-0.5 pr-3 tabular-nums">paid {fmt(s.actual_amount)}</td>
                                        <td className={`py-0.5 tabular-nums font-semibold ${
                                          (s.variance_amount ?? 0) < -0.005 ? "text-red-600" : "text-emerald-600"
                                        }`}>
                                          {(s.variance_amount ?? 0) < 0 ? "−" : "+"}{fmt(Math.abs(s.variance_amount ?? 0))}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

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
  const router = useRouter();
  const [runs, setRuns] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [intel, setIntel] = useState<any>(null);
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

  const loadFindings = useCallback(async () => {
    try {
      const data = await api.getAuditFindings();
      setFindings((data || []).filter((f: any) =>
        f.status === "open" || f.status === "investigating" || f.status === "disputed"));
    } catch { setFindings([]); }
  }, []);

  useEffect(() => {
    loadRuns().then((real) => {
      if (real.length > 0) setSelectedRun((cur: any) => cur ?? real[0]);
    });
    loadFindings();
    api.getCommissionIntelligence().then(setIntel).catch(() => {});
  }, [loadFindings]);

  const createDisputeFromFinding = async (f: any) => {
    try {
      const d = await api.createDispute({ supplier_id: f.supplier_id, finding_id: f.id });
      router.push(`/disputes/${d.id}`);
    } catch (e: any) {
      alert(`Could not build the dispute: ${String(e?.message ?? e).slice(0, 160)}`);
    }
  };

  const createDisputeFromCases = async (supplierId: string, caseIds: string[]) => {
    try {
      const d = await api.createDispute({ supplier_id: supplierId, case_ids: caseIds });
      router.push(`/disputes/${d.id}`);
    } catch (e: any) {
      alert(`Could not build the dispute: ${String(e?.message ?? e).slice(0, 160)}`);
    }
  };

  const updateFindingStatus = async (id: string, status: string) => {
    try {
      await api.updateFinding(id, { status });
      await loadFindings();
    } catch { alert("Update failed"); }
  };

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

        {/* Commission-intelligence tiles (populated once migration 008 is live) */}
        {intel && (
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <div className={heroTile}>
              <p className="text-xs text-white/60 font-medium flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-300" /> Money At Risk
              </p>
              <p className={`text-2xl font-bold mt-1 tabular-nums ${intel.money_at_risk > 0 ? "text-rose-300" : "text-emerald-300"}`}>
                {fmt(intel.money_at_risk)}
              </p>
              <p className="text-[11px] text-white/50 mt-0.5">{intel.open_cases} open exception cases</p>
            </div>
            <div className={heroTile}>
              <p className="text-xs text-white/60 font-medium flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" /> Pending Disputes
              </p>
              <p className="text-2xl font-bold mt-1 tabular-nums">{intel.pending_disputes?.count ?? 0}</p>
              <p className="text-[11px] text-white/50 mt-0.5">{fmt(intel.pending_disputes?.claimed)} claimed</p>
            </div>
            <div className={heroTile}>
              <p className="text-xs text-white/60 font-medium flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-300" /> Recovered
              </p>
              <p className="text-2xl font-bold mt-1 tabular-nums text-emerald-300">{fmt(intel.recovered_total)}</p>
              <p className="text-[11px] text-white/50 mt-0.5">via disputes & true-ups</p>
            </div>
            <div className={heroTile}>
              <p className="text-xs text-white/60 font-medium flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Recovery Rate
              </p>
              <p className="text-2xl font-bold mt-1 tabular-nums">
                {intel.recovery_rate != null ? `${intel.recovery_rate}%` : "—"}
              </p>
              <p className="text-[11px] text-white/50 mt-0.5">of identified losses recovered</p>
            </div>
          </div>
        )}
      </div>

      {/* Systemic findings — provider-wide patterns needing action */}
      <SystemicFindings
        findings={findings}
        onCreateDispute={createDisputeFromFinding}
        onUpdate={updateFindingStatus}
      />

      {/* Payments received by month × provider */}
      {runs.length > 0 && <PaymentsReceived runs={runs} onSelectRun={setSelectedRun} />}

      {/* Exception Center — durable case workflow */}
      <ExceptionCenter onCreateDispute={createDisputeFromCases} />

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
