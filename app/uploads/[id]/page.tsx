"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, ArrowLeft, Search, Link2, Banknote, Loader2 } from "lucide-react";
import DepositStatusBadge from "@/components/DepositStatusBadge";

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

  const isMatched = (r: any) => !!r.service_point_id || !!r.lead_deal_matched;

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

        {/* Bank deposit check */}
        {batch && batch.status === "confirmed" && (
          <DepositCard batch={batch} onSaved={setBatch} />
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
                      {["Customer", "ESI ID", "REP", "Service Address", "Amount", "Rate", "Usage", "Bill Start", "Bill End", "Match"].map(h => (
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
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-[#EEF1FA] text-[#0F1D5E] font-semibold">
                            {batch?.suppliers?.name || "—"}
                          </span>
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
                          {isMatched(r) ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold bg-green-100 px-2 py-1 rounded-full w-fit">
                                <CheckCircle className="w-3 h-3" /> Matched
                              </span>
                              {r.lead_match?.lead_name && (
                                <a href={`/crm/leads/${r.lead_match.lead_id}`}
                                  className="text-[10px] text-[#0F1D5E] hover:underline truncate max-w-[120px]"
                                  title={r.lead_match.lead_name}>
                                  {r.lead_match.lead_name}
                                </a>
                              )}
                            </div>
                          ) : (
                            <button onClick={() => openMatch(r)}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full transition-colors">
                              <Link2 className="w-3 h-3" /> Match
                            </button>
                          )}
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


function DepositCard({ batch, onSaved }: { batch: any; onSaved: (b: any) => void }) {
  const dep = batch.deposit || {};
  const [amount, setAmount] = useState<string>(dep.amount_received != null ? String(dep.amount_received) : "");
  const [date, setDate]     = useState<string>(dep.received_at || "");
  const [notes, setNotes]   = useState<string>(dep.received_notes || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  useEffect(() => {
    setAmount(dep.amount_received != null ? String(dep.amount_received) : "");
    setDate(dep.received_at || "");
    setNotes(dep.received_notes || "");
  }, [dep.amount_received, dep.received_at, dep.received_notes]);

  const save = async (clear = false) => {
    setSaving(true); setErr("");
    try {
      const body = clear
        ? { amount_received: null }
        : { amount_received: parseFloat(amount), received_at: date || null, notes: notes || null };
      if (!clear && (amount.trim() === "" || isNaN(body.amount_received as number))) {
        setErr("Enter the deposit amount from your bank."); setSaving(false); return;
      }
      const updated = await authFetch(`/api/v1/uploads/${batch.id}/received`, { method: "PUT", body: JSON.stringify(body) });
      onSaved({ ...batch, ...updated });
    } catch (e: any) {
      setErr(e.message || "Save failed");
    }
    setSaving(false);
  };

  const tone = dep.status === "paid_in_full" || dep.status === "explained_withholding"
    ? "border-green-200 bg-green-50/40"
    : dep.status === "short_paid" || dep.status === "over_paid" || dep.status === "overdue"
      ? "border-red-200 bg-red-50/40"
      : "border-slate-200 bg-white";

  const recorded = dep.amount_received != null;
  const diff = dep.difference;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-[#0F1D5E]" />
          <h2 className="text-sm font-bold text-[#0F1D5E]">Bank deposit check</h2>
          <DepositStatusBadge status={dep.status} />
        </div>
        {dep.expected_pay_date && (
          <span className="text-xs text-slate-500">Statement pay date {dep.expected_pay_date}</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center mb-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Statement total</div>
          <div className="text-lg font-bold text-slate-800">{fmtMoney(dep.statement_total)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Withheld (per statement)</div>
          <div className="text-lg font-bold text-slate-800">{dep.total_withheld ? fmtMoney(dep.total_withheld) : "$0.00"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Expected deposit</div>
          <div className="text-lg font-bold text-slate-800">{fmtMoney(dep.expected_deposit)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Received in bank</div>
          <div className="text-lg font-bold text-slate-800">{recorded ? fmtMoney(dep.amount_received) : "—"}</div>
          {recorded && dep.received_at && <div className="text-[11px] text-slate-400">{dep.received_at}</div>}
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Difference</div>
          <div className={`text-lg font-bold ${diff == null ? "text-slate-400" : Math.abs(diff) < 0.02 ? "text-green-700" : "text-red-600"}`}>
            {diff == null ? "—" : `${diff >= 0 ? "+" : "-"}$${Math.abs(diff).toFixed(2)}`}
          </div>
        </div>
      </div>

      {dep.explanation && (
        <p className="text-sm text-slate-600 mb-4">{dep.explanation}{recorded && dep.received_by ? ` Recorded by ${dep.received_by}.` : ""}</p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-500">
          <span className="block mb-1 font-medium">Deposit amount ($)</span>
          <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder={dep.expected_deposit != null ? dep.expected_deposit.toFixed(2) : "0.00"}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-40 bg-white" />
        </label>
        <label className="text-xs text-slate-500">
          <span className="block mb-1 font-medium">Posted to bank on</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
        </label>
        <label className="text-xs text-slate-500 flex-1 min-w-[200px]">
          <span className="block mb-1 font-medium">Note (optional)</span>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} maxLength={500}
            placeholder="e.g. wire fee $15, or one deposit covering two statements"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full bg-white" />
        </label>
        <button onClick={() => save(false)} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#182a7a] disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {recorded ? "Update deposit" : "Mark received"}
        </button>
        {recorded && (
          <button onClick={() => save(true)} disabled={saving}
            className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50">
            Clear
          </button>
        )}
      </div>
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
    </div>
  );
}
