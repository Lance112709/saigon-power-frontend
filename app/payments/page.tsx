"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Banknote, Download, CalendarRange, Building2, TrendingUp, Loader2, Landmark, CheckCircle, AlertTriangle, Mail, RefreshCw } from "lucide-react";
import DepositStatusBadge from "@/components/DepositStatusBadge";
import ProviderPayCycle from "@/components/ProviderPayCycle";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SERIES_COLORS = ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7", "#c2410c", "#0e7490", "#7c3aed", "#be185d", "#4d7c0f", "#6b7280"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function fmt0(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function shortMonth(m: string) {
  return `${MONTHS_SHORT[parseInt(m.slice(5, 7), 10) - 1]} '${m.slice(2, 4)}`;
}
function longMonth(m: string) {
  return `${MONTHS_SHORT[parseInt(m.slice(5, 7), 10) - 1]} ${m.slice(0, 4)}`;
}
function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function addMonths(m: string, n: number) {
  const d = new Date(parseInt(m.slice(0, 4), 10), parseInt(m.slice(5, 7), 10) - 1 + n, 1);
  return ym(d);
}

async function downloadFile(path: string, filename: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

type Preset = "this_month" | "last_month" | "ytd" | "last_12" | "all" | `year:${string}` | "custom";

export default function PaymentsReceivedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [preset, setPreset] = useState<Preset>("ytd");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [available, setAvailable] = useState<{ first: string; last: string; providers: string[] } | null>(null);
  const [deposits, setDeposits] = useState<any>(null);
  const [depLoading, setDepLoading] = useState(false);
  const [depOnlyOpen, setDepOnlyOpen] = useState(false);
  const [depEditing, setDepEditing] = useState<string | null>(null);
  const [depForm, setDepForm] = useState<{ amount: string; date: string; notes: string }>({ amount: "", date: "", notes: "" });
  const [depSaving, setDepSaving] = useState(false);
  const [depError, setDepError] = useState<string | null>(null);
  const [depSeq, setDepSeq] = useState(0);
  const [bank, setBank] = useState<any[]>([]);
  const [bankBusy, setBankBusy] = useState<string | null>(null);
  const [bankMsg, setBankMsg] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  // Resolve a preset into a from/to month pair
  const now = ym(new Date());
  const range = useMemo((): { from: string | null; to: string | null } => {
    switch (preset) {
      case "this_month": return { from: now, to: now };
      case "last_month": { const m = addMonths(now, -1); return { from: m, to: m }; }
      case "ytd": return { from: `${now.slice(0, 4)}-01`, to: now };
      case "last_12": return { from: addMonths(now, -11), to: now };
      case "all": return { from: null, to: null };
      case "custom": return { from: from || null, to: to || null };
      default: {
        const y = preset.slice(5);
        return { from: `${y}-01`, to: `${y}-12` };
      }
    }
  }, [preset, from, to, now]);

  const activeProviders = useMemo(() => {
    if (!available) return null;
    const list = available.providers.filter(p => !hidden.has(p));
    return list.length === available.providers.length ? null : list;
  }, [available, hidden]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    api.getPaymentsReceived(range.from, range.to, activeProviders)
      .then(d => {
        if (cancelled) return;
        setData(d);
        if (!available && d.available) setAvailable(d.available);
      })
      .catch(e => !cancelled && setError(String(e?.message || e).replace(/^\d+:/, "")))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to, activeProviders]);

  useEffect(() => {
    let cancelled = false;
    setDepLoading(true);
    api.getDeposits(range.from, range.to, depOnlyOpen ? "open" : null)
      .then(d => { if (!cancelled) setDeposits(d); })
      .catch(e => !cancelled && setDepError(String(e?.message || e).replace(/^\d+:/, "")))
      .finally(() => !cancelled && setDepLoading(false));
    return () => { cancelled = true; };
  }, [range.from, range.to, depOnlyOpen, depSeq]);

  useEffect(() => {
    api.getBankDeposits("unmatched").then(setBank).catch(() => setBank([]));
  }, [depSeq]);

  const runBank = async (what: "alerts" | "statements") => {
    setBankBusy(what); setBankMsg(null);
    try {
      if (what === "alerts") {
        const r = await api.pollBankAlerts(30);
        setBankMsg(r.ok === false ? r.error : `${r.deposits_added} new deposit alert(s) read · ${r.matched} matched to statements · ${r.unmatched} still unmatched`);
      } else {
        const r = await api.pollLanceStatements(30);
        const n = (r.imported || []).length;
        setBankMsg(`${n} statement(s) imported from lance@${n ? ": " + r.imported.map((i: any) => `${i.provider} ${(i.months || []).join("/")}`).join(", ") : ""}${r.errors?.length ? ` · ${r.errors.length} error(s)` : ""}`);
      }
      setDepSeq(n => n + 1);
    } catch (e: any) {
      setBankMsg(String(e?.message || e).replace(/^\d+:/, ""));
    } finally {
      setBankBusy(null);
    }
  };
  const bankAction = async (id: string, body: any) => {
    try { await api.updateBankDeposit(id, body); setDepSeq(n => n + 1); }
    catch (e: any) { setBankMsg(String(e?.message || e).replace(/^\d+:/, "")); }
  };
  const openStatements = (deposits?.items ?? []).filter((i: any) => i.amount_received == null && i.status !== "not_tracked");

  const startDepEdit = (it: any) => {
    setDepEditing(it.id);
    setDepError(null);
    setDepForm({
      amount: it.amount_received != null ? String(it.amount_received) : "",
      date: it.received_at || "",
      notes: it.received_notes || "",
    });
  };
  const saveDep = async (id: string, clear = false) => {
    setDepSaving(true); setDepError(null);
    try {
      const amt = parseFloat(depForm.amount);
      if (!clear && isNaN(amt)) { setDepError("Enter the deposit amount from your bank."); setDepSaving(false); return; }
      await api.setStatementReceived(id, clear
        ? { amount_received: null }
        : { amount_received: amt, received_at: depForm.date || null, notes: depForm.notes || null });
      setDepEditing(null);
      setDepSeq(n => n + 1);
    } catch (e: any) {
      setDepError(String(e?.message || e).replace(/^\d+:/, ""));
    } finally {
      setDepSaving(false);
    }
  };

  const years = useMemo(() => {
    if (!available?.first) return [];
    const out: string[] = [];
    for (let y = parseInt(available.last.slice(0, 4), 10); y >= parseInt(available.first.slice(0, 4), 10); y--) out.push(String(y));
    return out;
  }, [available]);

  const providers: string[] = useMemo(() => (data?.by_provider ?? []).map((p: any) => p.provider), [data]);
  const colorOf = (name: string) => {
    const idx = (available?.providers ?? providers).indexOf(name);
    return SERIES_COLORS[(idx < 0 ? 0 : idx) % SERIES_COLORS.length];
  };
  const chartData = useMemo(() => (data?.by_month ?? []).map((r: any) => ({ ...r, label: shortMonth(r.month) })), [data]);
  const topProvider = data?.by_provider?.[0];

  const toggle = (p: string) => setHidden(prev => {
    const next = new Set(prev);
    next.has(p) ? next.delete(p) : next.add(p);
    return next;
  });

  const exportExcel = async () => {
    setExporting(true);
    try {
      const qs = new URLSearchParams();
      if (range.from) qs.set("from", range.from);
      if (range.to) qs.set("to", range.to);
      if (activeProviders) qs.set("providers", activeProviders.join(","));
      const label = `${range.from ?? "all"}_${range.to ?? "all"}`;
      await downloadFile(`/api/v1/reconciliation/payments-received/export?${qs.toString()}`, `payments-received_${label}.xlsx`);
    } catch (e: any) {
      setError(e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

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

  const presetBtn = (v: Preset, l: string) => (
    <button key={v} onClick={() => setPreset(v)}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        preset === v ? "bg-[#0F1D5E] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
      {l}
    </button>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#EEF1FA] flex items-center justify-center">
            <Banknote className="w-5 h-5 text-[#0F1D5E]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F1D5E]">Payments Received</h1>
            <p className="text-sm text-slate-500">What every REP has paid Saigon Power, by month and provider, from the imported commission statements.</p>
          </div>
        </div>
        <button onClick={exportExcel} disabled={exporting || !data}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#182a7a] disabled:opacity-50">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export to Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
            <CalendarRange className="w-3.5 h-3.5" /> Period
          </span>
          {presetBtn("this_month", "This Month")}
          {presetBtn("last_month", "Last Month")}
          {presetBtn("ytd", "Year to Date")}
          {presetBtn("last_12", "Last 12 Months")}
          {years.map(y => presetBtn(`year:${y}` as Preset, y))}
          {presetBtn("all", "All Time")}
          {presetBtn("custom", "Custom")}
        </div>
        {preset === "custom" && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-slate-600">From
              <input type="month" value={from} min={available?.first} max={available?.last} onChange={e => setFrom(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-slate-600">To
              <input type="month" value={to} min={available?.first} max={available?.last} onChange={e => setTo(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
            </label>
            <span className="text-xs text-slate-400">Leave blank for open-ended. Statements on file: {available?.first ? longMonth(available.first) : "—"} to {available?.last ? longMonth(available.last) : "—"}.</span>
          </div>
        )}
        {available && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
              <Building2 className="w-3.5 h-3.5" /> Providers
            </span>
            {available.providers.map(p => {
              const off = hidden.has(p);
              return (
                <button key={p} onClick={() => toggle(p)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    off ? "bg-white border-slate-200 text-slate-300" : "border-transparent text-slate-700"}`}
                  style={off ? {} : { background: `${colorOf(p)}18`, borderColor: `${colorOf(p)}40` }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: off ? "#cbd5e1" : colorOf(p) }} />
                  {p}
                </button>
              );
            })}
            {hidden.size > 0 && (
              <button onClick={() => setHidden(new Set())} className="text-xs text-[#0F1D5E] underline ml-1">Show all</button>
            )}
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {/* Who has paid this cycle */}
      <ProviderPayCycle />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total paid to SGP", value: fmt(data?.total_paid), sub: data?.range ? `${data.range.from ? longMonth(data.range.from) : "Start"} – ${data.range.to ? longMonth(data.range.to) : "Latest"}` : "" },
          { label: "Months with payments", value: data ? String(data.months.length) : "—", sub: "statement months in range" },
          { label: "Average per month", value: fmt(data?.avg_per_month), sub: "across those months" },
          { label: "Top provider", value: topProvider ? topProvider.provider : "—", sub: topProvider ? `${fmt0(topProvider.paid)} · ${data.total_paid ? Math.round(topProvider.paid / data.total_paid * 100) : 0}% of total` : "" },
        ].map(t => (
          <div key={t.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.label}</p>
            <p className="text-2xl font-bold text-[#0F1D5E] mt-1 truncate">{loading && !data ? "…" : t.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t.sub}</p>
          </div>
        ))}
      </div>

      {/* Bank deposits vs statements */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#0F1D5E]" />
            <h2 className="text-sm font-bold text-[#0F1D5E]">Bank deposits vs statements</h2>
            {depLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {deposits && (
              <>
                {(deposits.counts.overdue || 0) + (deposits.counts.short_paid || 0) + (deposits.counts.over_paid || 0) > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {(deposits.counts.overdue || 0) + (deposits.counts.short_paid || 0) + (deposits.counts.over_paid || 0)} need attention
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Nothing needs attention
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">{deposits.counts.awaiting || 0} awaiting</span>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">{fmt(deposits.totals.not_yet_received)} not yet in bank</span>
                {deposits.totals.unexplained_difference !== 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-semibold">{fmt(deposits.totals.unexplained_difference)} unexplained</span>
                )}
              </>
            )}
            <label className="inline-flex items-center gap-1.5 ml-2 text-slate-600 cursor-pointer">
              <input type="checkbox" checked={depOnlyOpen} onChange={e => setDepOnlyOpen(e.target.checked)} className="rounded" />
              Open items only
            </label>
          </div>
        </div>
        {depError && <div className="mx-5 mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-sm">{depError}</div>}
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider sticky top-0">
              <tr>
                <th className="text-left px-5 py-2.5">Month</th>
                <th className="text-left px-3 py-2.5">Provider</th>
                <th className="text-right px-3 py-2.5">Statement</th>
                <th className="text-right px-3 py-2.5">Withheld</th>
                <th className="text-right px-3 py-2.5">Expected</th>
                <th className="text-right px-3 py-2.5">In bank</th>
                <th className="text-right px-3 py-2.5">Difference</th>
                <th className="text-left px-3 py-2.5">Status</th>
                <th className="text-right px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {(deposits?.items ?? []).length === 0 && !depLoading && (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-slate-400">No statements in this range{depOnlyOpen ? " with open deposits" : ""}.</td></tr>
              )}
              {(deposits?.items ?? []).map((it: any) => {
                const editing = depEditing === it.id;
                const bad = ["short_paid", "over_paid", "overdue"].includes(it.status);
                return (
                  <React.Fragment key={it.id}>
                    <tr className={`border-t border-slate-100 ${bad ? "bg-red-50/40" : ""}`}>
                      <td className="px-5 py-2 font-medium text-slate-700">{it.statement_month ? longMonth(it.statement_month) : "—"}</td>
                      <td className="px-3 py-2 text-slate-700">
                        <button onClick={() => router.push(`/uploads/${it.id}`)} className="hover:underline text-left" title={it.original_filename}>
                          {it.provider || it.provider_group || "—"}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(it.statement_total)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{it.total_withheld ? fmt(it.total_withheld) : <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(it.expected_deposit)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {it.amount_received != null ? (
                          <div>
                            <div>{fmt(it.amount_received)}</div>
                            {it.received_at && <div className="text-[11px] text-slate-400">{it.received_at}</div>}
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${it.difference == null ? "text-slate-300" : Math.abs(it.difference) < 0.02 ? "text-green-700" : "text-red-600"}`}>
                        {it.difference == null ? "—" : `${it.difference >= 0 ? "+" : "-"}${fmt(Math.abs(it.difference))}`}
                      </td>
                      <td className="px-3 py-2"><span title={it.explanation}><DepositStatusBadge status={it.status} /></span></td>
                      <td className="px-5 py-2 text-right">
                        {editing ? (
                          <button onClick={() => setDepEditing(null)} className="text-xs text-slate-500 hover:underline">Cancel</button>
                        ) : (
                          <button onClick={() => startDepEdit(it)}
                            className="px-3 py-1 rounded-lg bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#182a7a]">
                            {it.amount_received != null ? "Edit" : "Mark received"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {editing && (
                      <tr className="bg-slate-50 border-t border-slate-100">
                        <td colSpan={9} className="px-5 py-3">
                          <div className="flex flex-wrap items-end gap-3">
                            <label className="text-xs text-slate-500">
                              <span className="block mb-1 font-medium">Deposit amount ($)</span>
                              <input type="number" step="0.01" min="0" value={depForm.amount} autoFocus
                                onChange={e => setDepForm(f => ({ ...f, amount: e.target.value }))}
                                placeholder={it.expected_deposit != null ? it.expected_deposit.toFixed(2) : "0.00"}
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-36 bg-white" />
                            </label>
                            <label className="text-xs text-slate-500">
                              <span className="block mb-1 font-medium">Posted to bank on</span>
                              <input type="date" value={depForm.date} onChange={e => setDepForm(f => ({ ...f, date: e.target.value }))}
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white" />
                            </label>
                            <label className="text-xs text-slate-500 flex-1 min-w-[220px]">
                              <span className="block mb-1 font-medium">Note (optional)</span>
                              <input type="text" value={depForm.notes} maxLength={500}
                                onChange={e => setDepForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="e.g. wire fee $15, or one deposit covering two statements"
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full bg-white" />
                            </label>
                            <button onClick={() => saveDep(it.id)} disabled={depSaving}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#182a7a] disabled:opacity-50">
                              {depSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Save
                            </button>
                            {it.amount_received != null && (
                              <button onClick={() => saveDep(it.id, true)} disabled={depSaving}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs hover:bg-white disabled:opacity-50">Clear</button>
                            )}
                            <span className="text-xs text-slate-400 ml-auto">{it.original_filename}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-xs text-slate-400 border-t border-slate-100">
          Type each REP deposit from your bank once it lands. A deposit that is short by exactly the amount the statement reports as withheld is marked explained; any other difference, or a statement with no deposit after its pay window, needs attention.
        </p>
      </div>

      {/* Bank deposits read from Chase alerts */}
      <div id="bank-deposits" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#0F1D5E]" />
            <h2 className="text-sm font-bold text-[#0F1D5E]">Bank deposits with no statement</h2>
            <span className="text-xs text-slate-400">from Chase deposit alerts in lance@ · read and matched automatically every morning</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => runBank("statements")} disabled={!!bankBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              {bankBusy === "statements" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Pull statements from lance@
            </button>
            <button onClick={() => runBank("alerts")} disabled={!!bankBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#182a7a] disabled:opacity-50">
              {bankBusy === "alerts" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Landmark className="w-3.5 h-3.5" />} Check bank alerts now
            </button>
          </div>
        </div>
        {bankMsg && <div className="mx-5 mt-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-sm">{bankMsg}</div>}
        {bank.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">Every deposit read from your bank alerts is tied to a statement. Nothing to chase.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-2.5">Posted</th>
                <th className="text-right px-3 py-2.5">Amount</th>
                <th className="text-left px-3 py-2.5">Looks like</th>
                <th className="text-left px-3 py-2.5">Assign to statement</th>
                <th className="text-right px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {bank.map((d: any) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="px-5 py-2 text-slate-700">{d.posted_at}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(d.amount)}</td>
                  <td className="px-3 py-2 text-slate-600">{d.likely_provider ? `${d.likely_provider} (guess)` : <span className="text-slate-300">unknown</span>}</td>
                  <td className="px-3 py-2">
                    <select value={assignTo[d.id] || ""} onChange={e => setAssignTo(a => ({ ...a, [d.id]: e.target.value }))}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs max-w-[320px]">
                      <option value="">Choose a statement without a deposit…</option>
                      {openStatements.map((s: any) => (
                        <option key={s.id} value={s.id}>{longMonth(s.statement_month)} · {s.provider} · expected {fmt(s.expected_deposit)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-2 text-right whitespace-nowrap">
                    <button disabled={!assignTo[d.id]} onClick={() => bankAction(d.id, { upload_batch_id: assignTo[d.id] })}
                      className="px-3 py-1 rounded-lg bg-[#0F1D5E] text-white text-xs font-semibold disabled:opacity-40 mr-2">Assign</button>
                    <button onClick={() => bankAction(d.id, { status: "ignored", notes: "not a provider deposit" })}
                      className="px-3 py-1 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50">Ignore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[#0F1D5E]" />
          <h2 className="text-sm font-bold text-[#0F1D5E]">Paid by month</h2>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
        </div>
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">No statements in this range.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={chartData.length > 24 ? Math.ceil(chartData.length / 24) - 1 : 0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt0(v)} width={70} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
                {providers.map(p => (
                  <Bar key={p} dataKey={p} stackId="paid" fill={colorOf(p)} radius={[0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* By provider */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#0F1D5E]">Totals by provider</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-2.5">Provider</th>
                <th className="text-right px-4 py-2.5">Paid</th>
                <th className="text-right px-5 py-2.5">Share</th>
              </tr>
            </thead>
            <tbody>
              {(data?.by_provider ?? []).map((p: any) => (
                <tr key={p.provider} className="border-t border-slate-100">
                  <td className="px-5 py-2.5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorOf(p.provider) }} />{p.provider}
                    <span className="text-xs text-slate-400">· {p.months} mo</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{fmt(p.paid)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-slate-500">{data.total_paid ? Math.round(p.paid / data.total_paid * 100) : 0}%</td>
                </tr>
              ))}
              {data && (
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                  <td className="px-5 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(data.total_paid)}</td>
                  <td className="px-5 py-2.5 text-right">100%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Month × provider matrix */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#0F1D5E]">By month</h2>
          </div>
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="text-left px-5 py-2.5">Month</th>
                  {providers.map(p => <th key={p} className="text-right px-3 py-2.5">{p}</th>)}
                  <th className="text-right px-5 py-2.5">Total</th>
                </tr>
              </thead>
              <tbody>
                {[...(data?.by_month ?? [])].reverse().map((r: any) => (
                  <tr key={r.month} className="border-t border-slate-100">
                    <td className="px-5 py-2 font-medium text-slate-700">{longMonth(r.month)}</td>
                    {providers.map(p => (
                      <td key={p} className="px-3 py-2 text-right tabular-nums text-slate-600">{r[p] ? fmt(r[p]) : <span className="text-slate-300">—</span>}</td>
                    ))}
                    <td className="px-5 py-2 text-right tabular-nums font-semibold">{fmt(r.total)}</td>
                  </tr>
                ))}
                {data && data.by_month.length > 0 && (
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                    <td className="px-5 py-2.5">Total</td>
                    {providers.map(p => {
                      const v = data.by_provider.find((x: any) => x.provider === p)?.paid ?? 0;
                      return <td key={p} className="px-3 py-2.5 text-right tabular-nums">{fmt(v)}</td>;
                    })}
                    <td className="px-5 py-2.5 text-right tabular-nums">{fmt(data.total_paid)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Source: every commission statement imported on the Upload Statements page. A month appears once its statement has been imported and reconciled.
      </p>
    </div>
  );
}
