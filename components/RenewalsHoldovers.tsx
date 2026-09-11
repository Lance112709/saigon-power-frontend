"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { RefreshCw, Hourglass, ChevronDown, ChevronUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const fmtMonth = (m?: string | null) => {
  if (!m) return "—";
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '");
};
const OUTCOME: Record<string, string> = {
  renewed: "bg-emerald-100 text-emerald-700", holdover: "bg-amber-100 text-amber-700",
  dropped: "bg-red-100 text-red-700", pending: "bg-slate-100 text-slate-500",
};
const fmtDate = (d?: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

/** Admin dashboard card: renewals by month + contracts that expired without a renewal (holdovers). */
export default function RenewalsHoldovers() {
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState<string>("");
  const [showHold, setShowHold] = useState(false);
  const [holdFilter, setHoldFilter] = useState<"all" | "paying">("paying");

  useEffect(() => { api.getRenewalStats().then(setData).catch(() => setData(null)); }, []);

  const byMonth: any[] = data?.renewals?.by_month ?? [];
  const nowKey = new Date().toISOString().slice(0, 7);
  const chart = useMemo(() => byMonth.map(m => ({ ...m, label: fmtMonth(m.month) })), [byMonth]);
  const selected = byMonth.find(m => m.month === month);
  const hold = data?.holdovers;
  const holdRows: any[] = (hold?.deals ?? []).filter((h: any) => holdFilter === "all" || h.still_paying);

  if (!data || !hold) return null;
  const showRenewals = !!data.renewals;   // admin only (API omits it for managers)

  return (
    <div className={`grid grid-cols-1 ${showRenewals ? "xl:grid-cols-2" : ""} gap-4`}>
      {/* Renewals by month (admin): contracts due to end each month vs how many renewed */}
      {showRenewals && <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-[#0F1D5E] flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Contracts Due vs. Renewed</h3>
            <p className="text-xs text-slate-400 mt-0.5">Per month: contracts scheduled to end, and how many of those renewed with us · click a bar for the list</p>
          </div>
          <div className="flex gap-3 text-right">
            <div><p className="text-xl font-bold text-slate-600 tabular-nums">{data.renewals.last_12.due}</p><p className="text-[10px] text-slate-400 uppercase tracking-wider">due · 12 mo</p></div>
            <div><p className="text-xl font-bold text-[#0F1D5E] tabular-nums">{data.renewals.last_12.renewed}</p><p className="text-[10px] text-slate-400 uppercase tracking-wider">renewed</p></div>
            <div><p className="text-xl font-bold text-emerald-600 tabular-nums">{data.renewals.last_12.rate != null ? `${data.renewals.last_12.rate}%` : "—"}</p><p className="text-[10px] text-slate-400 uppercase tracking-wider">renewal rate</p></div>
            <div><p className="text-xl font-bold text-amber-600 tabular-nums">{data.renewals.next_3.due}</p><p className="text-[10px] text-slate-400 uppercase tracking-wider">due next 3 mo</p></div>
          </div>
        </div>
        <div className="px-3 pt-3" style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#eef1f6" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} interval={1} />
              <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip cursor={{ fill: "#0F1D5E08" }} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(v: any, name: any) => [v, name]}
                labelFormatter={(l: any, pl: any) => {
                  const r = pl?.[0]?.payload; if (!r) return l;
                  return `${l} · ${r.due} due · ${r.renewed} renewed${r.holdover ? ` · ${r.holdover} holdover` : ""}${r.dropped ? ` · ${r.dropped} dropped` : ""}${r.pending ? ` · ${r.pending} pending` : ""}`;
                }} />
              <Bar dataKey="due" name="Due to end" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} cursor="pointer"
                onClick={(d: any) => setMonth(m => (m === d.month ? "" : d.month))} />
              <Bar dataKey="renewed" name="Renewed" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} cursor="pointer"
                onClick={(d: any) => setMonth(m => (m === d.month ? "" : d.month))}>
                {chart.map(c => <Cell key={c.month} fill={month === c.month ? "#0F1D5E" : c.month > nowKey ? "#f59e0b" : c.month === nowKey ? "#1baf7a" : "#2a78d6"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="px-5 pb-1 flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" /> Due to end</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#2a78d6] inline-block" /> Renewed</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b] inline-block" /> Renewed early (future month)</span>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-xs">
          {selected ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <p className="font-semibold text-slate-700">
                  {fmtMonth(month)}: {selected.due} due · {selected.renewed} renewed
                  {selected.holdover ? ` · ${selected.holdover} holdover` : ""}{selected.dropped ? ` · ${selected.dropped} dropped` : ""}{selected.pending ? ` · ${selected.pending} still to decide` : ""}
                  <span className="text-slate-400 font-normal"> — {selected.by_provider.slice(0, 4).map(([p, d, r]: any) => `${p} ${r}/${d}`).join(" · ")}</span>
                </p>
                <button onClick={() => setMonth("")} className="text-[#0F1D5E] font-semibold hover:underline">clear</button>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                {selected.deals.map((r: any) => (
                  <div key={r.deal_id} className="py-1.5 flex items-center gap-3">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${OUTCOME[r.outcome] || ""}`}>{r.outcome}</span>
                    <Link href={`/crm/customers/${r.customer_id}`} className="font-semibold text-slate-700 hover:underline truncate min-w-0 flex-1">{r.customer || "—"}</Link>
                    <span className="text-slate-500 whitespace-nowrap">{r.provider}{r.new_provider && r.new_provider !== r.provider ? ` → ${r.new_provider}` : ""}</span>
                    <span className="text-slate-400 whitespace-nowrap">{r.outcome === "renewed" ? `${fmtDate(r.new_start)} → ${fmtDate(r.new_end)}` : `ended ${fmtDate(r.old_end)}`}</span>
                    <span className="text-slate-400 whitespace-nowrap hidden sm:inline">{r.sales_agent || ""}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-slate-400">
              Grey = contracts scheduled to end that month. Blue = how many of those signed a new contract with us (holdovers and drops are the gap).
              {data.renewals.marked_renewed_no_new_contract > 0 && <> {data.renewals.marked_renewed_no_new_contract} deals marked Renewed with no follow-up contract on the meter are not counted.</>}
            </p>
          )}
        </div>
      </div>}

      {/* Holdovers (admin + manager) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-[#0F1D5E] flex items-center gap-2"><Hourglass className="w-4 h-4" /> Expired, Not Renewed</h3>
            <p className="text-xs text-slate-400 mt-0.5">Active contracts past their end date with no new contract on the meter — on the provider's default rate</p>
          </div>
          <div className="flex gap-3 text-right">
            <div><p className="text-xl font-bold text-amber-600 tabular-nums">{hold.still_paying}</p><p className="text-[10px] text-slate-400 uppercase tracking-wider">still paying us</p></div>
            <div><p className="text-xl font-bold text-slate-500 tabular-nums">{hold.total}</p><p className="text-[10px] text-slate-400 uppercase tracking-wider">all expired</p></div>
          </div>
        </div>
        <div className="px-5 py-3 space-y-2">
          {hold.by_provider.slice(0, 6).map((p: any) => (
            <div key={p.provider} className="flex items-center gap-3 text-xs">
              <span className="w-32 truncate font-semibold text-slate-700">{p.provider}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${hold.total ? (p.count / hold.total) * 100 : 0}%` }} />
              </div>
              <span className="w-24 text-right text-slate-500 tabular-nums">{p.still_paying} paying / {p.count}</span>
            </div>
          ))}
          <p className="text-[11px] text-slate-400 pt-1">
            "Still paying" = commission received on the {hold.paid_months_checked?.map(fmtMonth).join(", ")} statements. The rest have expired with no recent payment and are probably gone.
          </p>
        </div>
        <button onClick={() => setShowHold(v => !v)}
          className="w-full py-2.5 text-xs font-semibold text-[#0F1D5E] hover:bg-[#EEF1FA] border-t border-slate-100 flex items-center justify-center gap-1">
          {showHold ? <>Hide list <ChevronUp className="w-3.5 h-3.5" /></> : <>View list <ChevronDown className="w-3.5 h-3.5" /></>}
        </button>
        {showHold && (
          <div className="border-t border-slate-100">
            <div className="px-5 py-2 flex items-center gap-2 text-[11px] bg-slate-50/60">
              {(["paying", "all"] as const).map(f => (
                <button key={f} onClick={() => setHoldFilter(f)}
                  className={`px-2.5 py-1 rounded-full font-semibold border ${holdFilter === f ? "bg-[#0F1D5E] text-white border-[#0F1D5E]" : "bg-white text-slate-500 border-slate-200"}`}>
                  {f === "paying" ? `Still paying (${hold.still_paying})` : `All expired (${hold.total})`}
                </button>
              ))}
            </div>
            <div className="max-h-80 overflow-y-auto overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="border-b border-slate-100">
                    {["Customer", "Provider", "Contract ended", "Over by", "Rate", "Last paid", "Agent"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdRows.map((h: any) => (
                    <tr key={h.deal_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2 font-semibold text-slate-700 whitespace-nowrap"><Link href={`/crm/customers/${h.customer_id}`} className="hover:underline">{h.customer || "—"}</Link></td>
                      <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{h.provider}</td>
                      <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{fmtDate(h.contract_end)}</td>
                      <td className="px-4 py-2 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full font-semibold ${h.days_over > 180 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{h.days_over}d</span></td>
                      <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{h.rate != null ? `${Number(h.rate).toFixed(3)}¢` : "—"}</td>
                      <td className={`px-4 py-2 whitespace-nowrap font-semibold ${h.still_paying ? "text-emerald-700" : "text-slate-400"}`}>{h.last_paid ? fmtMonth(h.last_paid) : "none"}</td>
                      <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{h.sales_agent || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
