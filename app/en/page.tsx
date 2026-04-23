"use client";
import { useState, useEffect, useRef } from "react";
import {
  Phone, ChevronDown, Star, CheckCircle, ArrowRight,
  Zap, Clock, Shield, Users, Home, Utensils, Briefcase,
} from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────

const PROVIDERS = [
  "Gexa Energy", "TXU Energy", "Reliant Energy", "Green Mountain Energy",
  "Cirro Energy", "Payless Power", "4Change Energy", "Pulse Power",
  "Constellation", "NRG Energy", "Ambit Energy", "Stream Energy",
];

const FAQS = [
  {
    q: "Can I switch electricity providers?",
    a: "Yes! Texas is a deregulated electricity market, so you can freely choose your provider without any prior notice. You don't need permission from your current provider.",
  },
  {
    q: "Will switching cause a power outage?",
    a: "No. Switching electricity providers in Texas never interrupts your service. The same utility (e.g., CenterPoint, Oncor) continues to deliver power — only your billing company changes.",
  },
  {
    q: "How long does enrollment take?",
    a: "Most switches are completed within 24 hours. In some cases, your new plan activates on your next meter read date (typically within 1–7 days).",
  },
  {
    q: "Does Saigon Power charge a fee?",
    a: "Never. Our service is 100% free to you. We're compensated by the energy provider when you enroll — you pay nothing extra.",
  },
  {
    q: "What if I'm in a contract?",
    a: "We'll check your current contract details and find out if switching makes financial sense. Sometimes paying an early termination fee still saves money long-term.",
  },
];

const TESTIMONIALS = [
  {
    initials: "LN",
    name: "Lan Nguyễn",
    location: "Houston, TX",
    before: "15.8¢",
    after: "10.9¢",
    saved: "$340/yr saved",
    quote: "Saigon Power saved me $340 last year. They explain everything clearly and handle all the paperwork — I didn't have to do anything.",
  },
  {
    initials: "MT",
    name: "Minh Trần",
    location: "Sugar Land, TX",
    before: "16.2¢",
    after: "11.5¢",
    saved: "$80/mo saved",
    quote: "As a nail salon owner, switching electricity was always confusing. Saigon Power handled all 3 of my locations and saved $80/month.",
  },
  {
    initials: "HL",
    name: "Hoa Lê",
    location: "Katy, TX",
    before: "17.1¢",
    after: "11.9¢",
    saved: "$95/mo saved",
    quote: "They reminded me 60 days before my contract expired — saved me from a huge rate spike. Outstanding service, I tell everyone I know.",
  },
];

const SEGMENTS = [
  { icon: Home,     label: "Homeowners",        tag: "Most popular", desc: "Fixed-rate 12–24 month plans for maximum savings. No switching fees.",                      savings: "Save $200+/year"  },
  { icon: Users,    label: "Nail Salons & Spas", tag: "Specialized",  desc: "We understand nail salon operating costs. Specialized advice for Vietnamese owners.",       savings: "Save $80+/month"  },
  { icon: Utensils, label: "Restaurants",        tag: "Commercial",   desc: "Custom commercial plans. Save hundreds per month on your restaurant electric bill.",         savings: "Save $100+/month" },
  { icon: Briefcase,label: "Small Businesses",   tag: "Business",     desc: "Compare commercial plans, sign long-term contracts, save from month one.",                  savings: "Save $150+/month" },
];

const STATS = [
  { value: "50+",  label: "Providers compared"  },
  { value: "$150", label: "Avg monthly savings"  },
  { value: "24hrs",label: "Average switch time"  },
  { value: "100%", label: "Free — always"        },
];

// ── Animated Background ────────────────────────────────────────────────────────

function AnimatedBackground() {
  return (
    <>
      {/* Orb 1 — green, top-left */}
      <div className="orb orb-1" />
      {/* Orb 2 — blue, top-right */}
      <div className="orb orb-2" />
      {/* Orb 3 — indigo, center */}
      <div className="orb orb-3" />
      {/* Orb 4 — teal, bottom-right */}
      <div className="orb orb-4" />
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
      >
        {q}
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

function ProviderTicker() {
  const doubled = [...PROVIDERS, ...PROVIDERS];
  return (
    <div className="overflow-hidden relative">
      {/* fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0B1120] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0B1120] to-transparent z-10 pointer-events-none" />
      <div className="ticker-track flex w-max gap-6">
        {doubled.map((p, i) => (
          <span key={i} className="whitespace-nowrap px-5 py-2 rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white/60 backdrop-blur-sm">
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [zip, setZip] = useState("");

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        /* Floating orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
          pointer-events: none;
          will-change: transform;
        }
        .orb-1 {
          width: 600px; height: 600px;
          top: -120px; left: -80px;
          background: radial-gradient(circle, #00C853 0%, transparent 70%);
          animation: orbFloat1 18s ease-in-out infinite;
        }
        .orb-2 {
          width: 500px; height: 500px;
          top: -60px; right: -100px;
          background: radial-gradient(circle, #1565C0 0%, transparent 70%);
          animation: orbFloat2 22s ease-in-out infinite;
        }
        .orb-3 {
          width: 700px; height: 400px;
          top: 40%; left: 30%;
          background: radial-gradient(ellipse, #4F46E5 0%, transparent 65%);
          animation: orbFloat3 28s ease-in-out infinite;
          opacity: 0.10;
        }
        .orb-4 {
          width: 400px; height: 400px;
          bottom: 0; right: 10%;
          background: radial-gradient(circle, #00897B 0%, transparent 70%);
          animation: orbFloat4 20s ease-in-out infinite;
          opacity: 0.12;
        }
        @keyframes orbFloat1 {
          0%,100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(60px, 80px) scale(1.08); }
          66%      { transform: translate(-40px, 120px) scale(0.94); }
        }
        @keyframes orbFloat2 {
          0%,100% { transform: translate(0, 0) scale(1); }
          40%      { transform: translate(-80px, 60px) scale(1.1); }
          70%      { transform: translate(40px, -40px) scale(0.95); }
        }
        @keyframes orbFloat3 {
          0%,100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-60px, -80px) scale(1.12); }
        }
        @keyframes orbFloat4 {
          0%,100% { transform: translate(0, 0) scale(1); }
          45%      { transform: translate(-70px, -60px) scale(1.06); }
          80%      { transform: translate(50px, 30px) scale(0.92); }
        }

        /* Provider ticker */
        .ticker-track {
          animation: tickerScroll 28s linear infinite;
        }
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* Fade-in on scroll */
        .fade-in {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .fade-in.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* ── Topbar ── */}
      <div className="bg-[#0B1120] text-white text-xs py-2 px-4 text-center border-b border-white/5">
        <span className="font-semibold text-white/70">Texas Electric License #BR190102</span>
        <span className="mx-3 text-white/20">·</span>
        <a href="tel:8329379999" className="text-[#00C853] font-bold hover:underline">(832) 937-9999</a>
        <span className="ml-2 text-white/30">· Mon–Fri, 8AM–6PM</span>
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-[#0B1120]/95 backdrop-blur-md border-b border-white/8 shadow-lg">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <img src="/sg-power-logo.jpg" alt="Saigon Power" className="h-8 w-auto rounded-lg object-contain"
              onError={(e: any) => { e.target.style.display = "none"; }} />
            <span className="font-black text-white text-lg tracking-tight">Saigon Power</span>
          </div>

          <div className="hidden md:flex items-center gap-7">
            {[["#plans","Compare Plans"],["#residential","Residential"],["#commercial","Commercial"],["#about","About Us"],["#faq","FAQ"]].map(([href,label]) => (
              <a key={href} href={href} className="text-sm font-medium text-white/60 hover:text-white transition-colors">{label}</a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a href="tel:8329379999" className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white transition-colors">
              <Phone className="w-4 h-4" /> (832) 937-9999
            </a>
            <a href="/apply"
              className="px-4 py-2 rounded-xl bg-[#00C853] hover:bg-[#00a844] text-white text-sm font-bold transition-colors shadow-lg shadow-[#00C853]/20">
              Get a Quote
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex flex-col justify-center overflow-hidden bg-[#0B1120]">
        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <AnimatedBackground />
          {/* Dark overlay to tame brightness */}
          <div className="absolute inset-0 bg-black/25" />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.025]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-5 pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 rounded-full px-4 py-1.5 mb-7 backdrop-blur-sm">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-white/70 text-xs font-semibold">4.9 · 500+ Texas Families Served</span>
            <span className="text-white/20">·</span>
            <span className="text-[#00C853] text-xs font-bold">100% Free</span>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(2.6rem,6vw,5rem)] font-black text-white leading-[1.04] tracking-tight mb-5">
            Compare Texas<br />
            Electricity Plans.<br />
            <span className="text-[#00C853]">Switch in 24 Hours.</span>
          </h1>

          <p className="text-lg text-white/55 leading-relaxed mb-9 max-w-lg mx-auto">
            We shop 50+ providers, find your lowest rate, and handle all the paperwork.{" "}
            <span className="text-white/80 font-semibold">You do nothing.</span>
          </p>

          {/* ZIP form */}
          <div className="flex flex-col sm:flex-row gap-0 max-w-md mx-auto mb-4 shadow-2xl shadow-black/40">
            <input
              type="text"
              value={zip}
              onChange={e => setZip(e.target.value.replace(/\D/, "").slice(0, 5))}
              placeholder="Enter your ZIP code"
              maxLength={5}
              className="flex-1 px-5 py-4 rounded-l-2xl sm:rounded-r-none rounded-r-2xl sm:rounded-bl-2xl bg-white/10 border border-white/20 text-white placeholder-white/35 text-sm font-medium outline-none focus:ring-2 focus:ring-[#00C853]/50 focus:border-[#00C853]/60 backdrop-blur-sm transition-all"
            />
            <a href="/apply"
              className="px-7 py-4 bg-[#00C853] hover:bg-[#00a844] text-white font-black rounded-r-2xl sm:rounded-l-none rounded-l-2xl sm:rounded-tr-2xl text-sm transition-colors flex items-center gap-2 justify-center whitespace-nowrap shadow-lg shadow-[#00C853]/30">
              See My Plans <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <p className="text-xs text-white/30">or call <a href="tel:8329379999" className="text-white/50 hover:text-white underline">(832) 937-9999</a></p>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3">
            {["100% Free Service", "No Credit Check", "Rates Updated Daily", "Switch in 24 Hours"].map(b => (
              <div key={b} className="flex items-center gap-1.5 text-sm text-white/50">
                <CheckCircle className="w-4 h-4 text-[#00C853]" />{b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Provider Ticker ── */}
      <section className="py-5 bg-[#0B1120] border-t border-white/5">
        <p className="text-center text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-4">We compare</p>
        <ProviderTicker />
      </section>

      {/* ── Problem vs Solution ── */}
      <section className="py-20 px-5 bg-white" id="plans">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight">The Situation Most Texans Are In</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Most Texans are overpaying. Most don't know it.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-8">
              <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-5">Without Saigon Power</p>
              <ul className="space-y-3.5">
                {[
                  "Paying 15–18¢/kWh without knowing it",
                  "Contract expired — auto-rolled to variable rate",
                  "Spent hours on PowerToChoose with no help",
                  "No one to call when your bill spikes",
                  "Renewing the same plan out of habit",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-red-800">
                    <span className="text-red-400 font-bold mt-0.5">✕</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8">
              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-5">With Saigon Power</p>
              <ul className="space-y-3.5">
                {[
                  "Locked in at 10.9–12¢/kWh fixed rate",
                  "Renewal reminder 60 days before expiration",
                  "We compare 50+ plans and recommend the best",
                  "Dedicated agent who speaks your language",
                  "Switched in 24 hours — zero paperwork from you",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="text-center mt-10">
            <a href="/apply"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#0B1120] text-white font-black rounded-2xl shadow-lg hover:bg-[#0B1120]/85 transition-colors text-sm tracking-tight">
              Compare My Rate Now <ArrowRight className="w-4 h-4" />
            </a>
            <p className="text-xs text-slate-400 mt-2">Free · No credit check · Takes 30 seconds</p>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-5 bg-[#F4F6FA]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight">We Find, Compare, and Switch. You Do Nothing.</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Unlike PowerToChoose, we don't just list plans — we're your agent. We handle everything.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-14">
            {STATS.map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
                <p className="text-3xl font-black text-[#0B1120] tracking-tight">{s.value}</p>
                <p className="text-sm text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { step: "01", icon: Zap,         title: "Enter Your ZIP",       time: "5 seconds",       desc: "We instantly pull every available plan in your service area — no account, no credit check." },
              { step: "02", icon: Shield,       title: "We Compare 50+ Plans", time: "30 seconds",      desc: "Our team analyzes every provider's rates, terms, and cancellation fees and surfaces your best 3 options." },
              { step: "03", icon: CheckCircle,  title: "We Switch You — Done", time: "Within 24 hours", desc: "Select your plan and we handle every piece of paperwork. You get a confirmation email. Zero effort from you." },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7 relative overflow-hidden">
                <span className="absolute top-4 right-5 text-6xl font-black text-slate-100 select-none leading-none">{s.step}</span>
                <s.icon className="w-8 h-8 text-[#0B1120] mb-4" />
                <h3 className="font-black text-slate-900 text-base mb-1 tracking-tight">{s.title}</h3>
                <div className="flex items-center gap-1 text-xs text-[#00C853] font-bold mb-3">
                  <Clock className="w-3.5 h-3.5" /> {s.time}
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <a href="/apply" className="px-8 py-4 bg-[#0B1120] text-white font-black rounded-2xl shadow-lg hover:bg-[#0B1120]/85 transition-colors text-sm text-center tracking-tight">
              Compare Plans Free
            </a>
            <a href="tel:8329379999" className="px-8 py-4 border-2 border-[#0B1120] text-[#0B1120] font-black rounded-2xl hover:bg-[#0B1120]/5 transition-colors text-sm text-center flex items-center justify-center gap-2 tracking-tight">
              <Phone className="w-4 h-4" /> Talk to an Agent
            </a>
          </div>
        </div>
      </section>

      {/* ── Who We Serve ── */}
      <section className="py-20 px-5 bg-white" id="residential">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight">Who We Help</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Electricity solutions for every need in the Vietnamese-American community</p>
          </div>
          <div className="grid md:grid-cols-4 gap-5" id="commercial">
            {SEGMENTS.map((s, i) => (
              <div key={s.label}
                className={`rounded-2xl border p-6 flex flex-col gap-4 shadow-sm transition-shadow hover:shadow-md ${i === 0 ? "border-[#0B1120] bg-[#0B1120] text-white" : "border-slate-200 bg-white"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === 0 ? "bg-[#00C853]" : "bg-slate-100"}`}>
                  <s.icon className={`w-5 h-5 ${i === 0 ? "text-white" : "text-slate-500"}`} />
                </div>
                <div>
                  <span className={`text-xs font-black uppercase tracking-wider ${i === 0 ? "text-[#00C853]" : "text-emerald-600"}`}>{s.tag}</span>
                  <h3 className={`font-black mt-0.5 tracking-tight ${i === 0 ? "text-white" : "text-slate-900"}`}>{s.label}</h3>
                  <p className={`text-xs mt-1.5 leading-relaxed ${i === 0 ? "text-white/60" : "text-slate-500"}`}>{s.desc}</p>
                </div>
                <div className="mt-auto">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${i === 0 ? "bg-[#00C853]/20 text-[#00C853]" : "bg-emerald-50 text-emerald-700"}`}>{s.savings}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 px-5 bg-[#F4F6FA]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-sm font-semibold text-slate-500 mb-3">4.9 · 200+ Google Reviews</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Real Texans. Real Savings.</h2>
            <p className="text-slate-500 mt-2">Here's what happened when they stopped overpaying.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0B1120] flex items-center justify-center text-white text-sm font-black">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3 text-xs font-bold flex-wrap">
                  <span className="text-red-500">Before {t.before}/kWh</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span className="text-emerald-600">After {t.after}/kWh</span>
                  <span className="ml-auto text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{t.saved}</span>
                </div>
                <p className="text-sm text-slate-600 italic leading-relaxed">"{t.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-5 bg-white" id="faq">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 tracking-tight">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(f => <FaqItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── CTA — dark with orbs ── */}
      <section className="relative py-20 px-5 overflow-hidden bg-[#0B1120]" id="get-quote">
        {/* Reuse orb effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position:"absolute", width:700, height:400, borderRadius:"50%", top:"50%", left:"50%", transform:"translate(-50%,-55%)", background:"radial-gradient(ellipse, #00C853 0%, transparent 60%)", opacity:0.12, filter:"blur(60px)" }} />
          <div style={{ position:"absolute", width:500, height:300, borderRadius:"50%", bottom:0, right:"10%", background:"radial-gradient(ellipse, #1565C0 0%, transparent 65%)", opacity:0.10, filter:"blur(60px)" }} />
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage:"linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize:"60px 60px" }} />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Rates updated today · Lock in now</div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">Stop Overpaying. Start Saving Today.</h2>
          <p className="text-white/50 mb-2">500+ Texas families already saving an average of <strong className="text-white/80">$150/month</strong>.</p>
          <p className="text-white/35 text-sm mb-8">Your lower rate is waiting.</p>

          <div className="bg-white/6 backdrop-blur border border-white/10 rounded-2xl p-6 max-w-sm mx-auto mb-8 text-left space-y-2 text-sm">
            <p className="font-bold text-white">Texas electricity rates change daily</p>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Today's lowest rate:</span>
              <span className="font-black text-[#00C853] text-xl">10.9¢/kWh</span>
            </div>
            <p className="text-xs text-white/30">Lock in before next rate cycle</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <a href="/apply"
              className="px-8 py-4 bg-[#00C853] hover:bg-[#00a844] text-white font-black rounded-2xl shadow-lg shadow-[#00C853]/20 transition-colors text-sm text-center flex items-center justify-center gap-2 tracking-tight">
              See My Plans <ArrowRight className="w-4 h-4" />
            </a>
            <a href="tel:8329379999"
              className="px-8 py-4 bg-white/8 hover:bg-white/14 text-white font-bold rounded-2xl border border-white/15 transition-colors text-sm text-center flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" /> (832) 937-9999
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-x-7 gap-y-2 text-xs text-white/35">
            {["Your data is secure", "Always free", "No spam, ever", "No credit check"].map(b => (
              <div key={b} className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#00C853]" />{b}</div>
            ))}
          </div>

          <div className="mt-8 p-5 bg-white/5 rounded-2xl border border-white/8 text-sm text-white/40 max-w-lg mx-auto">
            <span className="font-bold text-white/60">Our promise: </span>
            If we can't find you a lower rate than what you're currently paying, we'll tell you upfront. No pressure, no obligation.
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#060C1A] text-white pt-14 pb-8 px-5" id="about">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <img src="/sg-power-logo.jpg" alt="Saigon Power" className="h-8 w-auto rounded-lg object-contain"
                  onError={(e: any) => { e.target.style.display = "none"; }} />
                <span className="font-black text-lg tracking-tight">Saigon Power</span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed max-w-xs">
                Texas's #1 electricity service for the Vietnamese community
              </p>
              <div className="mt-4 space-y-1.5 text-sm text-white/35">
                <a href="tel:8329379999" className="flex items-center gap-2 hover:text-white transition-colors"><Phone className="w-4 h-4" />(832) 937-9999</a>
                <p>info@saigonllc.com</p>
                <p>Houston, Texas</p>
                <p>Mon-Fri: 8AM - 6PM</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-white/25 uppercase tracking-[0.2em] mb-4">Services</p>
              <ul className="space-y-2.5 text-sm text-white/40">
                {[["#residential","Residential Electricity"],["#commercial","Commercial Electricity"],["#plans","Compare Plans"],["#","Blog"]].map(([h,l]) => (
                  <li key={l}><a href={h} className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-black text-white/25 uppercase tracking-[0.2em] mb-4">Company</p>
              <ul className="space-y-2.5 text-sm text-white/40">
                {[["#about","About Us"],["#","Contact"],["#faq","FAQ"]].map(([h,l]) => (
                  <li key={l}><a href={h} className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
              <div className="mt-6">
                <a href="/apply"
                  className="inline-block px-5 py-2.5 bg-[#00C853] hover:bg-[#00a844] text-white text-sm font-black rounded-xl transition-colors shadow-lg shadow-[#00C853]/20 tracking-tight">
                  Nhận Báo Giá
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/25">
            <p>© 2026 Saigon Power LLC. All rights reserved. · Texas Electric License: <strong className="text-white/40">#BR190102</strong></p>
            <div className="flex gap-5">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
