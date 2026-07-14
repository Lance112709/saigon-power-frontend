"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Zap, Phone, Loader2, LogOut, CalendarClock, Share2, Copy, CheckCircle,
  AlertTriangle, ChevronRight, Gift, MessageSquare, Mail,
  UploadCloud, FileText, Sparkles, Pencil, Activity, Bell, Receipt, TrendingUp,
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

// ── HelcimPay.js (secure card entry — card data goes straight to Helcim) ─────

declare global {
  interface Window {
    appendHelcimPayIframe?: (checkoutToken: string, allowExit?: boolean) => void;
  }
}

function loadHelcimScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.appendHelcimPayIframe === "function") return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-helcim-pay]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://secure.helcim.app/helcim-pay/services/start.js";
    s.async = true;
    s.dataset.helcimPay = "true";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("failed"));
    document.head.appendChild(s);
  });
}

function openHelcimPay(checkoutToken: string): Promise<unknown> {
  return loadHelcimScript().then(() => new Promise((resolve, reject) => {
    const eventName = `helcim-pay-js-${checkoutToken}`;
    function cleanup() {
      window.removeEventListener("message", onMessage);
      document.getElementById("helcimPayIframe")?.remove();
    }
    function onMessage(ev: MessageEvent) {
      if (!ev.data || ev.data.eventName !== eventName) return;
      if (ev.data.eventStatus === "SUCCESS") { cleanup(); resolve(ev.data.eventMessage); }
      else if (ev.data.eventStatus === "ABORTED" || ev.data.eventStatus === "HIDE") {
        cleanup(); reject(new Error("cancelled"));
      }
    }
    window.addEventListener("message", onMessage);
    window.appendHelcimPayIframe?.(checkoutToken, true);
  }));
}

// ── Bill upload + Smart Meter Texas (English port of the giadienre.com dashboard) ──

type BillFields = {
  customer_name: string; service_address: string; provider: string; esi_id: string;
  current_rate: string; contract_end_date: string; average_kwh: string; tdu: string;
  meter_number: string;
};
const EMPTY_BILL: BillFields = {
  customer_name: "", service_address: "", provider: "", esi_id: "",
  current_rate: "", contract_end_date: "", average_kwh: "", tdu: "", meter_number: "",
};
const BILL_FIELDS: { key: keyof BillFields; label: string; placeholder?: string; type?: string }[] = [
  { key: "customer_name", label: "Customer name", placeholder: "Your name" },
  { key: "service_address", label: "Service address", placeholder: "123 Main St, Houston" },
  { key: "provider", label: "Provider (REP)", placeholder: "TXU Energy" },
  { key: "tdu", label: "TDU / Utility", placeholder: "CenterPoint" },
  { key: "esi_id", label: "ESI ID", placeholder: "10..." },
  { key: "current_rate", label: "Current rate (¢/kWh)", placeholder: "14.2" },
  { key: "average_kwh", label: "Usage (kWh/month)", placeholder: "1200" },
  { key: "contract_end_date", label: "Contract end date", type: "date" },
  { key: "meter_number", label: "Meter number (optional)", placeholder: "Meter #" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

const billInputCls = "w-full px-3.5 py-3 border border-white/15 rounded-xl text-sm bg-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 [color-scheme:dark]";

function BillUploadCard({ onDone }: { onDone?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fields, setFields] = useState<BillFields>(EMPTY_BILL);
  const [showForm, setShowForm] = useState(false);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  const authed = (path: string, body: unknown) =>
    fetch(`${API}/api/v1/giadienre/portal/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}`,
      },
      body: JSON.stringify(body),
    });

  async function analyze() {
    if (!file) return;
    setAnalyzing(true); setError(null); setMsg(null);
    try {
      const data = await fileToBase64(file);
      const res = await authed("bill-ocr", { data, mediaType: file.type });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.detail ?? "failed");
      const ex = body.extracted ?? {};
      setFields({
        customer_name: ex.customer_name ?? "",
        service_address: ex.service_address ?? "",
        provider: ex.provider ?? "",
        esi_id: ex.esi_id ?? "",
        current_rate: ex.current_rate != null ? String(ex.current_rate) : "",
        contract_end_date: ex.contract_end_date ?? "",
        average_kwh: ex.average_kwh != null ? String(ex.average_kwh) : "",
        tdu: ex.tdu ?? "",
        meter_number: ex.meter_number ?? "",
      });
      setConfidence(ex.confidence ?? null);
      setAiUsed(true); setShowForm(true);
      setMsg("AI read your bill — please review the details below.");
    } catch (err) {
      setError(err instanceof Error && err.message !== "failed"
        ? err.message
        : "We couldn't read that bill — you can enter the details manually.");
      setShowForm(true); setAiUsed(false);
    }
    setAnalyzing(false);
  }

  async function submit() {
    setSubmitting(true); setError(null);
    try {
      const res = await authed("bill", {
        ...fields,
        current_rate: fields.current_rate === "" ? null : Number(fields.current_rate),
        average_kwh: fields.average_kwh === "" ? null : Number(fields.average_kwh),
        bill_file_name: file?.name,
        source: aiUsed ? "portal_ocr" : "portal_manual",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.detail ?? "failed");
      setDone(true);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error && err.message !== "failed"
        ? err.message : "We couldn't save that — please try again.");
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-[#4ade80]">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Bill received! We're tracking your contract and will remind you before renewal time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <p className="font-black text-sm flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-[#22c55e]" /> Upload &amp; analyze your electric bill
      </p>
      <p className="text-xs text-white/45">
        Upload your latest bill (PDF or photo). AI reads it and fills in your details — you review and save.
      </p>

      <label htmlFor="portalBillFile"
        className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-white/15 bg-white/4 px-6 py-6 text-center transition-colors hover:border-[#22c55e]/50 hover:bg-[#22c55e]/5">
        {file ? (
          <>
            <FileText className="w-6 h-6 text-[#22c55e]" />
            <span className="text-sm font-semibold">{file.name}</span>
            <span className="text-[11px] text-white/35">Tap to choose a different file</span>
          </>
        ) : (
          <>
            <UploadCloud className="w-6 h-6 text-white/40" />
            <span className="text-sm font-semibold text-white/70">Choose your bill file</span>
            <span className="text-[11px] text-white/35">PDF, JPG, PNG · up to 10MB</span>
          </>
        )}
        <input id="portalBillFile" type="file" accept=".pdf,image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={e => { setFile(e.target.files?.[0] ?? null); setShowForm(false); setDone(false); setMsg(null); setError(null); }} />
      </label>

      {!showForm && (
        <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
          <button onClick={analyze} disabled={!file || analyzing}
            className="flex-1 py-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2">
            {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Reading your bill…</>
              : <><Sparkles className="w-4 h-4" /> Read My Bill with AI</>}
          </button>
          <button onClick={() => { setShowForm(true); setAiUsed(false); }}
            className="py-3 px-4 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-sm font-bold flex items-center justify-center gap-2">
            <Pencil className="w-4 h-4" /> Enter manually
          </button>
        </div>
      )}

      {msg && (
        <p className="mt-3 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/25 px-4 py-2.5 text-xs font-semibold text-[#4ade80]">
          {msg}{confidence ? ` (confidence: ${confidence})` : ""}
        </p>
      )}

      {showForm && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {BILL_FIELDS.map(f => (
              <div key={f.key} className={f.key === "service_address" ? "sm:col-span-2" : ""}>
                <label htmlFor={`bf-${f.key}`} className="block text-[11px] font-bold text-white/50 mb-1">{f.label}</label>
                <input id={`bf-${f.key}`} type={f.type ?? "text"} placeholder={f.placeholder}
                  value={fields[f.key]}
                  onChange={e => setFields(s => ({ ...s, [f.key]: e.target.value }))}
                  className={billInputCls} />
              </div>
            ))}
          </div>
          <button onClick={submit} disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save & start contract tracking"}
          </button>
        </div>
      )}

      {error && <p className="mt-3 rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-2.5 text-xs text-red-300">{error}</p>}

      <p className="mt-3 text-[11px] leading-relaxed text-white/30">
        🔒 Your bill is only used to manage your electricity account and find you a better plan.
      </p>
    </div>
  );
}

function SmartMeterCard() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function notifyMe() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/api/v1/giadienre/portal/smt-interest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail ?? "failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error && err.message !== "failed"
        ? err.message : "We couldn't record that — please try again.");
    }
    setBusy(false);
  }

  const perks = [
    { icon: Zap, text: "Track your electricity usage every day" },
    { icon: Receipt, text: "See an estimate of this month's bill" },
    { icon: TrendingUp, text: "Get alerts when your usage spikes" },
  ];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#22c55e]/10 to-white/5 border border-[#22c55e]/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-black text-sm flex items-center gap-2">
          <span className="grid w-8 h-8 place-items-center rounded-lg bg-[#22c55e] text-white shrink-0">
            <Activity className="w-4 h-4" />
          </span>
          <span>Smart Meter Texas<span className="block text-[11px] font-semibold text-white/40">Connect your meter directly</span></span>
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-black tracking-wider text-amber-300">
          <span className="w-1.5 h-1.5 animate-pulse rounded-full bg-amber-400" /> COMING SOON
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {perks.map(p => (
          <li key={p.text} className="flex items-center gap-2.5 text-sm text-white/70">
            <span className="grid w-6 h-6 shrink-0 place-items-center rounded-md bg-[#22c55e]/15 text-[#22c55e]">
              <p.icon className="w-3.5 h-3.5" />
            </span>
            {p.text}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[11px] leading-relaxed text-white/35">
        The system is built — we're finalizing the data-sharing agreement with Smart Meter Texas.
        Free for SAIGON POWER PLUS members.
      </p>

      {done ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/25 px-4 py-3 text-sm font-bold text-[#4ade80]">
          <CheckCircle className="w-4 h-4 shrink-0" /> Got it! We'll let you know the moment it's live.
        </p>
      ) : (
        <button onClick={notifyMe} disabled={busy}
          className="mt-4 w-full py-3 rounded-xl bg-white/8 hover:bg-white/12 border border-[#22c55e]/30 text-sm font-bold text-[#4ade80] disabled:opacity-60 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          Notify me when it launches
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
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
    if (!r.ok) throw new Error(r.status === 401 ? "expired" : "transient");
    setMe(await r.json());
    setStep("home");
  };

  useEffect(() => {
    // PWA service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const t = localStorage.getItem(TOKEN_KEY);
    // only drop the session when the token is actually rejected — a deploy blip
    // or flaky network shouldn't sign the customer out
    if (t) loadMe(t).catch(e => { if (e?.message === "expired") localStorage.removeItem(TOKEN_KEY); });
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

  // Update the card on file: Helcim popup collects the card ($0 verification),
  // then the CRM stores the new token and future billing uses it.
  const [cardBusy, setCardBusy] = useState(false);
  const [cardMsg, setCardMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const updateCard = async () => {
    setCardBusy(true); setCardMsg(null);
    const t = localStorage.getItem(TOKEN_KEY) || "";
    const authed = (path: string, body?: unknown) =>
      fetch(`${API}/api/v1/giadienre/billing/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    try {
      const sres = await authed("card-session");
      const sdata = await sres.json().catch(() => ({}));
      if (!sres.ok || !sdata?.checkoutToken) throw new Error(sdata?.detail ?? "failed");
      const event = await openHelcimPay(sdata.checkoutToken);
      const cres = await authed("card-confirm", { checkoutToken: sdata.checkoutToken, event });
      const cdata = await cres.json().catch(() => ({}));
      if (!cres.ok) throw new Error(cdata?.detail ?? "failed");
      setCardMsg({ ok: true, text: `Card updated — ${cdata.card_brand || "card"} ending ${cdata.card_last4} is now on file.` });
      loadMe(t).catch(() => {});
    } catch (err) {
      if (!(err instanceof Error && err.message === "cancelled")) {
        setCardMsg({
          ok: false,
          text: err instanceof Error && err.message !== "failed"
            ? err.message
            : "We couldn't update your card — please try again or call (832) 937-9999.",
        });
      }
    }
    setCardBusy(false);
  };

  const activePlans = useMemo(() => (me?.plans ?? []).filter((p: any) => p.active), [me]);
  const urgent = activePlans.find((p: any) => !p.month_to_month && p.days_left != null && p.days_left <= 60);

  return (
    <div className="min-h-screen bg-[#0a1a0e] text-white relative" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* brand glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div style={{ position: "absolute", width: 900, height: 480, borderRadius: "50%", top: "-55%", left: "50%", transform: "translateX(-50%)", background: "radial-gradient(ellipse,#22c55e 0%,transparent 65%)", opacity: 0.08, filter: "blur(60px)" }} />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0a1a0e]/90 backdrop-blur-md border-b border-white/6">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/sgpower-logo.webp" alt="" className="h-9 w-9 object-contain" />
            <div>
              <p className="font-black leading-tight text-sm tracking-tight">Saigon Power</p>
              <p className="text-[10px] font-bold text-[#22c55e] tracking-widest uppercase">My Account</p>
            </div>
          </a>
          <div className="flex items-center gap-4">
            <a href="tel:8329379999" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-white/50 hover:text-white transition-colors">
              <Phone className="w-3.5 h-3.5" /> (832) 937-9999
            </a>
            {step === "home" && (
              <button onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white/60 hover:text-white transition-colors">
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`relative mx-auto px-5 pb-16 ${step === "home" ? "max-w-6xl" : "max-w-md"}`}>
        {/* ── Login: phone ── */}
        {step === "phone" && (
          <div className="mt-14">
            <div className="text-center mb-7">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/25">
                <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                <span className="text-[#22c55e] text-[11px] font-black uppercase tracking-widest">Customer portal</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight leading-tight">Check your plan.<br /><span className="text-[#22c55e]">Never overpay again.</span></h1>
            </div>
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
              <p className="text-white/45 text-sm text-center mb-5">
                Enter the phone number on your account — we'll email you a login code. No password needed.
              </p>
              <input
                type="tel" inputMode="numeric" autoComplete="tel"
                placeholder="(832) 555-1234"
                value={phone} onChange={e => setPhone(e.target.value)}
                className={inputCls}
              />
              {err && <p className="text-red-300 text-sm text-center mt-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{err}</p>}
              <button onClick={requestCode} disabled={busy || phone.replace(/\D/g, "").length < 10}
                className="w-full mt-4 py-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] font-black text-white disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[#22c55e]/20 transition-colors">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Email Me a Code <Mail className="w-4 h-4" /></>}
              </button>
            </div>
            <p className="text-center text-xs text-white/30 mt-6">
              New customer? <a href="/enroll" className="text-[#22c55e] font-semibold">Enroll in 2 minutes →</a>
            </p>
          </div>
        )}

        {/* ── Login: code ── */}
        {step === "code" && (
          <div className="mt-14">
            <div className="text-center mb-7">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#22c55e]/12 border border-[#22c55e]/25 grid place-items-center">
                <Mail className="w-6 h-6 text-[#22c55e]" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">Enter your code</h1>
              <p className="text-white/45 text-sm mt-2">{hint}</p>
            </div>
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
              <input
                type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                placeholder="••••••"
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`${inputCls} text-2xl`}
              />
              {err && <p className="text-red-300 text-sm text-center mt-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{err}</p>}
              <button onClick={verify} disabled={busy || code.length !== 6}
                className="w-full mt-4 py-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] font-black text-white disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[#22c55e]/20 transition-colors">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
              </button>
            </div>
            <button onClick={() => { setStep("phone"); setErr(""); }} className="w-full mt-4 text-sm text-white/40 hover:text-white/70 transition-colors">
              Use a different number
            </button>
          </div>
        )}

        {/* ── Home ── */}
        {step === "home" && me && (
          <div className="space-y-6 mt-8">
            {/* greeting */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Hi {me.name?.split(" ")[0] || "there"} 👋</h1>
                <p className="text-white/40 text-sm mt-1">Here's your energy account at a glance.</p>
              </div>
              {me.membership && (
                <span className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-[11px] font-black tracking-wider ${
                  me.membership.status === "ACTIVE"
                    ? "bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"}`}>
                  <Zap className="w-3.5 h-3.5" /> SAIGON POWER PLUS {me.membership.status === "ACTIVE" ? "· ACTIVE" : "· PENDING"}
                </span>
              )}
            </div>

            {/* urgent renewal banner */}
            {urgent && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 md:flex md:items-center md:justify-between md:gap-6">
                <div>
                  <p className="font-bold text-amber-300 flex items-center gap-2 text-sm">
                    <CalendarClock className="w-4 h-4" /> Your contract ends in {urgent.days_left} days
                  </p>
                  <p className="text-white/50 text-xs mt-1">Lock in a new rate before it rolls onto an expensive variable plan.</p>
                </div>
                <button onClick={() => requestRenewal(urgent)}
                  className="mt-3 md:mt-0 w-full md:w-auto shrink-0 px-6 py-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-black shadow-lg shadow-[#22c55e]/20 transition-colors">
                  Get My Best Renewal Rate — Free
                </button>
              </div>
            )}
            {renewMsg && (
              <p className="text-sm text-[#4ade80] bg-[#22c55e]/10 border border-[#22c55e]/25 rounded-xl px-4 py-3 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />{renewMsg}
              </p>
            )}

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
              const hasDash = Boolean(m.contract_end_date || m.current_provider);
              return (
                <div className={`grid gap-5 items-stretch ${hasDash ? "lg:grid-cols-5" : ""}`}>
                  {/* membership card */}
                  <div className={`${hasDash ? "lg:col-span-2" : ""} rounded-3xl bg-gradient-to-br from-[#22c55e]/14 to-white/5 border border-[#22c55e]/25 p-6 flex flex-col`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[11px] font-black text-[#22c55e] uppercase tracking-widest">My Membership</p>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider shrink-0 ${
                        active ? "bg-[#22c55e]/15 text-[#22c55e]"
                        : cancelled ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}`}>
                        {active ? "● ACTIVE" : cancelled ? "CANCELLED" : "ACTIVATION PENDING"}
                      </span>
                    </div>
                    <p className="font-black text-lg tracking-tight mt-3 leading-snug">{m.plan_name || "Saigon Power membership"}</p>
                    {price && (
                      <div className="flex items-end gap-1.5 mt-2">
                        <span className="text-4xl font-black tracking-tight leading-none">{price}</span>
                        <span className="text-white/40 font-bold text-sm mb-0.5">/ month · cancel anytime</span>
                      </div>
                    )}
                    <div className="mt-auto pt-5 space-y-2">
                      {m.card_last4 && (
                        <p className="flex items-center gap-2 text-xs text-white/50">
                          <Receipt className="w-3.5 h-3.5 text-[#22c55e] shrink-0" /> {m.card_brand || "Card"} •••• {m.card_last4} on file
                        </p>
                      )}
                      {m.next_billing_date && (
                        <p className="flex items-center gap-2 text-xs text-white/50">
                          <CalendarClock className="w-3.5 h-3.5 text-[#22c55e] shrink-0" /> Next billing {String(m.next_billing_date).slice(0, 10)}
                        </p>
                      )}
                      {!active && !cancelled && (
                        <p className="text-xs text-white/45 bg-white/5 rounded-lg px-3 py-2">
                          We received your signup — our team will reach out to finish activating your membership.
                        </p>
                      )}
                      {!cancelled && (
                        <button onClick={updateCard} disabled={cardBusy}
                          className="w-full mt-1 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/10 text-xs font-bold text-white/70 hover:text-white disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors">
                          {cardBusy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening secure card window…</>
                            : <><Pencil className="w-3.5 h-3.5" /> {m.card_last4 ? "Update payment card" : "Add a payment card"}</>}
                        </button>
                      )}
                      {cardMsg && (
                        <p className={`text-xs rounded-lg px-3 py-2 ${cardMsg.ok
                          ? "text-[#4ade80] bg-[#22c55e]/10 border border-[#22c55e]/25"
                          : "text-red-300 bg-red-500/10 border border-red-500/25"}`}>
                          {cardMsg.text}
                        </p>
                      )}
                      <p className="text-[10px] text-white/25 text-center">
                        Card details are entered in Helcim&rsquo;s secure window and never touch our servers.
                      </p>
                    </div>
                  </div>

                  {/* energy dashboard */}
                  {hasDash && (
                    <div className="lg:col-span-3 rounded-3xl bg-white/5 border border-white/10 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <p className="font-black text-base tracking-tight">Your Energy Dashboard</p>
                        <span className="px-2.5 py-1 rounded-full bg-[#22c55e]/15 text-[#22c55e] text-[10px] font-black tracking-wider">● MONITORING</span>
                      </div>
                      <div className="rounded-2xl bg-[#060f09] border border-white/8 p-5 relative overflow-hidden">
                        <div style={{ position: "absolute", width: 240, height: 240, borderRadius: "50%", right: -100, top: -110, background: "radial-gradient(circle,#22c55e 0%,transparent 70%)", opacity: 0.12 }} />
                        <p className="text-white/50 text-[11px] font-bold">Current contract status</p>
                        <p className="font-black text-2xl tracking-tight mt-1 mb-4">
                          {endTxt
                            ? (dl != null && dl < 0 ? `Your contract ended ${endTxt}` : `You're covered until ${endTxt}`)
                            : "We're tracking your account"}
                        </p>
                        {pct != null && dl != null && dl >= 0 && (
                          <>
                            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                              <span className="block h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#4ade80]" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex justify-between text-[11px] text-white/40 mt-2">
                              <span>Contract progress</span><span className="font-bold text-white/60">{dl} days remaining</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                          <p className="text-[11px] text-white/40 font-bold mb-1">Renewal status</p>
                          <p className={`font-black ${renewal ? renewal.c : "text-white/60"}`}>{renewal ? renewal.t : "—"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                          <p className="text-[11px] text-white/40 font-bold mb-1">Current provider</p>
                          <p className="font-black truncate">{m.current_provider || "—"}</p>
                        </div>
                      </div>
                      {dl != null && dl >= 0 && dl <= 60 && (
                        <p className="mt-3 text-xs text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2 flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5 shrink-0" /> Your renewal window is open — we'll compare plans and reach out with options.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* plans (left) + tools (right) */}
            <div className="grid gap-5 lg:grid-cols-5 items-start">
            <div className="lg:col-span-3 space-y-5">
            <div>
              <p className="text-xs font-black text-white/35 uppercase tracking-widest mb-3">My Plans</p>
              {activePlans.length === 0 && (
                <div className="rounded-3xl bg-white/5 border border-white/10 p-10 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 grid place-items-center">
                    <Zap className="w-6 h-6 text-[#22c55e]" />
                  </div>
                  <p className="font-black tracking-tight">No electricity plans here yet</p>
                  <p className="text-sm text-white/45 mt-1.5 max-w-sm mx-auto">
                    When you enroll through Saigon Power, your plan, rate, and contract dates show up here automatically.
                  </p>
                  <a href="/enroll" className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-black shadow-lg shadow-[#22c55e]/20 transition-colors">
                    Compare plans &amp; enroll <ChevronRight className="w-4 h-4" />
                  </a>
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
                <p className="text-xs font-black text-white/35 uppercase tracking-widest mb-3">My Enrollments</p>
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
            </div>{/* /left column */}

            {/* bill upload + Smart Meter Texas (members) */}
            {me.membership ? (
              <div className="lg:col-span-2 space-y-3">
                <p className="text-xs font-black text-white/35 uppercase tracking-widest mb-3">My Tools</p>
                <BillUploadCard onDone={() => { const t = localStorage.getItem(TOKEN_KEY); if (t) loadMe(t).catch(() => {}); }} />
                <SmartMeterCard />
              </div>
            ) : (
              <div className="lg:col-span-2 space-y-3">
                <p className="text-xs font-black text-white/35 uppercase tracking-widest mb-3">Membership</p>
                <div className="rounded-3xl bg-gradient-to-br from-[#22c55e]/12 to-white/5 border border-[#22c55e]/25 p-6">
                  <p className="font-black text-base tracking-tight">SAIGON POWER PLUS</p>
                  <p className="text-sm text-white/45 mt-1.5">Contract monitoring, renewal reminders, bill analysis, and a dedicated team — from $9.99/month.</p>
                  <a href="/membership" className="mt-4 inline-flex w-full items-center justify-center gap-2 py-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-black shadow-lg shadow-[#22c55e]/20 transition-colors">
                    Learn more <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}
            </div>{/* /plans+tools grid */}

            {/* referral */}
            <div className="rounded-3xl bg-gradient-to-br from-[#22c55e]/15 to-[#22c55e]/5 border border-[#22c55e]/25 p-6 md:flex md:items-center md:justify-between md:gap-8">
              <div>
                <p className="font-black text-base tracking-tight flex items-center gap-2"><Gift className="w-4 h-4 text-[#22c55e]" /> Give friends a lower bill</p>
                <p className="text-sm text-white/45 mt-1.5">
                  Share your link — when a friend enrolls, we take care of them like family.
                  {me.referral?.count > 0 && <> You've referred <b className="text-white">{me.referral.count}</b> so far{me.referral.active > 0 ? ` (${me.referral.active} active 🎉)` : ""}.</>}
                </p>
              </div>
              <button onClick={share}
                className="mt-4 md:mt-0 w-full md:w-auto shrink-0 px-8 py-3.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-[#22c55e]/20 transition-colors">
                {copied ? <><Copy className="w-4 h-4" /> Link copied!</> : <><Share2 className="w-4 h-4" /> Share My Link</>}
              </button>
            </div>

            {/* contact */}
            <div className="grid grid-cols-2 gap-3 md:max-w-md md:mx-auto">
              <a href="tel:8329379999" className="py-3.5 rounded-2xl bg-white/8 border border-white/10 text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/12 transition-colors">
                <Phone className="w-4 h-4 text-[#22c55e]" /> Call Us
              </a>
              <a href="sms:8329379999" className="py-3.5 rounded-2xl bg-white/8 border border-white/10 text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/12 transition-colors">
                <MessageSquare className="w-4 h-4 text-[#22c55e]" /> Text Us
              </a>
            </div>

            <p className="text-center text-[11px] text-white/25 pt-2">
              <Zap className="w-3 h-3 inline mr-1" />Tip: tap Share → "Add to Home Screen" to keep Saigon Power one tap away.
            </p>
          </div>
        )}
      </div>

      {/* footer strip */}
      <div className="relative border-t border-white/5 py-6 px-5 text-center text-[11px] text-white/20">
        © 2026 Saigon Power LLC · Texas Electric License <span className="text-white/35">#BR190102</span> · (832) 937-9999 · We speak English &amp; Tiếng Việt
      </div>
    </div>
  );
}
