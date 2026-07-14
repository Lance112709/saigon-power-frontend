"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Megaphone, Pause, Play, XCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  sending: "bg-blue-50 text-blue-600",
  paused: "bg-amber-50 text-amber-600",
  completed: "bg-emerald-50 text-emerald-600",
  canceled: "bg-slate-100 text-slate-500",
};

export default function CampaignsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setCampaigns(await api.getCampaigns()); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "manager") { router.replace("/crm/converted"); return; }
    load();
    const t = setInterval(load, 15000);   // live progress while campaigns drip out
    return () => clearInterval(t);
  }, [load, user, router]);

  async function act(id: string, fn: (id: string) => Promise<any>) {
    setBusy(id);
    try { await fn(id); await load(); } catch {}
    setBusy(null);
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      <button onClick={() => router.push("/crm/converted")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0F1D5E]">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      <div className="flex items-center gap-2">
        <Megaphone className="w-6 h-6 text-[#0F1D5E]" />
        <h1 className="text-2xl font-bold text-[#0F1D5E]">Email Campaigns</h1>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No campaigns yet. Start one from the <button onClick={() => router.push("/crm/converted")} className="text-[#0F1D5E] font-semibold underline">Customers</button> tab.
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(c => {
            const done = (c.sent_count || 0) + (c.failed_count || 0);
            const pct = c.total_recipients ? Math.round((done / c.total_recipients) * 100) : 0;
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[#0F1D5E]">{c.name}</h3>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[c.status] || "bg-slate-100 text-slate-500"}`}>{c.status}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5 truncate"><span className="text-slate-400">Subject:</span> {c.subject}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      By {c.created_by_name || "staff"} · {new Date(c.created_at).toLocaleString()}
                      {c.daily_cap ? ` · ${c.daily_cap}/day cap` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.status === "sending" && (
                      <button onClick={() => act(c.id, api.pauseCampaign)} disabled={busy === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </button>
                    )}
                    {c.status === "paused" && (
                      <button onClick={() => act(c.id, api.resumeCampaign)} disabled={busy === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0F1D5E] text-[#0F1D5E] text-xs font-semibold hover:bg-[#EEF1FA] disabled:opacity-50">
                        <Play className="w-3.5 h-3.5" /> Resume
                      </button>
                    )}
                    {(c.status === "sending" || c.status === "paused") && (
                      <button onClick={() => { if (confirm("Cancel this campaign? Unsent recipients will not be emailed.")) act(c.id, api.cancelCampaign); }} disabled={busy === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-red-500 text-xs font-semibold hover:bg-red-50 disabled:opacity-50">
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0F1D5E] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
                    <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> {(c.sent_count || 0).toLocaleString()} sent</span>
                    <span className="flex items-center gap-1 text-slate-500"><Clock className="w-3.5 h-3.5" /> {(c.pending_count || 0).toLocaleString()} queued</span>
                    {c.failed_count > 0 && <span className="flex items-center gap-1 text-red-500"><AlertTriangle className="w-3.5 h-3.5" /> {c.failed_count.toLocaleString()} failed</span>}
                    {c.skipped_no_email > 0 && <span className="text-amber-500">{c.skipped_no_email.toLocaleString()} skipped (no email)</span>}
                    <span className="text-slate-400 ml-auto">{(c.total_recipients || 0).toLocaleString()} total · {pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
