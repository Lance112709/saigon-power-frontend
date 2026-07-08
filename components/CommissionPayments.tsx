"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DollarSign, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  unpaid: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<string, string> = { paid: "Paid", partial: "Partial", unpaid: "Unpaid" };

const fmtMonth = (m?: string) => {
  if (!m) return "—";
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
};
const fmtUsd = (v: number) => "$" + (v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CommissionPayments({ customerId, dealId, leadId }: {
  customerId?: string; dealId?: string; leadId?: string;
}) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    const params: Record<string, string> = {};
    if (customerId) params.customer_id = customerId;
    else if (dealId) params.deal_id = dealId;
    else if (leadId) params.lead_id = leadId;
    else return;
    (api as any).getCommissionPayments(params).then(setData).catch(() => setFailed(true));
  }, [isAdmin, customerId, dealId, leadId]);

  if (!isAdmin || failed) return null;

  const payments = data?.payments || [];
  const visible = showAll ? payments : payments.slice(0, 12);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#0F1D5E]" />
          <h3 className="text-sm font-bold text-[#0F1D5E]">Commission Payments ({payments.length})</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Admin only</span>
        </div>
        {data && payments.length > 0 && (
          <div className="flex items-center gap-3">
            {data.latest_status && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[data.latest_status]}`}>
                Latest month: {STATUS_LABEL[data.latest_status]}
              </span>
            )}
            <span className="text-sm text-slate-500">Total received <span className="font-bold text-emerald-600">{fmtUsd(data.total)}</span></span>
          </div>
        )}
      </div>

      {!data ? (
        <p className="px-5 py-6 text-center text-slate-400 text-sm">Loading payments…</p>
      ) : payments.length === 0 ? (
        <p className="px-5 py-6 text-center text-slate-400 text-sm">
          No commission payments found for {data.esi_ids?.length ? `ESI ID${data.esi_ids.length > 1 ? "s" : ""} ${data.esi_ids.join(", ")}` : "this record (no ESI ID on file)"}.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Statement Month", "Supplier", "Amount", "kWh", "Rate", "Service Period", "ESI ID", "Status", "Statement"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap">{fmtMonth((p.payment_date || "").slice(0, 7))}</td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{p.supplier || "—"}</td>
                    <td className={`px-4 py-2.5 font-bold whitespace-nowrap ${p.amount < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmtUsd(p.amount)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p.kwh != null ? Number(p.kwh).toLocaleString() : "—"}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p.rate != null ? Number(p.rate).toFixed(4) : "—"}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                      {p.service_start && p.service_end ? `${p.service_start} → ${p.service_end}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{p.esi_id}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[p.status] || STATUS_STYLE.paid}`}>
                        {STATUS_LABEL[p.status] || "Paid"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs max-w-[180px] truncate" title={p.statement_file || ""}>{p.statement_file || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {payments.length > 12 && (
            <button onClick={() => setShowAll(v => !v)}
              className="w-full py-2.5 text-xs font-semibold text-[#0F1D5E] hover:bg-[#EEF1FA] border-t border-slate-100 flex items-center justify-center gap-1">
              {showAll ? <>Show fewer <ChevronUp className="w-3.5 h-3.5" /></> : <>Show all {payments.length} payments <ChevronDown className="w-3.5 h-3.5" /></>}
            </button>
          )}
        </>
      )}
    </div>
  );
}
