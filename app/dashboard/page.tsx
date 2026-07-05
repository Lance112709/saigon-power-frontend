"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  UserPlus, Zap, DollarSign, AlertTriangle, TrendingUp,
  ArrowUpRight, FileText, Clock, Activity, Users, Search, X,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function fmt$(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(+y, +mo - 1).toLocaleDateString("en-US", { month: "short" });
}

// ── Stat card with gradient bg ─────────────────────────────────────────────────
function StatCard({ icon, gradient, label, value, sub, onClick }: {
  icon: React.ReactNode; gradient: string; label: string;
  value: string; sub?: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={`relative rounded-xl p-4 overflow-hidden group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${gradient} ${onClick ? "cursor-pointer" : ""}`}>
      <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-black text-white tracking-tight leading-none">{value}</p>
          <p className="text-xs font-semibold text-white/80 mt-0.5 truncate">{label}</p>
          {sub && <p className="text-[11px] text-white/50 mt-0.5 truncate">{sub}</p>}
        </div>
        {onClick && <ArrowUpRight className="w-3.5 h-3.5 text-white/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
    </div>
  );
}

// ── Dark section card ──────────────────────────────────────────────────────────
function Card({ title, action, actionHref, accent, children }: {
  title: string; action?: string; actionHref?: string;
  accent?: string; children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className={`px-5 py-3.5 flex items-center justify-between border-b border-slate-100 ${accent ?? "bg-white"}`}>
        <div className="flex items-center gap-2">
          {accent && <div className="w-1.5 h-5 rounded-full bg-current opacity-40" />}
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        </div>
        {action && actionHref && (
          <button onClick={() => router.push(actionHref)}
            className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:text-emerald-700 transition-colors">
            {action} <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Custom tooltip for chart ───────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-emerald-400">{fmt$(payload[0].value)}</p>
    </div>
  );
}

// ── Global Search ──────────────────────────────────────────────────────────────
function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<any[]>([]);
  const [open, setOpen]         = useState(false);
  const [focused, setFocused]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [cursor, setCursor]     = useState(-1);
  const [dropPos, setDropPos]   = useState({ top: 0, left: 0, width: 0 });
  const inputRef  = useRef<HTMLInputElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const data = await api.globalSearch(q.trim());
      setResults(data || []);
      setOpen(true);
      setCursor(-1);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(v), 300);
  };

  const go = (url: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(url);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, -1)); }
    if (e.key === "Enter" && cursor >= 0) go(results[cursor].url);
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 8, left: r.left, width: r.width });
    }
  }, [open]);

  const leads    = results.filter(r => r.type === "lead");
  const customers = results.filter(r => r.type === "customer");

  return (
    <div ref={wrapRef} className="relative w-full max-w-2xl mx-auto">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${(open || focused) ? "bg-white border-slate-200 shadow-2xl" : "bg-white/10 border-white/20 hover:bg-white/15"}`}>
        {loading
          ? <div className={`w-4 h-4 border-2 rounded-full animate-spin shrink-0 ${(open || focused) ? "border-slate-300 border-t-slate-600" : "border-white/40 border-t-white/80"}`} />
          : <Search className={`w-4 h-4 shrink-0 ${(open || focused) ? "text-slate-400" : "text-white/50"}`} />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => { setFocused(true); if (results.length) setOpen(true); }}
          onBlur={() => setFocused(false)}
          placeholder="Search by name, phone, ESI ID, address…"
          className={`flex-1 bg-transparent text-sm outline-none ${(open || focused) ? "text-slate-800 placeholder:text-slate-400" : "text-white placeholder:text-white/40"}`}
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }} className={(open || focused) ? "text-slate-400 hover:text-slate-600" : "text-white/40 hover:text-white/70"}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{ position: "fixed", top: dropPos.top, left: dropPos.left, width: dropPos.width }} className="bg-white rounded-2xl shadow-2xl border border-slate-100 z-[9999] max-h-[420px] overflow-y-auto">
          {[{ label: "Pipeline Leads", items: leads, color: "text-violet-600", badge: "bg-violet-50 text-violet-600" },
            { label: "Imported Customers", items: customers, color: "text-blue-600", badge: "bg-blue-50 text-blue-700" }]
            .filter(g => g.items.length > 0)
            .map(group => (
              <div key={group.label}>
                <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{group.label}</p>
                {group.items.map(r => {
                  const idx = results.indexOf(r);
                  return (
                    <button key={r.id} onMouseDown={() => go(r.url)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${cursor === idx ? "bg-slate-50" : ""}`}>
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-slate-500">
                          {(r.name || "?").slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">{r.name}</span>
                          {r.status && r.status !== "Imported" && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">{r.status}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {r.sub && <span className="text-xs text-slate-400 truncate">{r.sub}</span>}
                          {r.sub && r.detail && <span className="text-slate-200">·</span>}
                          {r.detail && <span className="text-xs text-slate-400 truncate">{r.detail}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          }
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && !loading && (
        <div style={{ position: "fixed", top: dropPos.top, left: dropPos.left, width: dropPos.width }} className="bg-white rounded-2xl shadow-2xl border border-slate-100 px-4 py-6 text-center z-[9999]">
          <p className="text-sm text-slate-400">No accounts found for <span className="font-semibold text-slate-600">"{query}"</span></p>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const showFinance = user?.role === "admin";
  const [stats, setStats]     = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.getLeadsStats(),
      api.getCommissionHistory(),
      api.getDashboard(),
      api.getExpiringDeals(),
    ]).then(([s, h, o, e]) => {
      setStats(s.status === "fulfilled" ? s.value : null);
      setHistory(h.status === "fulfilled" ? (h.value ?? []) : []);
      setOverview(o.status === "fulfilled" ? o.value : null);
      setExpiring(e.status === "fulfilled" ? (e.value ?? []) : []);
    }).finally(() => setLoading(false));
  }, []);

  // Prefer REAL received dollars (from reconciliation) over signup-month estimates
  const received: any[] = stats?.finance?.received_history ?? [];
  const chartData = received.length > 0
    ? received.map((r: any) => ({ month: fmtMonth(r.month), amount: r.amount }))
    : history.map(r => ({ month: fmtMonth(r.month), amount: r.amount }));
  const chartIsReal = received.length > 0;

  if (loading) return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-400">Loading dashboard...</p>
      </div>
    </div>
  );

  const pipeline  = stats?.pipeline  ?? {};
  const portfolio = stats?.portfolio ?? {};
  const recentLeads: any[] = stats?.recent_leads ?? [];

  return (
    <div className="min-h-screen bg-[#F4F6FA]">

      {/* ── Hero banner ── */}
      <div className="relative bg-gradient-to-br from-[#0A1440] via-[#0F1D5E] to-[#1e2f8a] overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-48 bg-emerald-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-20 w-64 h-32 bg-blue-400/15 rounded-full blur-3xl translate-y-1/2" />
        <div className="absolute top-10 left-1/2 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl" />

        <div className="relative px-6 pt-8 pb-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-widest">Live</p>
              </div>
              <h1 className="text-3xl font-black text-white">{greeting()}, {user?.name?.split(" ")[0]} 👋</h1>
              <p className="text-sm text-slate-500 mt-1">{todayLabel()}</p>
            </div>
            {user?.role === "admin" && (
              <button onClick={() => router.push("/reconciliation")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors">
                <FileText className="w-4 h-4" /> Reports
              </button>
            )}
          </div>

          {/* Global search */}
          <div className="mt-5">
            <GlobalSearch />
          </div>

          {/* Mini metrics row inside banner */}
          <div className="flex items-center gap-6 mt-5 pt-5 border-t border-white/[0.06]">
            {[
              { label: "This Week's Leads",  value: stats?.leads_this_week ?? 0, color: "text-blue-400" },
              { label: "Pipeline — Leads",   value: pipeline.lead ?? 0,           color: "text-violet-400" },
              { label: "Converted",          value: pipeline.converted ?? 0,       color: "text-emerald-400" },
              ...(showFinance ? [{ label: "At-risk ≤30d", value: portfolio.at_risk ?? 0, color: "text-amber-400" }] : []),
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-6 space-y-6">

        {/* Stat cards */}
        <div className={`grid gap-4 -mt-5 ${showFinance ? "grid-cols-4" : "grid-cols-3"}`}>
          <StatCard
            gradient="bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25"
            icon={<UserPlus className="w-5 h-5 text-white" />}
            label="New Leads Today"
            value={String(stats?.leads_today ?? 0)}
            sub={`${stats?.leads_this_week ?? 0} this week`}
            onClick={() => router.push("/crm/leads")}
          />
          <StatCard
            gradient="bg-gradient-to-br from-emerald-600 to-green-500 shadow-lg shadow-emerald-500/25"
            icon={<Zap className="w-5 h-5 text-white" />}
            label="Active Deals"
            value={(stats?.active_deals ?? 0).toLocaleString()}
            sub={`${(stats?.active_deals_pipeline ?? 0).toLocaleString()} pipeline · ${(stats?.active_deals_imported ?? 0).toLocaleString()} imported`}
            onClick={() => router.push("/crm/deals")}
          />
          {showFinance && (
            <StatCard
              gradient="bg-gradient-to-br from-violet-600 to-purple-500 shadow-lg shadow-violet-500/25"
              icon={<DollarSign className="w-5 h-5 text-white" />}
              label={stats?.finance?.received_month
                ? `Received — ${fmtMonth(stats.finance.received_month)}`
                : "Commission Received"}
              value={fmt$(stats?.finance?.received_last_month ?? 0)}
              sub={stats?.finance && stats.finance.providers_reported < stats.finance.total_providers
                ? `${stats.finance.providers_reported} of ${stats.finance.total_providers} providers reported so far`
                : "verified from provider statements"}
              onClick={() => router.push("/reconciliation")}
            />
          )}
          <StatCard
            gradient="bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25"
            icon={<AlertTriangle className="w-5 h-5 text-white" />}
            label="Expiring Soon"
            value={String(stats?.expiring_soon ?? 0)}
            sub="Active deals within 30 days"
            onClick={() => router.push("/call-list")}
          />
        </div>

        {/* Expiring deals + Chart */}
        <div className="grid grid-cols-5 gap-4">
          <div className={showFinance ? "col-span-2" : "col-span-5"}>
            <Card title="Expiring Within 60 Days" action="Call list" actionHref="/call-list">
              <div className="divide-y divide-slate-50">
                {expiring.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                      <Activity className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">All clear!</p>
                    <p className="text-xs text-slate-400 mt-0.5">No deals expiring in 30 days.</p>
                  </div>
                ) : expiring.slice(0, 6).map(d => {
                  const urgent = d.days_left <= 7;
                  return (
                    <div key={d.deal_id}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push(d.customer_id ? `/crm/customers/${d.customer_id}` : `/crm/leads/${d.lead_id}`)}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${urgent ? "bg-red-500" : "bg-amber-400"}`} />
                          <p className="text-sm font-semibold text-slate-800 truncate">{d.full_name}</p>
                          {d.source === "imported" && <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-500">Imported</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 pl-3.5">{d.supplier || "—"}{d.plan_name ? ` · ${d.plan_name}` : ""}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          urgent ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                        }`}>
                          {d.days_left === 0 ? "Today" : `${d.days_left}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {showFinance && (
            <div className="col-span-3">
              <div className="bg-[#0d1117] rounded-2xl border border-white/[0.06] overflow-hidden h-full">
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      {chartIsReal ? "Commission Received" : "Est. Commission History"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {chartIsReal ? "Verified provider payments · last 6 months" : "Last 6 months"}
                    </p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="p-5">
                  {chartData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
                      No data yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={210}>
                      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false}
                          tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2.5}
                          fill="url(#emeraldGrad)" dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: "#34d399" }} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Portfolio strip */}
        {showFinance && (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Active Contracts",        value: portfolio.active_contracts ?? 0,             fmt: (v: number) => v.toLocaleString(), icon: <Users className="w-4 h-4" />,        color: "text-blue-600",    bg: "bg-blue-50" },
              { label: "Received Last Month",     value: stats?.finance?.received_last_month ?? 0,    fmt: fmt$,                              icon: <DollarSign className="w-4 h-4" />,   color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Pipeline Est. / mo",      value: portfolio.commission_mo ?? 0,                fmt: fmt$,                              icon: <TrendingUp className="w-4 h-4" />,   color: "text-violet-600",  bg: "bg-violet-50" },
              { label: "At-risk ≤ 30 days",       value: portfolio.at_risk ?? 0,                      fmt: (v: number) => String(v),          icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-600",   bg: "bg-amber-50" },
            ].map(({ label, value, fmt, icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0`}>
                  {icon}
                </div>
                <div>
                  <p className={`text-2xl font-black ${color}`}>{fmt(value)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Leads */}
        <Card title={`Recent Leads · ${recentLeads.length} shown`} action="View all" actionHref="/crm/leads">
          {recentLeads.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-slate-500">No leads yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Name", "Contact", "Address", "Service", "Status", "Date"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((l, i) => (
                    <tr key={l.id} onClick={() => router.push(`/crm/leads/${l.id}`)}
                      className={`border-b border-slate-50 last:border-0 hover:bg-blue-50/40 cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                      <td className="px-5 py-3.5 font-bold text-slate-800">{l.full_name}</td>
                      <td className="px-5 py-3.5">
                        <p className="text-slate-600 text-xs font-medium">{l.phone}</p>
                        {l.email && <p className="text-xs text-slate-400 mt-0.5">{l.email}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{l.address}, {l.city}</td>
                      <td className="px-5 py-3.5">
                        {l.product_type ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                            {l.product_type}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          l.status === "converted" ? "bg-emerald-50 text-emerald-700" :
                          l.deal_status === "Active" ? "bg-emerald-50 text-emerald-700" :
                          "bg-blue-50 text-blue-700"
                        }`}>
                          {l.status === "converted" ? "Converted" : l.deal_status ?? "Lead"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
