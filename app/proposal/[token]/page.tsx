"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Zap, CheckCircle, AlertCircle, Shield, FileText } from "lucide-react";

export default function ProposalAcceptPage() {
  const params   = useParams();
  const token    = params.token as string;

  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    api.getProposalByToken(token)
      .then(setProposal)
      .catch(() => setError("Proposal not found or this link has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    if (!signature.trim()) { setSubmitError("Please type your full name as your signature."); return; }
    if (!agreed) { setSubmitError("Please agree to the terms to continue."); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      await api.acceptProposal(token, { signature: signature.trim() });
      setAccepted(true);
    } catch (err: any) {
      const raw = err?.message || "Something went wrong. Please try again.";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      try { setSubmitError(JSON.parse(body)?.detail ?? body); } catch { setSubmitError(body); }
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading your proposal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link Not Found</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (proposal?.status === "accepted") {
    return (
      <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Already Accepted</h2>
          <p className="text-slate-500 text-sm">This proposal has already been signed and accepted. A Saigon Power rep will follow up shortly.</p>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F1D5E] to-[#1a2f8f] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Contract Submitted!</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Thank you, <strong>{signature}</strong>. Your contract has been submitted successfully.
            A Saigon Power energy advisor will follow up within <strong>24 hours</strong>.
          </p>
          <p className="text-xs text-slate-400 mt-6">Questions? Call <span className="font-semibold text-[#0F1D5E]">(832) 793-2271</span></p>
        </div>
      </div>
    );
  }

  const p = proposal;

  return (
    <div className="min-h-screen bg-[#F4F6FA] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Brand header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-[#0F1D5E] text-white px-6 py-3 rounded-2xl">
            <Zap className="w-5 h-5 text-green-400" />
            <span className="font-bold text-lg">Saigon Power</span>
          </div>
          <p className="text-slate-500 text-sm mt-2">Energy Rate Proposal</p>
        </div>

        {/* Customer info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Prepared For</h2>
          <p className="text-xl font-bold text-[#0F1D5E]">{p.customer_name}</p>
          {p.customer_address && <p className="text-sm text-slate-500 mt-0.5">{p.customer_address}</p>}
          {p.customer_phone && <p className="text-sm text-slate-500">{p.customer_phone}</p>}
          {p.customer_email && <p className="text-sm text-slate-500">{p.customer_email}</p>}
        </div>

        {/* Plan details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0F1D5E]" />
            <h3 className="text-sm font-bold text-[#0F1D5E]">Plan Details</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              ["Energy Provider (REP)", p.rep_name || "—"],
              ["Plan Name",             p.plan_name || "—"],
              ["Energy Rate",           p.rate != null ? `$${parseFloat(p.rate).toFixed(4)} per kWh` : "—"],
              ["Contract Term",         p.term_months ? `${p.term_months} Months` : "—"],
              ["Est. Monthly Bill",     p.est_monthly_bill != null ? `$${parseFloat(p.est_monthly_bill).toFixed(2)}/mo` : "—"],
              ["Early Termination Fee", p.early_termination_fee != null ? `$${parseFloat(p.early_termination_fee).toFixed(2)}` : "None"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center px-6 py-3">
                <span className="text-sm text-slate-500">{label}</span>
                <span className="text-sm font-semibold text-slate-800">{value}</span>
              </div>
            ))}
          </div>
          {p.notes && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-slate-600">{p.notes}</p>
            </div>
          )}
        </div>

        {/* Terms */}
        <div className="bg-[#EEF1FA] rounded-2xl border border-[#0F1D5E]/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[#0F1D5E]" />
            <h3 className="text-sm font-bold text-[#0F1D5E]">Terms & Conditions</h3>
          </div>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>By signing below, you authorize Saigon Power LLC to process your energy enrollment with the selected provider.</p>
            <p>The rate quoted is fixed for the stated contract term. Usage-based billing will be managed by your retail energy provider (REP). Saigon Power LLC acts as a licensed energy broker and receives a commission from the REP.</p>
            <p>Early termination may result in fees as stated above. You have the right to cancel within 3 business days of enrollment under Texas PUC regulations.</p>
            <p>This document constitutes your agreement to proceed with enrollment. A confirmation will be sent to you by Saigon Power LLC within 1 business day.</p>
          </div>
        </div>

        {/* Signature + Accept */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#0F1D5E]">E-Signature</h3>

          <div>
            <label className="block text-sm text-slate-600 mb-1.5">
              Type your full legal name to sign <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 font-medium"
              placeholder="e.g. John Smith"
              value={signature}
              onChange={e => { setSignature(e.target.value); setSubmitError(""); }}
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => { setAgreed(e.target.checked); setSubmitError(""); }}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0F1D5E]"
            />
            <span className="text-sm text-slate-600">
              I have read and agree to the Terms & Conditions above. I authorize Saigon Power LLC to proceed with my energy enrollment.
            </span>
          </label>

          {submitError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {submitError}
            </div>
          )}

          <button
            onClick={submit}
            disabled={submitting || !signature.trim() || !agreed}
            className="w-full py-3.5 rounded-xl bg-[#0F1D5E] text-white font-bold text-sm hover:bg-[#0F1D5E]/90 transition-colors disabled:opacity-40"
          >
            {submitting ? "Submitting..." : "Accept & Sign Contract"}
          </button>

          <p className="text-xs text-center text-slate-400">
            Your typed name constitutes a legally binding electronic signature.
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          Saigon Power LLC · Licensed Energy Broker · Broker VID: 319010
        </p>
      </div>
    </div>
  );
}
