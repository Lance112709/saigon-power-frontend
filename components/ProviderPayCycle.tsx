"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, CircleDashed, Loader2, AlertTriangle } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function longMonth(m: string) { return `${MONTHS[parseInt(m.slice(5, 7), 10) - 1]} ${m.slice(0, 4)}`; }
function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function ordinal(d?: number | null) {
  if (!d) return "";
  const s = ["th", "st", "nd", "rd"], v = d % 100;
  return `${d}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** Who has paid Saigon Power for one statement month — one chip per provider. */
export default function ProviderPayCycle({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    api.getDepositCycle(month)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => !cancelled && setError(String(e?.message || e).replace(/^\d+:/, "")))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [month]);

  const open = (e: any) => { if (e.batch_ids?.length === 1) router.push(`/uploads/${e.batch_ids[0]}`); else router.push("/payments"); };
  const paid = data?.paid ?? [], awaiting = data?.awaiting ?? [], missing = data?.missing ?? [];
  const unmatched = data?.unmatched_deposits ?? [];
  const total = data?.providers ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => data && setMonth(data.previous_month)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500" title="Previous statement month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-[#0F1D5E]">
              Who has paid · {data ? longMonth(data.month) : "…"} statements
              {loading && <Loader2 className="inline w-3.5 h-3.5 ml-2 animate-spin text-slate-400" />}
            </h2>
            {data && (
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-emerald-700">{paid.length} of {total} providers paid</span>
                {" · "}{awaiting.length} statement{awaiting.length === 1 ? "" : "s"} in, deposit pending
                {" · "}{missing.length} not received yet
                {unmatched.length > 0 && <span className="text-red-700 font-semibold">{" · "}{unmatched.length} deposit{unmatched.length === 1 ? "" : "s"} in the bank with no statement</span>}
                {" · "}{fmt(data.totals?.received)} in the bank
              </p>
            )}
          </div>
          <button onClick={() => data && setMonth(data.next_month)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500" title="Next statement month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!compact && <span className="text-[11px] text-slate-400">Statements for a month are paid the following month. Click a chip to open the statement.</span>}
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {data && (
        <div className="mt-3 flex flex-wrap gap-2">
          {paid.map((e: any) => (
            <button key={e.supplier_id} onClick={() => open(e)} title={`${fmt(e.amount_received)} received ${e.received_at || ""}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" /> {e.provider}
              <span className="font-normal text-emerald-700/80">{fmt(e.amount_received)}</span>
            </button>
          ))}
          {awaiting.map((e: any) => (
            <button key={e.supplier_id} onClick={() => open(e)} title={`Statement received, ${fmt(e.expected_deposit)} expected${e.due_date ? ` by ${e.due_date}` : ""}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100">
              <Clock className="w-3.5 h-3.5" /> {e.provider}
              <span className="font-normal text-amber-700/80">{fmt(e.expected_deposit)} pending</span>
            </button>
          ))}
          {unmatched.map((d: any) => (
            <button key={d.id} onClick={() => router.push("/payments#bank-deposits")}
              title={`Deposit of ${fmt(d.amount)} posted ${d.posted_at} has no statement in the CRM${d.likely_provider ? ` — looks like ${d.likely_provider}` : ""}. Find the statement in email and upload it.`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100">
              <AlertTriangle className="w-3.5 h-3.5" /> {d.likely_provider ? `${d.likely_provider}?` : "Unknown payer"}
              <span className="font-normal">{fmt(d.amount)} paid · no statement</span>
            </button>
          ))}
          {missing.map((e: any) => (
            <span key={e.supplier_id} title={`No ${data ? longMonth(data.month) : ""} statement yet${e.usual_day ? ` · usually pays around the ${ordinal(e.usual_day)}` : ""}${e.last_statement_month ? ` · last statement ${longMonth(e.last_statement_month)}` : ""}`}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${e.overdue ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
              <CircleDashed className="w-3.5 h-3.5" /> {e.provider}
              <span className="font-normal opacity-80">{e.overdue ? "overdue" : e.usual_day ? `~${ordinal(e.usual_day)}` : "no statement"}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
