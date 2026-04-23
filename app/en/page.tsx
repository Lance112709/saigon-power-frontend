"use client";
import { useState, useEffect, useRef } from "react";
import {
  Phone, ChevronDown, Star, CheckCircle, ArrowRight,
  Zap, Clock, Shield, Users, Home, Utensils, Briefcase, Plus,
} from "lucide-react";

// ── Wave Canvas Background ─────────────────────────────────────────────────────

function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const drawWave = (
      yBase: number, amp: number, freq: number, speed: number,
      phase: number, alpha: number, width: number,
    ) => {
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      for (let x = 0; x <= canvas.width; x += 4) {
        const y = yBase
          + Math.sin((x / canvas.width) * freq * Math.PI * 2 + t * speed + phase) * amp
          + Math.sin((x / canvas.width) * freq * 0.5 * Math.PI * 2 + t * speed * 0.7 + phase + 1) * amp * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, yBase - amp, 0, yBase + amp * 2);
      grad.addColorStop(0, `rgba(34,197,94,${alpha})`);
      grad.addColorStop(0.5, `rgba(16,185,129,${alpha * 0.6})`);
      grad.addColorStop(1, `rgba(0,0,0,0)`);

      ctx.strokeStyle = `rgba(74,222,128,${alpha * 1.4})`;
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.fillStyle = grad;
      ctx.fill();
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const h = canvas.height;

      // Background waves (large, slow, dim)
      drawWave(h * 0.35, h * 0.18, 1.8, 0.18, 0,      0.06, 1.5);
      drawWave(h * 0.50, h * 0.20, 1.4, 0.14, 2.1,    0.05, 1.5);
      drawWave(h * 0.65, h * 0.16, 2.2, 0.22, 4.3,    0.04, 1);

      // Bright foreground glowing lines
      drawWave(h * 0.30, h * 0.14, 2.0, 0.28, 0.5,    0.10, 2);
      drawWave(h * 0.48, h * 0.18, 1.6, 0.20, 3.0,    0.09, 2.5);
      drawWave(h * 0.62, h * 0.12, 2.4, 0.32, 5.5,    0.08, 1.5);

      // Top bright highlight line
      drawWave(h * 0.22, h * 0.10, 1.2, 0.15, 1.2,    0.14, 3);

      t += 0.008;
      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.9 }}
    />
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const PROVIDERS = [
  "Gexa Energy","TXU Energy","Reliant Energy","Green Mountain Energy",
  "Cirro Energy","Payless Power","4Change Energy","Pulse Power",
  "Constellation","NRG Energy","Ambit Energy","Stream Energy",
];

const PLANS = [
  { name: "No Gimmicks 12 Resi", provider: "Budget Power · 12 mo", rate: "7.6", badge: "Lowest" },
  { name: "No Gimmicks 24 Resi", provider: "Budget Power · 24 mo", rate: "8.4", badge: null },
  { name: "No Gimmicks 36 Resi", provider: "Budget Power · 36 mo", rate: "8.5", badge: null },
];

const FAQS = [
  { q: "Can I switch electricity providers?",
    a: "Yes! Texas is a deregulated electricity market, so you can freely choose your provider without any prior notice." },
  { q: "Will switching cause a power outage?",
    a: "No. Switching never interrupts your service. The same utility continues to deliver power — only your billing company changes." },
  { q: "How long does enrollment take?",
    a: "Most switches are completed within 24 hours. In some cases it activates on your next meter read date (1–7 days)." },
  { q: "Does Saigon Power charge a fee?",
    a: "Never. Our service is 100% free to you. We're compensated by the energy provider when you enroll." },
  { q: "What if I'm in a contract?",
    a: "We'll check your contract and find out if switching makes financial sense — sometimes paying an ETF still saves money." },
];

const TESTIMONIALS = [
  { initials:"LN", name:"Lan Nguyễn",    location:"Houston, TX",     before:"15.8¢", after:"10.9¢", saved:"$340/yr", quote:"Saigon Power saved me $340 last year. They explain everything clearly and handle all the paperwork." },
  { initials:"MT", name:"Minh Trần",     location:"Sugar Land, TX",  before:"16.2¢", after:"11.5¢", saved:"$80/mo",  quote:"As a nail salon owner, switching was always confusing. Saigon Power handled all 3 locations and saved $80/month." },
  { initials:"HL", name:"Hoa Lê",        location:"Katy, TX",        before:"17.1¢", after:"11.9¢", saved:"$95/mo",  quote:"They reminded me 60 days before my contract expired — saved me from a huge rate spike. Outstanding service." },
];

const SEGMENTS = [
  { icon: Home,      label:"Homeowners",        tag:"Most popular", desc:"Fixed-rate 12–24 month plans for maximum savings. No switching fees.",                savings:"Save $200+/year"  },
  { icon: Users,     label:"Nail Salons & Spas", tag:"Specialized",  desc:"Specialized advice for Vietnamese owners. We understand your operating costs.",      savings:"Save $80+/month"  },
  { icon: Utensils,  label:"Restaurants",        tag:"Commercial",   desc:"Custom commercial plans. Save hundreds per month on your restaurant electric bill.", savings:"Save $100+/month" },
  { icon: Briefcase, label:"Small Businesses",   tag:"Business",     desc:"Compare commercial plans, sign long-term contracts, save from month one.",           savings:"Save $150+/month" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

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

function ProviderTicker() {
  const doubled = [...PROVIDERS, ...PROVIDERS];
  return (
    <div className="overflow-hidden relative py-3">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0a1a0e] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0a1a0e] to-transparent z-10 pointer-events-none" />
      <div style={{ display:"flex", width:"max-content", gap:24, animation:"tickerScroll 28s linear infinite" }}>
        {doubled.map((p, i) => (
          <div key={i} className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-white/40">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]/50" />
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [zip, setZip] = useState("");

  return (
    <div className="min-h-screen bg-[#0a1a0e]" style={{ fontFamily:"'Inter',system-ui,sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes tickerScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .hero-text    { animation: fadeUp .7s ease both; }
        .hero-text-2  { animation: fadeUp .7s .1s ease both; }
        .hero-text-3  { animation: fadeUp .7s .2s ease both; }
        .hero-form    { animation: fadeUp .7s .3s ease both; }
        .hero-card    { animation: fadeUp .8s .15s ease both; }
      `}</style>

      {/* ── Topbar ── */}
      <div className="bg-[#060f09] text-white/60 text-xs py-2 px-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <a href="tel:8329379999" className="flex items-center gap-1.5 text-white/80 hover:text-white font-semibold">
            <Phone className="w-3 h-3" />(832) 937-9999
          </a>
          <span className="text-white/20">·</span>
          <span>Mon–Fri, 8AM–6PM support</span>
        </div>
        <span>Texas Electric License <strong className="text-white/50">#BR190102</strong></span>
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-[#0a1a0e]/90 backdrop-blur-md border-b border-white/6">
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full border-2 border-[#22c55e]/60 flex items-center justify-center overflow-hidden bg-[#0f2d18]">
              <img src="/sg-power-logo.jpg" alt="SP" className="w-full h-full object-cover"
                onError={(e:any) => { e.target.style.display="none"; }} />
            </div>
            <div>
              <p className="font-black text-white text-sm leading-tight tracking-tight">Saigon Power</p>
            </div>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-7">
            {[["#plans","Compare Plans"],["#residential","Residential"],["#commercial","Commercial"],["#about","About Us"],["#faq","FAQ"]].map(([h,l]) => (
              <a key={h} href={h} className="text-sm font-medium text-white/65 hover:text-white transition-colors">{l}</a>
            ))}
          </div>

          {/* Right CTA */}
          <div className="flex items-center gap-3">
            <a href="#plans" className="hidden md:block text-sm font-semibold text-white/65 hover:text-white transition-colors">
              Compare Plans
            </a>
            <a href="/apply"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-black transition-colors shadow-lg shadow-[#22c55e]/20">
              <Plus className="w-4 h-4" /> Get a Quote
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-[#0a1a0e]">
        {/* Wave background */}
        <div className="absolute inset-0">
          <WaveBackground />
          {/* dark vignette edges */}
          <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse at center, transparent 40%, #0a1a0e 100%)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a1a0e] to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-10 w-full pt-16 pb-20 flex flex-col lg:flex-row items-center gap-16 lg:gap-20">

          {/* Left — headline + form */}
          <div className="flex-1 min-w-0">
            {/* Rating badge */}
            <div className="hero-text inline-flex items-center gap-2 mb-7">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_,i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
              </div>
              <span className="text-white/70 text-sm font-semibold">4.9 · 500+ Texas Families Served</span>
              <span className="text-white/20">·</span>
              <span className="text-[#22c55e] text-sm font-bold">100% Free</span>
            </div>

            {/* Headline */}
            <h1 className="hero-text-2 font-black text-white leading-[1.02] tracking-tight mb-5"
              style={{ fontSize:"clamp(2.8rem,6vw,5rem)" }}>
              Compare Texas<br />
              Electricity Plans.<br />
              <span className="text-[#22c55e]">Switch in 24 Hours.</span>
            </h1>

            <p className="hero-text-3 text-white/55 text-lg leading-relaxed mb-8 max-w-[440px]">
              We shop 50+ providers, find your lowest rate, and handle all the paperwork.{" "}
              <strong className="text-white font-semibold">You do nothing.</strong>
            </p>

            {/* ZIP form */}
            <div className="hero-form flex max-w-md mb-3">
              <div className="relative flex-1">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text" value={zip}
                  onChange={e => setZip(e.target.value.replace(/\D/,"").slice(0,5))}
                  placeholder="Enter your ZIP code" maxLength={5}
                  className="w-full pl-11 pr-4 py-4 bg-white/10 border border-white/20 rounded-l-2xl text-white placeholder-white/35 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]/60 backdrop-blur-sm transition-all"
                />
              </div>
              <a href="/apply"
                className="px-6 py-4 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black rounded-r-2xl text-sm transition-colors flex items-center gap-2 whitespace-nowrap shadow-xl shadow-[#22c55e]/25">
                See My Plans <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-white/40 mb-9 pl-1">
              <Phone className="w-3.5 h-3.5" />
              or call <a href="tel:8329379999" className="text-white/60 hover:text-white underline">(832) 937-9999</a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {["100% Free Service","Rates Updated Daily","Switch in 24 Hours"].map(b => (
                <div key={b} className="flex items-center gap-1.5 text-sm text-white/50">
                  <CheckCircle className="w-4 h-4 text-[#22c55e]" />{b}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Live rates card */}
          <div className="hero-card w-full lg:w-[380px] shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
              <span className="text-sm text-white/60 font-medium">Live rates · updated today</span>
            </div>

            <div className="bg-[#0f2d18]/80 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
              <div className="px-5 py-3 border-b border-white/8">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Houston Area · Top Plans Right Now</p>
              </div>

              <div className="divide-y divide-white/6">
                {PLANS.map((plan, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-white/4 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{plan.name}</p>
                        {plan.badge && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e] uppercase tracking-wide">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/35 mt-0.5">{plan.provider}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-white">{plan.rate}</span>
                      <span className="text-xs text-white/40 font-medium">¢<br />per kWh</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-4 border-t border-white/8">
                <a href="/apply"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors border border-white/10">
                  See all plans for your ZIP <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            <p className="text-xs text-white/30 mt-3 flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center text-[8px]">i</span>
              If we can't find you a better rate than what you're paying — we'll tell you upfront. No pressure.
            </p>
          </div>
        </div>
      </section>

      {/* ── Provider Ticker ── */}
      <section className="py-4 bg-[#060f09] border-y border-white/5">
        <ProviderTicker />
      </section>

      {/* ── Problem vs Solution ── */}
      <section className="py-20 px-5 bg-[#0a1a0e]" id="plans">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">The Situation Most Texans Are In</h2>
            <p className="text-white/50 max-w-xl mx-auto">Most Texans are overpaying. Most don't know it.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8">
              <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-5">Without Saigon Power</p>
              <ul className="space-y-3.5">
                {["Paying 15–18¢/kWh without knowing it","Contract expired — auto-rolled to variable rate","Spent hours on PowerToChoose with no help","No one to call when your bill spikes","Renewing the same plan out of habit"].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/60">
                    <span className="text-red-400 font-bold mt-0.5">✕</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/5 p-8">
              <p className="text-xs font-black text-[#22c55e] uppercase tracking-widest mb-5">With Saigon Power</p>
              <ul className="space-y-3.5">
                {["Locked in at 10.9–12¢/kWh fixed rate","Renewal reminder 60 days before expiration","We compare 50+ plans and recommend the best","Dedicated agent who speaks your language","Switched in 24 hours — zero paperwork from you"].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/70">
                    <CheckCircle className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="text-center mt-10">
            <a href="/apply" className="inline-flex items-center gap-2 px-8 py-4 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black rounded-2xl shadow-lg shadow-[#22c55e]/20 transition-colors text-sm tracking-tight">
              Compare My Rate Now <ArrowRight className="w-4 h-4" />
            </a>
            <p className="text-xs text-white/30 mt-2">Free · No credit check · Takes 30 seconds</p>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-5 bg-[#060f09]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">We Find, Compare, and Switch. You Do Nothing.</h2>
            <p className="text-white/45 max-w-xl mx-auto">Unlike PowerToChoose, we don't just list plans — we're your agent.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-14">
            {[{v:"50+",l:"Providers compared"},{v:"$150",l:"Avg monthly savings"},{v:"24hrs",l:"Average switch time"},{v:"100%",l:"Free — always"}].map(s => (
              <div key={s.l} className="bg-white/5 rounded-2xl border border-white/8 p-6 text-center">
                <p className="text-3xl font-black text-white tracking-tight">{s.v}</p>
                <p className="text-sm text-white/40 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {step:"01",icon:Zap,        title:"Enter Your ZIP",       time:"5 seconds",       desc:"We instantly pull every available plan in your service area — no account, no credit check."},
              {step:"02",icon:Shield,     title:"We Compare 50+ Plans", time:"30 seconds",      desc:"Our team analyzes every provider's rates, terms, and cancellation fees and surfaces your best 3 options."},
              {step:"03",icon:CheckCircle,title:"We Switch You — Done", time:"Within 24 hours", desc:"Select your plan and we handle every piece of paperwork. You get a confirmation email. Zero effort from you."},
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
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <a href="/apply" className="px-8 py-4 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black rounded-2xl shadow-lg shadow-[#22c55e]/20 transition-colors text-sm text-center tracking-tight">
              Compare Plans Free
            </a>
            <a href="tel:8329379999" className="px-8 py-4 border border-white/15 text-white font-bold rounded-2xl hover:bg-white/5 transition-colors text-sm text-center flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" /> Talk to an Agent
            </a>
          </div>
        </div>
      </section>

      {/* ── Who We Serve ── */}
      <section className="py-20 px-5 bg-[#0a1a0e]" id="residential">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">Who We Help</h2>
            <p className="text-white/45 max-w-xl mx-auto">Electricity solutions for every need in the Vietnamese-American community</p>
          </div>
          <div className="grid md:grid-cols-4 gap-5" id="commercial">
            {SEGMENTS.map((s, i) => (
              <div key={s.label}
                className={`rounded-2xl border p-6 flex flex-col gap-4 transition-all hover:scale-[1.02] ${i===0 ? "border-[#22c55e]/40 bg-[#22c55e]/8" : "border-white/8 bg-white/4"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i===0 ? "bg-[#22c55e]" : "bg-white/8"}`}>
                  <s.icon className={`w-5 h-5 ${i===0 ? "text-white" : "text-white/50"}`} />
                </div>
                <div>
                  <span className="text-xs font-black text-[#22c55e] uppercase tracking-wider">{s.tag}</span>
                  <h3 className="font-black text-white mt-0.5 tracking-tight">{s.label}</h3>
                  <p className="text-xs text-white/45 mt-1.5 leading-relaxed">{s.desc}</p>
                </div>
                <div className="mt-auto">
                  <span className="text-xs font-bold text-[#22c55e] bg-[#22c55e]/12 px-3 py-1 rounded-full">{s.savings}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 px-5 bg-[#060f09]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_,i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-sm font-semibold text-white/40 mb-3">4.9 · 200+ Google Reviews</p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Real Texans. Real Savings.</h2>
            <p className="text-white/40 mt-2">Here's what happened when they stopped overpaying.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white/5 rounded-2xl border border-white/8 p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] text-sm font-black">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{t.name}</p>
                    <p className="text-xs text-white/35">{t.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3 text-xs font-bold flex-wrap border border-white/8">
                  <span className="text-red-400">Before {t.before}/kWh</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
                  <span className="text-[#22c55e]">After {t.after}/kWh</span>
                  <span className="ml-auto text-[#22c55e] bg-[#22c55e]/12 px-2 py-0.5 rounded-full">{t.saved}</span>
                </div>
                <p className="text-sm text-white/50 italic leading-relaxed">"{t.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-5 bg-[#0a1a0e]" id="faq">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(f => <FaqItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-20 px-5 overflow-hidden bg-[#060f09]" id="get-quote">
        <div className="absolute inset-0 pointer-events-none">
          <div style={{position:"absolute",width:800,height:400,borderRadius:"50%",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"radial-gradient(ellipse,#22c55e 0%,transparent 65%)",opacity:0.06,filter:"blur(60px)"}} />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="text-[10px] font-black text-white/25 uppercase tracking-[0.2em] mb-4">Rates updated today · Lock in now</div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">Stop Overpaying. Start Saving Today.</h2>
          <p className="text-white/40 mb-8">500+ Texas families already saving an average of <strong className="text-white/65">$150/month</strong>. Your lower rate is waiting.</p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-sm mx-auto mb-8 text-left space-y-2 text-sm">
            <p className="font-bold text-white">Texas electricity rates change daily</p>
            <div className="flex items-center justify-between">
              <span className="text-white/40">Today's lowest rate:</span>
              <span className="font-black text-[#22c55e] text-xl">10.9¢/kWh</span>
            </div>
            <p className="text-xs text-white/25">Lock in before next rate cycle</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <a href="/apply" className="px-8 py-4 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black rounded-2xl shadow-lg shadow-[#22c55e]/20 transition-colors text-sm flex items-center justify-center gap-2 tracking-tight">
              See My Plans <ArrowRight className="w-4 h-4" />
            </a>
            <a href="tel:8329379999" className="px-8 py-4 bg-white/6 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-colors text-sm flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" /> (832) 937-9999
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-x-7 gap-y-2 text-xs text-white/30">
            {["Your data is secure","Always free","No spam, ever"].map(b => (
              <div key={b} className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#22c55e]" />{b}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#030a05] text-white pt-14 pb-8 px-5 border-t border-white/5" id="about">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full border border-[#22c55e]/40 flex items-center justify-center overflow-hidden">
                  <img src="/sg-power-logo.jpg" alt="SP" className="w-full h-full object-cover"
                    onError={(e:any) => { e.target.style.display="none"; }} />
                </div>
                <span className="font-black text-lg tracking-tight">Saigon Power</span>
              </div>
              <p className="text-sm text-white/35 leading-relaxed max-w-xs">Texas's #1 electricity service for the Vietnamese community</p>
              <div className="mt-4 space-y-1.5 text-sm text-white/30">
                <a href="tel:8329379999" className="flex items-center gap-2 hover:text-white transition-colors"><Phone className="w-3.5 h-3.5" />(832) 937-9999</a>
                <p>info@saigonllc.com · Houston, Texas</p>
                <p>Mon-Fri: 8AM - 6PM</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">Services</p>
              <ul className="space-y-2.5 text-sm text-white/35">
                {[["#residential","Residential Electricity"],["#commercial","Commercial Electricity"],["#plans","Compare Plans"]].map(([h,l]) => (
                  <li key={l}><a href={h} className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">Company</p>
              <ul className="space-y-2.5 text-sm text-white/35">
                {[["#about","About Us"],["#faq","FAQ"]].map(([h,l]) => (
                  <li key={l}><a href={h} className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
              <a href="/apply" className="inline-block mt-5 px-5 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-black rounded-xl transition-colors shadow-lg shadow-[#22c55e]/20 tracking-tight">
                Nhận Báo Giá
              </a>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/20">
            <p>© 2026 Saigon Power LLC. All rights reserved. · Texas Electric License: <strong className="text-white/35">#BR190102</strong></p>
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
