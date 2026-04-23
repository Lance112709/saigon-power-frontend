"use client";
import { useState, useRef } from "react";
import { CheckCircle, AlertCircle, Loader2, UserCheck, Mail } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const inputCls = "w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]/50 transition";
const labelCls = "block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider";

const EMPTY_FORM = {
  agent_code: "",
  first_name: "", last_name: "",
  phone: "", email: "",
  address: "", city: "", state: "TX", zip: "",
  est_kwh: "",
};

export default function ReferPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [agentLookupState, setAgentLookupState] = useState<"idle" | "checking" | "found" | "notfound">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (k: keyof typeof EMPTY_FORM, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleAgentCode = (v: string) => {
    set("agent_code", v);
    setAgentName(null);
    setAgentLookupState(v.trim() ? "idle" : "idle");
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (!v.trim()) return;
    setAgentLookupState("checking");
    lookupTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/leads/agents/lookup?code=${encodeURIComponent(v.trim())}`);
        if (res.ok) {
          const d = await res.json();
          setAgentName(d.name);
          setAgentLookupState("found");
        } else {
          setAgentLookupState("notfound");
        }
      } catch {
        setAgentLookupState("notfound");
      }
    }, 600);
  };

  const submit = async () => {
    setError("");
    if (agentLookupState !== "found") { setError("Please enter a valid Agent ID before submitting."); return; }
    const required: (keyof typeof EMPTY_FORM)[] = ["first_name", "last_name", "phone", "address", "city", "zip"];
    for (const f of required) {
      if (!form[f].trim()) { setError(`${f.replace("_", " ")} is required.`); return; }
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name:   form.first_name.trim(),
          last_name:    form.last_name.trim(),
          phone:        form.phone.trim(),
          email:        form.email.trim() || undefined,
          address:      form.address.trim(),
          city:         form.city.trim(),
          state:        form.state.trim().toUpperCase(),
          zip:          form.zip.trim(),
          est_kwh:      form.est_kwh ? parseFloat(form.est_kwh) : undefined,
          sales_agent:  agentName,
          referral_by:  `${agentName} (Agent ID: ${form.agent_code.trim().toUpperCase()})`,
          source:       "referral",
        }),
      });
      if (res.status === 409) { setError("A lead with this name and address already exists in our system."); setSubmitting(false); return; }
      if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.detail || "Something went wrong. Please try again."); setSubmitting(false); return; }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a1a0e] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#22c55e]/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-[#22c55e]" />
          </div>
          <h2 className="text-2xl font-black text-white">Referral Submitted!</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Thank you! Our inside sales team will reach out to your customer within 24 hours.
            You'll receive credit for this referral under Agent ID <strong className="text-white">{form.agent_code.toUpperCase()}</strong>.
          </p>
          <button onClick={() => { setSuccess(false); setForm(EMPTY_FORM); setAgentName(null); setAgentLookupState("idle"); }}
            className="mt-4 px-6 py-2.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-bold transition-colors">
            Submit Another Referral
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1a0e] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0a1a0e]/90 backdrop-blur-md border-b border-white/6">
        <div className="max-w-5xl mx-auto px-5 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <img src="/sgpower-logo.webp" alt="Saigon Power" className="h-10 w-10 object-contain" />
            <p className="font-black text-white text-sm leading-tight">Saigon Power</p>
          </div>
          <a href="/en" className="text-sm text-white/50 hover:text-white transition-colors">← Back to Home</a>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-14 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-block px-3 py-1 rounded-full bg-[#22c55e]/15 text-[#22c55e] text-xs font-bold uppercase tracking-widest">Partner Referral Portal</span>
          <h1 className="text-4xl font-black leading-tight">Refer a Customer</h1>
          <p className="text-white/50 text-base">Fill out the form below and our inside sales team handles the rest. Your customer will be contacted within 24 hours.</p>
        </div>

        {/* Card */}
        <div className="bg-white/4 border border-white/8 rounded-2xl p-8 space-y-8">

          {/* Agent ID section */}
          <div>
            <h3 className="text-sm font-bold text-white/80 mb-4">Your Information</h3>
            <div>
              <label className={labelCls}>Your Agent ID <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  className={inputCls}
                  placeholder="e.g. JOHN1234"
                  value={form.agent_code}
                  onChange={e => handleAgentCode(e.target.value.toUpperCase())}
                />
                {agentLookupState === "checking" && (
                  <Loader2 className="absolute right-3 top-3.5 w-4 h-4 text-white/40 animate-spin" />
                )}
                {agentLookupState === "found" && (
                  <UserCheck className="absolute right-3 top-3.5 w-4 h-4 text-[#22c55e]" />
                )}
              </div>
              {agentLookupState === "found" && agentName && (
                <p className="mt-2 text-sm text-[#22c55e] font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Verified: {agentName}
                </p>
              )}
              {agentLookupState === "notfound" && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300 space-y-1">
                  <p className="font-semibold">Agent ID not found.</p>
                  <p className="text-amber-300/70">
                    Not registered yet?{" "}
                    <a href="mailto:lance112709@gmail.com?subject=Partner Registration Request" className="underline hover:text-amber-200 transition-colors">
                      Email us to join our network
                    </a>{" "}
                    and we'll get you set up.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Customer info */}
          <div>
            <h3 className="text-sm font-bold text-white/80 mb-4">Customer Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>First Name <span className="text-red-400">*</span></label>
                  <input className={inputCls} placeholder="John" value={form.first_name} onChange={e => set("first_name", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Last Name <span className="text-red-400">*</span></label>
                  <input className={inputCls} placeholder="Smith" value={form.last_name} onChange={e => set("last_name", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Phone <span className="text-red-400">*</span></label>
                  <input type="tel" className={inputCls} placeholder="(555) 555-5555" value={form.phone} onChange={e => set("phone", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" className={inputCls} placeholder="john@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Service Address <span className="text-red-400">*</span></label>
                <input className={inputCls} placeholder="123 Main St" value={form.address} onChange={e => set("address", e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className={labelCls}>City <span className="text-red-400">*</span></label>
                  <input className={inputCls} placeholder="Houston" value={form.city} onChange={e => set("city", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input className={inputCls} placeholder="TX" value={form.state} onChange={e => set("state", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Zip <span className="text-red-400">*</span></label>
                  <input className={inputCls} placeholder="77001" value={form.zip} onChange={e => set("zip", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Est. Monthly Usage (kWh) <span className="text-white/30 font-normal normal-case tracking-normal">— optional</span></label>
                <input type="number" className={inputCls} placeholder="1200" value={form.est_kwh} onChange={e => set("est_kwh", e.target.value)} />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <button onClick={submit} disabled={submitting || agentLookupState !== "found"}
            className="w-full py-3.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm transition-colors flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit Referral"}
          </button>
        </div>

        {/* Not a partner yet */}
        <div className="bg-white/3 border border-white/6 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#22c55e]/15 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-[#22c55e]" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Not a registered partner yet?</p>
            <p className="text-white/50 text-sm mt-1">
              Realtors, insurance agents, loan officers, and other referral partners are welcome.{" "}
              <a href="mailto:lance112709@gmail.com?subject=Partner Registration Request"
                className="text-[#22c55e] hover:text-[#4ade80] underline transition-colors font-semibold">
                Email us to get set up
              </a>{" "}
              — we'll create your Agent ID so you can start referring right away.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
