"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Search, ChevronRight, Trash2, SlidersHorizontal, Mail, Megaphone, X } from "lucide-react";
import BulkEmailModal from "@/components/BulkEmailModal";

const EMPTY_FILTERS = {
  provider: "", end_from: "", end_to: "", status: "", city: "", state: "", zip: "", last_name: "", segment: "",
};

export default function ConvertedCustomersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canDelete = user?.role === "admin" || user?.role === "manager";
  const canEmail = user?.role === "admin" || user?.role === "manager";

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [showFilters, setShowFilters] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [count, setCount] = useState<{ total: number; with_email: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<null | { mode: "selected" | "filter"; leadIds: string[]; audience: number }>(null);

  // Only send the filters that are actually set, so the URL stays clean.
  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search.trim()) p.search = search.trim();
    for (const [k, v] of Object.entries(filters)) if (v) p[k] = v as string;
    return p;
  }, [search, filters]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length + (search.trim() ? 1 : 0),
    [filters, search]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cnt] = await Promise.all([
        api.getLeadCustomers({ ...params, limit: "500" }),
        canEmail ? api.getLeadCustomersCount(params) : Promise.resolve(null),
      ]);
      setCustomers(list);
      setCount(cnt);
    } catch {}
    setLoading(false);
  }, [params, canEmail]);

  // Debounce so typing in a filter doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  // Dropping a filter/search can remove rows — prune any now-invisible selections.
  useEffect(() => {
    setSelected(prev => {
      const visible = new Set(customers.map(c => c.lead_id));
      const next = new Set([...prev].filter(id => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [customers]);

  const handleDelete = async (leadId: string) => {
    if (!confirm("Delete this customer and all their deals? This cannot be undone.")) return;
    try {
      await api.deleteLead(leadId);
      setCustomers(prev => prev.filter(c => c.lead_id !== leadId));
    } catch {}
  };

  const shownWithEmail = customers.filter(c => c.email && c.email.includes("@"));
  const allShownSelected = shownWithEmail.length > 0 && shownWithEmail.every(c => selected.has(c.lead_id));

  function toggleAllShown() {
    setSelected(prev => {
      if (allShownSelected) {
        const next = new Set(prev);
        shownWithEmail.forEach(c => next.delete(c.lead_id));
        return next;
      }
      return new Set([...prev, ...shownWithEmail.map(c => c.lead_id)]);
    });
  }
  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const setFilter = (k: string, v: string) => setFilters(f => ({ ...f, [k]: v }));
  const clearFilters = () => { setFilters({ ...EMPTY_FILTERS }); setSearch(""); };

  const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 bg-white";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E]">Customers</h1>
          <p className="text-slate-500 mt-1 text-sm">Leads that have been converted to active customers</p>
        </div>
        {canEmail && (
          <button onClick={() => router.push("/crm/campaigns")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50">
            <Megaphone className="w-4 h-4" /> Email Campaigns
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search + filter toggle */}
        <div className="px-5 py-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search name, phone, email, ESI ID, address, SGP ID..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 bg-white" />
            </div>
            <button onClick={() => setShowFilters(s => !s)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${showFilters || activeFilterCount ? "border-[#0F1D5E] text-[#0F1D5E] bg-[#EEF1FA]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              <SlidersHorizontal className="w-4 h-4" /> Filters
              {activeFilterCount > 0 && <span className="ml-1 text-xs bg-[#0F1D5E] text-white rounded-full px-1.5 py-0.5">{activeFilterCount}</span>}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Provider</label>
                <input value={filters.provider} onChange={e => setFilter("provider", e.target.value)} placeholder="e.g. NRG" className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Segment</label>
                <select value={filters.segment} onChange={e => setFilter("segment", e.target.value)} className={inputCls}>
                  <option value="">All</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
                <select value={filters.status} onChange={e => setFilter("status", e.target.value)} className={inputCls}>
                  <option value="">All</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Last name</label>
                <input value={filters.last_name} onChange={e => setFilter("last_name", e.target.value)} placeholder="e.g. Nguyen" className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Contract ends after</label>
                <input type="date" value={filters.end_from} onChange={e => setFilter("end_from", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Contract ends before</label>
                <input type="date" value={filters.end_to} onChange={e => setFilter("end_to", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">City</label>
                <input value={filters.city} onChange={e => setFilter("city", e.target.value)} placeholder="e.g. Houston" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">State</label>
                  <input value={filters.state} onChange={e => setFilter("state", e.target.value)} placeholder="TX" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">ZIP</label>
                  <input value={filters.zip} onChange={e => setFilter("zip", e.target.value)} placeholder="77407" className={inputCls} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bulk email action bar */}
        {canEmail && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-500">
              {count
                ? <><span className="font-semibold text-slate-700">{count.total.toLocaleString()}</span> match{activeFilterCount ? " these filters" : ""} · <span className="font-semibold text-emerald-600">{count.with_email.toLocaleString()}</span> have an email</>
                : "…"}
              {selected.size > 0 && <> · <span className="font-semibold text-[#0F1D5E]">{selected.size} selected</span></>}
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button onClick={() => setBulk({ mode: "selected", leadIds: [...selected], audience: selected.size })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#0F1D5E]/90">
                  <Mail className="w-4 h-4" /> Email {selected.size} selected
                </button>
              )}
              <button onClick={() => setBulk({ mode: "filter", leadIds: [], audience: count?.with_email || 0 })}
                disabled={!count || count.with_email === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#0F1D5E] text-[#0F1D5E] text-xs font-semibold hover:bg-[#EEF1FA] disabled:opacity-40 disabled:cursor-not-allowed">
                <Megaphone className="w-4 h-4" /> Email all {count ? count.with_email.toLocaleString() : ""} {activeFilterCount ? "matching" : "customers"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            {activeFilterCount ? "No customers match these filters." : <>No converted customers yet.<br />Add a deal with <strong>Active</strong> status to convert a lead.</>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {canEmail && (
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={allShownSelected} onChange={toggleAllShown}
                      title="Select all shown (with email)"
                      className="w-4 h-4 rounded border-slate-300 accent-[#0F1D5E] cursor-pointer" />
                  </th>
                )}
                {["Customer ID", "Customer", "Business Name", "Phone", "Address", "Active Deals", "Customer Since", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const hasEmail = c.email && c.email.includes("@");
                return (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    {canEmail && (
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" disabled={!hasEmail} checked={selected.has(c.lead_id)}
                          onChange={() => toggleOne(c.lead_id)}
                          title={hasEmail ? "" : "No email on file"}
                          className="w-4 h-4 rounded border-slate-300 accent-[#0F1D5E] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" />
                      </td>
                    )}
                    <td className="px-5 py-3.5 whitespace-nowrap cursor-pointer" onClick={() => router.push(`/crm/converted/${c.lead_id}`)}>
                      {c.sgp_customer_id
                        ? <span className="font-mono text-xs font-semibold text-[#0F1D5E] bg-[#EEF1FA] px-2 py-1 rounded-lg">{c.sgp_customer_id}</span>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 cursor-pointer" onClick={() => router.push(`/crm/converted/${c.lead_id}`)}>
                      <div className="font-semibold text-[#0F1D5E]">{c.full_name}</div>
                      {c.email
                        ? <div className="text-xs text-slate-400 mt-0.5">{c.email}</div>
                        : <div className="text-xs text-amber-500 mt-0.5">no email</div>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-sm">{c.business_name || <span className="text-slate-300">—</span>}</td>
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
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && (
          <div className="px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Showing {customers.length.toLocaleString()} customers{count && count.total > customers.length ? ` of ${count.total.toLocaleString()} matching` : ""}
            </p>
          </div>
        )}
      </div>

      {bulk && (
        <BulkEmailModal
          mode={bulk.mode}
          leadIds={bulk.leadIds}
          filters={bulk.mode === "filter" ? params : undefined}
          audienceCount={bulk.audience}
          sampleVariables={(customers.find(c => bulk.mode === "selected" ? bulk.leadIds.includes(c.lead_id) : true) || {}).variables}
          onClose={() => setBulk(null)}
          onSent={() => { setBulk(null); setSelected(new Set()); }}
        />
      )}
    </div>
  );
}
