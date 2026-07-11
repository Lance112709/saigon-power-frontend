"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  DollarSign, TrendingUp, Zap, CalendarDays, Flame, ShieldAlert, PhoneCall,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, AreaChart, Area, ReferenceLine,
} from "recharts";

// Validated categorical palette (CVD-safe order) — matches the rest of the CRM.
const SERIES_COLORS = ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7", "#0F1D5E"];

function fmt$(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}
function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '");
}
function isCurrentMonth(m: string) {
  const now = new Date();
  return m === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Gradient stat tile — each metric gets its own color story. */
function GlowCard({ gradient, icon, label, value, sub }: {
  gradient: string; icon: React.ReactNode; label: string; value: string; sub: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}>
      <div className="pointer-events-none absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 w-28 h-28 rounded-full bg-black/10" />
      <div className="relative">
        <div className="flex items-center gap-2 text-white/75 text-xs font-semibold uppercase tracking-wider">
          {icon}{label}
        </div>
        <p className="text-3xl font-black mt-2 tabular-nums drop-shadow-sm">{value}</p>
        <p className="text-xs text-white/70 mt-1">{sub}</p>
      </div>
    </div>
  );
}

const NavyTooltip = ({ active, payload, label, lines }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[#0F1D5E] text-white rounded-xl px-4 py-3 shadow-xl text-xs space-y-1">
      <p className="font-bold text-sm">{label}</p>
      {lines(p).map((l: any, i: number) => l && (
        <p key={i} className="flex items-center gap-2">
          {l.dot && <span className="w-2 h-2 rounded-full inline-block" style={{ background: l.dot }} />}
          <span className="text-white/75">{l.k}</span>
          <span className="ml-auto font-semibold tabular-nums pl-4">{l.v}</span>
        </p>
      ))}
    </div>
  );
};

export default function ForecastPage() {
  const [data, setData] = useState<any>(null);
  const [cf, setCf] = useState<any>(null); // verified-base commission forecast (manager+)
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.getRevenueForecast()
      .then(setData)
      .catch((e: any) => { setErr(e?.message || String(e)); setData(null); })
      .finally(() => setLoading(false));
    api.getCommissionForecast().then(setCf).catch(() => {}); // 403 for non-managers — section hides
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center text-slate-400 text-sm">
      Building forecast...
    </div>
  );

  if (err) return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 max-w-lg text-center">
        <p className="text-red-600 font-semibold mb-2">Forecast failed to load</p>
        <p className="text-xs text-slate-500 font-mono break-all">{err}</p>
      </div>
    </div>
  );

  const monthly: any[] = data?.monthly ?? [];
  const bySupplier: any[] = data?.by_supplier ?? [];
  const chartData = monthly.map(r => ({ month: fmtMonth(r.month), amount: r.amount, raw: r.month }));

  const now = new Date();
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const future = monthly.filter(r => r.month >= nowKey);
  const next12 = future.slice(0, 12);
  const next12Total = next12.reduce((s, r) => s + r.amount, 0);
  const peak = chartData.reduce((best, r) => (r.amount > (best?.amount ?? 0) ? r : best), null as any);

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1D5E] via-[#182a80] to-[#2a3f9e] text-white p-6 shadow-lg">
        <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 right-40 w-80 h-80 rounded-full bg-emerald-400/10" />
        <div className="relative">
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-300" /> Revenue Forecast
          </h1>
          <p className="text-white/60 mt-1 text-sm">
            Projected commission from {data?.contributing_deals ?? 0} active deals — real statement usage × contracted adder,
            up to 24 months out.
          </p>
        </div>
      </div>

      {/* Gradient stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlowCard gradient="bg-gradient-to-br from-emerald-500 to-green-700"
          icon={<DollarSign className="w-3.5 h-3.5" />} label="Total Projected"
          value={fmt$(data?.total_projected ?? 0)} sub="all active + future deals · 24 months" />
        <GlowCard gradient="bg-gradient-to-br from-[#2a78d6] to-[#0F1D5E]"
          icon={<TrendingUp className="w-3.5 h-3.5" />} label="Next 12 Months"
          value={fmt$(next12Total)} sub={`${next12.length} months in view`} />
        <GlowCard gradient="bg-gradient-to-br from-violet-500 to-[#4a3aa7]"
          icon={<CalendarDays className="w-3.5 h-3.5" />} label="Avg. Monthly"
          value={fmt$(data?.avg_monthly ?? 0)} sub="across the forecast period" />
        <GlowCard gradient="bg-gradient-to-br from-amber-400 to-orange-600"
          icon={<Zap className="w-3.5 h-3.5" />} label="Contributing Deals"
          value={String(data?.contributing_deals ?? 0)} sub="lead deals + imported book" />
      </div>

      {/* Actual usage you're getting paid on */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg bg-gradient-to-r from-teal-500 via-cyan-600 to-sky-700">
        <div className="pointer-events-none absolute -top-12 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-8 w-36 h-36 rounded-full bg-black/10" />
        <div className="relative flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-white/75 text-xs font-semibold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> Actual Usage You're Getting Paid On
            </div>
            <p className="text-4xl font-black mt-2 tabular-nums drop-shadow-sm">
              {(data?.actual_usage_kwh_mo ?? 0).toLocaleString()}
              <span className="text-lg font-bold text-white/80"> kWh/mo</span>
            </p>
            <p className="text-xs text-white/70 mt-1">
              Actual metered usage from each meter's latest monthly commission statement, across {(data?.actual_usage_accounts ?? 0).toLocaleString()} active
              account{(data?.actual_usage_accounts ?? 0) === 1 ? "" : "s"} on statements
              {data?.active_accounts_total ? ` (of ${data.active_accounts_total.toLocaleString()} active)` : ""}
              {data?.latest_statement_month ? ` · latest ${data.latest_statement_month}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-white/70">Annualized</p>
            <p className="text-2xl font-black tabular-nums">
              {(data?.actual_usage_kwh_yr ?? 0).toLocaleString()}
              <span className="text-sm font-bold text-white/80"> kWh/yr</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-sm font-bold text-[#0F1D5E]">Monthly Commission Forecast</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Est. commission = kWh/mo × adder ($/kWh) per deal
              {peak && <> · peak {peak.month} at <span className="font-semibold text-[#0F1D5E]">{fmt$(peak.amount)}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Past
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1baf7a] inline-block" /> This month
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2a78d6] inline-block" /> Future
            </span>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <DollarSign className="w-8 h-8 opacity-30" />
            <p>No deals with complete rate data yet.</p>
            <p className="text-xs">Add deals with Est. kWh and Adder to see the forecast.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barSize={26}>
              <defs>
                <linearGradient id="futureBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2a78d6" />
                  <stop offset="100%" stopColor="#0F1D5E" />
                </linearGradient>
                <linearGradient id="nowBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip cursor={{ fill: "#0F1D5E08" }} content={
                <NavyTooltip lines={(p: any) => [
                  { k: "Projected commission", v: fmt$(p.amount), dot: p.raw === nowKey ? "#1baf7a" : "#2a78d6" },
                ]} />
              } />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {chartData.map((entry, i) => (
                  <Cell key={i}
                    fill={entry.raw === nowKey ? "url(#nowBar)" : entry.raw < nowKey ? "#cbd5e1" : "url(#futureBar)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Verified-base commission forecast: trailing received - contract roll-offs */}
      {cf && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-white via-white to-amber-50/60 p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#0F1D5E] flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Verified-Base Forecast — what happens if nobody renews
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                Starts from real provider payments (avg of {cf.trailing_months?.join(", ")}) and subtracts each contract
                as it ends. Every dollar below the line is recoverable by renewing.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl bg-[#EEF1FA] px-4 py-2.5 text-right">
                <p className="text-lg font-black text-[#0F1D5E] tabular-nums">{fmt$(cf.base_monthly)}</p>
                <p className="text-[11px] text-slate-500 font-medium">verified $/mo today</p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-right">
                <p className="text-lg font-black text-amber-600 tabular-nums">{fmt$(cf.renewals_at_stake_12mo)}<span className="text-xs">/mo</span></p>
                <p className="text-[11px] text-amber-700/70 font-medium flex items-center gap-1 justify-end">
                  <PhoneCall className="w-3 h-3" />{cf.renewal_accounts_12mo} renewals · 12mo
                </p>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-right">
                <p className="text-lg font-black text-red-600 tabular-nums">{fmt$(cf.clawback_exposure)}</p>
                <p className="text-[11px] text-red-700/70 font-medium flex items-center gap-1 justify-end">
                  <ShieldAlert className="w-3 h-3" />clawback exposure
                </p>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={(cf.months ?? []).map((m: any) => ({ ...m, label: fmtMonth(m.month) }))}
              margin={{ top: 8, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="projFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#2a78d6" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <ReferenceLine y={cf.base_monthly} stroke="#1baf7a" strokeDasharray="4 4"
                label={{ value: "today's verified base", position: "insideTopRight", fontSize: 10, fill: "#059669" }} />
              <Tooltip cursor={{ stroke: "#0F1D5E22" }} content={
                <NavyTooltip lines={(p: any) => [
                  { k: "If no renewals", v: fmt$(p.projected), dot: "#2a78d6" },
                  p.accounts_ending > 0 && {
                    k: `${p.accounts_ending} contracts end`, v: `${fmt$(p.rolling_off_this_month)}/mo at stake`, dot: "#eda100",
                  },
                ]} />
              } />
              <Area type="monotone" dataKey="projected" stroke="#0F1D5E" strokeWidth={2}
                fill="url(#projFill)" isAnimationActive={false}
                dot={(props: any) => {
                  const heavy = props.payload.accounts_ending > 100;
                  return heavy
                    ? <circle key={props.index} cx={props.cx} cy={props.cy} r={5} fill="#eda100" stroke="#fff" strokeWidth={2} />
                    : <circle key={props.index} cx={props.cx} cy={props.cy} r={0} fill="none" />;
                }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#eda100] inline-block" />
              amber dots = 100+ contracts ending that month
            </span>
            <span>12-month outlook: <span className="font-bold text-red-600">{fmt$(cf.projected_12mo_no_renewals)}</span> if nothing renews
              {" "}vs <span className="font-bold text-emerald-600">{fmt$(cf.projected_12mo_all_renewed)}</span> if everything renews</span>
            <span className="text-slate-400">— the gap is what Who To Call Today protects</span>
          </div>
        </div>
      )}

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
                const color = SERIES_COLORS[i % SERIES_COLORS.length];
                return (
                  <div key={row.supplier} className="px-5 py-3.5 hover:bg-slate-50/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                        {row.supplier}
                      </span>
                      <span className="text-sm font-bold text-[#0F1D5E] tabular-nums">{fmt$(row.amount)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
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
                          {isCurrent && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">Now</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-[#0F1D5E] tabular-nums">{fmt$(r.amount)}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                            diff >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                          }`}>
                            {diff >= 0 ? "▲" : "▼"} {fmt$(Math.abs(diff))}
                          </span>
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
