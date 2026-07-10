"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft, Download, Send, CheckCircle, XCircle, Banknote, X,
  Paperclip, MailQuestion,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  sent: "bg-blue-100 text-blue-800",
  provider_responded: "bg-violet-100 text-violet-800",
  recovered: "bg-emerald-100 text-emerald-800",
  rejected: "bg-slate-100 text-slate-500",
};

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [outcomeModal, setOutcomeModal] = useState<string | null>(null);
  const [recoveredAmount, setRecoveredAmount] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDispute(id);
      setD(data);
      setRecoveredAmount(String(data.total_claimed ?? ""));
    } catch { setD(null); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const isDraft = d?.status === "draft";

  const saveDraft = async () => {
    setSaving(true);
    setError("");
    try {
      await api.editDispute(id, {
        title: d.title, email_to: d.email_to,
        email_subject: d.email_subject, email_body: d.email_body,
      });
    } catch (e: any) { setError(String(e?.message ?? e).slice(0, 200)); }
    setSaving(false);
  };

  const doSend = async () => {
    setSending(true);
    setError("");
    try {
      await saveDraft();
      await api.sendDispute(id);
      setConfirmSend(false);
      await load();
    } catch (e: any) {
      setError(String(e?.message ?? e).slice(0, 200));
      setConfirmSend(false);
    }
    setSending(false);
  };

  const doOutcome = async () => {
    if (!outcomeModal) return;
    setSaving(true);
    setError("");
    try {
      await api.recordDisputeOutcome(id, {
        status: outcomeModal,
        recovered_amount: outcomeModal === "recovered" ? parseFloat(recoveredAmount) || 0 : 0,
        notes: outcomeNotes,
      });
      setOutcomeModal(null);
      await load();
    } catch (e: any) { setError(String(e?.message ?? e).slice(0, 200)); }
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-[#F4F6FA] p-6"><p className="p-8 text-center text-slate-400 text-sm">Loading…</p></div>;
  if (!d) return <div className="min-h-screen bg-[#F4F6FA] p-6"><p className="p-8 text-center text-slate-400 text-sm">Dispute not found.</p></div>;

  const inputClass = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1D5E] via-[#182a80] to-[#2a3f9e] text-white p-6 shadow-lg">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push("/disputes")}
              className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{d.title}</h1>
              <p className="text-white/60 text-sm mt-0.5">
                {d.suppliers?.name} · {Array.isArray(d.months) ? d.months.join(", ") : ""} ·{" "}
                <span className="font-semibold text-white/90 tabular-nums">{fmt(d.total_claimed)} claimed</span>
                {d.total_recovered > 0 && <> · <span className="text-emerald-300 font-semibold tabular-nums">{fmt(d.total_recovered)} recovered</span></>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize ${STATUS_BADGE[d.status] ?? ""}`}>
              {d.status.replace(/_/g, " ")}
            </span>
            {isDraft && (
              <button onClick={() => setConfirmSend(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0F1D5E] text-sm font-semibold hover:bg-white/90">
                <Send className="w-4 h-4" /> Send to Provider
              </button>
            )}
            {(d.status === "sent" || d.status === "provider_responded") && (
              <>
                <button onClick={() => { setOutcomeNotes(""); setOutcomeModal("recovered"); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600">
                  <Banknote className="w-4 h-4" /> Record Recovery
                </button>
                <button onClick={() => { setOutcomeNotes(""); setOutcomeModal("rejected"); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/20">
                  <XCircle className="w-4 h-4" /> Rejected
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-3 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email draft */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F1D5E]">
              {isDraft ? "Email Draft — edit before sending" : "Email Sent"}
            </h2>
            {isDraft && (
              <button onClick={saveDraft} disabled={saving}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
                {saving ? "Saving…" : "Save draft"}
              </button>
            )}
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">To (provider contact)</label>
              <input value={d.email_to ?? ""} disabled={!isDraft}
                onChange={e => setD({ ...d, email_to: e.target.value })}
                placeholder="rep@provider.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Subject</label>
              <input value={d.email_subject ?? ""} disabled={!isDraft}
                onChange={e => setD({ ...d, email_subject: e.target.value })}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Message</label>
              <textarea value={d.email_body ?? ""} disabled={!isDraft} rows={12}
                onChange={e => setD({ ...d, email_body: e.target.value })}
                className={`${inputClass} resize-y leading-relaxed`} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Paperclip className="w-4 h-4 text-slate-400" />
              <button
                onClick={async () => {
                  const token = localStorage.getItem("auth_token");
                  try {
                    const res = await fetch(`${API_BASE}/api/v1/disputes/${id}/attachment`,
                      { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                    if (!res.ok) throw new Error();
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `dispute_${String(id).slice(0, 8)}.xlsx`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch { alert("Download failed"); }
                }}
                className="text-[#0F1D5E] font-semibold hover:underline flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Account spreadsheet (attached on send)
              </button>
            </div>
          </div>
        </div>

        {/* Covered accounts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#0F1D5E]">Covered Accounts ({d.items?.length ?? 0})</h2>
            <p className="text-xs text-slate-400 mt-0.5">{fmt(d.total_claimed)} total claimed</p>
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-100">
            {(d.items ?? []).map((it: any) => (
              <div key={it.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-slate-700 font-semibold truncate">{it.esiid}</p>
                  <p className="text-[11px] text-slate-400">{String(it.billing_month ?? "").slice(0, 7)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(it.claimed_amount)}</p>
                  {it.recovered_amount > 0 && (
                    <p className="text-xs text-emerald-600 font-semibold tabular-nums">+{fmt(it.recovered_amount)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {d.notes && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-[#0F1D5E] mb-2 flex items-center gap-2">
            <MailQuestion className="w-4 h-4" /> Outcome Notes
          </h2>
          <p className="text-sm text-slate-600 whitespace-pre-line">{d.notes}</p>
        </div>
      )}

      {/* Confirm send modal */}
      {confirmSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">Send this dispute?</h3>
              <button onClick={() => setConfirmSend(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              The email and account spreadsheet go to <span className="font-semibold">{d.email_to || "(no recipient set)"}</span>.
              This can&apos;t be unsent.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmSend(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={doSend} disabled={sending || !d.email_to}
                className="flex-1 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#182a80] disabled:opacity-50">
                {sending ? "Sending…" : "Send Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outcome modal */}
      {outcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">
                {outcomeModal === "recovered" ? "Record Recovery" : "Mark Rejected"}
              </h3>
              <button onClick={() => setOutcomeModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {outcomeModal === "recovered" && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Amount recovered ($)</label>
                <input value={recoveredAmount} onChange={e => setRecoveredAmount(e.target.value)}
                  type="number" step="0.01" className={inputClass} />
                <p className="text-[11px] text-slate-400 mt-1">
                  Split across the covered accounts in proportion to what each claimed.
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes</label>
              <textarea value={outcomeNotes} onChange={e => setOutcomeNotes(e.target.value)} rows={3}
                placeholder={outcomeModal === "recovered" ? "e.g. True-up issued on the June statement" : "e.g. Provider says the contract allows the change"}
                className={`${inputClass} resize-none`} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setOutcomeModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={doOutcome} disabled={saving}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 ${
                  outcomeModal === "recovered" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-600 hover:bg-slate-700"
                }`}>
                {saving ? "Saving…" : outcomeModal === "recovered" ? "Record" : "Mark Rejected"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
