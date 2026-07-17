"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Megaphone, Pause, Play, XCircle, CheckCircle2, Clock, AlertTriangle,
  Search, Users, Send,
} from "lucide-react";
import BulkEmailModal from "@/components/BulkEmailModal";

const STATUS_STYLE: Record<string, string> = {
  sending: "bg-blue-50 text-blue-600",
  paused: "bg-amber-50 text-amber-600",
  completed: "bg-emerald-50 text-emerald-600",
  canceled: "bg-slate-100 text-slate-500",
};

export default function CampaignsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // ── Audience builder (targets the whole CRM customer base) ──
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [dealStatus, setDealStatus] = useState("");   // "" = all (incl. inactive)
  const [source, setSource] = useState("");
  const [membership, setMembership] = useState("");   // "" = all | members | non_members
  const [providers, setProviders] = useState<string[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [count, setCount] = useState<{ total: number; with_email: number } | null>(null);
  const [counting, setCounting] = useState(false);
  const [bulk, setBulk] = useState<null | { filters: Record<string, string>; audience: number; sampleVariables?: any }>(null);

  // ── Campaign list ──
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const filterParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (search.trim()) p.search = search.trim();
    if (provider) p.provider = provider;
    if (dealStatus) p.deal_status = dealStatus;
    if (source) p.source = source;
    if (membership) p.membership = membership;
    return p;
  }, [search, provider, dealStatus, source, membership]);

  const loadCampaigns = useCallback(async () => {
    try { setCampaigns(await api.getCampaigns()); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "manager") { router.replace("/dashboard"); return; }
    api.getCrmProviders().then(setProviders).catch(() => {});
    (api as any).getCrmCustomerSources().then(setSources).catch(() => {});
    loadCampaigns();
    const t = setInterval(loadCampaigns, 15000);
    return () => clearInterval(t);
  }, [loadCampaigns, user, router]);

  // Recompute audience size when filters change (debounced).
  useEffect(() => {
    setCounting(true);
    const t = setTimeout(() => {
      api.getCrmCustomersCount(filterParams).then(setCount).catch(() => {}).finally(() => setCounting(false));
    }, 350);
    return () => clearTimeout(t);
  }, [filterParams]);

  async function openCompose() {
    // Grab one matching customer so the modal preview shows real data.
    let sampleVariables: any = undefined;
    try {
      const first = await api.getCrmCustomers({ ...filterParams, limit: "1", offset: "0" });
      if (first?.[0]?.id) sampleVariables = (await api.getEmailMergeVars({ customer_id: first[0].id })).variables;
    } catch {}
    setBulk({ filters: filterParams, audience: count?.with_email || 0, sampleVariables });
  }

  async function act(id: string, fn: (id: string) => Promise<any>) {
    setBusy(id);
    try { await fn(id); await loadCampaigns(); } catch {}
    setBusy(null);
  }

  const selectCls = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Megaphone className="w-6 h-6 text-[#0F1D5E]" />
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E]">Email Campaigns</h1>
          <p className="text-slate-500 text-sm mt-0.5">Send a branded, personalized email to any set of customers in your CRM — active or inactive.</p>
        </div>
      </div>

      {/* ── New campaign builder ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-[#0F1D5E]">New campaign</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Search (name, email, phone)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Optional…"
                className={selectCls + " pl-9"} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Provider</label>
            <select value={provider} onChange={e => setProvider(e.target.value)} className={selectCls}>
              <option value="">All providers</option>
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Customer status</label>
            <select value={dealStatus} onChange={e => setDealStatus(e.target.value)} className={selectCls}>
              <option value="">All (active + inactive)</option>
              <option value="ACTIVE">Active only</option>
              <option value="INACTIVE">Inactive only</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Source</label>
            <select value={source} onChange={e => setSource(e.target.value)} className={selectCls}>
              <option value="">All sources</option>
              {sources.map((s: any) => <option key={s.value ?? s.label} value={s.value ?? s.label}>{(s.label ?? s.value)}{s.count ? ` (${s.count})` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">SmartCare membership</label>
            <select value={membership} onChange={e => setMembership(e.target.value)} className={selectCls}>
              <option value="">Everyone</option>
              <option value="non_members">Non-members only (for the ad)</option>
              <option value="members">Members only</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="w-4 h-4 text-[#0F1D5E]" />
            {counting && !count ? "Counting…" : count ? (
              <span>
                <span className="font-bold text-slate-800">{count.total.toLocaleString()}</span> customers match ·{" "}
                <span className="font-bold text-emerald-600">{count.with_email.toLocaleString()}</span> have an email
              </span>
            ) : "…"}
          </div>
          <button onClick={openCompose} disabled={!count || count.with_email === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-40 disabled:cursor-not-allowed">
            <Send className="w-4 h-4" /> Compose & send to {count ? count.with_email.toLocaleString() : "0"}
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Customers without an email are skipped automatically. Sending auto-drips within your email plan's daily cap, continuing over days until complete.
        </p>
      </div>

      {/* ── Campaign history / progress ── */}
      <div>
        <h2 className="font-semibold text-[#0F1D5E] mb-3">Campaigns</h2>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
            No campaigns yet. Build your audience above and send your first one.
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

      {bulk && (
        <BulkEmailModal
          dataset="crm"
          mode="filter"
          filters={bulk.filters}
          audienceCount={bulk.audience}
          sampleVariables={bulk.sampleVariables}
          onClose={() => setBulk(null)}
          onSent={() => { setBulk(null); loadCampaigns(); }}
        />
      )}
    </div>
  );
}
