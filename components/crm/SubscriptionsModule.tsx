"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Search, Users, CheckCircle, XCircle, TrendingUp,
  Download, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  CONTACTED: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-600",
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "NEW").toUpperCase();
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[s] || "bg-slate-100 text-slate-500"}`}>
      {s}
    </span>
  );
}

function StatCard({ title, value, sub, icon: Icon, valueColor = "text-[#0F1D5E]", onClick }: {
  title: string; value: string; sub?: string; icon: any; valueColor?: string; onClick?: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4 ${onClick ? "cursor-pointer hover:border-[#0F1D5E]/30 hover:shadow-md transition-all" : ""}`}
      onClick={onClick}
    >
      <div className="w-11 h-11 rounded-xl bg-[#EEF1FA] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#0F1D5E]" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className={`text-3xl font-bold mt-0.5 ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

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

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export interface SubscriptionsModuleProps {
  /** lead_source value that scopes this tab (e.g. "SaigonLLC Website") */
  leadSource: string;
  title: string;
  subtitle: string;
  /** route prefix for detail pages, e.g. "/crm/saigon" */
  basePath: string;
  /** localStorage badge key prefix, e.g. "saigon" (matches Sidebar) */
  badgeKeyPrefix: string;
  icon: any;
  planOptions: { value: string; label: string }[];
  /** show the Signup / Bill Analysis filter + column (giadienre only) */
  showFormType?: boolean;
  csvPrefix: string;
  emptyText: string;
}

export default function SubscriptionsModule({
  leadSource, title, subtitle, basePath, badgeKeyPrefix, icon: TitleIcon,
  planOptions, showFormType = false, csvPrefix, emptyText,
}: SubscriptionsModuleProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [subs, setSubs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [formType, setFormType] = useState("");
  const [plan, setPlan] = useState("");
  const [agent, setAgent] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  // visiting this page clears the sidebar badge
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`${badgeKeyPrefix}_last_seen_${user.id || user.name}`, new Date().toISOString());
  }, [user, badgeKeyPrefix]);

  useEffect(() => {
    api.getGdrStats({ lead_source: leadSource }).then(setStats).catch(() => {});
    api.getCrmAgents().then((a: any) => setAgents(Array.isArray(a) ? a : [])).catch(() => {});
  }, [leadSource]);

  const buildFilterParams = useCallback(() => {
    const params: Record<string, string> = { lead_source: leadSource };
    if (status) params.status = status;
    if (formType) params.form_type = formType;
    if (plan) params.plan = plan;
    if (agent) params.assigned_agent = agent;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [leadSource, status, formType, plan, agent, dateFrom, dateTo]);

  const loadSubs = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        ...buildFilterParams(),
        sort_by: sortBy, sort_dir: sortDir,
        limit: String(LIMIT), offset: String(off),
      };
      if (search) params.search = search;
      const data = await api.getGdrSubscriptions(params);
      const rows = data?.subscriptions || [];
      setTotal(data?.total || 0);
      setSubs(prev => {
        if (off === 0) return rows;
        const seen = new Set(prev.map((s: any) => s.id));
        return [...prev, ...rows.filter((s: any) => !seen.has(s.id))];
      });
      setOffset(off);
    } catch {}
    setLoading(false);
  }, [search, sortBy, sortDir, buildFilterParams]);

  useEffect(() => { loadSubs(0); }, [loadSubs]);

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir(col === "full_name" ? "asc" : "desc"); }
  };

  const SortHeader = ({ col, children }: { col: string; children: string }) => (
    <th
      className="text-left px-5 py-3 font-semibold text-slate-500 cursor-pointer select-none whitespace-nowrap"
      onClick={() => toggleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortBy === col
          ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
          : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
      </span>
    </th>
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const qs = new URLSearchParams(buildFilterParams()).toString();
      await downloadFile(
        `/api/v1/giadienre/subscriptions/export${qs ? `?${qs}` : ""}`,
        `${csvPrefix}_subscriptions_${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch {}
    setExporting(false);
  };

  const clearFilters = () => {
    setSearch(""); setStatus(""); setFormType(""); setPlan(""); setAgent("");
    setDateFrom(""); setDateTo("");
  };

  const planLabel = (s: any) => {
    const opt = planOptions.find(p => p.value === s.plan_id);
    return opt?.label || s.plan_name || s.plan_id;
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E] flex items-center gap-2.5">
            <TitleIcon className="w-6 h-6" /> {title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-50 transition-colors"
        >
          <Download className="w-4 h-4" /> {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Subscribers" value={String(stats?.total ?? "—")}
          sub={stats ? `${stats.today} today · ${stats.this_week} this week · ${stats.this_month} this month` : undefined}
          icon={Users} onClick={() => clearFilters()} />
        <StatCard title="Active" value={String(stats?.active ?? "—")}
          sub="status = ACTIVE" icon={CheckCircle} valueColor="text-emerald-600"
          onClick={() => { clearFilters(); setStatus("ACTIVE"); }} />
        <StatCard title="Cancelled" value={String(stats?.cancelled ?? "—")}
          sub="status = CANCELLED" icon={XCircle} valueColor="text-red-500"
          onClick={() => { clearFilters(); setStatus("CANCELLED"); }} />
        <StatCard title="Conversion Rate" value={stats ? `${stats.conversion_rate}%` : "—"}
          sub="active / total subscribers" icon={TrendingUp} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, phone, address…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F1D5E]/40"
            />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white">
            <option value="">All statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="ACTIVE">Active</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {showFormType && (
            <select value={formType} onChange={e => setFormType(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white">
              <option value="">All types</option>
              <option value="signup">Signup</option>
              <option value="bill_analysis">Bill Analysis</option>
            </select>
          )}
          <select value={plan} onChange={e => setPlan(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white">
            <option value="">All plans</option>
            {planOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select value={agent} onChange={e => setAgent(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white">
            <option value="">All agents</option>
            {agents.map((a: any) => {
              const name = typeof a === "string" ? a : a?.name;
              return name ? <option key={name} value={name}>{name}</option> : null;
            })}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600" />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600" />
          {(search || status || formType || plan || agent || dateFrom || dateTo) && (
            <button onClick={clearFilters} className="text-sm text-slate-400 hover:text-slate-600 underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <SortHeader col="full_name">Name</SortHeader>
                <th className="text-left px-5 py-3 font-semibold text-slate-500">Contact</th>
                <SortHeader col="plan_id">Plan</SortHeader>
                {showFormType && <th className="text-left px-5 py-3 font-semibold text-slate-500">Type</th>}
                <SortHeader col="status">Status</SortHeader>
                <th className="text-left px-5 py-3 font-semibold text-slate-500">Agent</th>
                <SortHeader col="subscribed_at">Subscribed</SortHeader>
                <SortHeader col="updated_at">Updated</SortHeader>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {subs.map(s => (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer"
                  onClick={() => router.push(`${basePath}/${s.id}`)}
                >
                  <td className="px-5 py-3.5 font-semibold text-[#0F1D5E] whitespace-nowrap">{s.full_name}</td>
                  <td className="px-5 py-3.5 text-slate-500">
                    <div className="whitespace-nowrap">{s.phone || "—"}</div>
                    <div className="text-xs text-slate-400 max-w-[200px] truncate">{s.email || ""}</div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {s.plan_id
                      ? <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EEF1FA] text-[#0F1D5E]">
                          {planLabel(s)}
                          {s.billing_cycle ? ` · ${s.billing_cycle}` : ""}
                        </span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  {showFormType && (
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        s.form_type === "signup" ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {s.form_type === "signup" ? "Signup" : "Bill Analysis"}
                      </span>
                    </td>
                  )}
                  <td className="px-5 py-3.5 whitespace-nowrap"><StatusBadge status={s.status} /></td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{s.assigned_agent || "—"}</td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{fmtDate(s.subscribed_at || s.created_at)}</td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{fmtDate(s.updated_at)}</td>
                  <td className="px-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                </tr>
              ))}
              {!loading && subs.length === 0 && (
                <tr>
                  <td colSpan={showFormType ? 9 : 8} className="px-5 py-12 text-center text-slate-400">
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {subs.length < total && (
          <div className="p-4 border-t border-slate-100 text-center">
            <button
              onClick={() => loadSubs(offset + LIMIT)}
              disabled={loading}
              className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Loading…" : `Load more (${subs.length} of ${total})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
