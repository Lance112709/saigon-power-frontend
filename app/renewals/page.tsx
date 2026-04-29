"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { RefreshCw, Search, X, ChevronRight } from "lucide-react";

const inputCls = "border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

function DaysChip({ days }: { days: number | null }) {
  if (days == null) return <span className="text-slate-300 text-xs">—</span>;
  if (days < 0)  return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-400">Expired</span>;
  if (days <= 7)  return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600">{days}d</span>;
  if (days <= 30) return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-600">{days}d</span>;
  if (days <= 60) return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-50 text-yellow-700">{days}d</span>;
  return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-50 text-slate-500">{days}d</span>;
}

export default function RenewalsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [agents, setAgents] = useState<string[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [provider, setProvider] = useState("");
  const [salesAgent, setSalesAgent] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (api as any).getRenewalFilters().then((f: any) => {
      setProviders(f.providers || []);
      setAgents(f.agents || []);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate)  params.start_date  = startDate;
      if (endDate)    params.end_date    = endDate;
      if (provider)   params.provider    = provider;
      if (salesAgent) params.sales_agent = salesAgent;
      const qs = new URLSearchParams(params).toString();
      const data = await (api as any).getRenewals(qs ? `?${qs}` : "");
      setDeals(data);
    } catch {}
    setLoading(false);
  }, [startDate, endDate, provider, salesAgent]);

  useEffect(() => { load(); }, [load]);

  const clearFilters = () => {
    setStartDate(""); setEndDate(""); setProvider(""); setSalesAgent(""); setSearch("");
  };

  const hasFilters = startDate || endDate || provider || salesAgent || search;

  const filtered = search
    ? deals.filter(d =>
        (d.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (d.provider || "").toLowerCase().includes(search.toLowerCase()) ||
        (d.sales_agent || "").toLowerCase().includes(search.toLowerCase())
      )
    : deals;

  const expiredCount  = filtered.filter(d => (d.days_left ?? 1) < 0).length;
  const urgentCount   = filtered.filter(d => d.days_left != null && d.days_left >= 0 && d.days_left <= 30).length;
  const upcomingCount = filtered.filter(d => d.days_left != null && d.days_left > 30).length;

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E] flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-emerald-500" />
            Renewals
          </h1>
          <p className="text-slate-500 mt-1 text-sm">All active deals from CRM + Imported Customers — sorted by contract end date</p>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" /> Clear filters
          </button>
        )}
      </div>

      {/* Summary chips */}
      <div className="flex gap-3">
        {[
          { label: "Expired", count: expiredCount, color: "bg-slate-100 text-slate-500" },
          { label: "Due ≤ 30 days", count: urgentCount, color: "bg-red-50 text-red-600 border border-red-100" },
          { label: "Due 31–60+ days", count: upcomingCount, color: "bg-amber-50 text-amber-700 border border-amber-100" },
          { label: "Total", count: filtered.length, color: "bg-[#EEF1FA] text-[#0F1D5E] border border-[#0F1D5E]/10" },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${s.color}`}>
            <span>{s.label}</span>
            <span className="font-black">{s.count}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, REP, agent…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 bg-white"
            />
          </div>

          {/* Contract End From */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">End Date From</label>
            <input type="date" className={`${inputCls} w-full`} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          {/* Contract End To */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">End Date To</label>
            <input type="date" className={`${inputCls} w-full`} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          {/* REP / Provider */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">REP / Provider</label>
            <select value={provider} onChange={e => setProvider(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">All REPs</option>
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Sales Agent */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Sales Agent</label>
            <select value={salesAgent} onChange={e => setSalesAgent(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">All Agents</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No deals found for selected filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Customer", "REP / Provider", "Rate", "Term", "Sales Agent", "End Date", "Days Left", "Source", ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const expired = (d.days_left ?? 1) < 0;
                return (
                  <tr
                    key={d.deal_id}
                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer transition-colors ${expired ? "opacity-50" : ""}`}
                    onClick={() => router.push(d.customer_id ? `/crm/customers/${d.customer_id}` : `/crm/leads/${d.lead_id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#0F1D5E]">{d.full_name || "—"}</p>
                      {d.phone && <p className="text-xs text-slate-400 mt-0.5">{d.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.provider || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {d.rate != null ? `$${parseFloat(d.rate).toFixed(4)}/kWh` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.contract_term || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{d.sales_agent || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.end_date || "—"}</td>
                    <td className="px-4 py-3"><DaysChip days={d.days_left} /></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        d.source === "imported"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {d.source === "imported" ? "Imported" : "CRM"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300"><ChevronRight className="w-4 h-4" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
