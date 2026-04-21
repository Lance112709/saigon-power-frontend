"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Search, ChevronDown } from "lucide-react";

function StatusBadge({ status, dealId, onUpdate }: { status: string; dealId: string; onUpdate: (id: string, s: string) => void }) {
  const [saving, setSaving] = useState(false);
  const isActive = status === "ACTIVE";

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = isActive ? "INACTIVE" : "ACTIVE";
    setSaving(true);
    try {
      await api.updateCrmDeal(dealId, { deal_status: next });
      onUpdate(dealId, next);
    } catch {}
    setSaving(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={saving}
      title={`Click to mark ${isActive ? "Inactive" : "Active"}`}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer
        ${isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}
        ${saving ? "opacity-50" : ""}`}
    >
      {saving ? "..." : status}
      <ChevronDown className="w-3 h-3 opacity-60" />
    </button>
  );
}

export default function CrmDealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [dealStatus, setDealStatus] = useState("ACTIVE");
  const [meterType, setMeterType] = useState("");
  const [salesAgent, setSalesAgent] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    api.getCrmProviders().then(setProviders).catch(() => {});
    api.getCrmAgents().then(setAgents).catch(() => {});
  }, []);

  const loadDeals = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: String(LIMIT), offset: String(off) };
      if (search) params.search = search;
      if (provider) params.provider = provider;
      if (dealStatus) params.deal_status = dealStatus;
      if (meterType) params.meter_type = meterType;
      if (salesAgent) params.sales_agent = salesAgent;
      const data = await api.getCrmDeals(params);
      setDeals(off === 0 ? data : prev => [...prev, ...data]);
      setOffset(off);
    } catch {}
    setLoading(false);
  }, [search, provider, dealStatus, meterType, salesAgent]);

  useEffect(() => { loadDeals(0); }, [loadDeals]);

  const handleDealStatusUpdate = (dealId: string, newStatus: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, deal_status: newStatus } : d));
  };

  const selectClass = "border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-[#0F1D5E]">All Deals</h1>
        <p className="text-slate-500 mt-1 text-sm">Every deal across all customers and providers</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search deal name, ESIID, address..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 bg-white"
              />
            </div>
            <select value={provider} onChange={e => setProvider(e.target.value)} className={selectClass}>
              <option value="">All Providers</option>
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={dealStatus} onChange={e => setDealStatus(e.target.value)} className={selectClass}>
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select value={meterType} onChange={e => setMeterType(e.target.value)} className={selectClass}>
              <option value="">All Types</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
            </select>
            <select value={salesAgent} onChange={e => setSalesAgent(e.target.value)} className={selectClass}>
              <option value="">All Agents</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading && deals.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : deals.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No deals found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Deal / Customer", "Provider", "ESIID", "Type", "Rate", "Adder", "Start", "End", "Agent", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map(d => (
                    <tr
                      key={d.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer"
                      onClick={() => router.push(`/crm/deals/${d.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0F1D5E] truncate max-w-[180px]">
                          {d.deal_name || d.business_name || "—"}
                        </div>
                        {d.crm_customers?.full_name && (
                          <div className="text-xs text-slate-400 mt-0.5">{d.crm_customers.full_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{d.provider || "—"}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">{d.esiid || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs capitalize whitespace-nowrap">{d.meter_type || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {d.energy_rate != null ? parseFloat(d.energy_rate).toFixed(4) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {d.adder != null ? parseFloat(d.adder).toFixed(4) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {d.contract_start_date ? d.contract_start_date.slice(0, 10) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {d.contract_end_date ? d.contract_end_date.slice(0, 10) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{d.sales_agent || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.deal_status} dealId={d.id} onUpdate={handleDealStatusUpdate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">Showing {deals.length} deals</p>
              {deals.length === offset + LIMIT && (
                <button
                  onClick={() => loadDeals(offset + LIMIT)}
                  disabled={loading}
                  className="text-sm text-[#0F1D5E] font-medium hover:underline disabled:opacity-50"
                >
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
