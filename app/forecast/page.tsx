"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DollarSign, TrendingUp, Zap, CalendarDays } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from "recharts";

function fmt$(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(+y, +mo - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function isCurrentMonth(m: string) {
  const now = new Date();
  return m === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function StatCard({ icon, iconBg, label, value, sub }: {
  icon: React.ReactNode; iconBg: string; label: string; value: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-emerald-600 font-bold">{fmt$(payload[0].value)}</p>
      <p className="text-xs text-slate-400 mt-0.5">Projected commission</p>
    </div>
  );
};

export default function ForecastPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRevenueForecast()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center text-slate-400 text-sm">
      Building forecast...
    </div>
  );

  const monthly: any[] = data?.monthly ?? [];
  const bySupplier: any[] = data?.by_supplier ?? [];
  const chartData = monthly.map(r => ({ month: fmtMonth(r.month), amount: r.amount, raw: r.month }));

  // Split into past-current and future
  const now = new Date();
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const future = monthly.filter(r => r.month >= nowKey);
  const next12 = future.slice(0, 12);
  const next12Total = next12.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F1D5E]">Revenue Forecast</h1>
        <p className="text-slate-500 text-sm mt-1">
          Projected commission from {data?.contributing_deals ?? 0} active deals · up to 24 months out
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Lead deals use est. kWh × adder · Imported deals use TX avg kWh (Residential 1,100 / Commercial 2,500) × adder
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label="Total Projected (24mo)"
          value={fmt$(data?.total_projected ?? 0)}
          sub="All active + future deals"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
          label="Next 12 Months"
          value={fmt$(next12Total)}
          sub={`${next12.length} months of data`}
        />
        <StatCard
          icon={<CalendarDays className="w-5 h-5 text-violet-600" />}
          iconBg="bg-violet-50"
          label="Avg. Monthly"
          value={fmt$(data?.avg_monthly ?? 0)}
          sub="Across forecast period"
        />
        <StatCard
          icon={<Zap className="w-5 h-5 text-amber-500" />}
          iconBg="bg-amber-50"
          label="Contributing Deals"
          value={String(data?.contributing_deals ?? 0)}
          sub="Lead deals + imported deals"
        />
      </div>

      {/* Main chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold text-[#0F1D5E]">Monthly Commission Forecast</h2>
            <p className="text-xs text-slate-400 mt-0.5">Est. commission = kWh/mo × adder ($/kWh) per deal</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> This month</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#0F1D5E] inline-block" /> Future</span>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <DollarSign className="w-8 h-8 opacity-30" />
            <p>No deals with complete rate data yet.</p>
            <p className="text-xs">Add deals with Est. kWh and Adder to see the forecast.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.raw === nowKey ? "#10b981" : entry.raw < nowKey ? "#cbd5e1" : "#0F1D5E"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom: supplier breakdown + monthly table */}
      <div className="grid grid-cols-5 gap-4">

        {/* Supplier breakdown */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#0F1D5E]">By Supplier</h2>
            <p className="text-xs text-slate-400 mt-0.5">Total projected across all months</p>
          </div>
          {bySupplier.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-sm">No data</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {bySupplier.map((row, i) => {
                const pct = data.total_projected > 0 ? (row.amount / data.total_projected) * 100 : 0;
                return (
                  <div key={row.supplier} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-700">{row.supplier}</span>
                      <span className="text-sm font-bold text-[#0F1D5E]">{fmt$(row.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: ["#0F1D5E", "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#06b6d4"][i % 6],
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{pct.toFixed(1)}% of total</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monthly table */}
        <div className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#0F1D5E]">Month-by-Month Breakdown</h2>
            <p className="text-xs text-slate-400 mt-0.5">Future months only</p>
          </div>
          <div className="overflow-y-auto max-h-96">
            {future.length === 0 ? (
              <p className="p-8 text-center text-slate-400 text-sm">No future months to show.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. Commission</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">vs Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {future.map(r => {
                    const diff = r.amount - (data?.avg_monthly ?? 0);
                    const isCurrent = isCurrentMonth(r.month);
                    return (
                      <tr key={r.month} className={`border-b border-slate-100 last:border-0 ${isCurrent ? "bg-emerald-50/50" : "hover:bg-slate-50"}`}>
                        <td className="px-5 py-3 font-medium text-slate-700">
                          {fmtMonth(r.month)}
                          {isCurrent && <span className="ml-2 text-xs text-emerald-600 font-semibold">Current</span>}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-[#0F1D5E]">{fmt$(r.amount)}</td>
                        <td className={`px-5 py-3 text-right text-xs font-semibold ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {diff >= 0 ? "+" : ""}{fmt$(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
