"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Search, ChevronDown } from "lucide-react";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const s = d.slice(0, 10);
  const [y, m, day] = s.split("-");
  return `${m}/${day}/${y}`;
}

function StatusBadge({ status, dealId, onUpdate, isLead }: { status: string; dealId: string; onUpdate: (id: string, s: string) => void; isLead?: boolean }) {
  const [saving, setSaving] = useState(false);
  const isActive = isLead ? status === "Active" : status === "ACTIVE";

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLead) return; // lead deals status managed from lead detail page
    const next = isActive ? "INACTIVE" : "ACTIVE";
    setSaving(true);
    try {
      await api.updateCrmDeal(dealId, { deal_status: next });
      onUpdate(dealId, next);
    } catch {}
    setSaving(false);
  };

  const label = isLead ? status : status;
  const activeClass = isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200";

  return (
    <button onClick={toggle} disabled={saving || isLead}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${activeClass} ${saving ? "opacity-50" : ""} ${isLead ? "cursor-default" : "cursor-pointer"}`}>
      {saving ? "..." : label}
      {!isLead && <ChevronDown className="w-3 h-3 opacity-60" />}
    </button>
  );
}

const selectClass = "border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

export default function CrmDealsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"crm" | "leads">("leads");

  // CRM deals state
  const [crmDeals, setCrmDeals]     = useState<any[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmOffset, setCrmOffset]   = useState(0);
  const [providers, setProviders]   = useState<string[]>([]);
  const [agents, setAgents]         = useState<string[]>([]);

  // Lead deals state
  const [leadDeals, setLeadDeals]     = useState<any[]>([]);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadOffset, setLeadOffset]   = useState(0);

  // Shared filters
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");

  const LIMIT = 50;

  useEffect(() => {
    api.getCrmProviders().then(setProviders).catch(() => {});
    api.getCrmAgents().then(setAgents).catch(() => {});
  }, []);

  const loadCrmDeals = useCallback(async (off = 0) => {
    setCrmLoading(true);
    try {
      const params: Record<string, string> = { limit: String(LIMIT), offset: String(off) };
      if (search) params.search = search;
      if (supplierFilter) params.provider = supplierFilter;
      if (statusFilter) params.deal_status = statusFilter;
      if (typeFilter) params.meter_type = typeFilter;
      if (agentFilter) params.sales_agent = agentFilter;
      const data = await api.getCrmDeals(params);
      setCrmDeals(off === 0 ? data : prev => [...prev, ...data]);
      setCrmOffset(off);
    } catch {}
    setCrmLoading(false);
  }, [search, supplierFilter, statusFilter, typeFilter, agentFilter]);

  const loadLeadDeals = useCallback(async (off = 0) => {
    setLeadLoading(true);
    try {
      const params: Record<string, string> = { limit: String(LIMIT), offset: String(off) };
      if (search) params.search = search;
      if (supplierFilter) params.supplier = supplierFilter;
      if (statusFilter) params.status = statusFilter === "ACTIVE" ? "Active" : statusFilter === "INACTIVE" ? "Inactive" : statusFilter;
      if (typeFilter) params.product_type = typeFilter;
      if (agentFilter) params.sales_agent = agentFilter;
      const data = await api.getAllLeadDeals(params);
      setLeadDeals(off === 0 ? data : prev => [...prev, ...data]);
      setLeadOffset(off);
    } catch {}
    setLeadLoading(false);
  }, [search, supplierFilter, statusFilter, typeFilter, agentFilter]);

  useEffect(() => { loadCrmDeals(0); }, [loadCrmDeals]);
  useEffect(() => { loadLeadDeals(0); }, [loadLeadDeals]);

  const handleCrmStatusUpdate = (dealId: string, newStatus: string) => {
    setCrmDeals(prev => prev.map(d => d.id === dealId ? { ...d, deal_status: newStatus } : d));
  };

  const isLoading = tab === "crm" ? crmLoading : leadLoading;
  const deals     = tab === "crm" ? crmDeals : leadDeals;

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1D5E]">All Deals</h1>
        <p className="text-slate-500 mt-1 text-sm">Every deal across all customers and providers</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {([["leads", `CRM Leads (${leadDeals.length})`], ["crm", `Imported (${crmDeals.length})`]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 ${
                tab === key ? "border-[#0F1D5E] text-[#0F1D5E]" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search name, ESI ID, supplier..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 bg-white" />
            </div>
            <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className={selectClass}>
              <option value="">All Providers</option>
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectClass}>
              <option value="">All Types</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
            </select>
            <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} className={selectClass}>
              <option value="">All Agents</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        {isLoading && deals.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : deals.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No deals found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Customer", "Supplier / Provider", "ESI ID", "Type", "Rate", "Adder", "Term", "Start", "End", "Agent", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tab === "leads" ? leadDeals.map(d => (
                    <tr key={d.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer"
                      onClick={() => d.lead_id && router.push(`/crm/leads/${d.lead_id}`)}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0F1D5E]">{d.customer_name || "—"}</div>
                        {d.sgp_customer_id && <div className="text-xs text-slate-400 font-mono">{d.sgp_customer_id}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{d.supplier || "—"}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">{d.esiid || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs capitalize whitespace-nowrap">{d.product_type || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.rate != null ? `$${parseFloat(d.rate).toFixed(4)}` : "—"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.adder != null ? parseFloat(d.adder).toFixed(4) : "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{d.contract_term || "—"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(d.start_date)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(d.end_date)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{d.sales_agent || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.status} dealId={d.id} onUpdate={() => {}} isLead />
                      </td>
                    </tr>
                  )) : crmDeals.map(d => (
                    <tr key={d.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer"
                      onClick={() => router.push(`/crm/deals/${d.id}`)}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0F1D5E] truncate max-w-[180px]">{d.deal_name || d.business_name || "—"}</div>
                        {d.crm_customers?.full_name && <div className="text-xs text-slate-400 mt-0.5">{d.crm_customers.full_name}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{d.provider || "—"}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">{d.esiid || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs capitalize whitespace-nowrap">{d.meter_type || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.energy_rate != null ? parseFloat(d.energy_rate).toFixed(4) : "—"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.adder != null ? parseFloat(d.adder).toFixed(4) : "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">—</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(d.contract_start_date)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(d.contract_end_date)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{d.sales_agent || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.deal_status} dealId={d.id} onUpdate={handleCrmStatusUpdate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">Showing {deals.length} deals</p>
              {deals.length === (tab === "leads" ? leadOffset : crmOffset) + LIMIT && (
                <button
                  onClick={() => tab === "leads" ? loadLeadDeals(leadOffset + LIMIT) : loadCrmDeals(crmOffset + LIMIT)}
                  disabled={isLoading}
                  className="text-sm text-[#0F1D5E] font-medium hover:underline disabled:opacity-50">
                  {isLoading ? "Loading..." : "Load more"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
