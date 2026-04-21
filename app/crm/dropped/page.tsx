"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Search, XCircle } from "lucide-react";

export default function DroppedDealsPage() {
  const router = useRouter();
  const [deals,   setDeals]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [supplier, setSupplier] = useState("");
  const [agent,    setAgent]    = useState("");
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [agents,    setAgents]    = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const LIMIT = 100;

  const load = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: String(LIMIT), offset: String(off) };
      if (search)   params.search       = search;
      if (supplier) params.supplier     = supplier;
      if (agent)    params.sales_agent  = agent;
      const data = await api.getDroppedDeals(params);
      setDeals(off === 0 ? data : prev => [...prev, ...data]);
      setOffset(off);

      // Build filter options from first load
      if (off === 0) {
        const allData = data as any[];
        setSuppliers([...new Set<string>(allData.map((d: any) => d.supplier).filter(Boolean))].sort());
        setAgents([...new Set<string>(allData.map((d: any) => d.sales_agent).filter(Boolean))].sort());
      }
    } catch {}
    setLoading(false);
  }, [search, supplier, agent]);

  useEffect(() => { load(0); }, [load]);

  const selectClass = "border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <XCircle className="w-6 h-6 text-red-400" />
          <h1 className="text-2xl font-bold text-[#0F1D5E]">Dropped Deals</h1>
        </div>
        <p className="text-slate-500 mt-1 text-sm">All terminated or inactive contracts</p>
      </div>

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
            <p className="text-slate-400 text-sm">No dropped deals found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Customer", "Supplier", "ESIID", "Rate", "Agent", "Start Date", "End Date", "Terminated"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map(d => (
                    <tr
                      key={d.id}
                      onClick={() => d.lead_id && router.push(`/crm/leads/${d.lead_id}`)}
                      className="border-b border-slate-100 last:border-0 hover:bg-red-50/40 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{d.lead_name || "—"}</p>
                        {d.lead_phone && <p className="text-xs text-slate-400 mt-0.5">{d.lead_phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.supplier || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{d.esiid || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {d.rate != null ? `${parseFloat(d.rate).toFixed(4)}¢` : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{d.sales_agent || "—"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {d.start_date ? d.start_date.slice(0, 10) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {d.end_date ? d.end_date.slice(0, 10) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                          <XCircle className="w-3 h-3" />
                          Dropped
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">{deals.length} dropped deal{deals.length !== 1 ? "s" : ""}</p>
              {deals.length === offset + LIMIT && (
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
