"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  UserPlus, Zap, DollarSign, AlertTriangle, TrendingUp,
  ArrowUpRight, FileText, Clock,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ── Helpers ────────────────────────────────────────────────────────────────────
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

// ── Sub-components ─────────────────────────────────────────────────────────────
function TopCard({
  icon, iconBg, label, value, sub, trend, onClick,
}: {
  icon: React.ReactNode; iconBg: string; label: string; value: string;
  sub?: string; trend?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-semibold text-emerald-500 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function Section({ title, action, actionHref, children }: {
  title: string; action?: string; actionHref?: string; children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#0F1D5E]">{title}</h2>
        {action && actionHref && (
          <button
            onClick={() => router.push(actionHref)}
            className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:underline"
          >
            {action} <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {children}
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getLeadsStats().catch(() => null),
      api.getCommissionHistory().catch(() => []),
      api.getDashboard().catch(() => null),
    ]).then(([s, h, o]) => {
      setStats(s);
      setHistory(h ?? []);
      setOverview(o);
    }).finally(() => setLoading(false));
  }, []);

  const chartData = history.map(r => ({ month: fmtMonth(r.month), amount: r.amount }));

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading...</div>
  );

  const pipeline = stats?.pipeline ?? {};
  const portfolio = stats?.portfolio ?? {};
  const recentLeads: any[] = stats?.recent_leads ?? [];

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{greeting()} 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">{todayLabel()} · Here's your overview</p>
        </div>
        <button
          onClick={() => router.push("/reconciliation")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-[#0F1D5E]/30 shadow-sm transition-colors"
        >
          <FileText className="w-4 h-4" /> View Reports
        </button>
      </div>

      {/* Top stat cards */}
      <div className={`grid gap-4 ${showFinance ? "grid-cols-4" : "grid-cols-3"}`}>
        <TopCard
          icon={<UserPlus className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
          label="New Leads Today"
          value={String(stats?.leads_today ?? 0)}
          sub={`${stats?.leads_this_week ?? 0} this week`}
          onClick={() => router.push("/crm/leads")}
        />
        <TopCard
          icon={<Zap className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label="Active Deals"
          value={String(stats?.active_deals ?? 0)}
          sub={`${pipeline.converted ?? 0} converted customers`}
          onClick={() => router.push("/crm/leads")}
        />
        {showFinance && (
          <TopCard
            icon={<DollarSign className="w-5 h-5 text-violet-600" />}
            iconBg="bg-violet-50"
            label="Est. Commission/mo"
            value={fmt$(portfolio.commission_mo ?? 0)}
            sub={`${(portfolio.total_kwh ?? 0).toLocaleString()} kWh enrolled`}
          />
        )}
        <TopCard
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          iconBg="bg-amber-50"
          label="Expiring Soon"
          value={String(stats?.expiring_soon ?? 0)}
          sub="Active deals within 30d"
          onClick={() => router.push("/crm/leads")}
        />
      </div>

      {/* Pipeline + Chart */}
      <div className="grid grid-cols-5 gap-4">

        {/* Pipeline Snapshot */}
        <div className={showFinance ? "col-span-2" : "col-span-5"}>
          <Section title="Pipeline Snapshot" action="View all" actionHref="/crm/leads">
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Leads", value: pipeline.lead ?? 0, color: "bg-blue-50 text-blue-700", border: "border-blue-100" },
                  { label: "Converted", value: pipeline.converted ?? 0, color: "bg-emerald-50 text-emerald-700", border: "border-emerald-100" },
                  { label: "Active Deals", value: stats?.active_deals ?? 0, color: "bg-violet-50 text-violet-700", border: "border-violet-100" },
                  { label: "Expiring Soon", value: stats?.expiring_soon ?? 0, color: "bg-amber-50 text-amber-700", border: "border-amber-100" },
                ].map(({ label, value, color, border }) => (
                  <div key={label} className={`rounded-xl border ${border} p-4 text-center`}>
                    <p className={`text-2xl font-bold ${color.split(" ")[1]}`}>{value}</p>
                    <p className="text-xs text-slate-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Commission overview */}
              {showFinance && overview && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Commissions</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Expected</span>
                    <span className="font-semibold text-[#0F1D5E]">{fmt$(overview.total_expected)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Received</span>
                    <span className="font-semibold text-emerald-600">{fmt$(overview.total_actual)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Discrepancy</span>
                    <span className={`font-semibold ${overview.net_discrepancy < 0 ? "text-red-500" : "text-emerald-600"}`}>
                      {fmt$(overview.net_discrepancy)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Commission Chart */}
        {showFinance && <div className="col-span-3">
          <Section title="Est. Commission History · Last 6 Months">
            <div className="p-5">
              {chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  No active deals with start dates yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                      formatter={(v: any) => [fmt$(v), "Est. Commission"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#10b981" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Section>
        </div>}
      </div>

      {/* Portfolio */}
      {showFinance && <Section title="Portfolio" action="All Deals" actionHref="/crm/leads">
        <div className="grid grid-cols-4 divide-x divide-slate-100">
          {[
            { label: "Active Contracts", value: portfolio.active_contracts ?? 0, fmt: (v: number) => String(v) },
            { label: "Est. kWh / month", value: portfolio.total_kwh ?? 0, fmt: (v: number) => v.toLocaleString() },
            { label: "Est. Commission / mo", value: portfolio.commission_mo ?? 0, fmt: fmt$, highlight: true },
            { label: "At-risk ≤ 30d", value: portfolio.at_risk ?? 0, fmt: (v: number) => String(v), warn: true },
          ].map(({ label, value, fmt, highlight, warn }) => (
            <div key={label} className="p-6 text-center">
              <p className={`text-3xl font-bold ${highlight ? "text-emerald-600" : warn && value > 0 ? "text-amber-500" : "text-slate-900"}`}>
                {fmt(value)}
              </p>
              <p className="text-sm text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </Section>}

      {/* Recent Leads */}
      <Section title={`Recent Leads · ${recentLeads.length} shown`} action="View all" actionHref="/crm/leads">
        {recentLeads.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No leads yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Name", "Contact", "Address", "Service", "Status", "Date"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLeads.map(l => (
                <tr
                  key={l.id}
                  onClick={() => router.push(`/crm/leads/${l.id}`)}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-5 py-3.5 font-semibold text-[#0F1D5E]">{l.full_name}</td>
                  <td className="px-5 py-3.5 text-slate-500">
                    <div>{l.phone}</div>
                    {l.email && <div className="text-xs text-slate-400">{l.email}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {l.address}, {l.city} {l.zip}
                  </td>
                  <td className="px-5 py-3.5">
                    {l.product_type ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        {l.product_type}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      l.status === "converted" ? "bg-emerald-100 text-emerald-700" :
                      l.deal_status === "Active" ? "bg-emerald-100 text-emerald-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {l.status === "converted" ? "Converted" : l.deal_status ?? "Lead"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

    </div>
  );
}
