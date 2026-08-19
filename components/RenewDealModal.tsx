"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { X, AlertCircle } from "lucide-react";

const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 placeholder:text-slate-400";
const labelCls = "block text-sm text-slate-700 mb-1";
const sectionLabelCls = "text-xs font-bold text-slate-400 uppercase tracking-wider mb-3";

const SUPPLIERS = [
  "Budget Power", "Discount Power", "Heritage Power", "Iron Horse",
  "CleanSky Energy", "Reliant", "Chariot",
  "Direct Energy", "Cirro Energy", "True Power", "Hudson Energy", "NRG",
];
const CONTRACT_TERMS = [
  "6 Months", "12 Months", "16 Months", "23 Months", "24 Months",
  "28 Months", "36 Months", "48 Months", "60 Months", "Month to Month",
];
const TERM_MONTHS: Record<string, number> = {
  "6 Months": 6, "12 Months": 12, "16 Months": 16, "23 Months": 23,
  "24 Months": 24, "28 Months": 28, "36 Months": 36, "48 Months": 48, "60 Months": 60,
};
const ADD_DEAL_TYPES = ["New Business", "Renew", "TOS", "TOAO"];
const ADD_SERVICE_ORDER_TYPES = ["PMVI", "MVI", "SWI"];
const ADD_RENEW_SERVICE_ORDER_TYPES = ["PMVI", "MVI", "SWI", "Renewed with same REP"];

function FormInput({ label, error, type = "text", value, onChange, onBlur, placeholder }: {
  label: string; error?: string; type?: string;
  value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string;
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
        onBlur={onBlur}
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

const EMPTY_RENEW = {
  status: "Future", supplier: "", plan_name: "", rate_type: "", meter_type: "",
  deal_type: "", service_order_type: "", contract_term: "",
  rate: "", adder: "", est_kwh: "",
  contract_signed_date: "", contract_start_date: "", contract_end_date: "",
  service_address: "", service_city: "", service_state: "TX", service_zip: "", esiid: "",
  sales_agent: "",
};

export default function RenewDealModal({ deal, customerId, onClose, onSaved }: {
  deal: any; customerId: string; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    ...EMPTY_RENEW,
    supplier: deal.provider || "",
    meter_type: deal.meter_type || "",
    deal_type: "Renew",
    est_kwh: deal.est_kwh != null ? String(deal.est_kwh) : "",
    service_address: deal.service_address || "",
    service_city: deal.service_city || "",
    service_state: deal.service_state || "TX",
    service_zip: deal.service_zip || "",
    esiid: deal.esiid || "",
    sales_agent: deal.sales_agent || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [agents, setAgents] = useState<string[]>([]);

  useEffect(() => {
    api.getCrmProviders().then(setProviders).catch(() => {});
    api.getCrmAgents().then(setAgents).catch(() => {});
  }, []);

  useEffect(() => {
    const months = TERM_MONTHS[form.contract_term];
    if (!form.contract_start_date || !months) return;
    const d = new Date(form.contract_start_date);
    d.setMonth(d.getMonth() + months);
    setForm(f => ({ ...f, contract_end_date: d.toISOString().split("T")[0] }));
  }, [form.contract_start_date, form.contract_term]);

  const setStr = (k: keyof typeof EMPTY_RENEW, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const required: (keyof typeof EMPTY_RENEW)[] = [
      "status", "supplier", "rate_type", "meter_type", "deal_type",
      "service_order_type", "contract_term", "rate", "est_kwh",
      "contract_signed_date", "contract_start_date", "contract_end_date",
      "service_address", "service_city", "service_state", "service_zip", "esiid",
      "sales_agent",
      ...(form.meter_type === "Commercial" ? ["adder" as keyof typeof EMPTY_RENEW] : []),
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
      await api.renewCrmDeal(deal.id, {
        deal_status: form.status.toUpperCase(),
        provider: form.supplier,
        plan_name: form.plan_name,
        rate_type: form.rate_type,
        meter_type: form.meter_type,
        deal_type: form.deal_type,
        service_order_type: form.service_order_type,
        contract_term: form.contract_term,
        energy_rate: form.rate ? parseFloat(form.rate) : null,
        adder: form.adder ? parseFloat(form.adder) : null,
        est_kwh: form.est_kwh ? parseFloat(form.est_kwh) : null,
        contract_signed_date: form.contract_signed_date,
        contract_start_date: form.contract_start_date,
        contract_end_date: form.contract_end_date,
        service_address: form.service_address,
        service_city: form.service_city,
        service_state: form.service_state,
        service_zip: form.service_zip,
        esiid: form.esiid,
        sales_agent: form.sales_agent,
      });
      onSaved();
    } catch (err: any) {
      const raw = err?.message || "Failed";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      try { setApiError(JSON.parse(body)?.detail ?? body); } catch { setApiError(body); }
    }
    setSaving(false);
  };

  const supplierOptions = providers.length ? providers : SUPPLIERS;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Renew Deal</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              The current deal will be marked <strong>RENEWED</strong> and a new deal will be created.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {apiError}
            </div>
          )}

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
                {supplierOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </FormSelect>

              <FormInput label="Plan Name" placeholder="e.g. Gexa Saver 12"
                value={form.plan_name} onChange={v => setStr("plan_name", v)} />

              <FormSelect label="Product Type *" error={errors.rate_type} value={form.rate_type} onChange={v => setStr("rate_type", v)}>
                <option value="">— Select —</option>
                <option value="Fixed Rate">Fixed Rate</option>
                <option value="Month-Month">Month-Month</option>
                <option value="FreeNight & Weekend">FreeNight &amp; Weekend</option>
                <option value="Solar Buy-Back">Solar Buy-Back</option>
              </FormSelect>

              <FormSelect label="Meter Type *" error={errors.meter_type} value={form.meter_type} onChange={v => setStr("meter_type", v)}>
                <option value="">— Select —</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
              </FormSelect>

              <FormSelect label="Deal Type *" error={errors.deal_type} value={form.deal_type} onChange={v => setStr("deal_type", v)}>
                <option value="">— Select —</option>
                {ADD_DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </FormSelect>

              <FormSelect label="Service Order Type *" error={errors.service_order_type} value={form.service_order_type} onChange={v => setStr("service_order_type", v)}>
                <option value="">— Select —</option>
                {(form.deal_type === "Renew" ? ADD_RENEW_SERVICE_ORDER_TYPES : ADD_SERVICE_ORDER_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
              </FormSelect>

              <FormSelect label="Contract Term *" error={errors.contract_term} value={form.contract_term} onChange={v => setStr("contract_term", v)}>
                <option value="">— Select —</option>
                {CONTRACT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </FormSelect>

              <FormInput label="Contract Rate ($/kWh) *" placeholder="0.109" type="number" error={errors.rate}
                value={form.rate} onChange={v => setStr("rate", v)} />

              {form.meter_type === "Commercial" && (
                <FormInput label="Adder ($/kWh) *" placeholder="0.0070" type="number" error={errors.adder}
                  value={form.adder} onChange={v => setStr("adder", v)} />
              )}

              <FormInput label="Estimated Usage (kWh/mo) *" placeholder="1200" type="number" error={errors.est_kwh}
                value={form.est_kwh} onChange={v => setStr("est_kwh", v)} />

              <FormInput label="Contract Signed Date *" type="date" error={errors.contract_signed_date}
                value={form.contract_signed_date} onChange={v => setStr("contract_signed_date", v)} />

              <FormInput label="Contract Start Date *" type="date" error={errors.contract_start_date}
                value={form.contract_start_date} onChange={v => setStr("contract_start_date", v)} />

              <div>
                <label className={labelCls}>Contract End Date * <span className="text-slate-400 font-normal">(auto-filled)</span></label>
                <input
                  type="date"
                  className={`${inputCls} bg-slate-50 ${errors.contract_end_date ? "border-red-400" : ""}`}
                  value={form.contract_end_date}
                  onChange={e => setStr("contract_end_date", e.target.value)}
                />
                {errors.contract_end_date && <p className="text-xs text-red-500 mt-1">{errors.contract_end_date}</p>}
              </div>
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
                {agents.map(a => <option key={a} value={a}>{a}</option>)}
              </FormSelect>
            </div>
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
            {saving ? "Renewing..." : "Confirm Renewal"}
          </button>
        </div>
      </div>
    </div>
  );
}
