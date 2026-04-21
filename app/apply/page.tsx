"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { CheckCircle, AlertCircle, Zap } from "lucide-react";

const inputCls = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 placeholder:text-slate-400";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

const STATES = ["TX","AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","UT","VT","VA","WA","WV","WI","WY"];

export default function ApplyPage() {
  const [form, setForm] = useState({
    first_name: "", last_name: "", address: "", city: "",
    state: "TX", zip: "", phone: "", email: "",
    est_kwh: "", business_name: "",
  });
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const required = ["first_name","last_name","address","city","state","zip","phone"];
    const e: Record<string, string> = {};
    for (const f of required) {
      if (!form[f as keyof typeof form].trim()) e[f] = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError("");
    try {
      await api.createLead({ ...form, source: "website" });
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.message || "Something went wrong";
      const status = parseInt(msg.split(":")[0], 10);
      if (status === 409 || msg.toLowerCase().includes("already exists")) {
        setApiError("It looks like you've already submitted a request. Our team will be in touch soon!");
      } else {
        setApiError("Something went wrong. Please try again or call us directly.");
      }
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F1D5E] to-[#1a2f8f] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">You're all set!</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Thanks for reaching out. A Saigon Power energy advisor will contact you within <strong>24 hours</strong> to discuss your options.
          </p>
          <p className="text-xs text-slate-400 mt-6">Questions? Call us at <span className="font-semibold text-[#0F1D5E]">(832) 793-2271</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1D5E] to-[#1a2f8f] flex items-center justify-center p-4 py-10">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-[#0F1D5E] px-8 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Zap className="w-6 h-6 text-green-400" />
            <span className="text-xl font-bold text-white">Saigon Power</span>
          </div>
          <p className="text-blue-200 text-sm">Get a free energy rate quote in minutes</p>
        </div>

        <form onSubmit={submit} className="px-8 py-6 space-y-5">
          {apiError && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {apiError}
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
              <input className={`${inputCls} ${errors.first_name ? "border-red-400" : ""}`}
                placeholder="John" value={form.first_name} onChange={e => set("first_name", e.target.value)} />
              {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <label className={labelCls}>Last Name <span className="text-red-500">*</span></label>
              <input className={`${inputCls} ${errors.last_name ? "border-red-400" : ""}`}
                placeholder="Smith" value={form.last_name} onChange={e => set("last_name", e.target.value)} />
              {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>}
            </div>
          </div>

          {/* Business name */}
          <div>
            <label className={labelCls}>Business Name <span className="text-slate-400 font-normal">(optional)</span></label>
            <input className={inputCls} placeholder="ABC Restaurant (if commercial)"
              value={form.business_name} onChange={e => set("business_name", e.target.value)} />
          </div>

          {/* Address */}
          <div>
            <label className={labelCls}>Service Address <span className="text-red-500">*</span></label>
            <input className={`${inputCls} ${errors.address ? "border-red-400" : ""}`}
              placeholder="123 Main St" value={form.address} onChange={e => set("address", e.target.value)} />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>

          {/* City / State / Zip */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>City <span className="text-red-500">*</span></label>
              <input className={`${inputCls} ${errors.city ? "border-red-400" : ""}`}
                placeholder="Houston" value={form.city} onChange={e => set("city", e.target.value)} />
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className={labelCls}>State <span className="text-red-500">*</span></label>
              <select className={`${inputCls} ${errors.state ? "border-red-400" : ""}`}
                value={form.state} onChange={e => set("state", e.target.value)}>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Zip Code <span className="text-red-500">*</span></label>
              <input className={`${inputCls} ${errors.zip ? "border-red-400" : ""}`}
                placeholder="77036" value={form.zip} onChange={e => set("zip", e.target.value)} />
              {errors.zip && <p className="text-xs text-red-500 mt-1">{errors.zip}</p>}
            </div>
          </div>

          {/* Phone / Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Phone <span className="text-red-500">*</span></label>
              <input type="tel" className={`${inputCls} ${errors.phone ? "border-red-400" : ""}`}
                placeholder="(832) 555-1234" value={form.phone} onChange={e => set("phone", e.target.value)} />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className={labelCls}>Email <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="email" className={inputCls}
                placeholder="john@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
          </div>

          {/* Est kWh */}
          <div>
            <label className={labelCls}>Estimated Monthly Usage <span className="text-slate-400 font-normal">(optional)</span></label>
            <input type="number" className={inputCls}
              placeholder="e.g. 1200 kWh/mo" value={form.est_kwh} onChange={e => set("est_kwh", e.target.value)} />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-[#0F1D5E] text-white font-bold text-sm hover:bg-[#0F1D5E]/90 transition-colors disabled:opacity-50">
            {submitting ? "Submitting..." : "Get My Free Quote →"}
          </button>

          <p className="text-center text-xs text-slate-400">
            No commitment required · We'll contact you within 24 hours
          </p>
        </form>
      </div>
    </div>
  );
}
