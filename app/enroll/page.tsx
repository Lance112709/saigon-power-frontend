"use client";
import { useEffect, useMemo, useState } from "react";
import { Zap, Check, ChevronLeft, ChevronRight, Loader2, PartyPopper, Search } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Plan = { id: number; plan_name: string; provider: string | null; rate: number | null; term_months: number | null; badge?: string | null };

const inputCls = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/30 placeholder:text-slate-400";
const labelCls = "block text-xs font-semibold text-slate-600 mb-1.5";

const STEPS = ["Plan", "Service Address", "Your Info", "Review"];

export default function EnrollPage() {
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<any>(null);

  const [form, setForm] = useState<any>({
    plan_id: null,
    enrollment_type: "switch",
    requested_start_date: "",
    service_address: "", service_city: "", service_state: "TX", service_zip: "",
    esiid: "",
    first_name: "", last_name: "", email: "", phone: "",
    terms_accepted: false,
    company_website: "",   // honeypot — hidden field, humans never fill it
    ref: "",
  });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  // status checker
  const [checkRef, setCheckRef] = useState("");
  const [checkLast, setCheckLast] = useState("");
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v1/landing`).then(r => r.json()).then(d => setPlans(Array.isArray(d) ? d : [])).catch(() => {});
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setForm((f: any) => ({ ...f, ref }));
  }, []);

  const selectedPlan = useMemo(() => plans.find(p => p.id === form.plan_id) ?? null, [plans, form.plan_id]);

  const stepValid = () => {
    if (step === 0) return form.plan_id != null;
    if (step === 1) return form.service_address.trim().length > 3 && form.service_city.trim().length > 1 && /\d{5}/.test(form.service_zip);
    if (step === 2) return form.first_name.trim() && form.last_name.trim() && form.phone.replace(/\D/g, "").length >= 10;
    if (step === 3) return form.terms_accepted;
    return false;
  };

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/enrollments/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, requested_start_date: form.requested_start_date || null, esiid: form.esiid || null, email: form.email || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong — please try again or call us.");
      setDone(data);
    } catch (e: any) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  const checkStatus = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const id = checkRef.trim().replace(/^SGP-/i, "").toLowerCase();
      // reference is the first 8 chars of the id — we need the full id, so accept full id or reference from the confirmation
      const res = await fetch(`${API}/api/v1/enrollments/public/${id}/status?last_name=${encodeURIComponent(checkLast.trim())}`);
      const data = await res.json();
      setCheckResult(res.ok ? data : { error: data.detail || "Not found." });
    } catch {
      setCheckResult({ error: "Could not check right now." });
    }
    setChecking(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
            <PartyPopper className="w-7 h-7 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-black text-[#0F1D5E] mt-4">You're all set!</h1>
          <p className="text-slate-500 text-sm mt-2">
            Your enrollment was received{done.auto_submitted ? " and sent straight to the provider" : ""}.
            We'll take it from here and text you when your service is confirmed.
          </p>
          <div className="mt-5 bg-[#EEF1FA] rounded-2xl p-4">
            <p className="text-xs text-slate-500">Your reference number</p>
            <p className="text-xl font-black tracking-wider text-[#0F1D5E]">{done.reference}</p>
            <p className="text-[11px] text-slate-400 mt-2">
              To check your status later, use this Enrollment ID with your last name:
            </p>
            <p className="font-mono text-[11px] text-slate-500 break-all">{done.id}</p>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Questions? Call or text us — Saigon Power LLC · Broker ID BR200202
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      {/* Brand bar */}
      <div className="bg-gradient-to-r from-[#0A1440] via-[#0F1D5E] to-[#1e2f8a] text-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-lg leading-tight">Saigon Power</p>
            <p className="text-[11px] text-white/60">Enroll in about 2 minutes — no phone call needed</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Stepper */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i < step ? "bg-emerald-500 text-white" : i === step ? "bg-[#0F1D5E] text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs font-semibold hidden sm:block ${i === step ? "text-[#0F1D5E]" : "text-slate-400"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-2 rounded ${i < step ? "bg-emerald-400" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
          {/* Step 0 — Plan */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-black text-[#0F1D5E]">Pick your plan</h2>
              <p className="text-sm text-slate-400 mt-1">Today's rates. No hidden fees, cancel-anytime guidance from our team.</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-5">
                {plans.length === 0 && <p className="text-sm text-slate-400 col-span-2">Loading plans…</p>}
                {plans.map(p => (
                  <button key={p.id} onClick={() => set("plan_id", p.id)}
                    className={`text-left rounded-2xl border-2 p-4 transition-all ${
                      form.plan_id === p.id ? "border-[#0F1D5E] bg-[#EEF1FA] shadow-md" : "border-slate-100 hover:border-slate-300"
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-800 text-sm">{p.plan_name}</p>
                      {p.badge && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold shrink-0">{p.badge}</span>}
                    </div>
                    <p className="text-2xl font-black text-[#0F1D5E] mt-2">
                      {p.rate != null ? <>{Number(p.rate).toFixed(1)}<span className="text-sm font-bold">¢/kWh</span></> : "Call"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {p.term_months ? `${p.term_months}-month term` : "Flexible term"}{p.provider ? ` · ${p.provider}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Address */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#0F1D5E]">Where's the service?</h2>
              <div>
                <label className={labelCls}>Service address *</label>
                <input className={inputCls} placeholder="123 Main St, Apt 4" value={form.service_address} onChange={e => set("service_address", e.target.value)} />
              </div>
              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-3">
                  <label className={labelCls}>City *</label>
                  <input className={inputCls} placeholder="Houston" value={form.service_city} onChange={e => set("service_city", e.target.value)} />
                </div>
                <div className="col-span-1">
                  <label className={labelCls}>State</label>
                  <input className={inputCls} value={form.service_state} onChange={e => set("service_state", e.target.value)} maxLength={2} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>ZIP *</label>
                  <input className={inputCls} placeholder="77001" value={form.service_zip} onChange={e => set("service_zip", e.target.value)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Is this a switch or a move-in?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ v: "switch", l: "Switching provider" }, { v: "move_in", l: "Moving in" }].map(o => (
                      <button key={o.v} onClick={() => set("enrollment_type", o.v)}
                        className={`py-3 rounded-xl text-sm font-semibold border-2 ${
                          form.enrollment_type === o.v ? "border-[#0F1D5E] bg-[#EEF1FA] text-[#0F1D5E]" : "border-slate-100 text-slate-500"
                        }`}>{o.l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Preferred start date <span className="font-normal text-slate-400">(optional)</span></label>
                  <input type="date" className={inputCls} value={form.requested_start_date} onChange={e => set("requested_start_date", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>ESI ID <span className="font-normal text-slate-400">(optional — the 17–22 digit number on your electric bill)</span></label>
                <input className={inputCls} placeholder="10089010…" value={form.esiid} onChange={e => set("esiid", e.target.value.replace(/[^\d]/g, ""))} />
                <p className="text-[11px] text-slate-400 mt-1">Don't have it handy? Leave it blank — we'll look it up for you.</p>
              </div>
            </div>
          )}

          {/* Step 2 — Contact */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#0F1D5E]">About you</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>First name *</label>
                  <input className={inputCls} value={form.first_name} onChange={e => set("first_name", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Last name *</label>
                  <input className={inputCls} value={form.last_name} onChange={e => set("last_name", e.target.value)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Mobile phone *</label>
                  <input type="tel" className={inputCls} placeholder="(832) 555-1234" value={form.phone} onChange={e => set("phone", e.target.value)} />
                  <p className="text-[11px] text-slate-400 mt-1">We text your confirmation here.</p>
                </div>
                <div>
                  <label className={labelCls}>Email <span className="font-normal text-slate-400">(optional)</span></label>
                  <input type="email" className={inputCls} placeholder="you@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
                </div>
              </div>
              {/* honeypot — invisible to humans */}
              <input type="text" value={form.company_website} onChange={e => set("company_website", e.target.value)}
                autoComplete="off" tabIndex={-1} aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#0F1D5E]">Review & confirm</h2>
              <div className="rounded-2xl bg-[#EEF1FA] p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Plan</span>
                  <span className="font-bold text-[#0F1D5E] text-right">{selectedPlan?.plan_name}
                    {selectedPlan?.rate != null && <> · {Number(selectedPlan.rate).toFixed(1)}¢/kWh</>}
                    {selectedPlan?.term_months ? <> · {selectedPlan.term_months} mo</> : null}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Service</span>
                  <span className="font-semibold text-slate-700 text-right">{form.service_address}, {form.service_city} {form.service_zip}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Type</span>
                  <span className="font-semibold text-slate-700">{form.enrollment_type === "move_in" ? "Move-in" : "Switch"}{form.requested_start_date ? ` · starts ${form.requested_start_date}` : ""}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Contact</span>
                  <span className="font-semibold text-slate-700 text-right">{form.first_name} {form.last_name} · {form.phone}</span></div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer bg-white border border-slate-200 rounded-2xl p-4">
                <input type="checkbox" checked={form.terms_accepted} onChange={e => set("terms_accepted", e.target.checked)} className="mt-0.5 rounded" />
                <span className="text-xs text-slate-500 leading-relaxed">
                  I authorize Saigon Power LLC (Broker ID BR200202) to enroll this service address with the selected
                  electricity provider on my behalf, and to contact me by phone, text, or email about this enrollment.
                  The provider's Terms of Service, EFL, and YRAC documents will be provided upon enrollment.
                </span>
              </label>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
            </div>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between mt-8">
            <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-0">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {step < 3 ? (
              <button onClick={() => stepValid() && setStep(s => s + 1)} disabled={!stepValid()}
                className="flex items-center gap-1 px-6 py-3 rounded-xl bg-[#0F1D5E] text-white text-sm font-bold hover:bg-[#0F1D5E]/90 disabled:opacity-40">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={submit} disabled={!stepValid() || submitting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-40">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Enrollment ⚡"}
              </button>
            )}
          </div>
        </div>

        {/* Status checker */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-sm font-bold text-slate-700 flex items-center gap-2"><Search className="w-4 h-4 text-slate-400" /> Already enrolled? Check your status</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <input className={`${inputCls} flex-1 min-w-40`} placeholder="Enrollment ID from your confirmation" value={checkRef} onChange={e => setCheckRef(e.target.value)} />
            <input className={`${inputCls} w-40`} placeholder="Last name" value={checkLast} onChange={e => setCheckLast(e.target.value)} />
            <button onClick={checkStatus} disabled={checking || !checkRef || !checkLast}
              className="px-5 py-3 rounded-xl bg-[#0F1D5E] text-white text-sm font-bold disabled:opacity-40">
              {checking ? "…" : "Check"}
            </button>
          </div>
          {checkResult && (
            <p className={`text-sm mt-3 px-4 py-3 rounded-xl ${checkResult.error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700 font-semibold"}`}>
              {checkResult.error || checkResult.message}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Saigon Power LLC · Broker ID BR200202 · Texas</p>
      </div>
    </div>
  );
}
