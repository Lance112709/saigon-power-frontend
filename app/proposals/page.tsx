"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { FileSignature, Copy, Check, ExternalLink } from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const STATUS_STYLES: Record<string, string> = {
  draft:    "bg-slate-100 text-slate-600",
  sent:     "bg-blue-100 text-blue-700",
  viewed:   "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
};

const TABS = ["all","draft","sent","viewed","accepted","rejected"] as const;

function CopyLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${APP_URL}/proposal/${token}`;
  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} title="Copy proposal link"
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#0F1D5E] transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<typeof TABS[number]>("all");

  const load = async () => {
    setLoading(true);
    const params = tab !== "all" ? { status: tab } : {};
    const data = await api.getProposals(params).catch(() => []);
    setProposals(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const markRejected = async (id: string) => {
    if (!confirm("Mark this proposal as rejected?")) return;
    await api.updateProposal(id, { status: "rejected" }).catch(() => {});
    load();
  };

  // Stats (from full list regardless of tab filter — load separately)
  const [stats, setStats] = useState({ sent: 0, viewed: 0, accepted: 0, rejected: 0 });
  useEffect(() => {
    api.getProposals({ limit: "500" }).then((all: any[]) => {
      setStats({
        sent:     all.filter(p => ["sent","viewed","accepted"].includes(p.status)).length,
        viewed:   all.filter(p => p.status === "viewed").length,
        accepted: all.filter(p => p.status === "accepted").length,
        rejected: all.filter(p => p.status === "rejected").length,
      });
    }).catch(() => {});
  }, [tab]);

  const convRate = stats.sent > 0 ? Math.round((stats.accepted / stats.sent) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0F1D5E] flex items-center justify-center">
          <FileSignature className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E]">Proposals</h1>
          <p className="text-sm text-slate-400">Track sent proposals and acceptances</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Sent",        value: stats.sent,     color: "text-blue-600" },
          { label: "Viewed",      value: stats.viewed,   color: "text-amber-600" },
          { label: "Accepted",    value: stats.accepted, color: "text-emerald-600" },
          { label: "Rejected",    value: stats.rejected, color: "text-red-600" },
          { label: "Conv. Rate",  value: `${convRate}%`, color: "text-[#0F1D5E]" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
              tab === t ? "bg-[#0F1D5E] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading...</div>
        ) : proposals.length === 0 ? (
          <div className="p-12 text-center">
            <FileSignature className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No proposals yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Customer", "Plan / REP", "Rate", "Term", "Est. Bill", "Status", "Created", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proposals.map(p => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#0F1D5E]">{p.customer_name}</p>
                      <p className="text-xs text-slate-400">{p.customer_phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{p.plan_name || "—"}</p>
                      <p className="text-xs text-slate-400">{p.rep_name || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {p.rate != null ? `$${parseFloat(p.rate).toFixed(4)}/kWh` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {p.term_months ? `${p.term_months} mo` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {p.est_monthly_bill != null ? `$${parseFloat(p.est_monthly_bill).toFixed(0)}/mo` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[p.status] || "bg-slate-100 text-slate-500"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CopyLink token={p.token} />
                        <a href={`/proposal/${p.token}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#0F1D5E] transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" /> View
                        </a>
                        {!["accepted","rejected"].includes(p.status) && (
                          <button onClick={() => markRejected(p.id)}
                            className="text-xs text-slate-300 hover:text-red-500 transition-colors">
                            Reject
                          </button>
                        )}
                      </div>
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
