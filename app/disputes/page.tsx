"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Scale, Send, CheckCircle, XCircle, FileEdit, Banknote, MailQuestion,
} from "lucide-react";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const STATUS_META: Record<string, { label: string; badge: string; icon: any }> = {
  draft:              { label: "Draft — review & send", badge: "bg-amber-100 text-amber-800",   icon: FileEdit },
  sent:               { label: "Sent — awaiting provider", badge: "bg-blue-100 text-blue-800",  icon: Send },
  provider_responded: { label: "Provider responded",   badge: "bg-violet-100 text-violet-800", icon: MailQuestion },
  recovered:          { label: "Recovered",             badge: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  rejected:           { label: "Rejected",              badge: "bg-slate-100 text-slate-500",   icon: XCircle },
};

const ORDER = ["draft", "sent", "provider_responded", "recovered", "rejected"];

export default function DisputesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  useEffect(() => {
    api.getDisputes()
      .then((d: any) => setDisputes(d || []))
      .catch(() => setDisputes([]))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => ({
    claimed: disputes.reduce((s, d) => s + (d.total_claimed ?? 0), 0),
    recovered: disputes.reduce((s, d) => s + (d.total_recovered ?? 0), 0),
    open: disputes.filter(d => ["draft", "sent", "provider_responded"].includes(d.status)).length,
  }), [disputes]);

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const d of disputes) (g[d.status] ??= []).push(d);
    return g;
  }, [disputes]);

  const heroTile = "rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-3.5";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1D5E] via-[#182a80] to-[#2a3f9e] text-white p-6 shadow-lg">
        <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Scale className="w-6 h-6" /> Provider Disputes
          </h1>
          <p className="text-white/60 mt-1 text-sm">
            Every package is drafted by the audit engine and sent only after you review it.
            Create disputes from the Reconciliation page.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-3 mt-6 max-w-2xl">
          <div className={heroTile}>
            <p className="text-xs text-white/60 font-medium">Open Disputes</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{totals.open}</p>
          </div>
          <div className={heroTile}>
            <p className="text-xs text-white/60 font-medium">Total Claimed</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{fmt(totals.claimed)}</p>
          </div>
          <div className={heroTile}>
            <p className="text-xs text-white/60 font-medium flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-300" /> Recovered
            </p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-emerald-300">{fmt(totals.recovered)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="p-8 text-center text-slate-400 text-sm">Loading…</p>
      ) : disputes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <Scale className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">No disputes yet</p>
          <p className="text-slate-400 text-sm mt-1">
            When the audit engine finds systemic problems (like a provider cutting your rate),
            create a dispute from the Reconciliation page — the full package lands here for review.
          </p>
        </div>
      ) : (
        ORDER.filter(s => grouped[s]?.length).map(status => {
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          return (
            <div key={status} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <Icon className="w-4 h-4 text-[#0F1D5E]" />
                <h2 className="text-sm font-bold text-[#0F1D5E]">{meta.label}</h2>
                <span className="text-xs text-slate-400">({grouped[status].length})</span>
              </div>
              <div className="divide-y divide-slate-100">
                {grouped[status].map(d => (
                  <button key={d.id} onClick={() => router.push(`/disputes/${d.id}`)}
                    className="w-full text-left px-5 py-4 hover:bg-slate-50 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[240px]">
                      <p className="text-sm font-bold text-[#0F1D5E]">{d.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {d.suppliers?.name ?? "Provider"}
                        {Array.isArray(d.months) && d.months.length > 0 && <> · {d.months.join(", ")}</>}
                        {d.created_at && <> · created {String(d.created_at).slice(0, 10)}</>}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}>{meta.label.split(" — ")[0]}</span>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800 tabular-nums">{fmt(d.total_claimed)}</p>
                      {d.total_recovered > 0 && (
                        <p className="text-xs text-emerald-600 font-semibold tabular-nums">recovered {fmt(d.total_recovered)}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
