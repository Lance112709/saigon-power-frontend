"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
  Bot, RefreshCw, AlertTriangle, CheckCircle2,
  TrendingUp, Users, FileText, Zap, BarChart3, ChevronRight,
  Trophy, DollarSign, Clock, ShieldAlert,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Alert {
  id: string; type: string; entity_type: string; entity_id: string;
  message: string; severity: "high" | "medium" | "low";
  status: string; metadata: Record<string, any>; created_at: string;
}
interface Recommendation { icon: string; priority: string; text: string; }
interface Dashboard {
  summary: string; metrics: any;
  alerts: { critical: Alert[]; warnings: Alert[]; info: Alert[] };
  recommendations: Recommendation[]; daily_report: any;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SEVERITY = {
  high:   { bg: "bg-red-50",   border: "border-red-200",   text: "text-red-700",   badge: "bg-red-100 text-red-700"   },
  medium: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
  low:    { bg: "bg-blue-50",  border: "border-blue-200",  text: "text-blue-700",  badge: "bg-blue-100 text-blue-700"  },
};
const AGENT_COLORS = [
  "bg-[#0F1D5E]","bg-green-600","bg-purple-600","bg-amber-500",
  "bg-rose-500","bg-cyan-600","bg-indigo-500","bg-orange-500",
];
const AGENT_HEX = ["#0F1D5E","#16a34a","#9333ea","#f59e0b","#f43f5e","#0891b2","#6366f1","#f97316"];

// ── Page ───────────────────────────────────────────────────────────────────────

type Tab = "overview" | "leaderboard" | "pipeline" | "performance" | "alerts" | "reports";

export default function AiOperationsPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [dashboard,    setDashboard]    = useState<Dashboard | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [scanning,     setScanning]     = useState(false);
  const [resolving,    setResolving]    = useState<string | null>(null);
  const [activeTab,    setActiveTab]    = useState<Tab>("overview");

  const [leaderboard,  setLeaderboard]  = useState<any[]>([]);
  const [lbLoading,    setLbLoading]    = useState(false);

  const [pipeline,     setPipeline]     = useState<any>(null);
  const [plLoading,    setPlLoading]    = useState(false);

  const [dealsData,    setDealsData]    = useState<any>(null);
  const [dealsMode,    setDealsMode]    = useState<"month"|"day">("month");
  const [dealsLoading, setDealsLoading] = useState(false);

  const [reports,      setReports]      = useState<any[]>([]);

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try { setDashboard(await api.getAiDashboard()); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try { setLeaderboard(await api.getAgentLeaderboard()); } finally { setLbLoading(false); }
  }, []);

  const loadPipeline = useCallback(async () => {
    setPlLoading(true);
    try { setPipeline(await api.getPipeline()); } finally { setPlLoading(false); }
  }, []);

  const loadDeals = useCallback(async (mode: "month"|"day") => {
    setDealsLoading(true);
    try { setDealsData(await api.getDealsByAgent(mode, 6)); } finally { setDealsLoading(false); }
  }, []);

  const loadReports = useCallback(async () => {
    setReports(await api.getAiReports());
  }, []);

  const handleTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "leaderboard" && leaderboard.length === 0) loadLeaderboard();
    if (tab === "pipeline"    && !pipeline)                loadPipeline();
    if (tab === "performance" && !dealsData)               loadDeals(dealsMode);
    if (tab === "reports"     && reports.length === 0)     loadReports();
  };

  const handleScan = async () => {
    setScanning(true);
    try { await api.runAiScan(); await loadDashboard(); } finally { setScanning(false); }
  };

  const handleResolve = async (id: string) => {
    setResolving(id);
    try { await api.resolveAiAlert(id); await loadDashboard(); } finally { setResolving(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-gray-500">
        <Bot className="w-5 h-5 animate-pulse" /><span>Loading AI Operations...</span>
      </div>
    </div>
  );

  const m = dashboard?.metrics;
  const totalAlerts = (dashboard?.alerts.critical.length||0) + (dashboard?.alerts.warnings.length||0) + (dashboard?.alerts.info.length||0);

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview",     label: "Overview"          },
    { key: "leaderboard",  label: "Agent Leaderboard" },
    { key: "pipeline",     label: "Pipeline & Revenue"},
    { key: "performance",  label: "Deals by Agent"    },
    { key: "alerts",       label: `Alerts (${totalAlerts})` },
    { key: "reports",      label: "Reports"           },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0F1D5E] rounded-xl">
            <Bot className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Operations Center</h1>
            <p className="text-sm text-gray-500">Automated data auditing & business intelligence</p>
          </div>
        </div>
        <button onClick={handleScan} disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F1D5E] text-white rounded-xl text-sm font-medium hover:bg-[#1a2d7c] transition disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Scanning..." : "Run Scan"}
        </button>
      </div>

      {/* AI Summary banner */}
      {dashboard?.summary && (
        <div className="bg-gradient-to-r from-[#0F1D5E] to-[#1a2d7c] rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <Bot className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-400 mb-1">AI SUMMARY</p>
              <p className="text-sm leading-relaxed text-blue-100">{dashboard.summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI strip */}
      {m && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users}         label="Total Leads"     value={m.pipeline.total_leads}                          sub={`+${m.today.new_leads} today`}            color="blue"   />
          <StatCard icon={FileText}      label="Active Deals"    value={m.pipeline.active_deals}                         sub={`+${m.today.new_deals} today`}            color="green"  />
          <StatCard icon={ShieldAlert}   label="Open Alerts"     value={m.alerts.total_open}                             sub={`${m.alerts.critical} critical`}          color={m.alerts.critical > 0 ? "red" : "gray"} />
          <StatCard icon={TrendingUp}    label="MTD Commission"  value={`$${(m.mtd.est_commission||0).toLocaleString()}`} sub={`${m.mtd.deals} deals this month`}        color="purple" />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => handleTab(t.key)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === t.key ? "border-b-2 border-[#0F1D5E] text-[#0F1D5E]" : "text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "overview" && <OverviewTab m={m} dashboard={dashboard} />}
          {activeTab === "leaderboard" && <LeaderboardTab data={leaderboard} loading={lbLoading} onRefresh={loadLeaderboard} />}
          {activeTab === "pipeline" && <PipelineTab data={pipeline} loading={plLoading} onRefresh={loadPipeline} />}
          {activeTab === "performance" && (
            <DealsByAgent data={dealsData} mode={dealsMode} loading={dealsLoading}
              onModeChange={m => { setDealsMode(m); loadDeals(m); }} />
          )}
          {activeTab === "alerts" && (
            <AlertsList critical={dashboard?.alerts.critical||[]} warnings={dashboard?.alerts.warnings||[]}
              info={dashboard?.alerts.info||[]} onResolve={handleResolve} resolving={resolving} />
          )}
          {activeTab === "reports" && (
            <ReportsList reports={reports}
              onTriggerDaily={async () => { await api.triggerDailyReport(); loadReports(); }}
              onTriggerMonthly={async () => { await api.triggerMonthlyReport(); loadReports(); }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────

function OverviewTab({ m, dashboard }: { m: any; dashboard: Dashboard | null }) {
  return (
    <div className="space-y-5">
      {m?.data_quality && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Data Quality</p>
          <div className="grid grid-cols-3 gap-3">
            <QualityCard label="Missing Rate"     count={m.data_quality.missing_rate}   severity="high"   />
            <QualityCard label="Missing ESIID"    count={m.data_quality.missing_esiid}  severity="high"   />
            <QualityCard label="Unassigned Agent" count={m.data_quality.missing_agent}  severity="medium" />
          </div>
        </div>
      )}
      {m?.renewals && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Renewal Pipeline
          </p>
          <div className="flex gap-3 flex-wrap">
            <RenewalBadge days={30} count={m.renewals["30_days"]} color="red"   />
            <RenewalBadge days={60} count={m.renewals["60_days"]} color="amber" />
            <RenewalBadge days={90} count={m.renewals["90_days"]} color="blue"  />
          </div>
        </div>
      )}
      {dashboard?.recommendations && dashboard.recommendations.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Recommendations</p>
          <div className="space-y-2">
            {dashboard.recommendations.map((r, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl text-sm ${
                r.priority === "high" ? "bg-red-50" : r.priority === "medium" ? "bg-amber-50" : "bg-gray-50"
              }`}>
                <span className="text-lg leading-none mt-0.5">{r.icon}</span>
                <span className="text-gray-700">{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Leaderboard Tab ────────────────────────────────────────────────────────────

function LeaderboardTab({ data, loading, onRefresh }: { data: any[]; loading: boolean; onRefresh: () => void }) {
  if (loading) return <Spinner text="Loading leaderboard..." />;
  if (!data.length) return (
    <div className="text-center py-8">
      <p className="text-sm text-gray-400 mb-3">No agent data yet.</p>
      <button onClick={onRefresh} className="text-sm text-[#0F1D5E] underline">Refresh</button>
    </div>
  );

  const maxDeals = Math.max(...data.map(a => a.active_deals), 1);

  return (
    <div className="space-y-5">
      {/* Top 3 podium */}
      {data.length >= 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.slice(0, 3).map((a, i) => (
            <div key={a.name} className={`rounded-2xl p-4 border ${
              i === 0 ? "bg-amber-50 border-amber-200" : i === 1 ? "bg-gray-50 border-gray-200" : "bg-orange-50 border-orange-200"
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{a.name}</p>
                  <p className="text-xs text-gray-500">#{i + 1} this month</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white rounded-xl p-2">
                  <p className="text-lg font-bold text-[#0F1D5E]">{a.deals_this_month}</p>
                  <p className="text-xs text-gray-400">This month</p>
                </div>
                <div className="bg-white rounded-xl p-2">
                  <p className="text-lg font-bold text-green-600">{a.active_deals}</p>
                  <p className="text-xs text-gray-400">Active</p>
                </div>
                <div className="bg-white rounded-xl p-2">
                  <p className="text-lg font-bold text-purple-600">{a.conversion_rate}%</p>
                  <p className="text-xs text-gray-400">Conv. rate</p>
                </div>
                <div className="bg-white rounded-xl p-2">
                  <p className="text-lg font-bold text-amber-600">${(a.est_monthly_commission||0).toLocaleString(undefined,{maximumFractionDigits:0})}</p>
                  <p className="text-xs text-gray-400">Est. comm.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-center">This Month</th>
              <th className="px-4 py-3 text-center">Active Deals</th>
              <th className="px-4 py-3 text-center">Future</th>
              <th className="px-4 py-3 text-center">Leads Touched</th>
              <th className="px-4 py-3 text-center">Conv. Rate</th>
              <th className="px-4 py-3 text-center">Proposals</th>
              <th className="px-4 py-3 text-right">Est. Monthly Comm.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a, i) => (
              <tr key={a.name} className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                <td className="px-4 py-3 font-bold text-gray-400">#{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${AGENT_COLORS[i % AGENT_COLORS.length]}`} />
                    <span className="font-medium text-gray-800">{a.name}</span>
                  </div>
                  {/* Mini bar */}
                  <div className="mt-1 h-1 bg-gray-100 rounded-full w-24 overflow-hidden">
                    <div className={`h-full ${AGENT_COLORS[i % AGENT_COLORS.length]} rounded-full`}
                      style={{ width: `${Math.round((a.active_deals / maxDeals) * 100)}%` }} />
                  </div>
                </td>
                <td className="px-4 py-3 text-center"><span className="font-bold text-[#0F1D5E]">{a.deals_this_month}</span></td>
                <td className="px-4 py-3 text-center"><span className="font-semibold text-green-600">{a.active_deals}</span></td>
                <td className="px-4 py-3 text-center text-gray-500">{a.future_deals}</td>
                <td className="px-4 py-3 text-center text-gray-600">{a.unique_leads_touched}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    a.conversion_rate >= 50 ? "bg-green-100 text-green-700" :
                    a.conversion_rate >= 25 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                  }`}>{a.conversion_rate}%</span>
                </td>
                <td className="px-4 py-3 text-center text-gray-500">
                  {a.proposals_accepted}/{a.proposals_sent}
                  {a.proposals_sent > 0 && <span className="ml-1 text-xs text-gray-400">({a.proposal_close_rate}%)</span>}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700">
                  ${(a.est_monthly_commission||0).toLocaleString(undefined,{maximumFractionDigits:0})}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Pipeline Tab ───────────────────────────────────────────────────────────────

function PipelineTab({ data, loading, onRefresh }: { data: any; loading: boolean; onRefresh: () => void }) {
  if (loading) return <Spinner text="Loading pipeline data..." />;
  if (!data) return (
    <div className="text-center py-8">
      <p className="text-sm text-gray-400 mb-3">No pipeline data yet.</p>
      <button onClick={onRefresh} className="text-sm text-[#0F1D5E] underline">Load Pipeline</button>
    </div>
  );

  const s = data.summary;

  // Build commission trend chart from commission_by_start
  const trendEntries: [string, any][] = Object.entries(data.commission_by_start || {});
  const maxComm = Math.max(...trendEntries.map(([, v]) => v.commission), 1);

  // Expiry schedule
  const expiryEntries: [string, number][] = Object.entries(data.expiry_by_month || {});
  const maxExpiry = Math.max(...expiryEntries.map(([, v]) => v as number), 1);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <BigStatCard
          icon={DollarSign} color="green"
          label="Monthly Recurring Commission"
          value={`$${(s.active_monthly_commission||0).toLocaleString(undefined,{maximumFractionDigits:0})}`}
          sub={`from ${s.active_deals} active deals`}
        />
        <BigStatCard
          icon={TrendingUp} color="blue"
          label="Pipeline Value (Future Deals)"
          value={`$${(s.pipeline_value||0).toLocaleString(undefined,{maximumFractionDigits:0})}`}
          sub={`${s.future_deals} future deals pending`}
        />
        <BigStatCard
          icon={Clock} color={s.at_risk_count > 0 ? "red" : "gray"}
          label="Revenue at Risk (90 days)"
          value={`$${(s.at_risk_commission||0).toLocaleString(undefined,{maximumFractionDigits:0})}`}
          sub={`${s.at_risk_count} deals expiring soon`}
        />
      </div>

      {/* Commission added trend */}
      {trendEntries.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-green-600" /> Commission Added by Start Month
          </h3>
          <div className="flex items-end gap-2 overflow-x-auto" style={{ minHeight: 120 }}>
            {trendEntries.map(([month, v]) => (
              <div key={month} className="flex flex-col items-center gap-1 flex-1 min-w-[48px]">
                <span className="text-xs font-semibold text-gray-600">
                  {v.commission > 0 ? `$${Math.round(v.commission).toLocaleString()}` : ""}
                </span>
                <div className="w-full bg-green-600 rounded-t-md"
                  style={{ height: `${Math.max((v.commission / maxComm) * 100, v.commission > 0 ? 6 : 0)}px` }} />
                <span className="text-xs text-gray-400">{month.slice(0,7)}</span>
                <span className="text-xs text-gray-300">{v.deals}d</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission expiry schedule */}
      {expiryEntries.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Commission Expiring by Month
          </h3>
          <div className="flex items-end gap-2 overflow-x-auto" style={{ minHeight: 120 }}>
            {expiryEntries.map(([month, amt]) => (
              <div key={month} className="flex flex-col items-center gap-1 flex-1 min-w-[48px]">
                <span className="text-xs font-semibold text-amber-700">
                  {(amt as number) > 0 ? `$${Math.round(amt as number).toLocaleString()}` : ""}
                </span>
                <div className="w-full bg-amber-400 rounded-t-md"
                  style={{ height: `${Math.max(((amt as number) / maxExpiry) * 100, (amt as number) > 0 ? 6 : 0)}px` }} />
                <span className="text-xs text-gray-400">{month}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission by agent */}
      {Object.keys(data.by_agent||{}).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Commission by Agent</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-4 py-2 text-left">Agent</th>
                <th className="px-4 py-2 text-center">Active Deals</th>
                <th className="px-4 py-2 text-center">Future Deals</th>
                <th className="px-4 py-2 text-right">Monthly Commission</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.by_agent).map(([name, v]: [string, any], i) => (
                <tr key={name} className={`border-t border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                  <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${AGENT_COLORS[i % AGENT_COLORS.length]}`} />{name}
                  </td>
                  <td className="px-4 py-3 text-center text-green-600 font-semibold">{v.active}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{v.future}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    ${(v.commission||0).toLocaleString(undefined,{maximumFractionDigits:0})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* At-risk table */}
      {data.at_risk && data.at_risk.length > 0 && (
        <div className="bg-white border border-red-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-red-100 bg-red-50">
            <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Contracts Expiring Within 90 Days
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="px-4 py-2 text-left">Supplier</th>
                <th className="px-4 py-2 text-left">Agent</th>
                <th className="px-4 py-2 text-center">Expires</th>
                <th className="px-4 py-2 text-center">Days Left</th>
                <th className="px-4 py-2 text-right">Monthly Comm.</th>
              </tr>
            </thead>
            <tbody>
              {data.at_risk.map((r: any, i: number) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.supplier}</td>
                  <td className="px-4 py-3 text-gray-600">{r.sales_agent}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{r.end_date}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      r.days_until_expiry <= 30 ? "bg-red-100 text-red-700" :
                      r.days_until_expiry <= 60 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>{r.days_until_expiry}d</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">
                    ${(r.est_monthly_commission||0).toLocaleString(undefined,{maximumFractionDigits:0})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Deals by Agent Tab ─────────────────────────────────────────────────────────

function DealsByAgent({ data, mode, loading, onModeChange }: {
  data: any; mode: "month"|"day"; loading: boolean; onModeChange: (m: "month"|"day") => void;
}) {
  if (loading) return <Spinner text="Loading..." />;
  if (!data) return <div className="py-8 text-center text-sm text-gray-400">No data yet.</div>;
  const { agents, rows, agent_totals } = data;
  if (!rows?.length) return <div className="py-8 text-center text-sm text-gray-400">No closed deals in this period.</div>;

  const maxTotal = Math.max(...rows.map((r: any) => r.total), 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">View by:</span>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          {(["month","day"] as const).map(m => (
            <button key={m} onClick={() => onModeChange(m)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === m ? "bg-[#0F1D5E] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}>{m === "month" ? "Monthly" : "Daily"}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {agents.map((agent: string, i: number) => (
          <div key={agent} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className={`w-2 h-2 rounded-full mb-2 inline-block mr-2 ${AGENT_COLORS[i % AGENT_COLORS.length]}`} />
            <p className="text-xl font-bold text-gray-900">{agent_totals[agent]}</p>
            <p className="text-xs text-gray-500 truncate">{agent}</p>
            <p className="text-xs text-gray-400">deals closed</p>
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#0F1D5E]" /> Deals Closed by Period
        </h3>
        <div className="flex items-end gap-2 min-w-0" style={{ minHeight: 160 }}>
          {rows.map((row: any) => (
            <div key={row.period} className="flex flex-col items-center gap-1 flex-1 min-w-[40px]">
              <span className="text-xs font-semibold text-gray-700">{row.total || ""}</span>
              <div className="w-full flex flex-col-reverse rounded overflow-hidden"
                style={{ height: `${Math.max((row.total / maxTotal) * 140, row.total > 0 ? 8 : 0)}px` }}>
                {agents.map((agent: string, i: number) => {
                  const count = row[agent] || 0;
                  if (!count) return null;
                  return <div key={agent} title={`${agent}: ${count}`}
                    className={`w-full ${AGENT_COLORS[i % AGENT_COLORS.length]}`}
                    style={{ height: `${(count / row.total) * 100}%`, minHeight: 4 }} />;
                })}
              </div>
              <span className="text-xs text-gray-400 text-center leading-tight">
                {mode === "month" ? row.period.slice(0, 7) : row.period.slice(5)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
          {agents.map((agent: string, i: number) => (
            <div key={agent} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className={`w-3 h-3 rounded-sm ${AGENT_COLORS[i % AGENT_COLORS.length]}`} />{agent}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Period</th>
              {agents.map((a: string) => (
                <th key={a} className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase truncate max-w-[100px]">{a}</th>
              ))}
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((row: any, i: number) => (
              <tr key={row.period} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="px-4 py-3 font-medium text-gray-700">{row.period}</td>
                {agents.map((a: string) => (
                  <td key={a} className="px-3 py-3 text-center text-gray-700">
                    {row[a] > 0 ? <span className="font-semibold">{row[a]}</span> : <span className="text-gray-300">—</span>}
                  </td>
                ))}
                <td className="px-4 py-3 text-center font-bold text-[#0F1D5E]">{row.total}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 border-t border-gray-200">
              <td className="px-4 py-3 font-bold text-gray-700">Total</td>
              {agents.map((a: string) => (
                <td key={a} className="px-3 py-3 text-center font-bold text-gray-700">{agent_totals[a]}</td>
              ))}
              <td className="px-4 py-3 text-center font-bold text-[#0F1D5E]">
                {agents.reduce((s: number, a: string) => s + agent_totals[a], 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Alerts Tab ─────────────────────────────────────────────────────────────────

function AlertsList({ critical, warnings, info, onResolve, resolving }: {
  critical: Alert[]; warnings: Alert[]; info: Alert[];
  onResolve: (id: string) => void; resolving: string | null;
}) {
  const all = [
    ...critical.map(a => ({ ...a, severity: "high"   as const })),
    ...warnings.map(a => ({ ...a, severity: "medium" as const })),
    ...info.map(a    => ({ ...a, severity: "low"    as const })),
  ];
  if (!all.length) return (
    <div className="text-center py-8 text-gray-400">
      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
      <p className="text-sm">No open alerts — all systems look good!</p>
    </div>
  );
  return (
    <div className="space-y-2">
      {all.map(alert => {
        const s = SEVERITY[alert.severity];
        return (
          <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-xl border ${s.bg} ${s.border}`}>
            <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${s.text}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800">{alert.message}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>{alert.severity.toUpperCase()}</span>
                <span className="text-xs text-gray-400">{alert.entity_type} · {alert.type}</span>
              </div>
            </div>
            <button onClick={() => onResolve(alert.id)} disabled={resolving === alert.id}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
              {resolving === alert.id ? "..." : "Resolve"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Reports Tab ────────────────────────────────────────────────────────────────

function ReportsList({ reports, onTriggerDaily, onTriggerMonthly }: {
  reports: any[]; onTriggerDaily: () => void; onTriggerMonthly: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button onClick={onTriggerDaily} className="px-4 py-2 text-sm bg-[#0F1D5E] text-white rounded-xl hover:bg-[#1a2d7c] transition">Generate Today's Report</button>
        <button onClick={onTriggerMonthly} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition">Generate Monthly Report</button>
      </div>
      {reports.length === 0 ? (
        <p className="text-sm text-gray-400">No reports yet. Generate one above.</p>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <div key={r.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition">
                <div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-2 ${r.report_type === "daily" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                    {r.report_type.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{r.report_date}</span>
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded === r.id ? "rotate-90" : ""}`} />
              </button>
              {expanded === r.id && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  {r.summary && <p className="text-sm text-gray-600 mt-3 p-3 bg-blue-50 rounded-xl">{r.summary}</p>}
                  <pre className="mt-3 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl overflow-auto max-h-64">{JSON.stringify(r.data, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared small components ────────────────────────────────────────────────────

function Spinner({ text }: { text: string }) {
  return <div className="py-8 text-center text-sm text-gray-400 flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />{text}</div>;
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: any; sub: string; color: string }) {
  const c: Record<string, string> = { blue:"bg-blue-50 text-blue-600", green:"bg-green-50 text-green-600", red:"bg-red-50 text-red-600", gray:"bg-gray-100 text-gray-500", purple:"bg-purple-50 text-purple-600" };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className={`inline-flex p-2 rounded-xl mb-3 ${c[color]}`}><Icon className="w-4 h-4" /></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function BigStatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const c: Record<string, string> = { green:"bg-green-50 text-green-600 border-green-100", blue:"bg-blue-50 text-blue-600 border-blue-100", red:"bg-red-50 text-red-600 border-red-100", gray:"bg-gray-50 text-gray-500 border-gray-100" };
  return (
    <div className={`rounded-2xl border p-5 ${c[color]}`}>
      <Icon className="w-5 h-5 mb-3" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-0.5">{label}</p>
      <p className="text-xs opacity-70 mt-1">{sub}</p>
    </div>
  );
}

function QualityCard({ label, count, severity }: { label: string; count: number; severity: "high"|"medium" }) {
  const s = SEVERITY[severity];
  return (
    <div className={`${s.bg} border ${s.border} rounded-xl p-4 text-center`}>
      <p className={`text-2xl font-bold ${s.text}`}>{count}</p>
      <p className={`text-xs font-medium mt-1 ${s.text}`}>{label}</p>
    </div>
  );
}

function RenewalBadge({ days, count, color }: { days: number; count: number; color: string }) {
  const c = color === "red" ? "text-red-600 bg-red-50" : color === "amber" ? "text-amber-600 bg-amber-50" : "text-blue-600 bg-blue-50";
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${c}`}>
      <span className="text-lg font-bold">{count}</span>
      <span className="text-sm">within {days} days</span>
    </div>
  );
}
