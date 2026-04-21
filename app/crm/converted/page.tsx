"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Search, ChevronRight, Trash2 } from "lucide-react";

export default function ConvertedCustomersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canDelete = user?.role === "admin" || user?.role === "manager";
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      setCustomers(await api.getLeadCustomers(params));
    } catch {}
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (leadId: string) => {
    if (!confirm("Delete this customer and all their deals? This cannot be undone.")) return;
    try {
      await api.deleteLead(leadId);
      setCustomers(prev => prev.filter(c => c.lead_id !== leadId));
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1D5E]">Customers</h1>
        <p className="text-slate-500 mt-1 text-sm">Leads that have been converted to active customers</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No converted customers yet.<br />Add a deal with <strong>Active</strong> status to convert a lead.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Customer ID", "Customer", "Phone", "Address", "Active Deals", "Customer Since", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer"
                  onClick={() => router.push(`/crm/leads/${c.lead_id}`)}>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {c.sgp_customer_id
                      ? <span className="font-mono text-xs font-semibold text-[#0F1D5E] bg-[#EEF1FA] px-2 py-1 rounded-lg">{c.sgp_customer_id}</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-[#0F1D5E]">{c.full_name}</div>
                    {c.email && <div className="text-xs text-slate-400 mt-0.5">{c.email}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{c.phone || "—"}</td>
                  <td className="px-5 py-3.5 text-slate-500 max-w-[200px] truncate">
                    {c.address ? `${c.address}, ${c.city} ${c.state}` : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-emerald-600">{c.active_deal_count}</span>
                    <span className="text-slate-400"> active</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                    {c.customer_since ? new Date(c.customer_since).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    {canDelete ? (
                      <button onClick={e => { e.stopPropagation(); handleDelete(c.lead_id); }}
                        className="text-slate-300 hover:text-red-500 transition-colors" title="Delete customer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && (
          <div className="px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Showing {customers.length} customers</p>
          </div>
        )}
      </div>
    </div>
  );
}
