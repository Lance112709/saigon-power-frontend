"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Award, AlertTriangle, TrendingDown, TrendingUp, Banknote } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortMonth(m: string) {
  return `${MONTHS_SHORT[parseInt(m.slice(5, 7), 10) - 1]} '${m.slice(2, 4)}`;
}

function gradeOf(acc: number | null): { letter: string; cls: string } {
  if (acc == null) return { letter: "—", cls: "bg-slate-100 text-slate-400" };
  if (acc >= 95) return { letter: "A", cls: "bg-emerald-100 text-emerald-700" };
  if (acc >= 85) return { letter: "B", cls: "bg-lime-100 text-lime-700" };
  if (acc >= 70) return { letter: "C", cls: "bg-amber-100 text-amber-700" };
  if (acc >= 50) return { letter: "D", cls: "bg-orange-100 text-orange-700" };
  return { letter: "F", cls: "bg-red-100 text-red-700" };
}

export default function ScorecardsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sc, setSc] = useState<any>(null);
  const [intel, setIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "manager") router.push("/dashboard");
  }, [user, router]);

  useEffect(() => {
    Promise.allSettled([api.getProviderScorecards(6), api.getCommissionIntelligence()])
      .then(([s, i]) => {
        setSc(s.status === "fulfilled" ? s.value : null);
        setIntel(i.status === "fulfilled" ? i.value : null);
      })
      .finally(() => setLoading(false));
  }, []);

  const openLossBySupplier = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of intel?.provider_accuracy ?? []) m[p.supplier_id] = p.open_loss ?? 0;
    return m;
  }, [intel]);

  const providers = useMemo(() => {
    const list = (sc?.providers ?? []).map((p: any) => {
      const months = sc.months.map((m: string) => ({
        month: m, label: shortMonth(m), ...(p.months[m] ?? {}),
      }));
      const withAcc = months.filter((m: any) => m.accuracy_pct != null);
      const latest = [...withAcc].reverse()[0];
      const avgAcc = withAcc.length
        ? withAcc.reduce((s: number, m: any) => s + m.accuracy_pct, 0) / withAcc.length
        : null;
      const totalReceived = months.reduce((s: number, m: any) => s + (m.received ?? 0), 0);
      const totalDisc = months.reduce((s: number, m: any) => s + (m.discrepancy ?? 0), 0);
      const trend = withAcc.length >= 2
        ? withAcc[withAcc.length - 1].accuracy_pct - withAcc[0].accuracy_pct : 0;
      return {
        ...p, monthsData: months, avgAcc, latestAcc: latest?.accuracy_pct ?? null,
        totalReceived, totalDisc, trend,
        openLoss: openLossBySupplier[p.supplier_id] ?? 0,
      };
    });
    list.sort((a: any, b: any) => (b.avgAcc ?? -1) - (a.avgAcc ?? -1));
    return list;
  }, [sc, openLossBySupplier]);

  if (loading) return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center text-slate-400 text-sm">
      Grading providers…
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1D5E] via-[#182a80] to-[#2a3f9e] text-white p-6 shadow-lg">
        <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Award className="w-6 h-6" /> Provider Scorecards
          </h1>
          <p className="text-white/60 mt-1 text-sm">
            How accurately each provider pays — graded on the share of accounts that reconcile
            clean each statement month (last 6 months).
          </p>
        </div>
      </div>

      {providers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-sm">
          No reconciliation history yet — upload statements to grade providers.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {providers.map((p: any) => {
            const grade = gradeOf(p.avgAcc);
            return (
              <div key={p.supplier_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${grade.cls}`}>
                      {grade.letter}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-[#0F1D5E] truncate">{p.supplier_name}</h2>
                      <p className="text-xs text-slate-400">
                        {p.avgAcc != null ? `${p.avgAcc.toFixed(1)}% avg accuracy` : "no data"}
                        {p.trend !== 0 && (
                          <span className={`ml-1.5 inline-flex items-center gap-0.5 font-semibold ${p.trend > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {p.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(p.trend).toFixed(0)}pt
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-right shrink-0">
                    <div>
                      <p className="text-sm font-bold text-emerald-600 tabular-nums flex items-center gap-1 justify-end">
                        <Banknote className="w-3.5 h-3.5" />{fmt(p.totalReceived)}
                      </p>
                      <p className="text-[11px] text-slate-400">received 6mo</p>
                    </div>
                    {p.openLoss > 0 && (
                      <div>
                        <p className="text-sm font-bold text-red-600 tabular-nums flex items-center gap-1 justify-end">
                          <AlertTriangle className="w-3.5 h-3.5" />{fmt(p.openLoss)}
                        </p>
                        <p className="text-[11px] text-slate-400">open loss</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-3 pt-3 pb-1">
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={p.monthsData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={22}>
                      <CartesianGrid vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={30}
                        tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip cursor={{ fill: "#f8fafc" }} content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const m = payload[0].payload;
                        return (
                          <div className="bg-[#0F1D5E] text-white rounded-xl px-3.5 py-2.5 text-xs space-y-0.5">
                            <p className="font-bold">{m.label}</p>
                            <p>Accuracy: <span className="font-semibold">{m.accuracy_pct != null ? `${m.accuracy_pct}%` : "—"}</span></p>
                            <p>Received: <span className="font-semibold tabular-nums">{fmt(m.received)}</span></p>
                            <p>Issues: <span className="font-semibold">{m.issues ?? 0}</span></p>
                          </div>
                        );
                      }} />
                      <Bar dataKey="accuracy_pct" radius={[4, 4, 0, 0]} fill="#2a78d6" isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
