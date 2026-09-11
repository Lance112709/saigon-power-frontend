"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { History, ChevronDown, ChevronUp, Bot, User } from "lucide-react";

type Change = { field: string; from: any; to: any };
type Event = {
  id: string; at: string; actor: string; actor_name: string; system: boolean;
  table: string; record_id: string; action: string; label: string;
  changes: Change[]; details: Record<string, any> | null; snapshot: Record<string, any> | null; reason: string;
};

const TONE: Record<string, string> = {
  created: "bg-emerald-100 text-emerald-700", renewed: "bg-indigo-100 text-indigo-700",
  converted: "bg-indigo-100 text-indigo-700", deleted: "bg-red-100 text-red-700",
  terminated: "bg-red-100 text-red-700", deactivated: "bg-red-100 text-red-700",
  reactivated: "bg-emerald-100 text-emerald-700", status: "bg-amber-100 text-amber-700",
  note: "bg-sky-100 text-sky-700", attachment: "bg-sky-100 text-sky-700",
};
const tone = (action: string) => {
  for (const k of Object.keys(TONE)) if (action.includes(k)) return TONE[k];
  return "bg-slate-100 text-slate-600";
};
const pretty = (f: string) => f.replace(/_/g, " ").replace(/\b(esiid)\b/i, "ESI ID").replace(/\bdob\b/i, "DOB");
const val = (v: any) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const s = String(v);
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
};
const when = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

export default function ActivityLog({ customerId, leadId, dealId }: { customerId?: string; leadId?: string; dealId?: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [events, setEvents] = useState<Event[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isAdmin) return;
    const p = customerId ? api.getCustomerActivity(customerId)
      : dealId ? api.getCrmDealActivity(dealId)
      : leadId ? api.getLeadActivity(leadId) : null;
    if (!p) return;
    p.then((r: any) => setEvents(r.events ?? [])).catch(() => setEvents([]));
  }, [isAdmin, customerId, leadId, dealId]);

  if (!isAdmin) return null;   // admin-only

  const visible = showAll ? (events ?? []) : (events ?? []).slice(0, 15);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#0F1D5E]" />
          <h3 className="text-sm font-bold text-[#0F1D5E]">Activity Log{events ? ` (${events.length})` : ""}</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Admin only</span>
        </div>
        <span className="text-[11px] text-slate-400">Who changed what, and when · newest first</span>
      </div>

      {events === null ? (
        <p className="px-5 py-6 text-center text-slate-400 text-sm">Loading activity…</p>
      ) : events.length === 0 ? (
        <p className="px-5 py-6 text-center text-slate-400 text-sm">No recorded activity yet. Changes made from now on will appear here.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map(e => {
            const extra = e.changes.length > 4;
            const shown = open[e.id] || !extra ? e.changes : e.changes.slice(0, 4);
            const facts = e.details || e.snapshot;
            return (
              <li key={e.id} className="px-5 py-3 flex gap-3">
                <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${e.system ? "bg-slate-100 text-slate-500" : "bg-[#EEF1FA] text-[#0F1D5E]"}`}>
                  {e.system ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{e.actor_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${tone(e.action)}`}>{e.label}</span>
                    {e.table && <span className="text-[10px] uppercase tracking-wider text-slate-400">{e.table === "crm_deals" || e.table === "lead_deals" ? "deal" : e.table === "crm_customers" ? "customer" : e.table === "leads" ? "lead" : e.table}</span>}
                    <span className="ml-auto text-xs text-slate-400 whitespace-nowrap">{when(e.at)}</span>
                  </div>
                  {e.reason && <p className="text-xs text-slate-500 mt-0.5">{e.reason}</p>}
                  {shown.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {shown.map(c => (
                        <span key={c.field} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                          <span className="text-slate-500 capitalize">{pretty(c.field)}:</span>
                          <span className="text-slate-400 line-through">{val(c.from)}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-semibold text-slate-700">{val(c.to)}</span>
                        </span>
                      ))}
                      {extra && (
                        <button onClick={() => setOpen(o => ({ ...o, [e.id]: !o[e.id] }))} className="text-[11px] font-semibold text-[#0F1D5E] hover:underline">
                          {open[e.id] ? "fewer" : `+${e.changes.length - 4} more`}
                        </button>
                      )}
                    </div>
                  )}
                  {shown.length === 0 && facts && (
                    <p className="text-xs text-slate-500 mt-1 break-words">
                      {Object.entries(facts).filter(([k, v]) => v !== null && v !== "" && k !== "id").slice(0, 8)
                        .map(([k, v]) => `${pretty(k)}: ${val(v)}`).join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {(events?.length ?? 0) > 15 && (
        <button onClick={() => setShowAll(v => !v)}
          className="w-full py-2.5 text-xs font-semibold text-[#0F1D5E] hover:bg-[#EEF1FA] border-t border-slate-100 flex items-center justify-center gap-1">
          {showAll ? <>Show fewer <ChevronUp className="w-3.5 h-3.5" /></> : <>Show all {events!.length} entries <ChevronDown className="w-3.5 h-3.5" /></>}
        </button>
      )}
    </div>
  );
}
