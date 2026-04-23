"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Phone, ChevronDown, Star, CheckCircle, ArrowRight,
  Zap, Clock, Shield, DollarSign, Users, Home, Building2, Utensils, Briefcase,
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
  { icon: Home, label: "Homeowners", tag: "Most popular", desc: "Fixed-rate 12–24 month plans for maximum savings. No switching fees.", savings: "Save $200+/year" },
  { icon: Users, label: "Nail Salons & Spas", tag: "Specialized", desc: "We understand nail salon operating costs. Specialized advice for Vietnamese owners.", savings: "Save $80+/month" },
  { icon: Utensils, label: "Restaurants", tag: "Commercial", desc: "Custom commercial plans. Save hundreds per month on your restaurant electric bill.", savings: "Save $100+/month" },
  { icon: Briefcase, label: "Small Businesses", tag: "Business", desc: "Compare commercial plans, sign long-term contracts, save from month one.", savings: "Save $150+/month" },
];

const STATS = [
  { value: "50+", label: "Providers compared" },
  { value: "$150", label: "Avg monthly savings" },
  { value: "24hrs", label: "Average switch time" },
  { value: "100%", label: "Free — always" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-sm font-medium text-slate-700 hover:text-[#0F1D5E] transition-colors">
      {children}
    </a>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
      >
        {q}
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
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
      <div className="flex animate-[scroll_25s_linear_infinite] w-max gap-6">
        {doubled.map((p, i) => (
          <span key={i} className="whitespace-nowrap px-5 py-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 shadow-sm">
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Topbar ── */}
      <div className="bg-[#0F1D5E] text-white text-xs py-2 px-4 text-center">
        <span className="font-medium">Texas Electric License #BR190102</span>
        <span className="mx-3 opacity-40">·</span>
        <a href="tel:8329379999" className="hover:underline">(832) 937-9999</a>
        <span className="ml-2 opacity-60">· Mon–Fri, 8AM–6PM</span>
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img src="/sg-power-logo.jpg" alt="Saigon Power" className="h-9 w-auto rounded-lg object-contain" onError={(e: any) => { e.target.style.display='none'; }} />
            <span className="font-bold text-[#0F1D5E] text-lg">Saigon Power</span>
          </div>

          <div className="hidden md:flex items-center gap-7">
            <NavLink href="#plans">Compare Plans</NavLink>
            <NavLink href="#residential">Residential</NavLink>
            <NavLink href="#commercial">Commercial</NavLink>
            <NavLink href="#about">About Us</NavLink>
            <NavLink href="#faq">FAQ</NavLink>
          </div>

          <div className="flex items-center gap-3">
            <a href="tel:8329379999"
              className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-[#0F1D5E] hover:underline">
              <Phone className="w-4 h-4" /> (832) 937-9999
            </a>
            <a href="#get-quote"
              className="px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 transition-colors">
              Get a Quote
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#0F1D5E] via-[#162580] to-[#1a2fa0] text-white pt-20 pb-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #60a5fa 0%, transparent 60%)" }} />
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            </div>
            <span className="text-sm text-blue-200">4.9 · 500+ Texas Families Served · 100% Free</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">
            Compare Texas<br />
            <span className="text-blue-300">Electricity Plans.</span><br />
            Switch in 24 Hours.
          </h1>
          <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
            We shop 50+ providers, find your lowest rate, and handle all the paperwork. You do nothing.
          </p>

          {/* ZIP form */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
            <input
              type="text"
              value={zip}
              onChange={e => setZip(e.target.value.replace(/\D/, "").slice(0, 5))}
              placeholder="Enter your ZIP code"
              maxLength={5}
              className="flex-1 px-5 py-3.5 rounded-xl text-slate-900 font-medium text-base outline-none focus:ring-2 focus:ring-blue-400 shadow-lg"
            />
            <a href="/apply"
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-colors whitespace-nowrap flex items-center gap-2 justify-center">
              See My Plans <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <p className="text-xs text-blue-300">or call <a href="tel:8329379999" className="underline">(832) 937-9999</a></p>

          <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-blue-200">
            {["100% Free Service", "No Credit Check", "Rates Updated Daily", "Switch in 24 Hours"].map(b => (
              <div key={b} className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" />{b}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Provider Ticker ── */}
      <section className="py-6 bg-slate-50 border-b border-slate-200">
        <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">We compare</p>
        <ProviderTicker />
      </section>

      {/* ── Problem vs Solution ── */}
      <section className="py-20 px-4 bg-white" id="plans">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">The Situation Most Texans Are In</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Most Texans are overpaying. Most don't know it.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-8">
              <p className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4">Without Saigon Power</p>
              <ul className="space-y-3">
                {[
                  "Paying 15–18¢/kWh without knowing it",
                  "Contract expired — auto-rolled to variable rate",
                  "Spent hours on PowerToChoose with no help",
                  "No one to call when your bill spikes",
                  "Renewing the same plan out of habit",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-red-800">
                    <span className="mt-0.5 text-red-400">✕</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8">
              <p className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-4">With Saigon Power</p>
              <ul className="space-y-3">
                {[
                  "Locked in at 10.9–12¢/kWh fixed rate",
                  "Renewal reminder 60 days before expiration",
                  "We compare 50+ plans and recommend the best",
                  "Dedicated agent who speaks your language",
                  "Switched in 24 hours — zero paperwork from you",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="text-center mt-10">
            <a href="/apply"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#0F1D5E] text-white font-bold rounded-2xl shadow-lg hover:bg-[#0F1D5E]/90 transition-colors text-sm">
              Compare My Rate Now <ArrowRight className="w-4 h-4" />
            </a>
            <p className="text-xs text-slate-400 mt-2">Free · No credit check · Takes 30 seconds</p>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-4 bg-[#F4F6FA]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">We Find, Compare, and Switch. You Do Nothing.</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Unlike PowerToChoose, we don't just list plans — we're your agent. We handle everything.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-14">
            {STATS.map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
                <p className="text-3xl font-extrabold text-[#0F1D5E]">{s.value}</p>
                <p className="text-sm text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", icon: Zap, title: "Enter Your ZIP", time: "5 seconds", desc: "We instantly pull every available plan in your service area — no account, no credit check." },
              { step: "02", icon: Shield, title: "We Compare 50+ Plans", time: "30 seconds", desc: "Our team analyzes every provider's rates, terms, and cancellation fees and surfaces your best 3 options." },
              { step: "03", icon: CheckCircle, title: "We Switch You — Done", time: "Within 24 hours", desc: "Select your plan and we handle every piece of paperwork. You get a confirmation email. Zero effort from you." },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7 relative overflow-hidden">
                <span className="absolute top-4 right-5 text-5xl font-black text-slate-100 select-none">{s.step}</span>
                <s.icon className="w-8 h-8 text-[#0F1D5E] mb-4" />
                <h3 className="font-bold text-slate-900 text-lg mb-1">{s.title}</h3>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold mb-3">
                  <Clock className="w-3.5 h-3.5" /> {s.time}
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <a href="/apply"
              className="px-8 py-4 bg-[#0F1D5E] text-white font-bold rounded-2xl shadow-lg hover:bg-[#0F1D5E]/90 transition-colors text-sm text-center">
              Compare Plans Free
            </a>
            <a href="tel:8329379999"
              className="px-8 py-4 border-2 border-[#0F1D5E] text-[#0F1D5E] font-bold rounded-2xl hover:bg-[#0F1D5E]/5 transition-colors text-sm text-center flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" /> Talk to an Agent
            </a>
          </div>
        </div>
      </section>

      {/* ── Who We Serve ── */}
      <section className="py-20 px-4 bg-white" id="residential">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">Who We Help</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Electricity solutions for every need in the Vietnamese-American community</p>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {SEGMENTS.map((s, i) => (
              <div key={s.label}
                className={`rounded-2xl border p-6 flex flex-col gap-4 shadow-sm ${i === 0 ? "border-[#0F1D5E] bg-[#EEF1FA]" : "border-slate-200 bg-white"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === 0 ? "bg-[#0F1D5E]" : "bg-slate-100"}`}>
                  <s.icon className={`w-5 h-5 ${i === 0 ? "text-white" : "text-slate-500"}`} />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{s.tag}</span>
                  <h3 className="font-bold text-slate-900 mt-0.5">{s.label}</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{s.desc}</p>
                </div>
                <div className="mt-auto">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">{s.savings}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 px-4 bg-[#F4F6FA]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-sm font-semibold text-slate-500 mb-4">4.9 · 200+ Google Reviews</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Real Texans. Real Savings.</h2>
            <p className="text-slate-500 mt-2">Here's what happened when they stopped overpaying.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0F1D5E] flex items-center justify-center text-white text-sm font-bold">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 text-xs font-semibold">
                  <div className="text-red-500">Before {t.before} per kWh</div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <div className="text-emerald-600">After {t.after} per kWh</div>
                  <div className="ml-auto text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{t.saved}</div>
                </div>
                <p className="text-sm text-slate-600 italic leading-relaxed">"{t.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-4 bg-white" id="faq">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(f => <FaqItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#0F1D5E] to-[#1a2fa0] text-white" id="get-quote">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-xs font-semibold text-blue-300 uppercase tracking-widest mb-4">Rates updated today · Lock in now</div>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3">Stop Overpaying. Start Saving Today.</h2>
          <p className="text-blue-200 mb-2">500+ Texas families already saving an average of <strong>$150/month</strong>.</p>
          <p className="text-blue-300 text-sm mb-8">Your lower rate is waiting.</p>

          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 max-w-md mx-auto mb-8 text-left space-y-2 text-sm text-blue-100">
            <p className="font-semibold text-white">Texas electricity rates change daily</p>
            <div className="flex items-center justify-between">
              <span>Today's lowest rate:</span>
              <span className="font-bold text-emerald-300 text-lg">10.9¢/kWh</span>
            </div>
            <p className="text-xs text-blue-300">Lock in before next rate cycle</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <a href="/apply"
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg transition-colors text-sm text-center flex items-center justify-center gap-2">
              See My Plans <ArrowRight className="w-4 h-4" />
            </a>
            <a href="tel:8329379999"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/20 transition-colors text-sm text-center flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" /> Prefer to call? (832) 937-9999
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-blue-300">
            {["Your data is secure", "Always free", "No spam, ever", "No credit check"].map(b => (
              <div key={b} className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" />{b}</div>
            ))}
          </div>

          <div className="mt-8 p-5 bg-white/5 rounded-2xl border border-white/10 text-sm text-blue-200 max-w-lg mx-auto">
            <span className="font-semibold text-white">Our promise: </span>
            If we can't find you a lower rate than what you're currently paying, we'll tell you upfront. No pressure, no obligation.
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0F1D5E] text-white pt-14 pb-8 px-4" id="about">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <img src="/sg-power-logo.jpg" alt="Saigon Power" className="h-9 w-auto rounded-lg object-contain" onError={(e: any) => { e.target.style.display='none'; }} />
                <span className="font-bold text-lg">Saigon Power</span>
              </div>
              <p className="text-sm text-blue-200 leading-relaxed max-w-xs">
                Texas's #1 electricity service for the Vietnamese community
              </p>
              <div className="mt-4 space-y-1 text-sm text-blue-300">
                <a href="tel:8329379999" className="flex items-center gap-2 hover:text-white"><Phone className="w-4 h-4" />(832) 937-9999</a>
                <p>info@saigonllc.com</p>
                <p>Houston, Texas</p>
                <p>Mon-Fri: 8AM - 6PM</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Services</p>
              <ul className="space-y-2 text-sm text-blue-200">
                <li><a href="#residential" className="hover:text-white">Residential Electricity</a></li>
                <li><a href="#commercial" className="hover:text-white">Commercial Electricity</a></li>
                <li><a href="#plans" className="hover:text-white">Compare Plans</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Company</p>
              <ul className="space-y-2 text-sm text-blue-200">
                <li><a href="#about" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              </ul>
              <div className="mt-6">
                <a href="/apply"
                  className="inline-block px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-colors">
                  Nhận Báo Giá
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-blue-400">
            <p>© 2026 Saigon Power LLC. All rights reserved. · Texas Electric License: <strong>#BR190102</strong></p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Ticker animation */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-\\[scroll_25s_linear_infinite\\] {
          animation: scroll 25s linear infinite;
        }
      `}</style>
    </div>
  );
}
