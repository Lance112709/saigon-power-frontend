"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  DollarSign, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, FileText, Filter, Activity,
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
  action: "approve" | "close_out" | "mark_paid" | "recalculate";
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

  const colorMap: Record<string, string> = {
    approve:     "bg-amber-500 hover:bg-amber-600",
    close_out:   "bg-violet-600 hover:bg-violet-700",
    mark_paid:   "bg-emerald-600 hover:bg-emerald-700",
    recalculate: "bg-blue-600 hover:bg-blue-700",
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

        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Notes <span className="font-normal normal-case text-slate-400">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder={modal.action === "mark_paid" ? "e.g. Paid via Zelle, partial payment…" : "Add a note…"}
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
            onClick={() => onConfirm(notes)}
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

  // ── Calculate ──────────────────────────────────────────────────────────────

  const handleCalculate = () => {
    setModal({
      commissionId: "",
      agentName: "all agents",
      action: "recalculate",
      title: "Calculate Commissions",
      message: `Run commission calculation for ${MONTHS[month - 1]} ${year}? Any existing "Calculated" records will be overwritten. Approved/Closed/Paid records are protected.`,
    });
  };

  // ── Action buttons ─────────────────────────────────────────────────────────

  const openAction = (row: Commission, action: "approve" | "close_out" | "mark_paid") => {
    const configs = {
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
        await api.calculateAgentCommissions({ month, year });
        setCalcLoading(false);
      } else if (modal.action === "approve") {
        await api.approveAgentCommission(modal.commissionId, { notes });
      } else if (modal.action === "close_out") {
        await api.closeOutAgentCommission(modal.commissionId, { notes });
      } else if (modal.action === "mark_paid") {
        await api.markAgentCommissionPaid(modal.commissionId, { notes });
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
      </div>

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
              {rows.map(row => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-4 font-semibold text-[#0F1D5E]">{row.agent_name}</td>
                  <td className="px-5 py-4 text-slate-600">{MONTHS[row.month - 1]} {row.year}</td>
                  <td className="px-5 py-4 text-right text-slate-700">{row.total_deals}</td>
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
                      {/* Approve */}
                      {row.status === "calculated" && (
                        <button
                          onClick={() => openAction(row, "approve")}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {/* Close Out */}
                      {row.status === "approved" && (
                        <button
                          onClick={() => openAction(row, "close_out")}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 transition-colors"
                        >
                          Close Out
                        </button>
                      )}
                      {/* Mark Paid */}
                      {row.status === "closed_out" && (
                        <button
                          onClick={() => openAction(row, "mark_paid")}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        >
                          Mark as Paid ✓
                        </button>
                      )}
                      {/* Paid badge */}
                      {row.status === "paid" && (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-400 border border-slate-200">
                          Paid ✓
                        </span>
                      )}
                      {/* Recalculate — only on calculated rows */}
                      {row.status === "calculated" && (
                        <button
                          onClick={handleCalculate}
                          title="Recalculate this month"
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-[#0F1D5E] hover:bg-slate-100 border border-slate-200 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
