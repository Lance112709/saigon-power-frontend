"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Zap, Phone, Loader2, LogOut, CalendarClock, Share2, Copy, CheckCircle,
  AlertTriangle, ChevronRight, Gift, MessageSquare, Mail,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "portal_token";

const inputCls = "w-full px-4 py-3.5 border border-white/15 rounded-2xl text-base bg-white/10 text-white placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 text-center tracking-widest font-semibold";

function daysBadge(d: number | null, m2m: boolean) {
  if (m2m) return { label: "Month-to-month", cls: "bg-white/10 text-white/70" };
  if (d == null) return { label: "", cls: "" };
  if (d < 0) return { label: "Contract ended", cls: "bg-red-500/20 text-red-300" };
  if (d <= 30) return { label: `${d} days left`, cls: "bg-red-500/20 text-red-300" };
  if (d <= 60) return { label: `${d} days left`, cls: "bg-amber-500/20 text-amber-300" };
  return { label: `${d} days left`, cls: "bg-white/10 text-white/60" };
}

const ENR_STATUS: Record<string, string> = {
  submitted: "Received — in review",
  needs_review: "In review",
  sent_to_provider: "Submitted to provider",
  accepted: "Approved 🎉",
  active: "Active 🎉",
  rejected: "Needs a call — we'll reach out",
  cancelled: "Cancelled",
};

export default function CustomerPortal() {
  const [step, setStep] = useState<"phone" | "code" | "home">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [me, setMe] = useState<any>(null);
  const [renewMsg, setRenewMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  const loadMe = async (t: string) => {
    const r = await fetch(`${API}/api/v1/portal/me`, { headers: { Authorization: `Bearer ${t}` } });
    if (!r.ok) throw new Error("expired");
    setMe(await r.json());
    setStep("home");
  };

  useEffect(() => {
    // PWA service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) loadMe(t).catch(() => localStorage.removeItem(TOKEN_KEY));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestCode = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`${API}/api/v1/portal/request-code`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Something went wrong.");
      setChallenge(d.challenge); setHint(d.hint); setStep("code");
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const verify = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`${API}/api/v1/portal/verify-code`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, challenge }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Wrong code.");
      localStorage.setItem(TOKEN_KEY, d.token);
      await loadMe(d.token);
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const requestRenewal = async (plan: any) => {
    setRenewMsg("");
    const t = localStorage.getItem(TOKEN_KEY);
    const r = await fetch(`${API}/api/v1/portal/renewal-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ plan: { plan_name: plan.plan_name, provider: plan.provider, end: plan.end } }),
    });
    const d = await r.json();
    setRenewMsg(r.ok ? d.message : (d.detail || "Please call us."));
  };

  const share = async () => {
    const link = me?.referral?.link;
    if (!link) return;
    if (navigator.share) {
      try { await navigator.share({ title: "Saigon Power", text: "They found me a cheaper electricity rate and handled everything — check them out:", url: link }); return; } catch {}
    }
    await navigator.clipboard.writeText(link);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const logout = () => { localStorage.removeItem(TOKEN_KEY); setMe(null); setStep("phone"); setPhone(""); setCode(""); };

  const activePlans = useMemo(() => (me?.plans ?? []).filter((p: any) => p.active), [me]);
  const urgent = activePlans.find((p: any) => !p.month_to_month && p.days_left != null && p.days_left <= 60);

  return (
    <div className="min-h-screen bg-[#0a1a0e] text-white" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-2.5">
          <img src="/sgpower-logo.webp" alt="" className="h-9 w-9 object-contain" />
          <div>
            <p className="font-black leading-tight">Saigon Power</p>
            <p className="text-[11px] text-white/40">My Account</p>
          </div>
        </div>
        {step === "home" && (
          <button onClick={logout} className="text-white/40 hover:text-white"><LogOut className="w-4 h-4" /></button>
        )}
      </div>

      <div className="max-w-lg mx-auto px-5 pb-16">
        {/* ── Login: phone ── */}
        {step === "phone" && (
          <div className="mt-10">
            <h1 className="text-2xl font-black text-center">Check your plan.<br /><span className="text-[#22c55e]">Never overpay again.</span></h1>
            <p className="text-white/45 text-sm text-center mt-3 mb-8">
              Enter the phone number on your account — we'll email you a login code. No password needed.
            </p>
            <input
              type="tel" inputMode="numeric" autoComplete="tel"
              placeholder="(832) 555-1234"
              value={phone} onChange={e => setPhone(e.target.value)}
              className={inputCls}
            />
            {err && <p className="text-red-300 text-sm text-center mt-3 bg-red-500/10 rounded-xl px-4 py-3">{err}</p>}
            <button onClick={requestCode} disabled={busy || phone.replace(/\D/g, "").length < 10}
              className="w-full mt-4 py-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] font-black text-white disabled:opacity-40 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Email Me a Code <Mail className="w-4 h-4" /></>}
            </button>
            <p className="text-center text-xs text-white/30 mt-6">
              New customer? <a href="/enroll" className="text-[#22c55e] font-semibold">Enroll in 2 minutes →</a>
            </p>
          </div>
        )}

        {/* ── Login: code ── */}
        {step === "code" && (
          <div className="mt-10">
            <h1 className="text-2xl font-black text-center">Enter your code</h1>
            <p className="text-white/45 text-sm text-center mt-2 mb-8">{hint}</p>
            <input
              type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              placeholder="••••••"
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`${inputCls} text-2xl`}
            />
            {err && <p className="text-red-300 text-sm text-center mt-3 bg-red-500/10 rounded-xl px-4 py-3">{err}</p>}
            <button onClick={verify} disabled={busy || code.length !== 6}
              className="w-full mt-4 py-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] font-black text-white disabled:opacity-40 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
            </button>
            <button onClick={() => { setStep("phone"); setErr(""); }} className="w-full mt-3 text-sm text-white/40">
              Use a different number
            </button>
          </div>
        )}

        {/* ── Home ── */}
        {step === "home" && me && (
          <div className="space-y-4 mt-2">
            <h1 className="text-xl font-black">Hi {me.name?.split(" ")[0] || "there"} 👋</h1>

            {/* membership + tracked-contract dashboard */}
            {me.membership && (() => {
              const m = me.membership;
              const price = ({ POWER_PLUS_RES: "$9.99", POWER_PLUS_COM: "$19.99", plus: "$9.99", managed: "$12.99", "managed-plus": "$19.99" } as Record<string, string>)[m.plan_id];
              const active = m.status === "ACTIVE";
              const cancelled = m.status === "CANCELLED";
              const dl = m.contract_days_left;
              const pct = dl == null ? null : Math.min(96, Math.max(4, Math.round((1 - dl / 365) * 100)));
              const endTxt = m.contract_end_date
                ? new Date(String(m.contract_end_date).slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : null;
              const renewal = dl == null ? null : dl < 0 ? { t: "Expired", c: "text-red-300" }
                : dl <= 60 ? { t: "Renewal window", c: "text-amber-300" } : { t: "On track", c: "text-[#22c55e]" };
              return (
                <div className="space-y-3">
                  <p className="text-xs font-black text-white/35 uppercase tracking-widest">My Membership</p>

                  <div className="rounded-2xl bg-gradient-to-br from-[#22c55e]/12 to-white/5 border border-[#22c55e]/25 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-sm">{m.plan_name || "Saigon Power membership"}</p>
                        {price && <p className="text-xs text-white/45 mt-0.5">{price}/month · cancel anytime</p>}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider shrink-0 ${
                        active ? "bg-[#22c55e]/15 text-[#22c55e]"
                        : cancelled ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}`}>
                        {active ? "● ACTIVE" : cancelled ? "CANCELLED" : "ACTIVATION PENDING"}
                      </span>
                    </div>
                    {(m.card_last4 || m.next_billing_date) && (
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-white/45">
                        {m.card_last4 && <span>{m.card_brand || "Card"} •••• {m.card_last4}</span>}
                        {m.next_billing_date && <span>Next billing {String(m.next_billing_date).slice(0, 10)}</span>}
                      </div>
                    )}
                    {!active && !cancelled && (
                      <p className="mt-3 text-xs text-white/45 bg-white/5 rounded-lg px-3 py-2">
                        We received your signup — our team will reach out to finish activating your membership.
                      </p>
                    )}
                  </div>

                  {(m.contract_end_date || m.current_provider) && (
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-black text-sm">Your Energy Dashboard</p>
                        <span className="px-2.5 py-1 rounded-full bg-[#22c55e]/15 text-[#22c55e] text-[10px] font-black tracking-wider">● MONITORING</span>
                      </div>
                      <div className="rounded-xl bg-[#060f09] border border-white/8 p-4">
                        <p className="text-white/50 text-[11px] font-bold">Current contract status</p>
                        <p className="font-black text-lg tracking-tight mt-0.5 mb-3">
                          {endTxt
                            ? (dl != null && dl < 0 ? `Your contract ended ${endTxt}` : `You're covered until ${endTxt}`)
                            : "We're tracking your account"}
                        </p>
                        {pct != null && dl != null && dl >= 0 && (
                          <>
                            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                              <span className="block h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#4ade80]" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex justify-between text-[11px] text-white/40 mt-1.5">
                              <span>Contract progress</span><span>{dl} days remaining</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                        <div className="rounded-xl border border-white/8 bg-white/4 p-3.5">
                          <p className="text-[11px] text-white/40 font-bold mb-0.5">Renewal status</p>
                          <p className={`font-black text-sm ${renewal ? renewal.c : "text-white/60"}`}>{renewal ? renewal.t : "—"}</p>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-white/4 p-3.5">
                          <p className="text-[11px] text-white/40 font-bold mb-0.5">Current provider</p>
                          <p className="font-black text-sm truncate">{m.current_provider || "—"}</p>
                        </div>
                      </div>
                      {dl != null && dl >= 0 && dl <= 60 && (
                        <p className="mt-2.5 text-xs text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2 flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5 shrink-0" /> Your renewal window is open — we'll compare plans and reach out with options.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* urgent renewal banner */}
            {urgent && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4">
                <p className="font-bold text-amber-300 flex items-center gap-2 text-sm">
                  <CalendarClock className="w-4 h-4" /> Your contract ends in {urgent.days_left} days
                </p>
                <p className="text-white/50 text-xs mt-1">Lock in a new rate before it rolls onto an expensive variable plan.</p>
                <button onClick={() => requestRenewal(urgent)}
                  className="mt-3 w-full py-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-black">
                  Get My Best Renewal Rate — Free
                </button>
              </div>
            )}
            {renewMsg && (
              <p className="text-sm text-[#4ade80] bg-[#22c55e]/10 border border-[#22c55e]/25 rounded-xl px-4 py-3 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />{renewMsg}
              </p>
            )}

            {/* plans */}
            <div>
              <p className="text-xs font-black text-white/35 uppercase tracking-widest mb-2">My Plans</p>
              {activePlans.length === 0 && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-sm text-white/50">
                  No active plans on this number yet. <a href="/enroll" className="text-[#22c55e] font-bold">Enroll now →</a>
                </div>
              )}
              <div className="space-y-3">
                {activePlans.map((p: any) => {
                  const b = daysBadge(p.days_left, p.month_to_month);
                  return (
                    <div key={`${p.source}-${p.id}`} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-sm">{p.plan_name}</p>
                          <p className="text-xs text-white/40 mt-0.5">{p.provider}{p.address ? ` · ${p.address}` : ""}</p>
                        </div>
                        {b.label && <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${b.cls}`}>{b.label}</span>}
                      </div>
                      <div className="flex items-end justify-between mt-4">
                        <div className="text-xs text-white/40">
                          {p.start ? `${String(p.start).slice(0, 10)} → ` : ""}{p.end ? String(p.end).slice(0, 10) : "open"}
                          {p.esiid_tail && <span className="block mt-0.5">Meter •••{p.esiid_tail}</span>}
                        </div>
                        {p.rate != null && (
                          <p className="text-2xl font-black">{Number(p.rate).toFixed(1)}<span className="text-xs font-bold text-white/40">¢/kWh</span></p>
                        )}
                      </div>
                      {p.provider_status === "Going Final" && (
                        <p className="mt-3 text-xs text-orange-300 bg-orange-500/10 rounded-lg px-3 py-2 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Your provider shows this account closing — call us and we'll sort it out.
                        </p>
                      )}
                      {!p.month_to_month && (p.days_left ?? 999) <= 90 && !urgent && (
                        <button onClick={() => requestRenewal(p)}
                          className="mt-3 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold flex items-center justify-center gap-1.5">
                          Get renewal options <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* enrollments in flight */}
            {(me.enrollments ?? []).length > 0 && (
              <div>
                <p className="text-xs font-black text-white/35 uppercase tracking-widest mb-2">My Enrollments</p>
                <div className="space-y-2">
                  {me.enrollments.map((e: any) => (
                    <div key={e.id} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{e.plan_name || "Enrollment"} · {e.provider || ""}</p>
                        <p className="text-[11px] text-white/35">{String(e.created_at).slice(0, 10)}</p>
                      </div>
                      <span className="text-xs font-bold text-[#4ade80] shrink-0">{ENR_STATUS[e.status] ?? e.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* referral */}
            <div className="rounded-2xl bg-gradient-to-br from-[#22c55e]/15 to-[#22c55e]/5 border border-[#22c55e]/25 p-5">
              <p className="font-black text-sm flex items-center gap-2"><Gift className="w-4 h-4 text-[#22c55e]" /> Give friends a lower bill</p>
              <p className="text-xs text-white/45 mt-1">
                Share your link — when a friend enrolls, we take care of them like family.
                {me.referral?.count > 0 && <> You've referred <b className="text-white">{me.referral.count}</b> so far{me.referral.active > 0 ? ` (${me.referral.active} active 🎉)` : ""}.</>}
              </p>
              <button onClick={share}
                className="mt-3 w-full py-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-black flex items-center justify-center gap-2">
                {copied ? <><Copy className="w-4 h-4" /> Link copied!</> : <><Share2 className="w-4 h-4" /> Share My Link</>}
              </button>
            </div>

            {/* contact */}
            <div className="flex gap-3">
              <a href="tel:8329379999" className="flex-1 py-3.5 rounded-2xl bg-white/8 border border-white/10 text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/12">
                <Phone className="w-4 h-4 text-[#22c55e]" /> Call Us
              </a>
              <a href="sms:8329379999" className="flex-1 py-3.5 rounded-2xl bg-white/8 border border-white/10 text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/12">
                <MessageSquare className="w-4 h-4 text-[#22c55e]" /> Text Us
              </a>
            </div>

            <p className="text-center text-[11px] text-white/25 pt-2">
              <Zap className="w-3 h-3 inline mr-1" />Tip: tap Share → "Add to Home Screen" to keep Saigon Power one tap away.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
