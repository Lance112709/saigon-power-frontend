"use client";
/**
 * saigonpowertx.com/membership — SAIGON POWER PLUS
 * Public membership + enrollment page, styled to match the saigonpowertx.com
 * homepage (dark #0a1a0e, emerald #22c55e, Inter). Signups and quote requests
 * sync to the CRM via the giadienre intake API (lead_source "SaigonPowerTX
 * Website"); card payment runs through HelcimPay.js (card data never touches
 * our servers).
 */
import { useState, FormEvent } from "react";
import {
  Phone, CheckCircle, ArrowRight, Shield, Clock, ChevronDown, FileText,
  BarChart3, Bell, FolderOpen, Headphones, CalendarClock, LayoutDashboard,
  Lock, X, Sparkles,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://web-production-188939.up.railway.app";
const LEAD_SOURCE = "SaigonPowerTX Website";

// ── HelcimPay.js loader (same flow as giadienre.com) ──────────────────────────

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

async function post(path: string, body: unknown) {
  const res = await fetch(`${API}/api/v1/giadienre/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(typeof data?.detail === "string" ? data.detail : "failed");
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data;
}

// ── Shared styles (homepage design language) ─────────────────────────────────

const inputCls = "w-full px-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/35 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]/60 transition-all";
const labelCls = "block text-xs font-bold text-white/60 mb-1.5";
const btnPrimary = "px-8 py-4 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black rounded-2xl shadow-lg shadow-[#22c55e]/20 transition-colors text-sm flex items-center justify-center gap-2 tracking-tight";
const btnGhost = "px-8 py-4 border border-white/15 text-white font-bold rounded-2xl hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-2";

const PLANS = {
  POWER_PLUS_RES: { label: "Residential", price: "$9.99" },
  POWER_PLUS_COM: { label: "Commercial", price: "$19.99" },
} as const;
type PlanId = keyof typeof PLANS;

type JoinStep = "form" | "submitting" | "paying" | "active" | "received";

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-white hover:bg-white/5 transition-colors">
        {q}
        <ChevronDown className={`w-5 h-5 text-white/40 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm text-white/60 leading-relaxed border-t border-white/10 pt-4">{a}</div>
      )}
    </div>
  );
}

export default function MembershipPage() {
  // Join (enrollment) modal
  const [joinPlan, setJoinPlan] = useState<PlanId | null>(null);
  const [joinStep, setJoinStep] = useState<JoinStep>("form");
  const [join, setJoin] = useState({ full_name: "", email: "", phone: "", service_address: "", city: "", zip: "", business_name: "" });
  const [joinError, setJoinError] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [cardLast4, setCardLast4] = useState("");

  // Quote form
  const [quote, setQuote] = useState({ accountType: "", name: "", phone: "", address: "", email: "", provider: "", contractEndDate: "" });
  const [quoteState, setQuoteState] = useState<"idle" | "sending" | "done">("idle");
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const openJoin = (plan: PlanId) => {
    setJoinPlan(plan);
    setJoinStep("form");
    setJoinError(null);
  };

  async function submitJoin(e: FormEvent) {
    e.preventDefault();
    if (!joinPlan) return;
    setJoinError(null);
    setJoinStep("submitting");
    try {
      const sub = await post("subscribe", {
        full_name: join.full_name,
        email: join.email,
        phone: join.phone,
        service_address: join.service_address,
        city: join.city,
        state: "TX",
        zip: join.zip,
        plan_id: joinPlan,
        billing_cycle: "monthly",
        form_type: "signup",
        lead_source: LEAD_SOURCE,
        extra: {
          account_type: joinPlan === "POWER_PLUS_COM" ? "commercial" : "residential",
          ...(join.business_name ? { business_name: join.business_name } : {}),
        },
      });
      setReference(sub?.reference || "");

      let session;
      try {
        session = await post("billing/pay-session", { subscription_id: sub.id });
      } catch (err) {
        if ((err as Error & { status?: number }).status === 503) {
          // online payments not switched on — the signup is in the CRM,
          // the team completes payment by phone
          setJoinStep("received");
          return;
        }
        throw err;
      }

      setJoinStep("paying");
      const event = await openHelcimPay(session.checkoutToken);
      const confirmed = await post("billing/pay-confirm", {
        subscription_id: sub.id,
        checkoutToken: session.checkoutToken,
        event,
      });
      setCardLast4(confirmed?.card_last4 || "");
      setJoinStep("active");
    } catch (err) {
      if (err instanceof Error && err.message === "cancelled") {
        setJoinStep("received"); // enrolled, payment pending — team follows up
        return;
      }
      setJoinError(err instanceof Error && err.message !== "failed"
        ? err.message
        : "Something went wrong — please try again or call (832) 937-9999.");
      setJoinStep("form");
    }
  }

  async function submitQuote(e: FormEvent) {
    e.preventDefault();
    setQuoteError(null);
    setQuoteState("sending");
    try {
      await post("subscribe", {
        full_name: quote.name,
        email: quote.email,
        phone: quote.phone,
        service_address: quote.address,
        state: "TX",
        current_provider: quote.provider,
        contract_end_date: quote.contractEndDate || null,
        form_type: "bill_analysis",
        lead_source: LEAD_SOURCE,
        extra: { account_type: quote.accountType, request: "quote" },
      });
      setQuoteState("done");
    } catch (err) {
      setQuoteError(err instanceof Error && err.message !== "failed"
        ? err.message
        : "Something went wrong — please try again or call (832) 937-9999.");
      setQuoteState("idle");
    }
  }

  const jf = (k: keyof typeof join) => ({
    value: join[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setJoin({ ...join, [k]: e.target.value }),
  });
  const qf = (k: keyof typeof quote) => ({
    value: quote[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuote({ ...quote, [k]: e.target.value }),
  });

  const faqs = [
    { q: "What do the subscriptions cover?", a: "Residential service is $9.99/month and commercial service is $19.99/month. Both cover Saigon Power account-management services such as dashboard access, contract tracking, renewal reminders, document storage, and quote assistance. Electricity charges from your provider are separate." },
    { q: "Can I cancel anytime?", a: "Yes. The membership is month-to-month and may be canceled according to the membership terms." },
    { q: "Does submitting a quote request switch my provider?", a: "No. A quote request only gives the team permission to contact you about available options. Enrollment requires a separate confirmation." },
    { q: "What if my contract does not end soon?", a: "Enter your contract end date. Saigon Power can keep it organized and help you prepare for the appropriate renewal window." },
    { q: "Is Saigon Power an electricity provider?", a: "Saigon Power is an energy broker and account-management service. Electricity service is supplied and billed by the selected retail electricity provider." },
  ];

  return (
    <div className="min-h-screen bg-[#0a1a0e]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .hero-text   { animation: fadeUp .7s ease both; }
        .hero-text-2 { animation: fadeUp .7s .1s ease both; }
        .hero-card   { animation: fadeUp .8s .15s ease both; }
      `}</style>

      {/* ── Topbar ── */}
      <div className="bg-[#060f09] text-white/60 text-xs py-2 px-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <a href="tel:8329379999" className="flex items-center gap-1.5 text-white/80 hover:text-white font-semibold">
            <Phone className="w-3 h-3" />(832) 937-9999
          </a>
          <span className="text-white/20 hidden sm:inline">·</span>
          <span className="hidden sm:inline">Mon–Fri, 8AM–6PM support</span>
        </div>
        <span className="hidden md:inline">Residential $9.99/mo · Commercial $19.99/mo · Cancel anytime</span>
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-[#0a1a0e]/90 backdrop-blur-md border-b border-white/6">
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/sgpower-logo.webp" alt="Saigon Power" className="h-10 w-10 object-contain" />
            <p className="font-black text-white text-sm leading-tight tracking-tight">Saigon Power</p>
          </a>

          <div className="hidden md:flex items-center gap-7">
            {[["#how", "How It Works"], ["#membership", "Membership"], ["#benefits", "Benefits"], ["#faq", "FAQ"]].map(([h, l]) => (
              <a key={h} href={h} className="text-sm font-medium text-white/65 hover:text-white transition-colors">{l}</a>
            ))}
            <a href="/" className="text-sm font-semibold text-[#22c55e] hover:text-[#4ade80] transition-colors">Compare Plans</a>
          </div>

          <div className="flex items-center gap-3">
            <a href="/my" className="hidden md:block text-sm font-semibold text-white/65 hover:text-white transition-colors">
              Log In
            </a>
            <button onClick={() => openJoin("POWER_PLUS_RES")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-black transition-colors shadow-lg shadow-[#22c55e]/20">
              <Sparkles className="w-4 h-4" /> Join Now
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#0a1a0e]">
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position: "absolute", width: 900, height: 500, borderRadius: "50%", top: "-10%", right: "-15%", background: "radial-gradient(ellipse,#22c55e 0%,transparent 65%)", opacity: 0.07, filter: "blur(60px)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a1a0e] to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-10 w-full pt-14 lg:pt-20 pb-16 lg:pb-24 flex flex-col lg:flex-row items-center gap-10 lg:gap-20">
          {/* Left — headline */}
          <div className="flex-1 min-w-0">
            <div className="hero-text inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/25">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              <span className="text-[#22c55e] text-xs font-black uppercase tracking-widest">Electricity concierge for Texas</span>
            </div>

            <h1 className="hero-text-2 font-black text-white leading-[1.02] tracking-tight mb-5"
              style={{ fontSize: "clamp(2.1rem,7vw,4.6rem)" }}>
              Better energy choices.<br />
              <span className="text-[#22c55e]">Less hassle.</span>
            </h1>

            <p className="text-white/55 text-base sm:text-lg leading-relaxed mb-8 max-w-[460px]">
              Saigon Power keeps your electricity information organized, monitors your contract,
              and helps residential and commercial customers compare available plans when it is time to renew.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <button onClick={() => openJoin("POWER_PLUS_RES")} className={btnPrimary}>
                Join Residential for $9.99/month <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#quote" className={btnGhost}>Get a real-time quote</a>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {["Cancel anytime", "Renewal reminders", "Human support"].map(b => (
                <div key={b} className="flex items-center gap-1.5 text-sm text-white/50">
                  <CheckCircle className="w-4 h-4 text-[#22c55e]" />{b}
                </div>
              ))}
            </div>
          </div>

          {/* Right — dashboard preview */}
          <div className="hero-card flex-1 min-w-0 w-full max-w-lg">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between px-1 pb-4">
                <h3 className="font-black text-white text-sm tracking-tight">Your Energy Dashboard</h3>
                <span className="px-2.5 py-1 rounded-full bg-[#22c55e]/15 text-[#22c55e] text-[10px] font-black tracking-wider">● MONITORING</span>
              </div>
              <div className="rounded-2xl bg-[#060f09] border border-white/8 p-5 relative overflow-hidden">
                <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", right: -90, top: -100, background: "radial-gradient(circle,#22c55e 0%,transparent 70%)", opacity: 0.12 }} />
                <p className="text-white/50 text-xs font-bold">Current contract status</p>
                <p className="text-white font-black text-2xl tracking-tight mt-1 mb-4">You&rsquo;re covered until Oct. 18</p>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <span className="block h-full w-[72%] rounded-full bg-gradient-to-r from-[#22c55e] to-[#4ade80]" />
                </div>
                <div className="flex justify-between text-[11px] text-white/40 mt-2">
                  <span>Contract started</span><span>98 days remaining</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-xs text-white/40 font-bold mb-1">Renewal status</p>
                  <p className="font-black text-[#22c55e]">On track</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-xs text-white/40 font-bold mb-1">Current provider</p>
                  <p className="font-black text-white">Provider name</p>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/8 p-4 flex gap-3 items-start">
                <div className="w-8 h-8 rounded-lg bg-amber-400/90 grid place-items-center shrink-0">
                  <Bell className="w-4 h-4 text-[#0a1a0e]" />
                </div>
                <div>
                  <p className="text-white text-xs font-black">We&rsquo;ll notify you before renewal time.</p>
                  <p className="text-white/45 text-[11px] mt-0.5">No more scrambling at the last minute or forgetting your contract end date.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Highlights strip ── */}
      <div className="border-y border-white/6 bg-[#060f09] py-4 px-5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-semibold text-white/40">
          <span className="text-white/70 font-black">Built for Texas homes and businesses</span>
          {["Simple membership", "Contract monitoring", "Bilingual support", "Residential + Commercial"].map(s => (
            <span key={s} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]/50" />{s}
            </span>
          ))}
        </div>
      </div>

      {/* ── How It Works ── */}
      <section className="py-20 px-5 bg-[#0a1a0e]" id="how">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">From Electric Bill to Organized Account in Three Steps.</h2>
            <p className="text-white/45 max-w-xl mx-auto">We designed the process to feel simple — even when electricity plans are not.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { step: "01", icon: FileText, title: "Upload your bill", time: "2 minutes", desc: "Upload a recent electric bill or enter your provider and contract information manually." },
              { step: "02", icon: Shield, title: "We monitor the details", time: "Always on", desc: "Your account stores key contract information and watches for the right renewal window." },
              { step: "03", icon: BarChart3, title: "Compare and renew", time: "When it counts", desc: "When the time is right, request available rates and get help choosing your next plan." },
            ].map(s => (
              <div key={s.step} className="bg-white/5 rounded-2xl border border-white/8 p-7 relative overflow-hidden">
                <span className="absolute top-4 right-5 text-6xl font-black text-white/5 select-none leading-none">{s.step}</span>
                <s.icon className="w-8 h-8 text-[#22c55e] mb-4" />
                <h3 className="font-black text-white text-base mb-1 tracking-tight">{s.title}</h3>
                <div className="flex items-center gap-1 text-xs text-[#22c55e] font-bold mb-3">
                  <Clock className="w-3.5 h-3.5" /> {s.time}
                </div>
                <p className="text-sm text-white/45 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Membership / Pricing ── */}
      <section className="py-20 px-5 bg-[#060f09]" id="membership">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/25">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              <span className="text-[#22c55e] text-xs font-black uppercase tracking-widest">Simple monthly subscriptions</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.05] mb-4">
              Your electricity account, <span className="text-[#22c55e]">actually managed.</span>
            </h2>
            <p className="text-white/45 mb-7">
              Saigon Power memberships cover account-management services only. Electricity usage,
              delivery charges, taxes, and provider charges remain separate.
            </p>
            <ul className="space-y-3.5 mb-8">
              {["Secure customer profile and electric-bill storage", "Contract-end-date tracking and renewal reminders", "Access to quote assistance and customer support", "Cancel your subscription anytime"].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/70 font-semibold">
                  <CheckCircle className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />{item}
                </li>
              ))}
            </ul>
            <a href="#quote" className={`${btnGhost} inline-flex`}>See available rates</a>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Residential — highlighted */}
            <div className="rounded-2xl border border-[#22c55e]/40 bg-[#22c55e]/8 p-7 flex flex-col">
              <p className="text-xs font-black text-[#22c55e] uppercase tracking-widest mb-4">Residential</p>
              <div className="flex items-end gap-1.5 mb-2">
                <span className="text-5xl font-black text-white tracking-tight leading-none">$9.99</span>
                <span className="text-white/40 font-bold text-sm mb-0.5">/ month</span>
              </div>
              <p className="text-sm text-white/50 mb-5">For homeowners and residential electricity accounts that want ongoing support and renewal monitoring.</p>
              <ul className="space-y-3 border-t border-white/10 pt-5 mb-6">
                {["Personal customer dashboard", "Contract and renewal tracking", "Quote and enrollment assistance", "Email and phone support"].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/75">
                    <CheckCircle className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => openJoin("POWER_PLUS_RES")}
                className="mt-auto w-full px-6 py-4 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black rounded-2xl shadow-lg shadow-[#22c55e]/20 transition-colors text-sm tracking-tight">
                Start Residential
              </button>
              <p className="text-[11px] text-white/30 text-center mt-3">No long-term subscription commitment.</p>
            </div>

            {/* Commercial */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-7 flex flex-col">
              <p className="text-xs font-black text-white/50 uppercase tracking-widest mb-4">Commercial</p>
              <div className="flex items-end gap-1.5 mb-2">
                <span className="text-5xl font-black text-white tracking-tight leading-none">$19.99</span>
                <span className="text-white/40 font-bold text-sm mb-0.5">/ month</span>
              </div>
              <p className="text-sm text-white/50 mb-5">For businesses that need commercial account monitoring, quote support, and contract-renewal visibility.</p>
              <ul className="space-y-3 border-t border-white/10 pt-5 mb-6">
                {["Commercial account dashboard", "Contract and renewal tracking", "Commercial quote assistance", "Priority support for business accounts"].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/75">
                    <CheckCircle className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => openJoin("POWER_PLUS_COM")}
                className="mt-auto w-full px-6 py-4 bg-white/8 hover:bg-white/14 border border-white/15 text-white font-black rounded-2xl transition-colors text-sm tracking-tight">
                Start Commercial
              </button>
              <p className="text-[11px] text-white/30 text-center mt-3">$19.99 per commercial account, billed monthly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="py-20 px-5 bg-[#0a1a0e]" id="benefits">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">Electricity is Complicated. Your Experience Shouldn&rsquo;t Be.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: CalendarClock, title: "Never miss renewal timing", desc: "We keep the contract end date visible and remind you before the renewal window arrives." },
              { icon: FolderOpen, title: "Everything in one place", desc: "Keep provider, plan, service address, documents, and account activity organized." },
              { icon: LayoutDashboard, title: "Rate-shopping assistance", desc: "Request current plan options based on the information you provide and your service location." },
              { icon: Headphones, title: "Real human support", desc: "Get help from the Saigon Power team when you have questions or are ready to enroll." },
            ].map(b => (
              <div key={b.title} className="bg-white/5 rounded-2xl border border-white/8 p-6 flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#22c55e]/12 border border-[#22c55e]/20 grid place-items-center shrink-0">
                  <b.icon className="w-5 h-5 text-[#22c55e]" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base mb-1 tracking-tight">{b.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quote ── */}
      <section className="relative py-20 px-5 overflow-hidden bg-[#060f09]" id="quote">
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position: "absolute", width: 800, height: 400, borderRadius: "50%", top: "50%", left: "-10%", transform: "translateY(-50%)", background: "radial-gradient(ellipse,#22c55e 0%,transparent 65%)", opacity: 0.06, filter: "blur(60px)" }} />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto grid lg:grid-cols-[0.85fr_1.15fr] gap-12 items-start">
          <div>
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/25">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              <span className="text-[#22c55e] text-xs font-black uppercase tracking-widest">Get a quote</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.02] mb-4">
              Let&rsquo;s find the right electricity plan.
            </h2>
            <p className="text-white/45 mb-7">
              Send your information and the Saigon Power team can review residential or commercial
              options for your service address and contract timing.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-sm">
              <p className="font-bold text-white mb-1">Already under contract?</p>
              <p className="text-white/45">That&rsquo;s okay. Share your contract end date so the team can follow up at the appropriate time.</p>
            </div>
          </div>

          {quoteState === "done" ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center backdrop-blur-sm">
              <div className="w-16 h-16 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 grid place-items-center mx-auto mb-5">
                <CheckCircle className="w-8 h-8 text-[#22c55e]" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight mb-2">Request received!</h3>
              <p className="text-white/50 mb-2">Thank you{quote.name ? `, ${quote.name.split(" ")[0]}` : ""} — the Saigon Power team will review current options for your address and reach out shortly.</p>
              <p className="text-white/40 text-sm">Questions right now? Call <a href="tel:8329379999" className="text-[#22c55e] font-bold hover:underline">832-937-9999</a>.</p>
            </div>
          ) : (
            <form onSubmit={submitQuote} className="bg-white/5 border border-white/10 rounded-3xl p-7 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-white tracking-tight">Request current rates</h3>
                <span className="flex items-center gap-1.5 text-[11px] font-black text-[#22c55e]">
                  <Lock className="w-3.5 h-3.5" /> SECURE FORM
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="accountType" className={labelCls}>Account Type</label>
                  <select id="accountType" required {...qf("accountType")} className={`${inputCls} [&>option]:bg-[#0a1a0e]`}>
                    <option value="">Select one</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="name" className={labelCls}>Full Name</label>
                  <input id="name" autoComplete="name" required placeholder="Your full name" {...qf("name")} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="phone" className={labelCls}>Phone Number</label>
                  <input id="phone" autoComplete="tel" required placeholder="(832) 000-0000" {...qf("phone")} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="email" className={labelCls}>Email Address</label>
                  <input id="email" type="email" autoComplete="email" required placeholder="you@example.com" {...qf("email")} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address" className={labelCls}>Service Address</label>
                  <input id="address" autoComplete="street-address" required placeholder="Street, city, state and ZIP" {...qf("address")} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="provider" className={labelCls}>Current Provider</label>
                  <input id="provider" placeholder="Provider name" {...qf("provider")} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="date" className={labelCls}>Contract End Date</label>
                  <input id="date" type="date" {...qf("contractEndDate")} className={`${inputCls} [color-scheme:dark]`} />
                </div>
              </div>
              <label className="flex gap-2.5 items-start text-xs text-white/40 my-5">
                <input type="checkbox" required className="mt-0.5 accent-[#22c55e]" />
                <span>I agree to be contacted about electricity service options and understand that submitting this form does not enroll me in a plan.</span>
              </label>
              {quoteError && (
                <p className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-semibold">{quoteError}</p>
              )}
              <button type="submit" disabled={quoteState === "sending"}
                className={`${btnPrimary} w-full disabled:opacity-60 disabled:cursor-wait`}>
                {quoteState === "sending" ? "Sending…" : <>Get My Quote <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-5 bg-[#0a1a0e]" id="faq">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-white/40">Clear answers, no electric-company alphabet soup.</p>
          </div>
          <div className="space-y-3">
            {faqs.map(f => <FaqItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-20 px-5 overflow-hidden bg-[#060f09]">
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position: "absolute", width: 800, height: 400, borderRadius: "50%", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(ellipse,#22c55e 0%,transparent 65%)", opacity: 0.06, filter: "blur(60px)" }} />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="text-[10px] font-black text-white/25 uppercase tracking-[0.2em] mb-4">Memberships from $9.99/month · Cancel anytime</div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">Ready to Stop Worrying About Renewal Dates?</h2>
          <p className="text-white/40 mb-8">Join SAIGON POWER PLUS or request a quote from the Saigon Power team.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <button onClick={() => openJoin("POWER_PLUS_RES")} className={btnPrimary}>
              Join Membership <ArrowRight className="w-4 h-4" />
            </button>
            <a href="#quote" className="px-8 py-4 bg-white/6 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-colors text-sm flex items-center justify-center gap-2">
              Get a Quote
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-x-7 gap-y-2 text-xs text-white/30">
            {["Your data is secure", "Card handled by Helcim", "No spam, ever"].map(b => (
              <div key={b} className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#22c55e]" />{b}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#030a05] text-white pt-14 pb-8 px-5 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <img src="/sgpower-logo.webp" alt="Saigon Power" className="h-9 w-9 object-contain" />
                <span className="font-black text-lg tracking-tight">Saigon Power</span>
              </div>
              <p className="text-sm text-white/35 leading-relaxed max-w-xs">A simpler way to organize residential and commercial Texas electricity accounts, monitor contract timing, and request help comparing available plans.</p>
              <div className="mt-4 space-y-1.5 text-sm text-white/30">
                <a href="tel:8329379999" className="flex items-center gap-2 hover:text-white transition-colors"><Phone className="w-3.5 h-3.5" />(832) 937-9999</a>
                <p>lance@saigonllc.com · Houston, Texas</p>
                <p>Mon-Fri: 8AM - 6PM</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">Platform</p>
              <ul className="space-y-2.5 text-sm text-white/35">
                {[["#how", "How It Works"], ["#membership", "Membership"], ["#quote", "Get a Quote"], ["/my", "Customer Login"]].map(([h, l]) => (
                  <li key={l}><a href={h} className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">Company</p>
              <ul className="space-y-2.5 text-sm text-white/35">
                {[["/", "Compare Plans"], ["/#about", "About Us"], ["/#faq", "FAQ"]].map(([h, l]) => (
                  <li key={l}><a href={h} className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
              <button onClick={() => openJoin("POWER_PLUS_RES")}
                className="inline-block mt-5 px-5 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-black rounded-xl transition-colors shadow-lg shadow-[#22c55e]/20 tracking-tight">
                Join Membership
              </button>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/20">
            <p>© 2026 Saigon Power LLC. All rights reserved. · Texas Electric License: <strong className="text-white/35">#BR190102</strong></p>
            <p className="text-white/15">Rates, availability, and potential savings vary by service area, usage, provider, and market conditions.</p>
          </div>
        </div>
      </footer>

      {/* ── Join / enrollment modal ── */}
      {joinPlan && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto"
          role="dialog" aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget && joinStep !== "paying" && joinStep !== "submitting") setJoinPlan(null); }}>
          <div className="w-full max-w-[540px] bg-[#0c1d11] border border-white/10 rounded-3xl p-7 shadow-2xl max-h-[calc(100vh-32px)] overflow-y-auto">
            {(joinStep === "active" || joinStep === "received") ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 grid place-items-center mx-auto mb-5">
                  <CheckCircle className="w-8 h-8 text-[#22c55e]" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight mb-3">
                  {joinStep === "active" ? "Welcome to SAIGON POWER PLUS! 🎉" : "You're on the list!"}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed mb-3">
                  {joinStep === "active"
                    ? <>Your {PLANS[joinPlan].label} membership is <strong className="text-[#22c55e]">active</strong>{cardLast4 ? <> — billed monthly to the card ending {cardLast4}</> : null}. The Saigon Power team will reach out to finish setting up your dashboard.</>
                    : <>We received your {PLANS[joinPlan].label} membership signup. The Saigon Power team will contact you shortly to complete payment and activate your account.</>}
                </p>
                {reference && <p className="text-white/40 text-sm mb-4">Reference: <strong className="text-white/70">{reference}</strong></p>}
                <button onClick={() => setJoinPlan(null)}
                  className="px-8 py-3.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black rounded-2xl shadow-lg shadow-[#22c55e]/20 transition-colors text-sm">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs font-black text-[#22c55e] uppercase tracking-widest mb-2">{PLANS[joinPlan].label} membership</p>
                    <h3 className="text-2xl font-black text-white tracking-tight">Join for {PLANS[joinPlan].price}/month</h3>
                  </div>
                  <button onClick={() => setJoinPlan(null)} aria-label="Close"
                    className="w-9 h-9 rounded-xl border border-white/15 grid place-items-center text-white/50 hover:text-white hover:bg-white/5 transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={submitJoin}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="j-name" className={labelCls}>Full Name</label>
                      <input id="j-name" autoComplete="name" required placeholder="Your full name" {...jf("full_name")} className={inputCls} />
                    </div>
                    {joinPlan === "POWER_PLUS_COM" && (
                      <div className="sm:col-span-2">
                        <label htmlFor="j-biz" className={labelCls}>Business Name</label>
                        <input id="j-biz" autoComplete="organization" required placeholder="Your business name" {...jf("business_name")} className={inputCls} />
                      </div>
                    )}
                    <div>
                      <label htmlFor="j-email" className={labelCls}>Email Address</label>
                      <input id="j-email" type="email" autoComplete="email" required placeholder="you@example.com" {...jf("email")} className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="j-phone" className={labelCls}>Phone Number</label>
                      <input id="j-phone" autoComplete="tel" required placeholder="(832) 000-0000" {...jf("phone")} className={inputCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="j-addr" className={labelCls}>Service Address</label>
                      <input id="j-addr" autoComplete="street-address" required placeholder="Street address" {...jf("service_address")} className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="j-city" className={labelCls}>City</label>
                      <input id="j-city" autoComplete="address-level2" required placeholder="Houston" {...jf("city")} className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="j-zip" className={labelCls}>ZIP Code</label>
                      <input id="j-zip" autoComplete="postal-code" required placeholder="77000" {...jf("zip")} className={inputCls} />
                    </div>
                  </div>
                  {joinError && (
                    <p className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-semibold">{joinError}</p>
                  )}
                  <button type="submit" disabled={joinStep === "submitting" || joinStep === "paying"}
                    className={`${btnPrimary} w-full mt-5 disabled:opacity-60 disabled:cursor-wait`}>
                    {joinStep === "submitting" ? "Saving your details…"
                      : joinStep === "paying" ? "Waiting for secure payment…"
                      : <>Continue to secure payment <ArrowRight className="w-4 h-4" /></>}
                  </button>
                  <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/35 mt-3 text-center">
                    <Lock className="w-3 h-3 shrink-0" />
                    Card details are entered in Helcim&rsquo;s secure payment window and never touch our servers. {PLANS[joinPlan].price}/month, cancel anytime.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
