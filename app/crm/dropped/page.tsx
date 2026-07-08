"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Search, XCircle, FileText, TrendingDown, CalendarDays } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function fmtMonth(m?: string | null) {
  if (!m || m.length < 7) return m ?? "";
  return `${MONTHS[parseInt(m.slice(5, 7), 10) - 1]} ${m.slice(0, 4)}`;
}
function fmtMonthShort(m: string) {
  return `${MONTHS[parseInt(m.slice(5, 7), 10) - 1]?.slice(0, 3)} '${m.slice(2, 4)}`;
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${MONTHS[parseInt(m, 10) - 1]?.slice(0, 3)} ${parseInt(day, 10)}, ${y}`;
}

export default function DroppedDealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [supplier, setSupplier] = useState("");
  const [agent, setAgent] = useState("");
  const [month, setMonth] = useState("");           // "" = all months
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const LIMIT = 500;

  const load = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: String(LIMIT), offset: String(off) };
      if (search) params.search = search;
      if (supplier) params.supplier = supplier;
      if (agent) params.sales_agent = agent;
      if (month) params.month = month;
      const res = await api.getDroppedDeals(params);
      const rows = res.deals ?? res;                 // envelope or legacy array
      setSummary(res.summary ?? null);
      setDeals(off === 0 ? rows : prev => [...prev, ...rows]);
      setOffset(off);
      if (off === 0 && !supplier && !agent) {
        setSuppliers([...new Set<string>(rows.map((d: any) => d.supplier).filter(Boolean))].sort());
        setAgents([...new Set<string>(rows.map((d: any) => d.sales_agent).filter(Boolean))].sort());
      }
    } catch {}
    setLoading(false);
  }, [search, supplier, agent, month]);

  useEffect(() => { load(0); }, [load]);

  const byMonth: any[] = summary?.by_month ?? [];
  const last12 = byMonth.slice(-12);
  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const droppedThisMonth = byMonth.find(b => b.month === thisMonthKey)?.count ?? 0;

  const chartData = useMemo(() => last12.map(b => ({
    month: b.month,
    label: fmtMonthShort(b.month),
    Drops: b.count,
    reported: b.provider_reported,
  })), [byMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const ChartTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
      <div className="bg-[#0F1D5E] text-white rounded-xl px-3 py-2 shadow-xl text-xs space-y-0.5">
        <p className="font-bold">{label}</p>
        <p>{row.Drops} deal{row.Drops !== 1 ? "s" : ""} dropped</p>
        <p className="text-white/60">{row.reported} reported by provider statements</p>
        <p className="text-white/40 pt-0.5">click to {month === row.month ? "clear filter" : "filter this month"}</p>
      </div>
    );
  };

  const selectClass = "border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3d0f0f] via-[#5e0f1d] to-[#8a1e2a] text-white p-6 shadow-lg">
        <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-300" /> Dropped Deals
            </h1>
            <p className="text-white/60 mt-1 text-sm">
              Every terminated contract — pipeline and imported — with the provider-reported reason when it came from a commission statement.
            </p>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-3 mt-5 max-w-2xl">
          {[
            { icon: TrendingDown, label: "Total Dropped", value: summary?.total ?? deals.length, sub: month ? fmtMonth(month) : "all time" },
            { icon: CalendarDays, label: "Dropped This Month", value: droppedThisMonth, sub: fmtMonth(thisMonthKey) },
            { icon: FileText, label: "Reported by Statements", value: summary?.provider_reported ?? 0, sub: "with provider reason" },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3">
              <p className="text-xs text-white/60 font-medium flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{label}</p>
              <p className="text-2xl font-bold mt-0.5 tabular-nums">{Number(value).toLocaleString()}</p>
              <p className="text-[11px] text-white/40">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Drops by month */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#0F1D5E]">Drops by Month</h2>
              <p className="text-xs text-slate-400 mt-0.5">Click a bar to see that month's dropped deals below</p>
            </div>
            {month && (
              <button onClick={() => setMonth("")}
                className="px-3 py-1.5 rounded-full bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#0F1D5E]/90">
                Showing {fmtMonth(month)} — clear ✕
              </button>
            )}
          </div>
          <div className="px-3 py-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eef1f6" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "#0F1D5E08" }} />
                <Bar dataKey="Drops" maxBarSize={40} isAnimationActive={false} radius={[4, 4, 0, 0]}
                  onClick={(d: any) => setMonth(m => (m === d.month ? "" : d.month))} cursor="pointer">
                  {chartData.map(d => (
                    <Cell key={d.month} fill={month === d.month ? "#0F1D5E" : "#e34948"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer, supplier, agent, ESIID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20"
              />
            </div>
            <select value={month} onChange={e => setMonth(e.target.value)} className={selectClass}>
              <option value="">All months</option>
              {[...byMonth].reverse().map(b => (
                <option key={b.month} value={b.month}>{fmtMonth(b.month)} ({b.count})</option>
              ))}
            </select>
            <select value={supplier} onChange={e => setSupplier(e.target.value)} className={selectClass}>
              <option value="">All Suppliers</option>
              {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={agent} onChange={e => setAgent(e.target.value)} className={selectClass}>
              <option value="">All Agents</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading && deals.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : deals.length === 0 ? (
          <div className="p-10 text-center">
            <XCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No dropped deals{month ? ` in ${fmtMonth(month)}` : ""}.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Dropped", "Customer", "Supplier", "Why Dropped", "ESIID", "Agent", "Contract"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map(d => (
                    <tr
                      key={`${d.source}-${d.id}`}
                      onClick={() => {
                        if (d.lead_id) router.push(`/crm/leads/${d.lead_id}`);
                        else if (d.customer_id) router.push(`/crm/customers/${d.customer_id}`);
                      }}
                      className="border-b border-slate-100 last:border-0 hover:bg-red-50/40 cursor-pointer"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-semibold text-slate-700">{fmtDate(d.drop_date)}</p>
                        <p className="text-[10px] text-slate-400">{d.provider_status ? "statement month" : "record updated"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-slate-800">{d.lead_name || "—"}</p>
                          {d.source === "imported" && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-500">Imported</span>
                          )}
                        </div>
                        {d.lead_phone && <p className="text-xs text-slate-400 mt-0.5">{d.lead_phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.supplier || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {d.provider_status ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                            <XCircle className="w-3 h-3" />
                            Provider: {d.provider_status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                            Dropped manually
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{d.esiid || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{d.sales_agent || "—"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {d.start_date ? d.start_date.slice(0, 10) : "—"} → {d.end_date ? d.end_date.slice(0, 10) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Showing {deals.length}{summary?.total != null ? ` of ${summary.total}` : ""} dropped deal{deals.length !== 1 ? "s" : ""}
                {month ? ` · ${fmtMonth(month)}` : ""}
              </p>
              {summary?.total != null && deals.length < summary.total && (
                <button onClick={() => load(offset + LIMIT)} disabled={loading}
                  className="text-sm text-[#0F1D5E] font-medium hover:underline disabled:opacity-50">
                  {loading ? "Loading..." : "Load more"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
