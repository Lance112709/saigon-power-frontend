"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, ArrowLeft, Search, Link2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function authFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Request failed");
  return res.json();
}

function fmt(v: any) {
  if (v == null || v === "") return "—";
  return v;
}

function fmtMoney(v: any) {
  if (v == null) return "—";
  return `$${parseFloat(v).toFixed(2)}`;
}

export default function UploadDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [batch, setBatch]           = useState<any>(null);
  const [records, setRecords]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<"all" | "unmatched">("all");
  const [search, setSearch]         = useState("");
  const [offset, setOffset]         = useState(0);

  // Manual match modal
  const [matching, setMatching]     = useState<any>(null);
  const [matchEsi, setMatchEsi]     = useState("");
  const [matchSearch, setMatchSearch] = useState("");
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [matchSaving, setMatchSaving] = useState(false);
  const [matchError, setMatchError]   = useState("");

  const LIMIT = 100;

  const loadRecords = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(off),
        ...(tab === "unmatched" ? { unmatched_only: "true" } : {}),
      });
      const data = await authFetch(`/api/v1/uploads/${id}/records?${params}`);
      setRecords(off === 0 ? data : prev => [...prev, ...data]);
      setOffset(off);
    } catch {}
    setLoading(false);
  }, [id, tab]);

  useEffect(() => {
    authFetch(`/api/v1/uploads/${id}`).then(setBatch).catch(() => {});
  }, [id]);

  useEffect(() => { loadRecords(0); }, [loadRecords]);

  const filtered = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.raw_customer_name || "").toLowerCase().includes(q)
      || (r.raw_esiid || "").includes(q)
      || (r.resolved_esiid || "").includes(q);
  });

  const searchLeads = async (q: string) => {
    if (!q.trim()) { setMatchResults([]); return; }
    try {
      const data = await authFetch(`/api/v1/leads?search=${encodeURIComponent(q)}&limit=10`);
      setMatchResults(Array.isArray(data) ? data : data.leads || []);
    } catch { setMatchResults([]); }
  };

  const openMatch = (r: any) => {
    setMatching(r);
    setMatchEsi(r.resolved_esiid || r.raw_esiid || "");
    setMatchSearch("");
    setMatchResults([]);
    setMatchError("");
  };

  const saveMatch = async (esiid?: string) => {
    const esi = esiid || matchEsi.trim();
    if (!esi) { setMatchError("Enter an ESI ID to match."); return; }
    setMatchSaving(true);
    setMatchError("");
    try {
      await authFetch(`/api/v1/uploads/${id}/records/${matching.id}`, {
        method: "PATCH",
        body: JSON.stringify({ esiid: esi }),
      });
      setRecords(prev => prev.map(r => r.id === matching.id
        ? { ...r, resolved_esiid: esi, service_point_id: "__matched__" }
        : r
      ));
      setMatching(null);
    } catch (e: any) {
      setMatchError(e.message || "Match failed");
    }
    setMatchSaving(false);
  };

  const isMatched = (r: any) => !!r.service_point_id;

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/uploads")}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#0F1D5E]">{batch?.original_filename || "Upload Records"}</h1>
            <p className="text-sm text-slate-500">{batch?.suppliers?.name} · {batch?.rows_imported} records imported</p>
          </div>
        </div>

        {/* Amount reconciliation summary */}
        {batch?.amount_received != null && (
          <div className={`rounded-2xl border p-4 ${Math.abs((batch.total_affinity_amount || 0) - batch.amount_received) < 0.02 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-500 mb-1">Amount Received</div>
                <div className="text-lg font-bold text-slate-800">{fmtMoney(batch.amount_received)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Total Affinity Amount</div>
                <div className="text-lg font-bold text-slate-800">{fmtMoney(batch.total_affinity_amount)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Difference</div>
                <div className={`text-lg font-bold ${Math.abs((batch.total_affinity_amount || 0) - batch.amount_received) < 0.02 ? "text-green-700" : "text-red-600"}`}>
                  {batch.total_affinity_amount != null
                    ? `${(batch.total_affinity_amount - batch.amount_received) >= 0 ? "+" : ""}$${(batch.total_affinity_amount - batch.amount_received).toFixed(2)}`
                    : "—"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs + search */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 border-b border-slate-100">
            <div className="flex">
              {(["all", "unmatched"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors capitalize ${
                    tab === t ? "border-[#0F1D5E] text-[#0F1D5E]" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}>
                  {t === "unmatched" ? "Unmatched Only" : "All Records"}
                </button>
              ))}
            </div>
            <div className="relative py-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input placeholder="Search name or ESI ID..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 w-64" />
            </div>
          </div>

          {loading && records.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No records found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Customer", "ESI ID", "Service Address", "Amount", "Rate", "Usage", "Bill Start", "Bill End", "Match"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap max-w-[180px] truncate">
                          {fmt(r.raw_customer_name)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {fmt(r.resolved_esiid || r.raw_esiid)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[180px] truncate">
                          {fmt(r.raw_row_data?.["Premise Address"] || r.raw_row_data?.["Service Address"] || r.raw_row_data?.["service_address"])}
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">{fmtMoney(r.raw_amount)}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.raw_rate != null ? `$${parseFloat(r.raw_rate).toFixed(5)}` : "—"}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.raw_kwh != null ? `${parseFloat(r.raw_kwh).toLocaleString()} kWh` : "—"}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {fmt(r.raw_row_data?.["Cust Contract Start Date"] || r.raw_row_data?.["Bill Start Date"] || r.raw_row_data?.["bill_start_date"])}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {fmt(r.raw_row_data?.["Cust Contract End Date"] || r.raw_row_data?.["Bill End Date"] || r.raw_row_data?.["bill_end_date"])}
                        </td>
                        <td className="px-4 py-3">
                          {isMatched(r)
                            ? <span className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold bg-green-100 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Matched</span>
                            : <button onClick={() => openMatch(r)}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full transition-colors">
                                <Link2 className="w-3 h-3" /> Match
                              </button>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === LIMIT && (
                <div className="px-5 py-3 border-t border-slate-100 text-center">
                  <button onClick={() => loadRecords(offset + LIMIT)} disabled={loading}
                    className="text-sm text-[#0F1D5E] font-medium hover:underline disabled:opacity-50">
                    {loading ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Manual Match Modal */}
      {matching && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Match Account</h2>
              <p className="text-sm text-slate-500 mt-0.5">{matching.raw_customer_name} · <span className="font-mono">{matching.raw_esiid}</span></p>
            </div>

            {/* Search leads */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Search Lead by Name</label>
              <div className="flex gap-2">
                <input placeholder="Type customer name..."
                  value={matchSearch}
                  onChange={e => { setMatchSearch(e.target.value); searchLeads(e.target.value); }}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20" />
              </div>
              {matchResults.length > 0 && (
                <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {matchResults.map((lead: any) => (
                    <button key={lead.id} onClick={() => saveMatch(lead.esiid || matchEsi)}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="font-semibold text-sm text-slate-800">{lead.name}</div>
                      {lead.esiid && <div className="text-xs text-slate-400 font-mono">{lead.esiid}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-3">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Or enter ESI ID manually</label>
              <input placeholder="e.g. 10443720003526970"
                value={matchEsi}
                onChange={e => setMatchEsi(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20" />
            </div>

            {matchError && <p className="text-red-600 text-sm">{matchError}</p>}

            <div className="flex gap-3">
              <button onClick={() => setMatching(null)}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => saveMatch()} disabled={matchSaving}
                className="flex-1 py-2 bg-[#0F1D5E] text-white rounded-xl text-sm font-bold hover:bg-[#0F1D5E]/90 disabled:opacity-50">
                {matchSaving ? "Saving..." : "Save Match"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
