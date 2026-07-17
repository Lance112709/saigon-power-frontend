"use client";
import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Search, Users, FileCheck, TrendingUp, ChevronRight, Trash2,
  Download, Upload, AlertTriangle, CheckCircle, X, Mail, Megaphone,
} from "lucide-react";
import BulkEmailModal from "@/components/BulkEmailModal";

function StatCard({ title, value, sub, icon: Icon, valueColor = "text-[#0F1D5E]", onClick }: {
  title: string; value: string; sub?: string; icon: any; valueColor?: string; onClick?: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4 ${onClick ? "cursor-pointer hover:border-[#0F1D5E]/30 hover:shadow-md transition-all" : ""}`}
      onClick={onClick}
    >
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

function CrmCustomersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "admin" || user?.role === "manager";

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [dealStatus, setDealStatus] = useState(() => searchParams.get("deal_status") ?? "");
  const [meterType, setMeterType] = useState("");
  const [source, setSource] = useState("");
  const [missingInfo, setMissingInfo] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sources, setSources] = useState<any[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  // Import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Clear All modal state
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirm, setClearConfirm] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearAfterImport, setClearAfterImport] = useState(false);


  useEffect(() => {
    api.getCrmProviders().then(setProviders).catch(() => {});
    api.getCrmStats().then(setStats).catch(() => {});
    (api as any).getCrmCustomerSources().then(setSources).catch(() => {});
  }, []);

  const [exporting, setExporting] = useState(false);
  // Bulk email
  const canEmail = user?.role === "admin" || user?.role === "manager";
  const [count, setCount] = useState<{ total: number; with_email: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<null | { mode: "selected" | "filter"; ids: string[]; audience: number; sampleVariables?: any }>(null);

  async function openBulk(mode: "selected" | "filter") {
    const ids = mode === "selected" ? [...selected] : [];
    const sampleId = mode === "selected" ? ids[0] : customers.find((c: any) => c.email)?.id;
    let sampleVariables: any = undefined;
    if (sampleId) {
      try { sampleVariables = (await api.getEmailMergeVars({ customer_id: sampleId })).variables; } catch {}
    }
    setBulk({ mode, ids, audience: mode === "selected" ? ids.length : (count?.with_email || 0), sampleVariables });
  }

  // The active filters (no paging) — shared by the list, the count, and the
  // "email all matching" campaign so the audience always equals what's shown.
  const filterParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p.search = search;
    if (provider) p.provider = provider;
    if (dealStatus) p.deal_status = dealStatus;
    if (meterType) p.meter_type = meterType;
    if (source) p.source = source;
    if (missingInfo) p.missing_contact = "true";
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    return p;
  }, [search, provider, dealStatus, meterType, source, missingInfo, dateFrom, dateTo]);

  const loadCustomers = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      const data = await api.getCrmCustomers({ ...filterParams, limit: String(LIMIT), offset: String(off) });
      setCustomers(off === 0 ? data : prev => {
        const seen = new Set(prev.map((c: any) => c.id));
        return [...prev, ...data.filter((c: any) => !seen.has(c.id))];
      });
      setOffset(off);
    } catch {}
    setLoading(false);
  }, [filterParams]);

  useEffect(() => { loadCustomers(0); }, [loadCustomers]);

  useEffect(() => {
    if (!canEmail) return;
    api.getCrmCustomersCount(filterParams).then(setCount).catch(() => {});
  }, [filterParams, canEmail]);

  const toggleOne = (id: string) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const refreshStats = () => {
    api.getCrmStats().then(setStats).catch(() => {});
    api.getCrmProviders().then(setProviders).catch(() => {});
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer and all their deals? This cannot be undone.")) return;
    try {
      await api.deleteCrmCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch {}
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try { await (api as any).getCrmImportTemplate(); } catch {}
    setDownloadingTemplate(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportResult(null);
    try {
      const result = await (api as any).importCrmExcel(file);
      setImportResult({ ...result, ok: true });
      loadCustomers(0);
      refreshStats();
    } catch (err: any) {
      setImportResult({ ok: false, error: err?.message || "Import failed" });
    }
    setImporting(false);
  };

  const handleClearAll = async () => {
    if (clearConfirm !== "CLEAR") return;
    setClearing(true);
    try {
      await (api as any).clearCrmData();
      setCustomers([]);
      setStats(null);
      setShowClearModal(false);
      setClearConfirm("");
      if (clearAfterImport) {
        setTimeout(() => fileRef.current?.click(), 300);
      }
      refreshStats();
    } catch {}
    setClearing(false);
    setClearAfterImport(false);
  };

  const selectClass = "border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E]">Imported Customers</h1>
          <p className="text-slate-500 mt-1 text-sm">All active and inactive customer accounts</p>
        </div>
        {isAdmin && (
          <button onClick={async () => {
            setExporting(true);
            try { await (api as any).exportImportedCustomers(filterParams); }
            catch (e: any) { alert(e?.message || "Export failed."); }
            setExporting(false);
          }} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-50">
            <Download className="w-4 h-4" /> {exporting ? "Exporting…" : "Export CSV"}
          </button>
        )}
      </div>

      {/* ── Import Panel (admin only) ── */}
      {isAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <p className="text-sm font-bold text-[#0F1D5E]">Import Customers & Deals</p>
          <div className="flex flex-wrap items-center gap-3">
            {/* Download Template */}
            <button
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloadingTemplate ? "Downloading…" : "Download Template"}
            </button>

            {/* Upload Excel */}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {importing ? "Importing…" : "Upload Excel"}
            </button>


            <div className="h-5 w-px bg-slate-200" />

            {/* Clear All & Re-import */}
            <button
              onClick={() => { setClearAfterImport(false); setShowClearModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              Clear All & Re-import
            </button>
          </div>

          {/* Import result */}
          {importResult && (
            <div className={`rounded-xl p-4 border text-sm ${importResult.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              {importResult.ok ? (
                <div className="space-y-1">
                  <p className="font-bold text-emerald-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Import Complete
                  </p>
                  <p className="text-emerald-600">{importResult.customers_created} customers created · {importResult.customers_reused} matched existing · {importResult.deals_created} deals imported · {importResult.deals_skipped} skipped</p>
                  {importResult.errors?.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold text-amber-700">Warnings ({importResult.errors.length}):</p>
                      <ul className="text-amber-600 text-xs mt-1 space-y-0.5 max-h-28 overflow-y-auto">
                        {importResult.errors.map((e: string, i: number) => <li key={i}>• {e}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-red-700 font-semibold">{importResult.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Total Customers" value={stats.total_customers.toLocaleString()} icon={Users} onClick={() => setDealStatus("")} />
          <StatCard title="Active Deals" value={stats.active_deals.toLocaleString()} icon={FileCheck} valueColor="text-emerald-600" onClick={() => setDealStatus("ACTIVE")} />
          <StatCard title="Inactive Deals" value={stats.inactive_deals.toLocaleString()} icon={TrendingUp} valueColor="text-slate-400" onClick={() => setDealStatus("INACTIVE")} />
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
            <select value={meterType} onChange={e => setMeterType(e.target.value)} className={selectClass}>
              <option value="">All Types</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Small Commercial">Small Commercial</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-3 sm:items-center">
            <select value={source} onChange={e => setSource(e.target.value)} className={selectClass}>
              <option value="">All Sources</option>
              {sources.map((s: any) => (
                <option key={s.value} value={s.value}>{s.label} ({s.count})</option>
              ))}
            </select>
            <button
              onClick={() => setMissingInfo(v => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap transition-colors ${
                missingInfo ? "bg-amber-500 text-white border-amber-500" : "bg-white text-amber-600 border-amber-300 hover:bg-amber-50"
              }`}>
              {missingInfo ? "✓ " : ""}Needs contact info
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Added</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={selectClass} />
              <span className="text-slate-300">→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={selectClass} />
            </div>
            {(source || missingInfo || dateFrom || dateTo || provider || dealStatus || meterType || search) && (
              <button
                onClick={() => { setSearch(""); setProvider(""); setDealStatus(""); setMeterType(""); setSource(""); setMissingInfo(false); setDateFrom(""); setDateTo(""); }}
                className="text-xs font-semibold text-slate-500 hover:text-red-500 px-2 py-1 whitespace-nowrap">
                ✕ Clear filters
              </button>
            )}
          </div>
        </div>

        {canEmail && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-500">
              {count
                ? <><span className="font-semibold text-slate-700">{count.total.toLocaleString()}</span> customer{count.total === 1 ? "" : "s"} match · <span className="font-semibold text-emerald-600">{count.with_email.toLocaleString()}</span> have an email</>
                : "…"}
              {selected.size > 0 && <> · <span className="font-semibold text-[#0F1D5E]">{selected.size} selected</span></>}
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button onClick={() => openBulk("selected")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#0F1D5E]/90">
                  <Mail className="w-4 h-4" /> Email {selected.size} selected
                </button>
              )}
              <button onClick={() => openBulk("filter")}
                disabled={!count || count.with_email === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#0F1D5E] text-[#0F1D5E] text-xs font-semibold hover:bg-[#EEF1FA] disabled:opacity-40 disabled:cursor-not-allowed">
                <Megaphone className="w-4 h-4" /> Email all {count ? count.with_email.toLocaleString() : ""} matching
              </button>
            </div>
          </div>
        )}

        {loading && customers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No customers found.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {canEmail && (
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox"
                        checked={customers.filter(c => c.email).length > 0 && customers.filter(c => c.email).every(c => selected.has(c.id))}
                        onChange={() => {
                          const withEmail = customers.filter(c => c.email);
                          const allSel = withEmail.length > 0 && withEmail.every(c => selected.has(c.id));
                          setSelected(prev => {
                            const next = new Set(prev);
                            withEmail.forEach(c => allSel ? next.delete(c.id) : next.add(c.id));
                            return next;
                          });
                        }}
                        title="Select all loaded (with email)"
                        className="w-4 h-4 rounded border-slate-300 accent-[#0F1D5E] cursor-pointer" />
                    </th>
                  )}
                  {["Name", "Business Name", "Source", "Phone", "Service Address", "REP", "Status", "Active / Total Deals", "", ...(isManager ? [""] : [])].map((h, i) => (
                    <th key={i} className={`px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${i === 7 ? "text-center" : ""}`}>
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
                    {canEmail && (
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" disabled={!c.email} checked={selected.has(c.id)}
                          onChange={() => toggleOne(c.id)}
                          title={c.email ? "" : "No email on file"}
                          className="w-4 h-4 rounded border-slate-300 accent-[#0F1D5E] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" />
                      </td>
                    )}
                    <td className="px-5 py-3.5 font-semibold text-[#0F1D5E]">
                      {c.full_name}
                      {c.is_member && (
                        <span title="SmartCare Member — give extra care"
                          className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 align-middle">⭐ SmartCare</span>
                      )}
                      {!c.phone && !c.email && (
                        <span className="ml-2 inline-block w-2 h-2 rounded-full bg-amber-400 align-middle" title="No contact info on file — click to complete profile" />
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 max-w-[160px] truncate">{c.business_name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        c.source === "HubSpot" ? "bg-yellow-100 text-yellow-700"
                        : c.source === "GiaDienRe" ? "bg-teal-50 text-teal-700"
                        : c.source === "Direct Energy Transfer" ? "bg-blue-50 text-blue-700"
                        : c.source === "Manual" ? "bg-slate-100 text-slate-500"
                        : "bg-violet-50 text-violet-700"
                      }`}>{c.source || "Manual"}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{c.phone || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500 max-w-[200px] truncate">{c.service_address || c.city || "—"}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {c.provider
                        ? <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EEF1FA] text-[#0F1D5E]">{c.provider}</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.active_deal_count > 0
                        ? <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Active</span>
                        : <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Inactive</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-semibold text-emerald-600">{c.active_deal_count}</span>
                      <span className="text-slate-400"> / {c.deal_count}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      <ChevronRight className="w-4 h-4" />
                    </td>
                    {isManager && (
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

      {bulk && (
        <BulkEmailModal
          dataset="crm"
          mode={bulk.mode}
          customerIds={bulk.ids}
          filters={bulk.mode === "filter" ? filterParams : undefined}
          audienceCount={bulk.audience}
          sampleVariables={bulk.sampleVariables}
          onClose={() => setBulk(null)}
          onSent={() => { setBulk(null); setSelected(new Set()); }}
        />
      )}

      {/* ── Clear All Confirmation Modal ── */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Clear All Data</h3>
              </div>
              <button onClick={() => { setShowClearModal(false); setClearConfirm(""); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              This will permanently delete <strong>all imported customers and deals</strong> including their notes. This cannot be undone.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Type <strong>CLEAR</strong> to confirm</label>
              <input
                type="text"
                value={clearConfirm}
                onChange={e => setClearConfirm(e.target.value)}
                placeholder="CLEAR"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowClearModal(false); setClearConfirm(""); setClearAfterImport(false); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearConfirm !== "CLEAR" || clearing}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {clearing ? "Clearing…" : "Clear All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CrmCustomersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F6FA]" />}>
      <CrmCustomersContent />
    </Suspense>
  );
}
