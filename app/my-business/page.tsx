"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Briefcase, DollarSign, CalendarClock, AlertTriangle, CheckCircle, Search,
  ChevronRight, Users, FileWarning, TrendingDown, HelpCircle,
} from "lucide-react";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const STATUS_BADGE: Record<string, string> = {
  calculated: "bg-blue-50 text-blue-700",
  approved: "bg-amber-50 text-amber-700",
  closed_out: "bg-violet-50 text-violet-700",
  paid: "bg-emerald-50 text-emerald-700",
};

const ALERT_META: Record<string, { label: string; badge: string; icon: any }> = {
  missing:    { label: "Missing Payment", badge: "bg-red-100 text-red-800", icon: AlertTriangle },
  short_paid: { label: "Wrong Rate",      badge: "bg-orange-100 text-orange-800", icon: TrendingDown },
  unexpected: { label: "Needs Review",    badge: "bg-amber-100 text-amber-800", icon: HelpCircle },
};

function planLabel(c: any): string {
  const scope = c.supplier ? ` (${c.supplier})` : "";
  switch (c.type) {
    case "per_kwh": return `$${c.rate}/kWh${scope}`;
    case "flat_monthly": return `$${c.amount}/mo${scope}`;
    case "flat_per_deal": return `$${c.amount}/new deal${scope}`;
    case "percent_of_commission": return `${c.percent}% of received${scope}`;
    default: return "";
  }
}

export default function MyBusinessPage() {
  const { user } = useAuth();
  const isAgent = user?.role === "sales_agent";

  const [agentList, setAgentList] = useState<string[]>([]);
  const [previewAgent, setPreviewAgent] = useState("");
  const agentParam = isAgent ? undefined : previewAgent || undefined;

  const [overview, setOverview] = useState<any>(null);
  const [book, setBook] = useState<any>(null);
  const [comms, setComms] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [bookSearch, setBookSearch] = useState("");
  const [expandedComm, setExpandedComm] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isAgent && user) {
      api.getSalesAgents()
        .then((d: any[]) => setAgentList(d.map(a => a.name).filter(Boolean).sort()))
        .catch(() => {});
    }
  }, [user, isAgent]);

  const load = useCallback(async () => {
    if (!user) return;
    if (!isAgent && !previewAgent) { setLoading(false); return; }
    setLoading(true);
    setErr("");
    try {
      const [ov, bk, cm, al] = await Promise.all([
        api.agentPortalOverview(agentParam),
        api.agentPortalBook(agentParam),
        api.agentPortalCommissions(agentParam),
        api.agentPortalAlerts(agentParam),
      ]);
      setOverview(ov);
      setBook(bk);
      setComms(cm.commissions ?? []);
      setAlerts(al.alerts ?? []);
      const qs = isAgent ? "" : `?sales_agent=${encodeURIComponent(previewAgent)}`;
      api.getRenewals(qs).then(setRenewals).catch(() => {});
      // heavier aggregate — loads after the page paints
      setEarnings(null);
      api.agentPortalEarnings(agentParam).then(setEarnings).catch(() => {});
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    }
    setLoading(false);
  }, [user, isAgent, previewAgent, agentParam]);

  useEffect(() => { load(); }, [load]);

  const toggleBreakdown = async (id: string) => {
    if (expandedComm === id) { setExpandedComm(null); return; }
    setExpandedComm(id);
    if (!breakdown[id]) {
      try {
        const data = await api.agentPortalBreakdown(id, agentParam);
        setBreakdown(prev => ({ ...prev, [id]: data }));
      } catch {}
    }
  };

  const shownDeals = useMemo(() => {
    const deals = book?.deals ?? [];
    if (!bookSearch.trim()) return deals;
    const q = bookSearch.toLowerCase();
    return deals.filter((d: any) =>
      (d.customer || "").toLowerCase().includes(q) ||
      (d.esiid || "").includes(q.replace(/\D/g, "") || "§") ||
      (d.provider || "").toLowerCase().includes(q));
  }, [book, bookSearch]);

  const activeDeals = (book?.deals ?? []).filter((d: any) => d.active);
  const months: string[] = book?.months_checked ?? [];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1D5E] via-[#182a80] to-[#2a3f9e] text-white p-6 shadow-lg">
        <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="w-6 h-6" /> My Business
            </h1>
            <p className="text-white/60 mt-1 text-sm">
              {overview?.agent ? `${overview.agent} — your book, your commissions, your customers.` :
                "Your book, your commissions, your customers."}
            </p>
          </div>
          {!isAgent && (
            <select value={previewAgent} onChange={e => setPreviewAgent(e.target.value)}
              className="rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold px-3 py-2.5 focus:outline-none [&>option]:text-slate-800">
              <option value="">Preview an agent…</option>
              {agentList.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>

        {overview && (
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3.5">
              <p className="text-xs text-white/60 font-medium flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Active Accounts</p>
              <p className="text-2xl font-bold mt-1 tabular-nums">{overview.active_deals}</p>
              <p className="text-[11px] text-white/50 mt-0.5">
                {overview.paid_last_month} paid on the {overview.latest_statement_month} statements
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3.5">
              <p className="text-xs text-white/60 font-medium flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Last Payout</p>
              <p className="text-2xl font-bold mt-1 tabular-nums">
                {overview.last_commission ? fmt(overview.last_commission.total_commission) : "—"}
              </p>
              <p className="text-[11px] text-white/50 mt-0.5">
                {overview.last_commission
                  ? `${MONTHS[overview.last_commission.month - 1]} ${overview.last_commission.year} · ${overview.last_commission.status}`
                  : "no payouts calculated yet"}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3.5">
              <p className="text-xs text-white/60 font-medium flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5 text-amber-300" /> Renewals — 60 Days</p>
              <p className={`text-2xl font-bold mt-1 tabular-nums ${overview.renewals_60d > 0 ? "text-amber-300" : ""}`}>{overview.renewals_60d}</p>
              <p className="text-[11px] text-white/50 mt-0.5">contracts ending soon — lock them in</p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3.5">
              <p className="text-xs text-white/60 font-medium flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-rose-300" /> Account Alerts</p>
              <p className={`text-2xl font-bold mt-1 tabular-nums ${alerts.length > 0 ? "text-rose-300" : "text-emerald-300"}`}>{alerts.length}</p>
              <p className="text-[11px] text-white/50 mt-0.5">customers needing attention</p>
            </div>
          </div>
        )}

        {overview && (
          <div className="relative flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-white/50 font-medium">My commission plan:</span>
            {overview.has_plan ? overview.plan_components.map((c: any, i: number) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-semibold">
                {planLabel(c)}
              </span>
            )) : (
              <span className="px-2.5 py-1 rounded-full bg-rose-400/20 text-rose-200 text-xs font-semibold">
                No plan configured — talk to your admin
              </span>
            )}
            {overview.deals_missing_esiid > 0 && (
              <span className="ml-auto text-[11px] text-white/40">
                {overview.deals_missing_esiid} accounts pending ESI ID link (commissions attach automatically once linked)
              </span>
            )}
          </div>
        )}
      </div>

      {err && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">{err}</div>}
      {!isAgent && !previewAgent && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          Select an agent above to preview their portal.
        </div>
      )}

      {/* Earnings — what my book generates vs what providers actually paid */}
      {earnings && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#0F1D5E]">My Book&apos;s Earnings</h2>
              <p className="text-xs text-slate-400">
                Gross commission the providers pay on my accounts — payouts to me are under Commission Payouts below
              </p>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-lg font-bold text-[#0F1D5E] tabular-nums">{fmt(earnings.expected_monthly)}</p>
                <p className="text-[11px] text-slate-400">expected / month (active book)</p>
              </div>
              {earnings.open_issue_cases > 0 && (
                <div>
                  <p className="text-lg font-bold text-red-600 tabular-nums">{fmt(earnings.open_issue_dollars)}</p>
                  <p className="text-[11px] text-slate-400">{earnings.open_issue_cases} open money issues</p>
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Statement Month</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Received</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Accounts Paid</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {(earnings.months ?? []).map((m: any) => {
                  const pct = m.accounts_active ? Math.round(m.accounts_paid / m.accounts_active * 100) : 0;
                  return (
                    <tr key={m.month} className="border-t border-slate-100">
                      <td className="px-5 py-2.5 font-semibold text-[#0F1D5E]">{m.month}</td>
                      <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-emerald-600">{fmt(m.received)}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-slate-600">
                        {m.accounts_paid} / {m.accounts_active}
                      </td>
                      <td className="px-5 py-2.5 w-48">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 tabular-nums w-9">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {loading && <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">Loading…</div>}

      {!loading && overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Commission history */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-[#0F1D5E]">My Commissions</h2>
              <p className="text-xs text-slate-400 mt-0.5">Calculated from dollars the providers actually paid on your accounts</p>
            </div>
            {comms.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">No commission records yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {comms.map(c => (
                  <div key={c.id}>
                    <button onClick={() => toggleBreakdown(c.id)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 text-left">
                      <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${expandedComm === c.id ? "rotate-90" : ""}`} />
                      <span className="font-semibold text-[#0F1D5E] w-32">{MONTHS[c.month - 1]} {c.year}</span>
                      <span className="text-xs text-slate-400">{c.total_deals} paid deals</span>
                      {c.summary?.gross_received != null && (
                        <span className="text-xs text-slate-400 hidden sm:inline">· gross {fmt(c.summary.gross_received)}</span>
                      )}
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[c.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {c.status.replace("_", " ")}
                      </span>
                      <span className="font-bold text-emerald-600 tabular-nums w-24 text-right">{fmt(c.total_commission)}</span>
                    </button>
                    {expandedComm === c.id && (
                      <div className="bg-[#F8FAFF] px-6 py-3 border-t border-slate-100">
                        {!breakdown[c.id] ? (
                          <p className="text-xs text-slate-400 py-2">Loading…</p>
                        ) : (
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {(breakdown[c.id].deals ?? []).map((d: any) => (
                              <div key={d.esiid} className="flex items-center gap-2 text-xs py-1">
                                <span className="font-medium text-slate-700 truncate w-36">{d.customer || d.esiid}</span>
                                {d.first_payment && <span className="px-1.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">NEW</span>}
                                <span className="text-slate-400 truncate flex-1">{d.excluded ? `excluded — ${d.plan_type}` : d.applied}</span>
                                <span className="font-semibold text-emerald-600 tabular-nums">{fmt(d.commission)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-[#0F1D5E]">Account Alerts</h2>
              <p className="text-xs text-slate-400 mt-0.5">Your customers flagged by the latest statements — act fast to save them</p>
            </div>
            {alerts.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">All clear — no issues on your accounts.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {alerts.map((a, i) => {
                  const meta = ALERT_META[a.type] ?? ALERT_META.unexpected;
                  const Icon = meta.icon;
                  return (
                    <div key={i} className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.badge}`}>
                          <Icon className="w-3 h-3" />{meta.label}
                        </span>
                        <span className="text-xs text-slate-400">{a.provider} · {a.month}</span>
                        <span className="ml-auto font-mono text-[10px] text-slate-300">{a.esiid}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{a.explanation}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Renewals due */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-[#0F1D5E]">Renewals Coming Up</h2>
              <p className="text-xs text-slate-400 mt-0.5">Every renewal you close keeps your residuals compounding</p>
            </div>
            {renewals.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">No contracts ending in the selected window.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                {renewals.slice(0, 50).map((r: any) => (
                  <div key={`${r.source}-${r.deal_id}`} className="px-5 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-700 truncate">{r.full_name || "—"}</p>
                      <p className="text-xs text-slate-400">{r.provider} · ends {r.end_date}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      (r.days_left ?? 99) <= 30 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {r.days_left != null ? `${r.days_left}d` : "—"}
                    </span>
                    {r.phone && <a href={`tel:${r.phone}`} className="text-xs text-blue-600 font-semibold hover:underline">Call</a>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Book */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#0F1D5E]">My Book ({activeDeals.length} active)</h2>
                <p className="text-xs text-slate-400 mt-0.5">✓ = commission received on that month's statement</p>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="Search…"
                  className="border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20" />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[360px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Customer</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Provider</th>
                    {months.map(m => (
                      <th key={m} className="px-2 py-2 text-center text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{m.slice(5)}/{m.slice(2, 4)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shownDeals.slice(0, 300).map((d: any, i: number) => (
                    <tr key={i} className={`border-t border-slate-100 ${!d.active ? "opacity-40" : ""}`}>
                      <td className="px-4 py-2">
                        <span className="font-medium text-slate-700">{d.customer || "—"}</span>
                        {!d.esiid && <FileWarning className="w-3 h-3 text-amber-400 inline ml-1.5" aria-label="No ESI ID linked yet" />}
                        {d.provider_status === "Going Final" && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">GOING FINAL</span>
                        )}
                        {d.provider_status === "Inactive" && d.active && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">PROVIDER: INACTIVE</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-500 text-xs">{d.provider}</td>
                      {months.map(m => (
                        <td key={m} className="px-2 py-2 text-center">
                          {d.paid_by_month?.[m]
                            ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 inline" />
                            : <span className="text-slate-200">·</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
