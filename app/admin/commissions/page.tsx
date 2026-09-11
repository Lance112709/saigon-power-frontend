"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  DollarSign, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, FileText, Filter, Activity, ChevronRight,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Commission {
  id: string;
  agent_name: string;
  month: number;
  year: number;
  total_deals: number;
  total_commission: number;
  status: "calculated" | "approved" | "closed_out" | "paid";
  approved_at?: string;
  approved_by?: string;
  closed_out_at?: string;
  closed_out_by?: string;
  paid_at?: string;
  paid_by?: string;
  notes?: string;
}

interface Deal {
  deal_id: string;
  deal_source?: string;
  kind?: "enrollment" | "paid" | "statement" | "clawback";
  enrollment_type?: "new" | "renewal";
  segment?: "residential" | "commercial";
  auto_decision?: "reject" | "release" | null;
  cancelled?: string;
  prior_contract?: { source: string; id: string; customer: string; supplier: string; agent: string; contract_start: string; contract_end: string } | null;
  held?: boolean;
  hold_reason?: string;
  contract_start?: string;
  address?: string;
  duplicate_of?: { source: string; id: string; customer: string; contract_start: string; contract_end: string; agent: string } | null;
  esiid: string;
  customer: string;
  supplier: string;
  plan_type: string;
  kwh_paid: number;
  gross_received: number;
  first_payment: boolean;
  excluded: boolean;
  commission: number;
  applied: string;
}

interface CalcResult {
  calculated: number;
  locked: string[];
  warnings: string[];
  gross_total: number;
  statement_rows: number;
  unassigned: {
    no_deal: { esiids: number; gross: number };
    no_agent_on_deal: { esiids: number; gross: number };
    agent_not_registered: Record<string, number>;
  };
}

interface Log {
  id: string;
  action: string;
  performed_by: string;
  agent_name: string;
  month: number;
  year: number;
  notes?: string;
  created_at: string;
}

interface Modal {
  commissionId: string;
  agentName: string;
  action: "approve" | "close_out" | "mark_paid" | "recalculate" | "record_payment";
  title: string;
  message: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  calculated: { label: "Calculated", bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400" },
  approved:   { label: "Approved",   bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  closed_out: { label: "Closed Out", bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  paid:       { label: "Paid",       bg: "bg-emerald-50",text: "text-emerald-700",dot: "bg-emerald-500" },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.calculated;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function actionLabel(a: string) {
  const m: Record<string, string> = {
    recalculated: "Recalculated",
    approve:      "Approved",
    close_out:    "Closed Out",
    mark_paid:    "Marked Paid",
  };
  return m[a] || a;
}

// ── Confirmation Modal ────────────────────────────────────────────────────────

function ConfirmModal({
  modal, onConfirm, onCancel, loading,
}: {
  modal: Modal;
  onConfirm: (notes: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));

  const colorMap: Record<string, string> = {
    approve:     "bg-amber-500 hover:bg-amber-600",
    close_out:   "bg-violet-600 hover:bg-violet-700",
    mark_paid:   "bg-emerald-600 hover:bg-emerald-700",
    recalculate: "bg-blue-600 hover:bg-blue-700",
    record_payment: "bg-emerald-600 hover:bg-emerald-700",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">{modal.title}</h3>
            <p className="text-slate-500 text-sm mt-1">{modal.message}</p>
          </div>
        </div>

        {modal.action === "record_payment" && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date paid</label>
            <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20" />
          </div>
        )}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Notes <span className="font-normal normal-case text-slate-400">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder={modal.action === "mark_paid" || modal.action === "record_payment" ? "e.g. Paid via Zelle, check #1042…" : "Add a note…"}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 resize-none"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(modal.action === "record_payment" ? `${paidAt}|${notes}` : notes)}
            disabled={loading}
            className={`px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${colorMap[modal.action]} disabled:opacity-50`}
          >
            {loading ? "Processing…" : modal.title}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

/** Engine summary stored on each record (JSON in `notes`): enrolled split etc. */
function parseSummary(notes?: string): { enrolled?: number; new_enrollments?: number; renewals?: number; held?: number; statement_rows?: number; statement_share?: number } | null {
  if (!notes) return null;
  try { const j = JSON.parse(notes); return j && typeof j === "object" ? j : null; } catch { return null; }
}

// ── Paid to agents (month range / YTD) ──────────────────────────────────────

interface PaidSummary {
  from: string | null; to: string | null; records: number;
  totals: { paid: number; owed: number; pending: number };
  by_month: { year: number; month: number; paid: number; owed: number; pending: number; agents: number }[];
  by_agent: { agent_name: string; paid: number; owed: number; pending: number; months_paid: number; last_paid_at: string | null }[];
  detail: { id: string; agent_name: string; year: number; month: number; status: string; total_commission: number; paid_at: string | null; paid_by: string | null }[];
}

type RangePreset = "month" | "last_month" | "ytd" | "last12" | "all" | "custom";

const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

function presetRange(preset: RangePreset, now: Date): { from?: string; to?: string } {
  const y = now.getFullYear(), m = now.getMonth() + 1;
  switch (preset) {
    case "month":      return { from: ym(y, m), to: ym(y, m) };
    case "last_month": { const d = new Date(y, m - 2, 1); return { from: ym(d.getFullYear(), d.getMonth() + 1), to: ym(d.getFullYear(), d.getMonth() + 1) }; }
    case "ytd":        return { from: ym(y, 1), to: ym(y, m) };
    case "last12":     { const d = new Date(y, m - 12, 1); return { from: ym(d.getFullYear(), d.getMonth() + 1), to: ym(y, m) }; }
    case "all":        return {};
    default:           return {};
  }
}

function MonthCloseModal({ year, month, rows, onClose, onDone }: {
  year: number; month: number; rows: Commission[]; onClose: () => void; onDone: () => void;
}) {
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const open = rows.filter(r => r.status !== "paid" && (r.total_commission || 0) > 0);
  const heldOf = (r: Commission) => parseSummary(r.notes)?.held || 0;
  const payable = open.filter(r => !heldOf(r));
  const total = payable.reduce((s, r) => s + (r.total_commission || 0), 0);
  const run = async () => {
    setBusy(true);
    try {
      const res = await api.closeCommissionMonth({ year, month, paid_at: paidAt, notes });
      setResult(res);
      onDone();
    } catch (e: any) {
      alert(e?.message?.replace(/^\d+:/, "") || "Could not close the month");
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <h3 className="text-lg font-bold text-[#0F1D5E]">Pay {MONTHS[month - 1]} {year}</h3>
          <p className="text-sm text-slate-500 mt-1">Approves, closes out and marks paid every agent below in one step.</p>
        </div>
        {result ? (
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-emerald-700">Paid {result.paid.length} agent{result.paid.length === 1 ? "" : "s"} · {fmt(result.paid_total)} · dated {result.paid_at}</p>
            {result.skipped?.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                <p className="font-semibold mb-1">Skipped</p>
                {result.skipped.map((s: any, i: number) => <p key={i}>{s.agent_name} — {s.reason}</p>)}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold">Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-[#F8FAFF] border border-slate-100 divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {open.length === 0 && <p className="p-3 text-xs text-slate-400">Nothing unpaid for this month.</p>}
              {open.map(r => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-slate-700">{r.agent_name}{heldOf(r) ? <span className="ml-2 text-[11px] text-amber-700 font-semibold">{heldOf(r)} held — will be skipped</span> : null}</span>
                  <span className={`font-semibold ${heldOf(r) ? "text-slate-400 line-through" : "text-emerald-600"}`}>{fmt(r.total_commission)}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Payment date</label>
                <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Note (optional)</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Zelle batch" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-slate-500">{payable.length} agent{payable.length === 1 ? "" : "s"} · <b className="text-emerald-600">{fmt(total)}</b></span>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600">Cancel</button>
                <button onClick={run} disabled={busy || payable.length === 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  {busy ? "Paying…" : `Pay ${fmt(total)}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface DigestItem { agent: string; text: string; link?: string; fix?: { from: string; to: string } | null }
interface Digest { label: string; count: number; agents: number; payout_total: number; items: Record<string, DigestItem[]> }
const DIGEST_TITLES: Record<string, string> = {
  held: "Held enrollment bonuses — Release or Reject",
  unregistered_agents: "Deals credited to unregistered agent names",
  no_agent: "Paid accounts with no agent on the deal",
  no_plan: "Agents with activity but no commission plan",
  swings: "Payouts that moved ±30% vs the last 3 months",
  name_fixes: "Agent name spellings to fix",
  clawbacks: "Clawbacks this month (early cancellations)",
  unpaid_older: "Earlier months still not paid",
};

function NeedsAttentionPanel({ year, month, onChanged }: { year: number; month: number; onChanged: () => void }) {
  const [data, setData] = useState<Digest | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { setData(null); setMsg(""); }, [year, month]);
  const check = async () => {
    setBusy(true); setMsg("");
    try { setData(await api.getCommissionDigest(year, month)); }
    catch (e: any) { setMsg(e?.message?.replace(/^\d+:/, "") || "Could not build the checklist"); }
    finally { setBusy(false); }
  };
  const email = async () => {
    setSending(true);
    try { const r = await api.sendCommissionDigest({ year, month }); setMsg(r.sent ? `Emailed to ${r.to}` : "Email not sent — RESEND_API_KEY missing?"); }
    catch (e: any) { setMsg(e?.message || "Could not send"); }
    finally { setSending(false); }
  };
  const rename = async (fix: { from: string; to: string }) => {
    if (!confirm(`Rename '${fix.from}' to '${fix.to}' on every deal?`)) return;
    setFixing(fix.from);
    try {
      const r = await api.normalizeAgentNames({ dry_run: false, renames: { [fix.from]: fix.to } });
      setMsg(`Renamed on ${r.changed} deal${r.changed === 1 ? "" : "s"} — recalculate to apply.`);
      onChanged();
      await check();
    } catch (e: any) { setMsg(e?.message?.replace(/^\d+:/, "") || "Rename failed"); }
    finally { setFixing(null); }
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3 border-b border-slate-100">
        <div>
          <p className="text-sm font-bold text-[#0F1D5E]">Needs attention before paying {MONTHS[month - 1]} {year}</p>
          <p className="text-xs text-slate-400">Held bonuses, unregistered agent names, missing plans, unusual swings, clawbacks, unpaid earlier months. Emailed to you automatically on the 8th.</p>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs text-slate-500">{msg}</span>}
          <button onClick={email} disabled={sending} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 disabled:opacity-50">
            {sending ? "Sending…" : "Email me this"}
          </button>
          <button onClick={check} disabled={busy} className="px-3 py-1.5 rounded-lg bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#1a2d7a] disabled:opacity-50">
            {busy ? "Checking… (can take a minute)" : data ? "Re-check" : "Check now"}
          </button>
        </div>
      </div>
      {data && (
        <div className="p-5 space-y-4">
          {data.count === 0 ? (
            <p className="text-sm text-emerald-700 font-semibold">Nothing needs your attention — {data.agents} agents, {fmt(data.payout_total)} ready to pay.</p>
          ) : Object.entries(DIGEST_TITLES).map(([key, title]) => {
            const items = data.items[key] || [];
            if (!items.length) return null;
            return (
              <div key={key}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{title} ({items.length})</p>
                <ul className="space-y-1">
                  {items.map((it, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2 flex-wrap">
                      <span>{it.agent && <b>{it.agent} · </b>}{it.text}</span>
                      {it.fix && (
                        <button disabled={fixing === it.fix.from} onClick={() => rename(it.fix!)}
                          className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-50">
                          {fixing === it.fix.from ? "Renaming…" : `Rename to ${it.fix.to}`}
                        </button>
                      )}
                      {it.link && !it.fix && <a href={it.link} className="text-[11px] text-[#0F1D5E] underline">open</a>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaidToAgentsPanel({ inputCls }: { inputCls: string }) {
  const now = new Date();
  const [preset, setPreset] = useState<RangePreset>("ytd");
  const [from, setFrom] = useState(ym(now.getFullYear(), 1));
  const [to, setTo] = useState(ym(now.getFullYear(), now.getMonth() + 1));
  const [view, setView] = useState<"month" | "agent" | "detail">("month");
  const [data, setData] = useState<PaidSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);

  const range = preset === "custom" ? { from, to } : presetRange(preset, now);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    const params: Record<string, string> = {};
    if (range.from) params.from = range.from;
    if (range.to) params.to = range.to;
    api.getAgentPaidSummary(params).then(d => { if (alive) setData(d); }).catch(() => { if (alive) setData(null); }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  const label = (y: number, m: number) => `${MONTHS[m - 1].slice(0, 3)} ${y}`;
  const rangeLabel = !range.from && !range.to ? "All time" : `${range.from || "…"} → ${range.to || "…"}`;
  const PRESETS: { key: RangePreset; label: string }[] = [
    { key: "month", label: "This month" }, { key: "last_month", label: "Last month" }, { key: "ytd", label: "YTD" },
    { key: "last12", label: "Last 12 months" }, { key: "all", label: "All time" }, { key: "custom", label: "Custom" },
  ];
  const monthOptions = (() => {
    const out: string[] = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--)
      for (let m = (y === now.getFullYear() ? now.getMonth() + 1 : 12); m >= 1; m--) out.push(ym(y, m));
    return out;
  })();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3 border-b border-slate-100">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-left">
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          <div>
            <p className="text-sm font-bold text-[#0F1D5E]">Paid to Agents</p>
            <p className="text-xs text-slate-400">Commission periods {rangeLabel} · what has been paid out, what is approved but unpaid, and what is still only calculated</p>
          </div>
        </button>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${preset === p.key ? "bg-[#0F1D5E] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {p.label}
            </button>
          ))}
          {preset === "custom" && (
            <>
              <select value={from} onChange={e => setFrom(e.target.value)} className={`${inputCls} py-1.5`}>
                {monthOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <span className="text-slate-400 text-xs">to</span>
              <select value={to} onChange={e => setTo(e.target.value)} className={`${inputCls} py-1.5`}>
                {monthOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Paid out", value: data?.totals.paid ?? 0, color: "text-emerald-600", note: "marked paid" },
              { label: "Approved, not yet paid", value: data?.totals.owed ?? 0, color: "text-amber-600", note: "approved or closed out" },
              { label: "Calculated only", value: data?.totals.pending ?? 0, color: "text-slate-500", note: "awaiting approval" },
            ].map(c => (
              <div key={c.label} className="rounded-xl bg-[#F8FAFF] border border-slate-100 p-4">
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${c.color}`}>{busy && !data ? "…" : fmt(c.value)}</p>
                <p className="text-[11px] text-slate-400">{c.note}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {(["month", "agent", "detail"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === v ? "bg-[#EEF1FA] text-[#0F1D5E]" : "text-slate-500 hover:bg-slate-50"}`}>
                {v === "month" ? "By month" : v === "agent" ? "By agent" : "Every record"}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-400">{data ? `${data.records} record${data.records === 1 ? "" : "s"}` : ""}{busy ? " · refreshing…" : ""}</span>
          </div>

          {!data || data.records === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">{busy ? "Loading…" : "No commission records in this range."}</p>
          ) : view === "month" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-200">
                    <th className="py-2 text-left">Commission month</th>
                    <th className="py-2 text-right">Agents</th>
                    <th className="py-2 text-right">Paid out</th>
                    <th className="py-2 text-right">Approved, unpaid</th>
                    <th className="py-2 text-right">Calculated only</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...data.by_month].reverse().map(m => (
                    <tr key={`${m.year}-${m.month}`} className="hover:bg-slate-50/60">
                      <td className="py-2 font-medium text-slate-700">{label(m.year, m.month)}</td>
                      <td className="py-2 text-right text-slate-500">{m.agents}</td>
                      <td className="py-2 text-right font-semibold text-emerald-600">{fmt(m.paid)}</td>
                      <td className="py-2 text-right text-amber-600">{m.owed ? fmt(m.owed) : "—"}</td>
                      <td className="py-2 text-right text-slate-400">{m.pending ? fmt(m.pending) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-semibold">
                    <td className="pt-2 text-slate-500" colSpan={2}>Total</td>
                    <td className="pt-2 text-right text-emerald-600">{fmt(data.totals.paid)}</td>
                    <td className="pt-2 text-right text-amber-600">{fmt(data.totals.owed)}</td>
                    <td className="pt-2 text-right text-slate-400">{fmt(data.totals.pending)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : view === "agent" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-200">
                    <th className="py-2 text-left">Agent</th>
                    <th className="py-2 text-right">Months paid</th>
                    <th className="py-2 text-right">Paid out</th>
                    <th className="py-2 text-right">Approved, unpaid</th>
                    <th className="py-2 text-right">Calculated only</th>
                    <th className="py-2 text-right">Last payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.by_agent.map(a => (
                    <tr key={a.agent_name} className="hover:bg-slate-50/60">
                      <td className="py-2 font-medium text-slate-700">{a.agent_name}</td>
                      <td className="py-2 text-right text-slate-500">{a.months_paid}</td>
                      <td className="py-2 text-right font-semibold text-emerald-600">{fmt(a.paid)}</td>
                      <td className="py-2 text-right text-amber-600">{a.owed ? fmt(a.owed) : "—"}</td>
                      <td className="py-2 text-right text-slate-400">{a.pending ? fmt(a.pending) : "—"}</td>
                      <td className="py-2 text-right text-slate-500 text-xs">{a.last_paid_at ? fmtDate(a.last_paid_at) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-semibold">
                    <td className="pt-2 text-slate-500" colSpan={2}>Total</td>
                    <td className="pt-2 text-right text-emerald-600">{fmt(data.totals.paid)}</td>
                    <td className="pt-2 text-right text-amber-600">{fmt(data.totals.owed)}</td>
                    <td className="pt-2 text-right text-slate-400">{fmt(data.totals.pending)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-200">
                    <th className="py-2 text-left">Agent</th>
                    <th className="py-2 text-left">Commission month</th>
                    <th className="py-2 text-left">Status</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="py-2 text-left pl-4">Paid on</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.detail.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="py-2 font-medium text-slate-700">{r.agent_name}</td>
                      <td className="py-2 text-slate-600">{label(r.year, r.month)}</td>
                      <td className="py-2"><StatusBadge status={r.status as Commission["status"]} /></td>
                      <td className={`py-2 text-right font-semibold ${r.status === "paid" ? "text-emerald-600" : "text-slate-500"}`}>{fmt(r.total_commission)}</td>
                      <td className="py-2 pl-4 text-xs text-slate-500">{r.paid_at ? `${fmtDate(r.paid_at)}${r.paid_by ? ` · ${r.paid_by}` : ""}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommissionsPage() {
  const router  = useRouter();
  const { user } = useAuth();

  // Guard — admin only
  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    api.getSalesAgents()
      .then((data: any[]) => setAgents(data.map((a: any) => a.name).filter(Boolean).sort()))
      .catch(() => {});
  }, []);

  const now  = new Date();
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [year,  setYear]    = useState(now.getFullYear());
  const [status, setStatus] = useState("");
  const [agentQ, setAgentQ] = useState("");

  const [agents,  setAgents]  = useState<string[]>([]);
  const [rows,    setRows]    = useState<Commission[]>([]);
  const [logs,    setLogs]    = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [modal, setModal] = useState<Modal | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, Deal[]>>({});
  const [deciding, setDeciding] = useState<Record<string, boolean>>({});

  /** Admin decision on a HELD enrollment bonus, then refresh that record's breakdown + recalculate the month. */
  const decideHeld = async (row: Commission, d: Deal, decision: "release" | "reject") => {
    if (!d.deal_source || !d.deal_id) return;
    setDeciding(s => ({ ...s, [d.deal_id]: true }));
    try {
      await api.decideHeldEnrollment(d.deal_source, d.deal_id, decision, { month: `${row.year}-${String(row.month).padStart(2, "0")}` });
      await api.calculateAgentCommissions({ month: row.month, year: row.year });
      const data = await api.getAgentCommissionBreakdown(row.id);
      setBreakdown(b => ({ ...b, [row.id]: data.deals }));
      await load();
    } catch (e: any) {
      alert(e?.message?.replace(/^\d+:/, "") || "Could not save decision");
    } finally {
      setDeciding(s => ({ ...s, [d.deal_id]: false }));
    }
  };
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  const downloadStatement = async (row: Commission) => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const res = await fetch(`${API_BASE}/api/v1/agent-commissions/${row.id}/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) { alert("Export failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commission_${row.agent_name.replace(/ /g, "_")}_${row.year}-${String(row.month).padStart(2, "0")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load commissions
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (month)  params.month  = String(month);
      if (year)   params.year   = String(year);
      if (status) params.status = status;
      if (agentQ) params.agent  = agentQ;
      const data = await api.listAgentCommissions(params);
      setRows(data);
    } catch {}
    setLoading(false);
  }, [month, year, status, agentQ]);

  useEffect(() => { load(); }, [load]);

  // Load logs when panel opened
  useEffect(() => {
    if (!showLogs) return;
    api.getCommissionLogs({ month: String(month), year: String(year) })
      .then(setLogs).catch(() => {});
  }, [showLogs, month, year]);

  // ── Breakdown toggle ───────────────────────────────────────────────────────

  const toggleBreakdown = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!breakdown[id]) {
      try {
        const data = await api.getAgentCommissionBreakdown(id);
        setBreakdown(prev => ({ ...prev, [id]: data.deals }));
      } catch {}
    }
  };

  // ── Calculate ──────────────────────────────────────────────────────────────

  const handleCalculate = () => {
    setModal({
      commissionId: "",
      agentName: "all agents",
      action: "recalculate",
      title: "Calculate Commissions",
      message: `Calculate ${MONTHS[month - 1]} ${year} payouts from the provider payments imported for that month? Each agent's custom plan is applied to the dollars actually received. "Calculated" records are refreshed; Approved/Closed/Paid records are protected.`,
    });
  };

  // ── Action buttons ─────────────────────────────────────────────────────────

  const openAction = (row: Commission, action: "approve" | "close_out" | "mark_paid" | "record_payment") => {
    const configs = {
      record_payment: {
        title: "Record Payment",
        message: `Record that ${row.agent_name} was paid ${fmt(row.total_commission)} for ${MONTHS[row.month - 1]} ${row.year}. Use this for payments already made outside the approve → close out → pay steps; the record goes straight to Paid with the date you enter.`,
      },
      approve: {
        title: "Approve Commission",
        message: `Approve ${row.agent_name}'s commission of ${fmt(row.total_commission)} for ${MONTHS[row.month - 1]} ${row.year}? This confirms the numbers are correct.`,
      },
      close_out: {
        title: "Close Out Commission",
        message: `Close out ${row.agent_name}'s commission? This finalizes the amount of ${fmt(row.total_commission)} and prepares it for payout.`,
      },
      mark_paid: {
        title: "Mark as Paid",
        message: `Confirm ${row.agent_name} has been paid ${fmt(row.total_commission)} for ${MONTHS[row.month - 1]} ${row.year}? This action cannot be undone.`,
      },
    };
    setModal({ commissionId: row.id, agentName: row.agent_name, action, ...configs[action] });
  };

  const handleConfirm = async (notes: string) => {
    if (!modal) return;
    setActionLoading(true);
    try {
      if (modal.action === "recalculate") {
        setCalcLoading(true);
        const result = await api.calculateAgentCommissions({ month, year });
        setCalcResult(result);
        setBreakdown({});
        setCalcLoading(false);
      } else if (modal.action === "approve") {
        await api.approveAgentCommission(modal.commissionId, { notes });
      } else if (modal.action === "close_out") {
        await api.closeOutAgentCommission(modal.commissionId, { notes });
      } else if (modal.action === "mark_paid") {
        await api.markAgentCommissionPaid(modal.commissionId, { notes });
      } else if (modal.action === "record_payment") {
        const [paid_at, ...rest] = notes.split("|");
        await api.recordAgentCommissionPayment(modal.commissionId, { paid_at, notes: rest.join("|") });
      }
      setModal(null);
      await load();
      if (showLogs) {
        api.getCommissionLogs({ month: String(month), year: String(year) })
          .then(setLogs).catch(() => {});
      }
    } catch (err: any) {
      alert(err?.message || "An error occurred. Please try again.");
    }
    setActionLoading(false);
    setCalcLoading(false);
  };

  // ── Summary totals ─────────────────────────────────────────────────────────

  const totalComm  = rows.reduce((s, r) => s + (r.total_commission || 0), 0);
  const totalDeals = rows.reduce((s, r) => s + (r.total_deals || 0), 0);
  const paidCount  = rows.filter(r => r.status === "paid").length;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const inputCls = "border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E] flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-500" />
            Commission Management
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Admin-only · Track, approve, and pay out agent commissions</p>
        </div>
        <button
          onClick={handleCalculate}
          disabled={calcLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F1D5E] text-white text-sm font-semibold rounded-xl hover:bg-[#1a2d7a] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${calcLoading ? "animate-spin" : ""}`} />
          {calcLoading ? "Calculating…" : `Calculate ${MONTHS[month - 1]} ${year}`}
        </button>
        <button
          onClick={() => setCloseOpen(true)}
          disabled={!rows.some(r => r.status !== "paid" && (r.total_commission || 0) > 0)}
          title="Approve, close out and mark paid every agent for this month in one step"
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          Pay {MONTHS[month - 1]} {year}
        </button>
      </div>
      {closeOpen && <MonthCloseModal year={year} month={month} rows={rows} onClose={() => setCloseOpen(false)} onDone={load} />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Agents",     value: String(rows.length),     icon: Activity,    color: "text-[#0F1D5E]" },
          { label: "Total Deals",      value: String(totalDeals),      icon: FileText,    color: "text-slate-700" },
          { label: "Total Commission", value: fmt(totalComm),          icon: DollarSign,  color: "text-emerald-600" },
          { label: "Paid Out",         value: `${paidCount} / ${rows.length}`, icon: CheckCircle, color: "text-violet-600" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEF1FA] flex items-center justify-center shrink-0">
              <c.icon className="w-4 h-4 text-[#0F1D5E]" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{c.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pre-payout checklist */}
      <NeedsAttentionPanel year={year} month={month} onChanged={load} />

      {/* Paid to agents — month range / YTD */}
      <PaidToAgentsPanel inputCls={inputCls} />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Month</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className={`${inputCls} w-full`}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className={`${inputCls} w-full`}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">All Statuses</option>
              <option value="calculated">Calculated</option>
              <option value="approved">Approved</option>
              <option value="closed_out">Closed Out</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Agent</label>
            <select value={agentQ} onChange={e => setAgentQ(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">All Agents</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Post-calculation report */}
      {calcResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#0F1D5E]">
              Calculation report — {calcResult.statement_rows.toLocaleString()} provider payment rows,{" "}
              {fmt(calcResult.gross_total)} gross received
            </p>
            <button onClick={() => setCalcResult(null)} className="text-slate-300 hover:text-slate-500 text-xs">dismiss</button>
          </div>
          {calcResult.locked.length > 0 && (
            <p className="text-xs text-slate-500">
              Untouched (already approved/paid): {calcResult.locked.join(", ")}
            </p>
          )}
          {(calcResult.unassigned?.no_agent_on_deal?.esiids > 0 ||
            Object.keys(calcResult.unassigned?.agent_not_registered || {}).length > 0) && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-1">
              {calcResult.unassigned.no_agent_on_deal.esiids > 0 && (
                <p>{calcResult.unassigned.no_agent_on_deal.esiids} paid accounts have a deal with <b>no sales agent set</b> ({fmt(calcResult.unassigned.no_agent_on_deal.gross)} gross) — house accounts or missing data.</p>
              )}
              {Object.entries(calcResult.unassigned.agent_not_registered || {}).map(([nm, gross]) => (
                <p key={nm}>Deals credit "<b>{nm}</b>" ({fmt(gross as number)} gross) but that agent isn't registered.</p>
              ))}
            </div>
          )}
          {calcResult.warnings.filter(w => w.includes("NO commission plan")).map((w, i) => (
            <p key={i} className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{w}</p>
          ))}
          {calcResult.warnings.filter(w => w.includes("HELD for review")).map((w, i) => (
            <p key={`h${i}`} className="text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 font-medium">⚠ {w}</p>
          ))}
        </div>
      )}

      {/* Status flow indicator */}
      <div className="flex items-center gap-1 px-1">
        {["Calculated", "Approved", "Closed Out", "Paid"].map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              i === 0 ? "bg-blue-50 text-blue-700" :
              i === 1 ? "bg-amber-50 text-amber-700" :
              i === 2 ? "bg-violet-50 text-violet-700" :
              "bg-emerald-50 text-emerald-700"
            }`}>{s}</span>
            {i < 3 && <span className="text-slate-300 text-xs">→</span>}
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-slate-400 text-sm">No commission records found.</p>
            <p className="text-slate-300 text-xs">Click "Calculate" to generate commissions for the selected month.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Agent", "Month / Year", "Total Deals", "Total Commission", "Status", "Last Updated By", "Actions"].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${i >= 2 && i <= 3 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const isExpanded = expandedId === row.id;
                const deals = breakdown[row.id] || [];
                return (
                  <>
                    <tr key={row.id} className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${isExpanded ? "bg-slate-50/60" : ""}`}>
                      {/* Agent name — clickable */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleBreakdown(row.id)}
                          className="flex items-center gap-1.5 font-semibold text-[#0F1D5E] hover:text-emerald-600 transition-colors group"
                        >
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""} text-slate-400 group-hover:text-emerald-500`} />
                          {row.agent_name}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{MONTHS[row.month - 1]} {row.year}</td>
                      <td className="px-5 py-4 text-right text-slate-700">
                        {row.total_deals}
                        {(() => {
                          const sm = parseSummary(row.notes);
                          if (sm && sm.statement_rows) {
                            return (
                              <span className="block text-[11px] text-slate-400 whitespace-nowrap">
                                {sm.statement_rows} statement rows · <span className="text-sky-700">{fmt(sm.statement_share ?? 0)} provider-listed share</span>
                              </span>
                            );
                          }
                          if (!sm || !sm.enrolled) return null;
                          return (
                            <span className="block text-[11px] text-slate-400 whitespace-nowrap">
                              {sm.enrolled} enrolled{sm.new_enrollments == null
                                ? <span className="text-amber-600"> · recalculate for the latest rules</span>
                                : <> · <span className="text-emerald-600">{sm.new_enrollments} new</span> · <span className="text-violet-600">{sm.renewals ?? 0} renewals</span></>}
                              {sm.held ? <span className="text-amber-600"> · {sm.held} held</span> : null}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-emerald-600">{fmt(row.total_commission)}</td>
                      <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {row.status === "paid"       && row.paid_by       ? <span><span className="font-medium text-slate-600">{row.paid_by}</span><br />{fmtDate(row.paid_at)}</span>
                        : row.status === "closed_out" && row.closed_out_by ? <span><span className="font-medium text-slate-600">{row.closed_out_by}</span><br />{fmtDate(row.closed_out_at)}</span>
                        : row.status === "approved"   && row.approved_by   ? <span><span className="font-medium text-slate-600">{row.approved_by}</span><br />{fmtDate(row.approved_at)}</span>
                        : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {row.status === "calculated" && (
                            <button onClick={() => openAction(row, "approve")}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors">
                              Approve
                            </button>
                          )}
                          {row.status === "approved" && (
                            <button onClick={() => openAction(row, "close_out")}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 transition-colors">
                              Close Out
                            </button>
                          )}
                          {row.status === "closed_out" && (
                            <button onClick={() => openAction(row, "mark_paid")}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors">
                              Mark as Paid ✓
                            </button>
                          )}
                          {row.status !== "paid" && (
                            <button onClick={() => openAction(row, "record_payment")} title="Already paid this? Record the payment with its date"
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-colors">
                              Record payment
                            </button>
                          )}
                          {row.status === "paid" && (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-400 border border-slate-200">Paid ✓</span>
                          )}
                          <button onClick={() => downloadStatement(row)} title="Download Excel statement for this agent"
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-[#0F1D5E] hover:bg-slate-100 border border-slate-200 transition-colors">
                            <FileText className="w-3 h-3" />
                          </button>
                          {row.status === "calculated" && (
                            <button onClick={handleCalculate} title="Recalculate"
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-[#0F1D5E] hover:bg-slate-100 border border-slate-200 transition-colors">
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Breakdown sub-rows */}
                    {isExpanded && (
                      <tr key={`${row.id}-breakdown`} className="bg-[#F8FAFF] border-b border-slate-200">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="mb-2 flex items-center gap-2 flex-wrap">
                            {(() => {
                              const enrollOnly = deals.length > 0 && deals.every(d => d.kind === "enrollment" || d.kind === "clawback");
                              const rateFor = (seg: string) => { const r = deals.find(d => d.segment === seg && !d.held && !d.excluded && d.commission > 0); return r ? r.commission : 0; };
                              const rates = Array.from(new Set(deals.filter(d => !d.held && !d.excluded && d.commission > 0).map(d => d.commission)));
                              const rateTxt = rates.length <= 1
                                ? `${fmt(rates[0] ?? 0)} per customer`
                                : `${fmt(rateFor("residential"))} residential · ${fmt(rateFor("commercial"))} commercial`;
                              return enrollOnly ? (
                                <>
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Enrolled Customers — {row.agent_name}</span>
                                  <span className="text-xs text-slate-400">· {rateTxt} enrolled in {MONTHS[row.month - 1]} {row.year}</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Paid Deals — {row.agent_name}</span>
                                  <span className="text-xs text-slate-400">· {deals.some(d => d.kind === "statement") ? "share listed per account on the provider's own statement" : "computed from provider payments received this month"}</span>
                                </>
                              );
                            })()}
                            {(() => {
                              const enr = deals.filter(d => d.kind === "enrollment");
                              if (!enr.length) return null;
                              const nw = enr.filter(d => d.enrollment_type !== "renewal").length;
                              const rn = enr.length - nw;
                              const hd = enr.filter(d => d.held).length;
                              return (
                                <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{enr.length} enrolled</span>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{nw} brand-new</span>
                                  <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{rn} renewals</span>
                                  {hd > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">{hd} held</span>}
                                </span>
                              );
                            })()}
                          </div>
                          {deals.length === 0 ? (
                            <p className="text-xs text-slate-400 py-2">Loading deals…</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-200">
                                  <th className="pb-2 text-left">Customer</th>
                                  <th className="pb-2 text-left">Provider</th>
                                  {!deals.every(d => d.kind === "enrollment" || d.kind === "clawback") && <th className="pb-2 text-right">kWh Paid</th>}
                                  {!deals.every(d => d.kind === "enrollment" || d.kind === "clawback") && <th className="pb-2 text-right">Gross Received</th>}
                                  {deals.every(d => d.kind === "enrollment" || d.kind === "clawback") && <th className="pb-2 text-left">Contract Start</th>}
                                  <th className="pb-2 text-left pl-4">How Calculated</th>
                                  <th className="pb-2 text-right">{deals.every(d => d.kind === "enrollment" || d.kind === "clawback") ? "Bonus" : "Agent Commission"}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {deals.map(d => (
                                  <tr key={d.deal_id || d.esiid} className={d.held ? "bg-amber-50/70" : "hover:bg-white/60"}>
                                    <td className="py-2 pr-4">
                                      <span className="font-medium text-slate-700">{d.customer || "—"}</span>
                                      {d.first_payment && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">NEW</span>
                                      )}
                                      {d.kind === "statement" && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-bold">STATEMENT</span>
                                      )}
                                      {d.kind === "clawback" && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">CLAWBACK</span>
                                      )}
                                      {d.hold_reason === "auto_rejected" && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold" title="Same contract entered twice — the other record pays. Use Pay anyway to override.">DUPLICATE · $0</span>
                                      )}
                                      {d.hold_reason === "cancelled" && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">CANCELLED · $0</span>
                                      )}
                                      {d.kind === "enrollment" && d.auto_decision === "release" && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold" title="Earlier contract was inactive and with another provider — released automatically">AUTO-OK</span>
                                      )}
                                      {d.kind === "enrollment" && d.segment === "commercial" && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-bold">COMMERCIAL</span>
                                      )}
                                      {d.kind === "enrollment" && (
                                        d.enrollment_type === "renewal"
                                          ? <span className="ml-1.5 px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[10px] font-bold"
                                                  title={d.prior_contract ? `Prior contract: ${d.prior_contract.supplier || "—"} from ${d.prior_contract.contract_start}${d.prior_contract.contract_end ? ` to ${d.prior_contract.contract_end}` : ""}${d.prior_contract.agent ? ` (agent ${d.prior_contract.agent})` : ""}` : undefined}>RENEWAL</span>
                                          : <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">NEW CUSTOMER</span>
                                      )}
                                      {d.held && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                                          {d.hold_reason === "rejected" ? "REJECTED" : "HELD — REVIEW"}
                                        </span>
                                      )}
                                      {d.address && <span className="block text-[11px] text-slate-500">{d.address}</span>}
                                      {d.esiid && <span className="block font-mono text-[10px] text-slate-400">{d.esiid}</span>}
                                    </td>
                                    <td className="py-2 pr-4 text-slate-500">{d.supplier}</td>
                                    {!deals.every(x => x.kind === "enrollment" || x.kind === "clawback") && <td className="py-2 pr-4 text-right text-slate-600">{d.kind === "enrollment" ? "—" : (d.kwh_paid ?? 0).toLocaleString()}</td>}
                                    {!deals.every(x => x.kind === "enrollment" || x.kind === "clawback") && <td className="py-2 pr-4 text-right text-slate-600">{d.kind === "enrollment" ? "—" : fmt(d.gross_received)}</td>}
                                    {deals.every(x => x.kind === "enrollment" || x.kind === "clawback") && <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{d.contract_start || "—"}</td>}
                                    <td className="py-2 pl-4 text-slate-500">
                                      {d.excluded
                                        ? <span className="text-red-400 font-semibold">Excluded — {d.plan_type}</span>
                                        : d.applied}
                                      {d.hold_reason === "auto_rejected" && d.deal_source && (
                                        <div className="mt-1">
                                          <button disabled={!!deciding[d.deal_id]} onClick={() => decideHeld(row, d, "release")}
                                            className="px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-600 text-[11px] font-semibold hover:bg-slate-50 disabled:opacity-50">
                                            Pay anyway
                                          </button>
                                        </div>
                                      )}
                                      {d.held && d.hold_reason !== "rejected" && d.duplicate_of && (
                                        <div className="mt-1 text-[11px] text-amber-900">
                                          Other contract: <b>{d.duplicate_of.customer || "—"}</b> · {d.duplicate_of.contract_start} → {d.duplicate_of.contract_end || "open"}
                                          {d.duplicate_of.agent ? ` · agent ${d.duplicate_of.agent}` : ""}
                                          <div className="mt-1 flex gap-2">
                                            <button
                                              disabled={!!deciding[d.deal_id]}
                                              onClick={() => decideHeld(row, d, "release")}
                                              className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-50">
                                              Release &amp; pay
                                            </button>
                                            <button
                                              disabled={!!deciding[d.deal_id]}
                                              onClick={() => decideHeld(row, d, "reject")}
                                              className="px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-600 text-[11px] font-semibold hover:bg-slate-50 disabled:opacity-50">
                                              Reject (no pay)
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                    <td className={`py-2 text-right font-semibold ${d.held ? "text-amber-700" : "text-emerald-600"}`}>{fmt(d.commission)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                {deals.every(d => d.kind === "enrollment" || d.kind === "clawback") ? (() => {
                                  const paidRows = deals.filter(d => !d.held && !d.excluded && d.commission > 0);
                                  const rate = paidRows.length ? paidRows[0].commission : 0;
                                  const mixed = new Set(paidRows.map(d => d.commission)).size > 1;
                                  const heldN = deals.filter(d => d.held).length;
                                  const segMath = ["residential", "commercial"].map(seg => {
                                    const rows = paidRows.filter(d => (d.segment || "residential") === seg);
                                    return rows.length ? `${rows.length} ${seg} × ${fmt(rows[0].commission)}` : "";
                                  }).filter(Boolean).join(" + ");
                                  return (
                                    <tr className="border-t-2 border-slate-200 font-semibold">
                                      <td colSpan={4} className="pt-2 text-right text-slate-500">
                                        {mixed ? segMath : `${paidRows.length} enrolled × ${fmt(rate)}`}{heldN ? <span className="font-normal text-amber-700"> ({heldN} held at $0)</span> : null}{(() => { const cb = deals.filter(d => d.kind === "clawback"); return cb.length ? <span className="font-normal text-red-600"> − {cb.length} clawback{cb.length > 1 ? "s" : ""} {fmt(-cb.reduce((s, d) => s + d.commission, 0))}</span> : null; })()} =
                                      </td>
                                      <td className="pt-2 text-right text-emerald-600">{fmt(deals.reduce((s,d) => s + d.commission, 0))}</td>
                                    </tr>
                                  );
                                })() : (
                                <tr className="border-t-2 border-slate-200 font-semibold">
                                  <td colSpan={5} className="pt-2 text-right text-slate-500">Total from paid deals:</td>
                                  <td className="pt-2 text-right text-emerald-600">{fmt(deals.reduce((s,d) => s + d.commission, 0))}</td>
                                </tr>
                                )}
                              </tfoot>
                            </table>
                          )}
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

      {/* Notes column if any row has notes */}
      {rows.some(r => r.notes) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" /> Payout Notes
          </h3>
          <div className="space-y-2">
            {rows.filter(r => r.notes).map(r => (
              <div key={r.id} className="flex items-start gap-3 text-sm">
                <span className="font-semibold text-slate-700 w-32 shrink-0">{r.agent_name}</span>
                <span className="text-slate-500">{r.notes}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowLogs(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            Activity Log — {MONTHS[month - 1]} {year}
          </span>
          {showLogs ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showLogs && (
          <div className="border-t border-slate-100">
            {logs.length === 0 ? (
              <p className="p-5 text-center text-slate-400 text-sm">No activity yet for this period.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {logs.map(log => (
                  <div key={log.id} className="px-5 py-3.5 flex items-start gap-4">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      log.action === "mark_paid"    ? "bg-emerald-400" :
                      log.action === "close_out"    ? "bg-violet-400" :
                      log.action === "approve"      ? "bg-amber-400" :
                      "bg-blue-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold">{log.performed_by}</span>
                        {" "}<span className="text-slate-500">{actionLabel(log.action).toLowerCase()}</span>{" "}
                        <span className="font-semibold">{log.agent_name}</span>
                        {" — "}{MONTHS[log.month - 1]} {log.year}
                      </p>
                      {log.notes && <p className="text-xs text-slate-400 mt-0.5">{log.notes}</p>}
                    </div>
                    <span className="text-xs text-slate-300 shrink-0 whitespace-nowrap">{fmtDate(log.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {modal && (
        <ConfirmModal
          modal={modal}
          onConfirm={handleConfirm}
          onCancel={() => setModal(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
