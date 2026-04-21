"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Search, Users, FileCheck, TrendingUp, ChevronRight, Trash2 } from "lucide-react";

function StatCard({ title, value, sub, icon: Icon, valueColor = "text-[#0F1D5E]" }: {
  title: string; value: string; sub?: string; icon: any; valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl bg-[#EEF1FA] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#0F1D5E]" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className={`text-3xl font-bold mt-0.5 ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function CrmCustomersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "manager";
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [dealStatus, setDealStatus] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    api.getCrmProviders().then(setProviders).catch(() => {});
    api.getCrmStats().then(setStats).catch(() => {});
  }, []);

  const loadCustomers = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: String(LIMIT), offset: String(off) };
      if (search) params.search = search;
      if (provider) params.provider = provider;
      if (dealStatus) params.deal_status = dealStatus;
      const data = await api.getCrmCustomers(params);
      setCustomers(off === 0 ? data : prev => [...prev, ...data]);
      setOffset(off);
    } catch {}
    setLoading(false);
  }, [search, provider, dealStatus]);

  useEffect(() => { loadCustomers(0); }, [loadCustomers]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer and all their deals? This cannot be undone.")) return;
    try {
      await api.deleteCrmCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch {}
  };

  const selectClass = "border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-[#0F1D5E]">Customers</h1>
        <p className="text-slate-500 mt-1 text-sm">All active and inactive customer accounts</p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Total Customers" value={stats.total_customers.toLocaleString()} icon={Users} />
          <StatCard title="Active Deals" value={stats.active_deals.toLocaleString()} icon={FileCheck} valueColor="text-emerald-600" />
          <StatCard title="Inactive Deals" value={stats.inactive_deals.toLocaleString()} icon={TrendingUp} valueColor="text-slate-400" />
        </div>
      )}

      {/* Filters + table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, email, or phone..."
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
          </div>
        </div>

        {loading && customers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No customers found.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Name", "Email", "Phone", "City", "Active / Total Deals", "", ...(isAdmin ? [""] : [])].map((h, i) => (
                    <th key={i} className={`px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${i === 4 ? "text-center" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer"
                    onClick={() => router.push(`/crm/customers/${c.id}`)}
                  >
                    <td className="px-5 py-3.5 font-semibold text-[#0F1D5E]">{c.full_name}</td>
                    <td className="px-5 py-3.5 text-slate-500">{c.email || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500">{c.phone || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500">{c.city || "—"}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-semibold text-emerald-600">{c.active_deal_count}</span>
                      <span className="text-slate-400"> / {c.deal_count}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      <ChevronRight className="w-4 h-4" />
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5">
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(c.id); }}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                          title="Delete customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.length === offset + LIMIT && (
              <div className="px-5 py-4 border-t border-slate-100">
                <button
                  onClick={() => loadCustomers(offset + LIMIT)}
                  disabled={loading}
                  className="w-full py-2 text-sm text-[#0F1D5E] font-medium hover:underline disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
