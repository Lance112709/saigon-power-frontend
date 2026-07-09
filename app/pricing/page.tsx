"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Tag, RefreshCw, Search, Settings } from "lucide-react";

const selectCls = "px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20";
const fmtRate = (v: number) => v != null ? `$${Number(v).toFixed(5)}` : "—";
const fmtWhen = (s?: string) => s ? new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const fmtMonth = (m?: string) => {
  if (!m) return "—";
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

export default function CommercialPricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatedToast, setUpdatedToast] = useState(false);
  const [utility, setUtility] = useState("");
  const [zone, setZone] = useState("");
  const [term, setTerm] = useState("");
  const [product, setProduct] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [usageTier, setUsageTier] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 100;
  const versionRef = useRef<string | null>(null);

  const load = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: String(LIMIT), offset: String(off) };
      if (utility) params.utility = utility;
      if (zone) params.zone = zone;
      if (term) params.term = term;
      if (product) params.product = product;
      if (startMonth) params.start_month = startMonth;
      if (usageTier) params.usage_tier = usageTier;
      if (search) params.search = search;
      const res = await (api as any).getCurrentPricing(params);
      setData((prev: any) => off === 0 ? res : { ...res, rows: [...(prev?.rows || []), ...res.rows] });
      setOffset(off);
      versionRef.current = res?.meta?.upload_id ?? null;
    } catch {}
    setLoading(false);
  }, [utility, zone, term, product, startMonth, usageTier, search]);

  useEffect(() => { load(0); }, [load]);

  // live updates: poll the version marker; refetch + toast when it changes
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const v = await (api as any).getCurrentPricingVersion();
        if (v?.upload_id && versionRef.current && v.upload_id !== versionRef.current) {
          versionRef.current = v.upload_id;
          await load(0);
          setUpdatedToast(true);
          setTimeout(() => setUpdatedToast(false), 8000);
        }
      } catch {}
    }, 45000);
    return () => clearInterval(t);
  }, [load]);

  const meta = data?.meta;
  const dims = data?.dims || {};
  const rows = data?.rows || [];

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">
      {updatedToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg">
          ⚡ Today's pricing was just updated — showing the latest rates.
        </div>
      )}

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0F1D5E] via-[#1a2d7a] to-[#2a3f96] p-6 text-white">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Today's Commercial Pricing</h1>
              <p className="text-sm text-blue-200/80 mt-0.5">
                {meta ? <>Provider <span className="font-semibold text-white">{meta.provider}</span> · v{meta.version}</> : "No pricing published yet"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            {meta && (
              <>
                <div><p className="text-[11px] uppercase tracking-wider text-blue-200/70">Last updated</p><p className="font-semibold mt-0.5">{fmtWhen(meta.published_at)}</p></div>
                <div><p className="text-[11px] uppercase tracking-wider text-blue-200/70">Effective</p><p className="font-semibold mt-0.5">{meta.effective_date}</p></div>
                <div><p className="text-[11px] uppercase tracking-wider text-blue-200/70">Valid until</p><p className="font-semibold mt-0.5">{fmtWhen(meta.expiration_at)}</p></div>
              </>
            )}
            {isAdmin && (
              <button onClick={() => router.push("/pricing/admin")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-sm font-semibold hover:bg-white/20">
                <Settings className="w-4 h-4" /> Manage
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters + table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20"
              placeholder="Search product, utility, zone…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={utility} onChange={e => setUtility(e.target.value)} className={selectCls}>
            <option value="">All Utilities</option>
            {(dims.utilities || []).map((u: string) => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={zone} onChange={e => setZone(e.target.value)} className={selectCls}>
            <option value="">All Load Zones</option>
            {(dims.zones || []).map((z: string) => <option key={z} value={z}>{z}</option>)}
          </select>
          <select value={term} onChange={e => setTerm(e.target.value)} className={selectCls}>
            <option value="">All Terms</option>
            {(dims.terms || []).map((t: number) => <option key={t} value={t}>{t} mo</option>)}
          </select>
          <select value={product} onChange={e => setProduct(e.target.value)} className={selectCls}>
            <option value="">All Products</option>
            {(dims.products || []).map((p: string) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={startMonth} onChange={e => setStartMonth(e.target.value)} className={selectCls}>
            <option value="">All Start Months</option>
            {(dims.start_months || []).map((m: string) => <option key={m} value={m}>{fmtMonth(m)}</option>)}
          </select>
          <select value={usageTier} onChange={e => setUsageTier(e.target.value)} className={selectCls}>
            <option value="">All Usage</option>
            {(dims.usage_tiers || []).map((u: string) => <option key={u} value={u}>{u} kWh</option>)}
          </select>
        </div>

        {loading && rows.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading pricing…
          </div>
        ) : !meta ? (
          <div className="p-12 text-center text-slate-400 text-sm">No pricing has been published yet. Check back soon.</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No rates match those filters.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Utility", "Load Zone", "Product", "Start Month", "Load Profile", "Usage (kWh)", "Term", "Customer Rate"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-semibold text-slate-700">{r.utility}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.zone}</td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{r.product}</td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtMonth(r.start_month)}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{r.load_profile || "—"}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">{r.usage_tier || "—"}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap">{r.term} mo</td>
                      <td className="px-4 py-2.5 font-bold text-emerald-600 whitespace-nowrap">{fmtRate(r.customer_rate)}<span className="text-slate-400 font-normal text-xs">/kWh</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">Showing {rows.length.toLocaleString()} of {(data?.total ?? 0).toLocaleString()} rates</p>
              {rows.length < (data?.total ?? 0) && (
                <button onClick={() => load(offset + LIMIT)} disabled={loading}
                  className="px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-50">
                  {loading ? "Loading…" : "Load more"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
