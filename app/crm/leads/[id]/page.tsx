"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, User, MapPin, Phone, Mail, Plus, X, AlertCircle, ChevronDown, Pencil, Trash2, Check, Bell, FileSignature, Copy, Ban } from "lucide-react";

// ── Design tokens ──────────────────────────────────────────────────────────────
const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 placeholder:text-slate-400";
const labelCls = "block text-sm text-slate-700 mb-1";
const sectionLabelCls = "text-xs font-bold text-slate-400 uppercase tracking-wider mb-3";

// ── Module-level field components ─────────────────────────────────────────────
function FormInput({ label, error, type = "text", value, onChange, placeholder }: {
  label: string; error?: string; type?: string;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type={type}
        className={`${inputCls} ${error ? "border-red-400 ring-1 ring-red-400/30" : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function FormSelect({ label, error, value, onChange, children }: {
  label: string; error?: string;
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select
        className={`${inputCls} ${error ? "border-red-400" : ""}`}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Misc UI ────────────────────────────────────────────────────────────────────
function IconBox({ icon: Icon }: { icon: any }) {
  return (
    <div className="w-9 h-9 rounded-xl bg-[#EEF1FA] flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-[#0F1D5E]" />
    </div>
  );
}

function LeadBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status === "converted" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
      }`}>
      {status === "converted" ? "Converted Customer" : "Lead"}
    </span>
  );
}

function DealStatusBtn({ status, dealId, leadId, onUpdate }: {
  status: string; dealId: string; leadId: string;
  onUpdate: (id: string, s: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const next = status === "Active" ? "Inactive" : status === "Inactive" ? "Future" : "Active";
  const cls: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
    Future: "bg-amber-100 text-amber-700 hover:bg-amber-200",
    Inactive: "bg-slate-100 text-slate-500 hover:bg-slate-200",
  };

  const cycle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await api.updateLeadDeal(leadId, dealId, { status: next });
      onUpdate(dealId, next);
    } catch { }
    setSaving(false);
  };

  return (
    <button
      onClick={cycle}
      disabled={saving}
      title={`Click to change to ${next}`}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${cls[status] ?? "bg-slate-100 text-slate-500"} ${saving ? "opacity-50" : ""}`}
    >
      {saving ? "..." : status}
      <ChevronDown className="w-3 h-3 opacity-60" />
    </button>
  );
}

// ── Proposal Modal ────────────────────────────────────────────────────────────
const APP_URL = typeof window !== "undefined" ? window.location.origin : "";

function ProposalModal({ lead, onClose }: { lead: any; onClose: () => void }) {
  const [form, setForm] = useState({
    rep_name: "", plan_name: "", rate: "", term_months: "",
    est_monthly_bill: "", early_termination_fee: "", notes: "",
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [link, setLink]       = useState("");
  const [copied, setCopied]   = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await api.createProposal({
        lead_id:          lead.id,
        customer_name:    lead.full_name,
        customer_phone:   lead.phone,
        customer_email:   lead.email,
        customer_address: `${lead.address}, ${lead.city}, ${lead.state} ${lead.zip}`,
        ...form,
      });
      setLink(`${APP_URL}/proposal/${res.token}`);
    } catch (err: any) {
      const raw = err?.message || "Failed to create proposal";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      try { setError(JSON.parse(body)?.detail ?? body); } catch { setError(body); }
    }
    setSaving(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inp = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20";
  const lbl = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-[#0F1D5E]" />
            <h2 className="text-base font-bold text-slate-900">Generate Proposal</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {link ? (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="font-bold text-slate-800">Proposal created!</p>
            <p className="text-sm text-slate-500">Share this link with <strong>{lead.full_name}</strong>:</p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <p className="flex-1 text-xs text-slate-600 break-all text-left">{link}</p>
              <button onClick={copyLink} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#0F1D5E] text-white text-xs font-semibold rounded-lg hover:bg-[#0F1D5E]/90">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <a href="/proposals" className="block text-xs text-[#0F1D5E] hover:underline">View all proposals →</a>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {/* Pre-filled customer info */}
            <div className="bg-[#EEF1FA] rounded-xl px-4 py-3 text-sm">
              <p className="font-semibold text-[#0F1D5E]">{lead.full_name}</p>
              <p className="text-slate-500 text-xs mt-0.5">{lead.phone} · {lead.address}, {lead.city}</p>
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>REP / Provider</label><input className={inp} placeholder="Budget Power" value={form.rep_name} onChange={e => set("rep_name", e.target.value)} /></div>
              <div><label className={lbl}>Plan Name</label><input className={inp} placeholder="12-Month Fixed" value={form.plan_name} onChange={e => set("plan_name", e.target.value)} /></div>
              <div><label className={lbl}>Rate ($/kWh)</label><input type="number" className={inp} placeholder="0.1090" value={form.rate} onChange={e => set("rate", e.target.value)} /></div>
              <div><label className={lbl}>Term (months)</label><input type="number" className={inp} placeholder="12" value={form.term_months} onChange={e => set("term_months", e.target.value)} /></div>
              <div><label className={lbl}>Est. Monthly Bill ($)</label><input type="number" className={inp} placeholder="120.00" value={form.est_monthly_bill} onChange={e => set("est_monthly_bill", e.target.value)} /></div>
              <div><label className={lbl}>Early Term. Fee ($)</label><input type="number" className={inp} placeholder="0" value={form.early_termination_fee} onChange={e => set("early_termination_fee", e.target.value)} /></div>
            </div>
            <div>
              <label className={lbl}>Notes</label>
              <textarea className={`${inp} resize-none`} rows={2} placeholder="Any additional notes..." value={form.notes} onChange={e => set("notes", e.target.value)} />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={submit} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-50">
                {saving ? "Creating..." : "Create Proposal"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Deal Modal ─────────────────────────────────────────────────────────────
const FLAGS = ["TOS", "TOAO", "Deposit", "Special Deal", "10% Promo"] as const;
type Flag = typeof FLAGS[number];

const FLAG_KEYS: Record<Flag, string> = {
  "TOS": "flag_tos",
  "TOAO": "flag_toao",
  "Deposit": "flag_deposit",
  "Special Deal": "flag_special_deal",
  "10% Promo": "flag_promo_10",
};

const CONTRACT_TERMS = [
  "6 Months", "12 Months", "24 Months", "36 Months",
  "48 Months", "60 Months", "Month to Month",
];

const TERM_MONTHS: Record<string, number> = {
  "6 Months": 6, "12 Months": 12, "24 Months": 24,
  "36 Months": 36, "48 Months": 48, "60 Months": 60,
};

const SUPPLIERS = [
  "Budget Power", "NRG", "Heritage Power", "Iron Horse",
  "CleanSky Energy", "Reliant", "Discount Power", "Chariot",
  "Direct Energy", "Cirro Energy", "True Power", "Hudson Energy",
];

const DEAL_TYPES = ["New Business", "Renew", "TOS", "TOAO"];
const SERVICE_ORDER_TYPES = ["PMVI", "MVI", "SWI"];

const EMPTY_DEAL = {
  // Flags
  flag_tos: false, flag_toao: false, flag_deposit: false, flag_special_deal: false, flag_promo_10: false,
  // Contract
  status: "Future", supplier: "", plan_name: "", product_type: "",
  deal_type: "", service_order_type: "",
  contract_term: "", rate: "", adder: "", est_kwh: "",
  expected_close_date: "", start_date: "", end_date: "",
  // Property
  service_address: "", service_city: "", service_state: "TX", service_zip: "", esiid: "",
  // Assignment
  sales_agent: "",
  // Notes
  notes: "",
};

function AddDealModal({ leadId, onClose, onSaved, existing }: {
  leadId: string; onClose: () => void; onSaved: () => void; existing?: any;
}) {
  const [form, setForm] = useState(() => existing ? {
    flag_tos: existing.flag_tos ?? false,
    flag_toao: existing.flag_toao ?? false,
    flag_deposit: existing.flag_deposit ?? false,
    flag_special_deal: existing.flag_special_deal ?? false,
    flag_promo_10: existing.flag_promo_10 ?? false,
    status: existing.status ?? "Future",
    supplier: existing.supplier ?? "",
    plan_name: existing.plan_name ?? "",
    product_type: existing.product_type ?? "",
    deal_type: existing.deal_type ?? "",
    service_order_type: existing.service_order_type ?? "",
    contract_term: existing.contract_term ?? "",
    rate: existing.rate != null ? String(existing.rate) : "",
    adder: existing.adder != null ? String(existing.adder) : "",
    est_kwh: existing.est_kwh != null ? String(existing.est_kwh) : "",
    expected_close_date: existing.expected_close_date ?? "",
    start_date: existing.start_date ?? "",
    end_date: existing.end_date ?? "",
    service_address: existing.service_address ?? "",
    service_city: existing.service_city ?? "",
    service_state: existing.service_state ?? "TX",
    service_zip: existing.service_zip ?? "",
    esiid: existing.esiid ?? "",
    sales_agent: existing.sales_agent ?? "",
    notes: existing.notes ?? "",
  } : EMPTY_DEAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    api.getSalesAgents().then(setAgents).catch(() => { });
  }, []);

  useEffect(() => {
    const months = TERM_MONTHS[form.contract_term];
    if (!form.start_date || !months) return;
    const d = new Date(form.start_date);
    d.setMonth(d.getMonth() + months);
    setForm(f => ({ ...f, end_date: d.toISOString().split("T")[0] }));
  }, [form.start_date, form.contract_term]);

  const setStr = (k: keyof typeof EMPTY_DEAL, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };

  const toggleFlag = (key: string) =>
    setForm(f => ({ ...f, [key]: !(f as any)[key] }));

  const validate = () => {
    const e: Record<string, string> = {};
    const required: (keyof typeof EMPTY_DEAL)[] = [
      "status", "supplier", "product_type", "deal_type", "service_order_type",
      "contract_term", "rate", "adder", "est_kwh", "expected_close_date",
      "start_date", "end_date", "service_address", "service_city",
      "service_state", "service_zip", "esiid", "sales_agent",
    ];
    for (const f of required) {
      if (!String((form as any)[f] ?? "").trim()) e[f] = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      setApiError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setApiError("");
    try {
      if (existing) {
        await api.updateLeadDeal(leadId, existing.id, form);
      } else {
        await api.createLeadDeal(leadId, form);
      }
      onSaved();
    } catch (err: any) {
      const raw = err?.message || "Failed to save deal";
      // Strip leading "STATUS:" prefix added by api.ts request helper
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      try { setApiError(JSON.parse(body)?.detail ?? body); } catch { setApiError(body); }
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{existing ? "Edit Deal" : "New Deal"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {apiError}
            </div>
          )}

          {/* Flags */}
          <div>
            <p className="text-sm text-slate-700 mb-2">Flags</p>
            <div className="flex flex-wrap gap-2">
              {FLAGS.map(flag => {
                const key = FLAG_KEYS[flag];
                const active = (form as any)[key];
                return (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => toggleFlag(key)}
                    className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-colors ${active
                        ? "bg-[#0F1D5E] text-white border-[#0F1D5E]"
                        : "bg-white text-slate-700 border-slate-300 hover:border-[#0F1D5E]/40"
                      }`}
                  >
                    {flag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contract Details */}
          <div>
            <p className={sectionLabelCls}>Contract Details</p>
            <div className="grid grid-cols-2 gap-4">

              <FormSelect label="Status *" error={errors.status} value={form.status} onChange={v => setStr("status", v)}>
                <option value="">— Select —</option>
                <option value="Future">Future</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </FormSelect>

              <FormSelect label="Supplier / REP *" error={errors.supplier} value={form.supplier} onChange={v => setStr("supplier", v)}>
                <option value="">— Select —</option>
                {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
              </FormSelect>

              <FormInput label="Plan Name" placeholder="e.g. Gexa Saver 12"
                value={form.plan_name} onChange={v => setStr("plan_name", v)} />

              <FormSelect label="Meter Type *" error={errors.product_type} value={form.product_type} onChange={v => setStr("product_type", v)}>
                <option value="">— Select —</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
              </FormSelect>

              <FormSelect label="Deal Type *" error={errors.deal_type} value={form.deal_type} onChange={v => setStr("deal_type", v)}>
                <option value="">— Select —</option>
                {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </FormSelect>

              <FormSelect label="Service Order Type *" error={errors.service_order_type} value={form.service_order_type} onChange={v => setStr("service_order_type", v)}>
                <option value="">— Select —</option>
                {SERVICE_ORDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </FormSelect>

              <FormSelect label="Contract Term *" error={errors.contract_term} value={form.contract_term} onChange={v => setStr("contract_term", v)}>
                <option value="">— Select —</option>
                {CONTRACT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </FormSelect>

              <FormInput label="Contract Rate ($/kWh) *" placeholder="0.109" type="number" error={errors.rate}
                value={form.rate} onChange={v => setStr("rate", v)} />

              <FormInput label="Adder / Commission ($/kWh) *" placeholder="0.0070" type="number" error={errors.adder}
                value={form.adder} onChange={v => setStr("adder", v)} />

              <FormInput label="Estimated Usage (kWh/mo) *" placeholder="1200" type="number" error={errors.est_kwh}
                value={form.est_kwh} onChange={v => setStr("est_kwh", v)} />

              <FormInput label="Contract Signed Date *" type="date" error={errors.expected_close_date}
                value={form.expected_close_date} onChange={v => setStr("expected_close_date", v)} />

              <FormInput label="Contract Start Date *" type="date" error={errors.start_date}
                value={form.start_date} onChange={v => setStr("start_date", v)} />

              <div>
                <label className={labelCls}>Contract End Date * <span className="text-slate-400 font-normal">(auto-filled)</span></label>
                <input
                  type="date"
                  className={`${inputCls} bg-slate-50 ${errors.end_date ? "border-red-400" : ""}`}
                  value={form.end_date}
                  onChange={e => setStr("end_date", e.target.value)}
                />
                {errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
              </div>

              {form.status === "Active" && (
                <div className="col-span-2">
                  <p className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    Setting status to Active will convert this lead to a Customer.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Property */}
          <div>
            <p className={sectionLabelCls}>Property</p>
            <div className="space-y-3">
              <FormInput label="Service Address *" placeholder="Street address" error={errors.service_address}
                value={form.service_address} onChange={v => setStr("service_address", v)} />
              <div className="grid grid-cols-3 gap-3">
                <FormInput label="City *" placeholder="City" error={errors.service_city}
                  value={form.service_city} onChange={v => setStr("service_city", v)} />
                <FormInput label="State *" placeholder="TX" error={errors.service_state}
                  value={form.service_state} onChange={v => setStr("service_state", v)} />
                <FormInput label="Zip *" placeholder="77036" error={errors.service_zip}
                  value={form.service_zip} onChange={v => setStr("service_zip", v)} />
              </div>
              <div className="max-w-xs">
                <FormInput label="ESI ID *" placeholder="10089010238183693001" error={errors.esiid}
                  value={form.esiid} onChange={v => setStr("esiid", v)} />
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div>
            <p className={sectionLabelCls}>Assignment</p>
            <div className="max-w-xs">
              <FormSelect label="Sales Agent *" error={errors.sales_agent} value={form.sales_agent} onChange={v => setStr("sales_agent", v)}>
                <option value="">— Unassigned —</option>
                {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </FormSelect>
              {agents.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  No agents yet. <a href="/crm/agents" target="_blank" className="text-[#0F1D5E] underline">Add agents →</a>
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className={sectionLabelCls}>Notes</p>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Any notes about this deal..."
              value={form.notes}
              onChange={e => setStr("notes", e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : existing ? "Save Changes" : "Create Deal"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Terminate Modal ───────────────────────────────────────────────────────────
function TerminateModal({ deal, leadId, onClose, onDone }: {
  deal: any; leadId: string; onClose: () => void; onDone: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    if (!date) { setError("Please select a termination date."); return; }
    setSaving(true);
    setError("");
    try {
      await api.updateLeadDeal(leadId, deal.id, { status: "Inactive", end_date: date });
      onDone();
    } catch (err: any) {
      const raw = err?.message || "Failed to terminate deal";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      try { setError(JSON.parse(body)?.detail ?? body); } catch { setError(body); }
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-500" />
            <h2 className="text-base font-bold text-slate-900">Terminate Deal</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm">
            <p className="font-semibold text-slate-700">{deal.supplier || "Unknown Supplier"}</p>
            {deal.plan_name && <p className="text-slate-400 text-xs mt-0.5">{deal.plan_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Termination Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setError(""); }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <p className="text-xs text-slate-400">
            The deal status will be set to <strong>Inactive</strong> and the end date updated.
          </p>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={confirm} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
            {saving ? "Terminating..." : "Terminate Deal"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const canDeleteNotes = user?.role === "admin";
  const id = params.id as string;

  const [lead, setLead] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showProposal, setShowProposal] = useState(false);
  const [showDeal, setShowDeal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  const [terminatingDeal, setTerminatingDeal] = useState<any>(null);
  const [editingLead, setEditingLead] = useState(false);
  const [leadForm, setLeadForm] = useState<any>({});
  const [leadFormErrors, setLeadFormErrors] = useState<Record<string, string>>({});
  const [savingLead, setSavingLead] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", task_type: "call", due_date: "", priority: "medium", description: "" });
  const [savingTask, setSavingTask] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [taskError, setTaskError] = useState("");

  const reload = async () => {
    const data = await api.getLead(id);
    setLead(data);
    setDeals(data.deals || []);
  };

  const loadTasks = async () => {
    const data = await api.getTasks({ lead_id: id }).catch(() => []);
    setTasks(data);
  };

  const loadNotes = async () => {
    const data = await api.getLeadNotes(id).catch(() => []);
    setNotes(data);
  };

  useEffect(() => {
    reload().catch(e => setError(e.message || "Failed to load")).finally(() => setLoading(false));
    loadTasks();
    loadNotes();
  }, [id]);

  const handleDealSaved = async () => {
    setShowDeal(false);
    setEditingDeal(null);
    await reload();
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm("Delete this deal? This cannot be undone.")) return;
    setDeletingDealId(dealId);
    try {
      await api.deleteLeadDeal(id, dealId);
      await reload();
    } catch { }
    setDeletingDealId(null);
  };

  const startEditLead = () => {
    setLeadFormErrors({});
    setLeadForm({
      first_name: lead.first_name, last_name: lead.last_name,
      business_name: lead.business_name ?? "",
      phone: lead.phone, phone2: lead.phone2 ?? "",
      email: lead.email ?? "", email2: lead.email2 ?? "",
      address: lead.address, city: lead.city, state: lead.state, zip: lead.zip,
    });
    setEditingLead(true);
  };

  const handleCompleteTask = async (taskId: string) => {
    await api.updateTask(taskId, { status: "completed" }).catch(() => { });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "completed" } : t));
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    await api.deleteTask(taskId).catch(() => { });
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim() || !newTask.due_date) return;
    setSavingTask(true);
    setTaskError("");
    try {
      await api.createTask({ ...newTask, lead_id: id });
      setNewTask({ title: "", task_type: "call", due_date: "", priority: "medium", description: "" });
      setShowAddTask(false);
      await loadTasks();
    } catch (err: any) {
      const raw = err?.message || "Failed to save task";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      try { setTaskError(JSON.parse(body)?.detail ?? body); } catch { setTaskError(body); }
    }
    setSavingTask(false);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    setNoteError("");
    try {
      await api.createLeadNote(id, { content: noteText.trim(), author_name: user?.name || "" });
      setNoteText("");
      await loadNotes();
    } catch (err: any) {
      const raw = err?.message || "Failed to save note";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      try { setNoteError(JSON.parse(body)?.detail ?? body); } catch { setNoteError(body); }
    }
    setSavingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    await api.deleteLeadNote(id, noteId).catch(() => { });
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const saveLeadInfo = async () => {
    const required = ["first_name", "last_name", "phone", "email", "address", "city", "state", "zip"];
    const errs: Record<string, string> = {};
    for (const f of required) {
      if (!String(leadForm[f] ?? "").trim()) errs[f] = "Required";
    }
    setLeadFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSavingLead(true);
    try {
      await api.updateLead(id, leadForm);
      await reload();
      setEditingLead(false);
    } catch (err: any) {
      const raw = err?.message || "Failed to save";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      let detail = body;
      try { detail = JSON.parse(body)?.detail ?? body; } catch { /* not JSON */ }
      alert(detail);
    }
    setSavingLead(false);
  };

  const handleDealStatusUpdate = async (dealId: string, newStatus: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: newStatus } : d));
    const data = await api.getLead(id);
    setLead(data);
    setDeals(data.deals || []);
  };

  if (loading) return <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center text-slate-400 text-sm">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!lead) return null;

  const active = deals.filter(d => d.status === "Active");
  const other = deals.filter(d => d.status !== "Active");

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">
      {(showDeal || editingDeal) && (
        <AddDealModal
          leadId={id}
          onClose={() => { setShowDeal(false); setEditingDeal(null); }}
          onSaved={handleDealSaved}
          existing={editingDeal ?? undefined}
        />
      )}

      {showProposal && (
        <ProposalModal lead={lead} onClose={() => setShowProposal(false)} />
      )}

      {terminatingDeal && (
        <TerminateModal
          deal={terminatingDeal}
          leadId={id}
          onClose={() => setTerminatingDeal(null)}
          onDone={async () => { setTerminatingDeal(null); await reload(); }}
        />
      )}

      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0F1D5E] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </button>
        <button
          onClick={() => setShowProposal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#0F1D5E]/90 transition-colors"
        >
          <FileSignature className="w-4 h-4" /> Generate Proposal
        </button>
      </div>

      {/* ── Lead Info Card (horizontal) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-6">
          {/* Identity */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#EEF1FA] flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-[#0F1D5E]" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-[#0F1D5E]">{lead.full_name}</h2>
                <LeadBadge status={lead.status} />
              </div>
              {lead.status === "converted" && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-xs text-emerald-600">Converted customer · appears in Customers tab</p>
                  {lead.sgp_customer_id && (
                    <span className="font-mono text-xs font-semibold text-[#0F1D5E] bg-[#EEF1FA] px-2 py-0.5 rounded-lg">{lead.sgp_customer_id}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact + Address */}
          {!editingLead && (
            <div className="flex items-center gap-8 text-sm text-slate-600 flex-wrap">
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <IconBox icon={Phone} />
                  <span>{lead.phone}{lead.phone2 ? ` · ${lead.phone2}` : ""}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2">
                  <IconBox icon={Mail} />
                  <span className="break-all">{lead.email}{lead.email2 ? ` · ${lead.email2}` : ""}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <IconBox icon={MapPin} />
                <span>{lead.address}, {lead.city}, {lead.state} {lead.zip}</span>
              </div>
            </div>
          )}

          {/* Deal stats */}
          {!editingLead && (
            <div className="flex items-center gap-5 shrink-0 text-center">
              <div><p className="text-xl font-bold text-emerald-600">{active.length}</p><p className="text-xs text-slate-400">Active</p></div>
              <div><p className="text-xl font-bold text-amber-500">{deals.filter(d => d.status === "Future").length}</p><p className="text-xs text-slate-400">Future</p></div>
              <div><p className="text-xl font-bold text-slate-400">{deals.filter(d => d.status === "Inactive").length}</p><p className="text-xs text-slate-400">Inactive</p></div>
            </div>
          )}

          {/* Edit toggle */}
          {!editingLead ? (
            <button onClick={startEditLead} className="text-slate-400 hover:text-[#0F1D5E] transition-colors shrink-0" title="Edit lead info">
              <Pencil className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Edit form */}
        {editingLead && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-500">First Name <span className="text-red-500">*</span></label>
                <input className={`${inputCls} ${leadFormErrors.first_name ? "border-red-400" : ""}`} value={leadForm.first_name} onChange={e => { setLeadForm((f: any) => ({ ...f, first_name: e.target.value })); setLeadFormErrors(v => ({ ...v, first_name: "" })); }} />
                {leadFormErrors.first_name && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500">Last Name <span className="text-red-500">*</span></label>
                <input className={`${inputCls} ${leadFormErrors.last_name ? "border-red-400" : ""}`} value={leadForm.last_name} onChange={e => { setLeadForm((f: any) => ({ ...f, last_name: e.target.value })); setLeadFormErrors(v => ({ ...v, last_name: "" })); }} />
                {leadFormErrors.last_name && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500">Business Name</label>
                <input className={inputCls} placeholder="Optional" value={leadForm.business_name} onChange={e => setLeadForm((f: any) => ({ ...f, business_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-slate-500">Phone <span className="text-red-500">*</span></label>
                <input className={`${inputCls} ${leadFormErrors.phone ? "border-red-400" : ""}`} value={leadForm.phone} onChange={e => { setLeadForm((f: any) => ({ ...f, phone: e.target.value })); setLeadFormErrors(v => ({ ...v, phone: "" })); }} />
                {leadFormErrors.phone && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>
              <div>
                <label className="text-xs text-slate-500">Phone 2</label>
                <input className={inputCls} placeholder="Optional" value={leadForm.phone2} onChange={e => setLeadForm((f: any) => ({ ...f, phone2: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Email <span className="text-red-500">*</span></label>
                <input className={`${inputCls} ${leadFormErrors.email ? "border-red-400" : ""}`} value={leadForm.email} onChange={e => { setLeadForm((f: any) => ({ ...f, email: e.target.value })); setLeadFormErrors(v => ({ ...v, email: "" })); }} />
                {leadFormErrors.email && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>
              <div>
                <label className="text-xs text-slate-500">Email 2</label>
                <input className={inputCls} placeholder="Optional" value={leadForm.email2} onChange={e => setLeadForm((f: any) => ({ ...f, email2: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-500">Address <span className="text-red-500">*</span></label>
                <input className={`${inputCls} ${leadFormErrors.address ? "border-red-400" : ""}`} value={leadForm.address} onChange={e => { setLeadForm((f: any) => ({ ...f, address: e.target.value })); setLeadFormErrors(v => ({ ...v, address: "" })); }} />
                {leadFormErrors.address && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500">City <span className="text-red-500">*</span></label>
                <input className={`${inputCls} ${leadFormErrors.city ? "border-red-400" : ""}`} value={leadForm.city} onChange={e => { setLeadForm((f: any) => ({ ...f, city: e.target.value })); setLeadFormErrors(v => ({ ...v, city: "" })); }} />
                {leadFormErrors.city && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>
              <div>
                <label className="text-xs text-slate-500">State <span className="text-red-500">*</span></label>
                <input className={`${inputCls} ${leadFormErrors.state ? "border-red-400" : ""}`} value={leadForm.state} onChange={e => { setLeadForm((f: any) => ({ ...f, state: e.target.value })); setLeadFormErrors(v => ({ ...v, state: "" })); }} />
                {leadFormErrors.state && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>
              <div>
                <label className="text-xs text-slate-500">Zip <span className="text-red-500">*</span></label>
                <input className={`${inputCls} ${leadFormErrors.zip ? "border-red-400" : ""}`} value={leadForm.zip} onChange={e => { setLeadForm((f: any) => ({ ...f, zip: e.target.value })); setLeadFormErrors(v => ({ ...v, zip: "" })); }} />
                {leadFormErrors.zip && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveLeadInfo} disabled={savingLead}
                className="px-5 flex items-center gap-1.5 py-2 rounded-xl bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-50">
                <Check className="w-3.5 h-3.5" /> {savingLead ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditingLead(false)}
                className="px-5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Deals ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0F1D5E]">Deals ({deals.length})</h3>
          <button onClick={() => setShowDeal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#0F1D5E] text-white text-xs font-semibold rounded-xl hover:bg-[#0F1D5E]/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Deal
          </button>
        </div>
        {deals.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm">No deals yet.</p>
            <button onClick={() => setShowDeal(true)} className="mt-3 text-sm text-[#0F1D5E] font-semibold hover:underline">Add the first deal →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Supplier", "Plan", "ESI ID", "Rate", "Adder", "Term", "Start", "End", "Agent", "Status", ""].map((h, i) => (
                    <th key={h || `col-${i}`} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...active, ...other].map(d => (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-[#0F1D5E] whitespace-nowrap">{d.supplier || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{d.plan_name || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{d.esiid || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.rate != null ? `$${parseFloat(d.rate).toFixed(4)}` : "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.adder != null ? parseFloat(d.adder).toFixed(4) : "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{d.contract_term || "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{d.start_date || "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{d.end_date || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{d.sales_agent || "—"}</td>
                    <td className="px-4 py-3"><DealStatusBtn status={d.status} dealId={d.id} leadId={id} onUpdate={handleDealStatusUpdate} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {d.status === "Active" && (
                          <button onClick={() => setTerminatingDeal(d)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors whitespace-nowrap"
                            title="Terminate deal">
                            <Ban className="w-3 h-3" /> Terminate
                          </button>
                        )}
                        <button onClick={() => setEditingDeal(d)} className="text-slate-300 hover:text-[#0F1D5E] transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteDeal(d.id)} disabled={deletingDealId === d.id} className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Account Notes ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0F1D5E]">Account Notes ({notes.length})</h3>
          {user?.name && <p className="text-xs text-slate-400">Posting as: <span className="font-semibold text-slate-600">{user.name}</span></p>}
        </div>

        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40">
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            placeholder="Add a note about this account..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleAddNote(); }}
          />
          {noteError && <p className="text-xs text-red-500 mt-1">{noteError}</p>}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">⌘ + Enter to submit</p>
            <button
              onClick={handleAddNote}
              disabled={savingNote || !noteText.trim()}
              className="px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-40 transition-colors"
            >
              {savingNote ? "Saving..." : "Add Note"}
            </button>
          </div>
        </div>

        {notes.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-400 text-sm">No notes yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {notes.map(n => (
              <div key={n.id} className="px-5 py-4 hover:bg-slate-50/50 group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#EEF1FA] flex items-center justify-center text-xs font-bold text-[#0F1D5E]">
                      {n.author_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{n.author_name}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(n.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  {canDeleteNotes && (
                    <button onClick={() => handleDeleteNote(n.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap ml-9">{n.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tasks & Follow-Ups ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#0F1D5E]" />
            <h3 className="text-sm font-bold text-[#0F1D5E]">Tasks & Follow-Ups ({tasks.length})</h3>
          </div>
          <button
            onClick={() => setShowAddTask(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F1D5E] border border-[#0F1D5E]/20 rounded-xl hover:bg-[#EEF1FA] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        </div>

        {showAddTask && (
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 grid grid-cols-5 gap-3 items-end">
            {([
              { label: "Title", col: "col-span-2", el: <input className={inputCls} placeholder="Task title" value={newTask.title} onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))} /> },
              { label: "Type", col: "", el: <select className={inputCls} value={newTask.task_type} onChange={e => setNewTask(f => ({ ...f, task_type: e.target.value }))}><option value="call">Call</option><option value="text">Text</option><option value="email">Email</option><option value="renewal_followup">Renewal</option><option value="general">General</option></select> },
              { label: "Priority", col: "", el: <select className={inputCls} value={newTask.priority} onChange={e => setNewTask(f => ({ ...f, priority: e.target.value }))}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select> },
              { label: "Due Date", col: "", el: <input type="date" className={inputCls} value={newTask.due_date} onChange={e => setNewTask(f => ({ ...f, due_date: e.target.value }))} /> },
            ] as { label: string; col: string; el: React.ReactNode }[]).map(({ label, col, el }) => (
              <div key={label} className={col}>
                <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                {el}
              </div>
            ))}
            <button onClick={handleAddTask} disabled={savingTask}
              className="py-2 px-4 rounded-xl bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-50">
              {savingTask ? "..." : "Save"}
            </button>
          </div>
        )}
        {taskError && <p className="text-xs text-red-500 px-5 py-2">{taskError}</p>}

        {tasks.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">No tasks yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Title", "Type", "Due", "Priority", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => {
                const isOverdue = t.status !== "completed" && new Date(t.due_date) < new Date();
                const statusCls = t.status === "completed" ? "bg-emerald-100 text-emerald-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700";
                const statusLabel = t.status === "completed" ? "Done" : isOverdue ? "Overdue" : "Pending";
                return (
                  <tr key={t.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/70 ${t.status === "completed" ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">{t.title}</td>
                    <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EEF1FA] text-[#0F1D5E]">{t.task_type}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${t.priority === "high" ? "bg-red-100 text-red-700" : t.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{t.priority}</span></td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusCls}`}>{statusLabel}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {t.status !== "completed" && (
                          <button onClick={() => handleCompleteTask(t.id)} className="text-slate-300 hover:text-emerald-500 transition-colors" title="Mark done"><Check className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => handleDeleteTask(t.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
