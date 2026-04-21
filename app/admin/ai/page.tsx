"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
  Bot, RefreshCw, AlertTriangle, CheckCircle2, Info,
  TrendingUp, Users, FileText, Zap, BarChart3, ChevronRight,
} from "lucide-react";

interface Alert {
  id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  message: string;
  severity: "high" | "medium" | "low";
  status: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface Recommendation {
  icon: string;
  priority: string;
  text: string;
}

interface Dashboard {
  summary: string;
  metrics: any;
  alerts: { critical: Alert[]; warnings: Alert[]; info: Alert[] };
  recommendations: Recommendation[];
  daily_report: any;
}

const severityColors = {
  high:   { bg: "bg-red-50",    border: "border-red-200",   text: "text-red-700",   badge: "bg-red-100 text-red-700"   },
  medium: { bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
  low:    { bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-700",  badge: "bg-blue-100 text-blue-700"  },
};

export default function AiOperationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "alerts" | "reports">("overview");
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.getAiDashboard();
      setDashboard(d);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleScan = async () => {
    setScanning(true);
    try {
      await api.runAiScan();
      await load();
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (id: string) => {
    setResolving(id);
    try {
      await api.resolveAiAlert(id);
      await load();
    } finally {
      setResolving(null);
    }
  };

  const loadReports = async () => {
    const r = await api.getAiReports();
    setReports(r);
  };

  const handleTabChange = (tab: "overview" | "alerts" | "reports") => {
    setActiveTab(tab);
    if (tab === "reports") loadReports();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <Bot className="w-5 h-5 animate-pulse" />
          <span>Loading AI Operations...</span>
        </div>
      </div>
    );
  }

  const m = dashboard?.metrics;
  const totalAlerts = (dashboard?.alerts.critical.length || 0) +
    (dashboard?.alerts.warnings.length || 0) +
    (dashboard?.alerts.info.length || 0);

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
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F1D5E] text-white rounded-xl text-sm font-medium hover:bg-[#1a2d7c] transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Scanning..." : "Run Scan"}
        </button>
      </div>

      {/* AI Summary */}
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

      {/* Stat cards */}
      {m && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Leads" value={m.pipeline.total_leads} sub={`+${m.today.new_leads} today`} color="blue" />
          <StatCard icon={FileText} label="Active Deals" value={m.pipeline.active_deals} sub={`+${m.today.new_deals} today`} color="green" />
          <StatCard icon={AlertTriangle} label="Open Alerts" value={m.alerts.total_open} sub={`${m.alerts.critical} critical`} color={m.alerts.critical > 0 ? "red" : "gray"} />
          <StatCard icon={TrendingUp} label="MTD Commission" value={`$${(m.mtd.est_commission || 0).toLocaleString()}`} sub={`${m.mtd.deals} deals this month`} color="purple" />
        </div>
      )}

      {/* Data quality strip */}
      {m?.data_quality && (
        <div className="grid grid-cols-3 gap-3">
          <QualityCard label="Missing Rate" count={m.data_quality.missing_rate} severity="high" />
          <QualityCard label="Missing ESIID" count={m.data_quality.missing_esiid} severity="high" />
          <QualityCard label="Unassigned Agent" count={m.data_quality.missing_agent} severity="medium" />
        </div>
      )}

      {/* Renewals */}
      {m?.renewals && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> Renewal Pipeline
          </h2>
          <div className="flex gap-4">
            <RenewalBadge days={30} count={m.renewals["30_days"]} color="red" />
            <RenewalBadge days={60} count={m.renewals["60_days"]} color="amber" />
            <RenewalBadge days={90} count={m.renewals["90_days"]} color="blue" />
          </div>
        </div>
      )}

      {/* Recommendations */}
      {dashboard?.recommendations && dashboard.recommendations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recommendations</h2>
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

      {/* Tabs: Alerts / Reports */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(["overview", "alerts", "reports"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-[#0F1D5E] text-[#0F1D5E]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "overview" ? "Overview" : tab === "alerts" ? `Alerts (${totalAlerts})` : "Reports"}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "overview" && (
            <div className="text-sm text-gray-500">
              Select the <strong>Alerts</strong> tab to review and resolve open issues, or <strong>Reports</strong> to view historical reports.
            </div>
          )}

          {activeTab === "alerts" && (
            <AlertsList
              critical={dashboard?.alerts.critical || []}
              warnings={dashboard?.alerts.warnings || []}
              info={dashboard?.alerts.info || []}
              onResolve={handleResolve}
              resolving={resolving}
            />
          )}

          {activeTab === "reports" && (
            <ReportsList reports={reports} onTriggerDaily={async () => { await api.triggerDailyReport(); await loadReports(); }} onTriggerMonthly={async () => { await api.triggerMonthlyReport(); await loadReports(); }} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: any; sub: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    gray: "bg-gray-100 text-gray-500",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className={`inline-flex p-2 rounded-xl mb-3 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function QualityCard({ label, count, severity }: { label: string; count: number; severity: "high" | "medium" }) {
  const s = severityColors[severity];
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

function AlertsList({ critical, warnings, info, onResolve, resolving }: {
  critical: Alert[]; warnings: Alert[]; info: Alert[];
  onResolve: (id: string) => void; resolving: string | null;
}) {
  const allAlerts = [
    ...critical.map(a => ({ ...a, severity: "high" as const })),
    ...warnings.map(a => ({ ...a, severity: "medium" as const })),
    ...info.map(a => ({ ...a, severity: "low" as const })),
  ];

  if (allAlerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
        <p className="text-sm">No open alerts. All systems look good!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {allAlerts.map(alert => {
        const s = severityColors[alert.severity];
        return (
          <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-xl border ${s.bg} ${s.border}`}>
            <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${s.text}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800">{alert.message}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>
                  {alert.severity.toUpperCase()}
                </span>
                <span className="text-xs text-gray-400">{alert.entity_type} · {alert.type}</span>
              </div>
            </div>
            <button
              onClick={() => onResolve(alert.id)}
              disabled={resolving === alert.id}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
            >
              {resolving === alert.id ? "..." : "Resolve"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ReportsList({ reports, onTriggerDaily, onTriggerMonthly }: {
  reports: any[]; onTriggerDaily: () => void; onTriggerMonthly: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button onClick={onTriggerDaily} className="px-4 py-2 text-sm bg-[#0F1D5E] text-white rounded-xl hover:bg-[#1a2d7c] transition">
          Generate Today's Report
        </button>
        <button onClick={onTriggerMonthly} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition">
          Generate Monthly Report
        </button>
      </div>
      {reports.length === 0 ? (
        <p className="text-sm text-gray-400">No reports yet. Generate one above.</p>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <div key={r.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
              >
                <div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-2 ${
                    r.report_type === "daily" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                  }`}>
                    {r.report_type.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{r.report_date}</span>
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded === r.id ? "rotate-90" : ""}`} />
              </button>
              {expanded === r.id && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  {r.summary && (
                    <p className="text-sm text-gray-600 mt-3 p-3 bg-blue-50 rounded-xl">{r.summary}</p>
                  )}
                  <pre className="mt-3 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl overflow-auto max-h-64">
                    {JSON.stringify(r.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
