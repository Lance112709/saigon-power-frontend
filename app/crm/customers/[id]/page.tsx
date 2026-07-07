"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft, User, MapPin, Phone, Mail, Calendar, Hash,
  Pencil, Check, X, ChevronDown, Bell, Plus, Trash2, Zap, MessageSquare, RefreshCw, Ban, FileEdit, AlertCircle,
  Paperclip, Upload, Download, FileText, Loader2,
} from "lucide-react";
import SendSmsModal from "@/components/SendSmsModal";

const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 placeholder:text-slate-400";
const labelCls = "block text-sm text-slate-700 mb-1";
const sectionLabelCls = "text-xs font-bold text-slate-400 uppercase tracking-wider mb-3";
const fmtDate = (s: string) => { const [y, m, d] = s.slice(0, 10).split("-"); return `${m}-${d}-${y}`; };
const fmtBytes = (n?: number) => {
  if (!n || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const DEAL_FLAGS = ["TOS", "TOAO", "Deposit", "Special Deal", "10% Promo", "DE LINKED"] as const;
type DealFlag = typeof DEAL_FLAGS[number];
const DEAL_FLAG_KEYS: Record<DealFlag, string> = {
  "TOS": "flag_tos",
  "TOAO": "flag_toao",
  "Deposit": "flag_deposit",
  "Special Deal": "flag_special_deal",
  "10% Promo": "flag_promo_10",
  "DE LINKED": "flag_delinked",
};
const EMPTY_FLAGS = { flag_tos: false, flag_toao: false, flag_deposit: false, flag_special_deal: false, flag_promo_10: false, flag_delinked: false };

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

function IconBox({ icon: Icon }: { icon: any }) {
  return (
    <div className="w-9 h-9 rounded-xl bg-[#EEF1FA] flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-[#0F1D5E]" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "ACTIVE"   ? "bg-emerald-100 text-emerald-700" :
    status === "RENEWED"  ? "bg-indigo-100 text-indigo-700" :
                            "bg-slate-100 text-slate-500";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${styles}`}>
      {status}
    </span>
  );
}

const EMPTY_RENEW = {
  provider: "", energy_rate: "", adder: "", contract_term: "",
  contract_start_date: "", contract_end_date: "", contract_signed_date: "",
  sales_agent: "", product_type: "", meter_type: "Residential",
};

function RenewDealModal({ deal, customerId, onClose, onSaved }: {
  deal: any; customerId: string; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    ...EMPTY_RENEW,
    provider: deal.provider || "",
    sales_agent: deal.sales_agent || "",
    product_type: deal.product_type || "",
    meter_type: deal.meter_type || "Residential",
    contract_term: deal.contract_term || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const [agents, setAgents] = useState<string[]>([]);

  useEffect(() => {
    api.getCrmProviders().then(setProviders).catch(() => {});
    api.getCrmAgents().then(setAgents).catch(() => {});
  }, []);

  const set = (k: keyof typeof EMPTY_RENEW, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.renewCrmDeal(deal.id, form);
      onSaved();
    } catch (err: any) {
      const raw = err?.message || "Failed";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      try { setError(JSON.parse(body)?.detail ?? body); } catch { setError(body); }
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-base font-bold text-[#0F1D5E]">Renew Deal</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ESIID: <span className="font-mono">{deal.esiid || "—"}</span>
              {deal.service_address && <> · {deal.service_address}</>}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700">
            The current deal will be marked <strong>RENEWED</strong> and a new Active deal will be created with the same ESIID and address.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Provider (REP)</label>
              <select className={inputCls} value={form.provider} onChange={e => set("provider", e.target.value)}>
                <option value="">Select provider…</option>
                {providers.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Sales Agent</label>
              <select className={inputCls} value={form.sales_agent} onChange={e => set("sales_agent", e.target.value)}>
                <option value="">Select agent…</option>
                {agents.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Meter Type</label>
              <select className={inputCls} value={form.meter_type} onChange={e => set("meter_type", e.target.value)}>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Small Commercial">Small Commercial</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Energy Rate ($/kWh)</label>
              <input type="number" step="0.0001" className={inputCls} placeholder="0.0850" value={form.energy_rate} onChange={e => set("energy_rate", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Adder ($/kWh)</label>
              <input type="number" step="0.0001" className={inputCls} placeholder="0.0070" value={form.adder} onChange={e => set("adder", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Contract Term</label>
              <input className={inputCls} placeholder="12 Months" value={form.contract_term} onChange={e => set("contract_term", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Start Date</label>
              <input type="date" className={inputCls} value={form.contract_start_date} onChange={e => set("contract_start_date", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">End Date</label>
              <input type="date" className={inputCls} value={form.contract_end_date} onChange={e => set("contract_end_date", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Signed Date</label>
            <input type="date" className={inputCls} value={form.contract_signed_date} onChange={e => set("contract_signed_date", e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Renewing…" : "Confirm Renewal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TerminateDealModal({ deal, onClose, onSaved }: {
  deal: any; onClose: () => void; onSaved: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const handleTerminate = async () => {
    setSaving(true);
    try {
      await api.updateCrmDeal(deal.id, {
        deal_status: "INACTIVE",
        contract_end_date: date,
      });
      onSaved();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <Ban className="w-4 h-4 text-red-500" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Terminate Deal</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm">
          <p className="font-semibold text-slate-700 truncate">{deal.deal_name || deal.business_name || "Unnamed Deal"}</p>
          {deal.service_address && <p className="text-slate-400 text-xs mt-0.5 truncate">{deal.service_address}</p>}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1.5">Termination Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleTerminate}
            disabled={saving || !date}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {saving ? "Terminating…" : "Terminate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditDealModal({ deal, onClose, onSaved }: { deal: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    deal_name:           deal.deal_name           || "",
    provider:            deal.provider            || "",
    service_address:     deal.service_address     || "",
    meter_type:          deal.meter_type          || "Residential",
    deal_type:           deal.deal_type           || "",
    energy_rate:         deal.energy_rate != null  ? String(deal.energy_rate) : "",
    adder:               deal.adder       != null  ? String(deal.adder)       : "",
    contract_term:       deal.contract_term        || "",
    contract_start_date: (deal.contract_start_date || "").slice(0, 10),
    contract_end_date:   (deal.contract_end_date   || "").slice(0, 10),
    contract_signed_date:(deal.contract_signed_date|| "").slice(0, 10),
    sales_agent:         deal.sales_agent          || "",
    deal_status:         deal.deal_status          || "ACTIVE",
    business_name:       deal.business_name        || "",
    esiid:               deal.esiid                || "",
  });
  const [flags, setFlags] = useState({ ...EMPTY_FLAGS, flag_tos: deal.flag_tos ?? false, flag_toao: deal.flag_toao ?? false, flag_deposit: deal.flag_deposit ?? false, flag_special_deal: deal.flag_special_deal ?? false, flag_promo_10: deal.flag_promo_10 ?? false, flag_delinked: deal.flag_delinked ?? false });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const [agents, setAgents]     = useState<string[]>([]);

  useEffect(() => {
    api.getCrmProviders().then(setProviders).catch(() => {});
    api.getCrmAgents().then(setAgents).catch(() => {});
  }, []);

  const set = (k: keyof typeof form, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };
  const toggleFlag = (key: string) => setFlags(f => ({ ...f, [key]: !(f as any)[key] }));

  // Everything is required except Deal Name and Business Name.
  const REQUIRED: (keyof typeof form)[] = [
    "provider", "service_address", "meter_type", "energy_rate", "adder",
    "contract_term", "contract_start_date", "contract_end_date", "contract_signed_date",
    "sales_agent", "deal_status", "esiid",
  ];
  const inpCls = (field: string) => `${inputCls} ${errors[field] ? "border-red-400 ring-1 ring-red-400/30" : ""}`;
  const errMsg = (field: string) => errors[field]
    ? <p className="text-xs text-red-500 mt-1">{errors[field]}</p> : null;

  const validate = () => {
    const e: Record<string, string> = {};
    for (const f of REQUIRED) {
      if (!String((form as any)[f] ?? "").trim()) e[f] = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setApiError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setApiError("");
    try {
      await api.updateCrmDeal(deal.id, {
        ...form,
        energy_rate: form.energy_rate ? parseFloat(form.energy_rate) : null,
        adder:       form.adder       ? parseFloat(form.adder)       : null,
        ...flags,
      });
      onSaved();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-[#0F1D5E]" />
            <h2 className="text-base font-bold text-[#0F1D5E]">Edit Deal</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">

          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {apiError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Deal Name</label>
              <input className={inputCls} value={form.deal_name} onChange={e => set("deal_name", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Business Name</label>
              <input className={inputCls} value={form.business_name} onChange={e => set("business_name", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Provider (REP) *</label>
              <select className={inpCls("provider")} value={form.provider} onChange={e => set("provider", e.target.value)}>
                <option value="">Select provider…</option>
                {providers.map(p => <option key={p} value={p}>{p}</option>)}
                {form.provider && !providers.includes(form.provider) && (
                  <option value={form.provider}>{form.provider}</option>
                )}
              </select>
              {errMsg("provider")}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Service Address *</label>
              <input className={inpCls("service_address")} value={form.service_address} onChange={e => set("service_address", e.target.value)} />
              {errMsg("service_address")}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Meter Type *</label>
              <select className={inpCls("meter_type")} value={form.meter_type} onChange={e => set("meter_type", e.target.value)}>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Small Commercial">Small Commercial</option>
              </select>
              {errMsg("meter_type")}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Energy Rate ($/kWh) *</label>
              <input type="number" step="0.0001" className={inpCls("energy_rate")} value={form.energy_rate} onChange={e => set("energy_rate", e.target.value)} />
              {errMsg("energy_rate")}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Adder ($/kWh) *</label>
              <input type="number" step="0.0001" className={inpCls("adder")} value={form.adder} onChange={e => set("adder", e.target.value)} />
              {errMsg("adder")}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Contract Term *</label>
              <input className={inpCls("contract_term")} placeholder="e.g. 36" value={form.contract_term} onChange={e => set("contract_term", e.target.value)} />
              {errMsg("contract_term")}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Start Date *</label>
              <input type="date" className={inpCls("contract_start_date")} value={form.contract_start_date} onChange={e => set("contract_start_date", e.target.value)} />
              {errMsg("contract_start_date")}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">End Date *</label>
              <input type="date" className={inpCls("contract_end_date")} value={form.contract_end_date} onChange={e => set("contract_end_date", e.target.value)} />
              {errMsg("contract_end_date")}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Signed Date *</label>
              <input type="date" className={inpCls("contract_signed_date")} value={form.contract_signed_date} onChange={e => set("contract_signed_date", e.target.value)} />
              {errMsg("contract_signed_date")}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Sales Agent *</label>
              <select className={inpCls("sales_agent")} value={form.sales_agent} onChange={e => set("sales_agent", e.target.value)}>
                <option value="">Select agent…</option>
                {agents.map(a => <option key={a} value={a}>{a}</option>)}
                {form.sales_agent && !agents.includes(form.sales_agent) && (
                  <option value={form.sales_agent}>{form.sales_agent}</option>
                )}
              </select>
              {errMsg("sales_agent")}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Status *</label>
              <select className={inpCls("deal_status")} value={form.deal_status} onChange={e => set("deal_status", e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="RENEWED">Renewed</option>
              </select>
              {errMsg("deal_status")}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">ESI ID *</label>
            <input className={inpCls("esiid")} placeholder="10089010238183693001" value={form.esiid} onChange={e => set("esiid", e.target.value)} />
            {errMsg("esiid")}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-2 block">Flags</label>
            <div className="flex flex-wrap gap-2">
              {DEAL_FLAGS.map(flag => {
                const key = DEAL_FLAG_KEYS[flag];
                const active = (flags as any)[key];
                return (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => toggleFlag(key)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                      flag === "DE LINKED"
                        ? active ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-300 hover:border-red-400"
                        : active ? "bg-[#0F1D5E] text-white border-[#0F1D5E]" : "bg-white text-slate-700 border-slate-300 hover:border-[#0F1D5E]/40"
                    }`}
                  >
                    {flag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-50">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

const EMPTY_DEAL = {
  flag_tos: false, flag_toao: false, flag_deposit: false, flag_special_deal: false, flag_promo_10: false, flag_delinked: false,
  deal_status: "ACTIVE",
  supplier: "", deal_name: "", product_type: "", meter_type: "Residential",
  deal_type: "", service_order_type: "",
  contract_term: "", energy_rate: "", adder: "",
  contract_signed_date: "", contract_start_date: "", contract_end_date: "",
  service_address: "", service_city: "", service_state: "TX", service_zip: "", esiid: "",
  sales_agent: "",
};

function AddDealModal({ customerId, onClose, onSaved }: { customerId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(EMPTY_DEAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [activeConflicts, setActiveConflicts] = useState<any[]>([]);
  const [agents, setAgents] = useState<string[]>([]);

  useEffect(() => {
    api.getCrmAgents().then(setAgents).catch(() => {});
  }, []);

  useEffect(() => {
    const months = TERM_MONTHS[form.contract_term];
    if (!form.contract_start_date || !months) return;
    const d = new Date(form.contract_start_date);
    d.setMonth(d.getMonth() + months);
    setForm(f => ({ ...f, contract_end_date: d.toISOString().split("T")[0] }));
  }, [form.contract_start_date, form.contract_term]);

  const setStr = (k: keyof typeof EMPTY_DEAL, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };
  const toggleFlag = (key: string) => setForm(f => ({ ...f, [key]: !(f as any)[key] }));

  const validate = () => {
    const required: (keyof typeof EMPTY_DEAL)[] = [
      "supplier", "product_type", "meter_type", "deal_type", "service_order_type",
      "contract_term", "energy_rate", "adder",
      "contract_signed_date", "contract_start_date", "contract_end_date",
      "service_address", "service_city", "service_state", "service_zip", "esiid",
      "sales_agent",
    ];
    const e: Record<string, string> = {};
    for (const f of required) {
      if (!String((form as any)[f] ?? "").trim()) e[f] = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const checkDup = async (params: { esiid?: string; service_address?: string }) => {
    const key = params.esiid || params.service_address || "";
    if (!key.trim()) return;
    try {
      const res = await api.checkDuplicateDeal({ ...params, active_only: true });
      if (res.matches?.length) {
        setActiveConflicts(prev => {
          const newIds = new Set(res.matches.map((m: any) => m.deal_id));
          const merged = prev.filter((m: any) => !newIds.has(m.deal_id));
          return [...merged, ...res.matches];
        });
      }
    } catch {}
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) {
      setApiError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setApiError("");
    try {
      const fullAddress = [form.service_address, form.service_city, form.service_state, form.service_zip]
        .filter(Boolean).join(", ");
      await api.createCrmDeal(customerId, {
        deal_name:            form.deal_name,
        provider:             form.supplier,
        esiid:                form.esiid,
        service_address:      fullAddress,
        meter_type:           form.meter_type,
        deal_type:            form.deal_type,
        energy_rate:          form.energy_rate ? parseFloat(form.energy_rate) : null,
        adder:                form.adder ? parseFloat(form.adder) : null,
        contract_term:        form.contract_term,
        contract_start_date:  form.contract_start_date,
        contract_end_date:    form.contract_end_date,
        contract_signed_date: form.contract_signed_date,
        sales_agent:          form.sales_agent,
        deal_status:          form.deal_status,
        product_type:         form.product_type,
        flag_tos:             form.flag_tos,
        flag_toao:            form.flag_toao,
        flag_deposit:         form.flag_deposit,
        flag_special_deal:    form.flag_special_deal,
        flag_promo_10:        form.flag_promo_10,
        flag_delinked:        form.flag_delinked,
      });
      onSaved();
    } catch (err: any) {
      const raw = err?.message || "Failed";
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
          <h2 className="text-lg font-bold text-slate-900">Add New Deal</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-6">
          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {apiError}
            </div>
          )}

          {activeConflicts.length > 0 && (
            <div className="bg-red-50 border-2 border-red-400 rounded-xl px-4 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <p className="text-sm font-bold text-red-700">Active deal already exists for this ESI ID or address</p>
              </div>
              <div className="space-y-1.5 pl-6">
                {activeConflicts.map((m, i) => (
                  <div key={i} className="text-xs text-red-700 bg-red-100 rounded-lg px-3 py-2">
                    <span className="font-bold">{m.customer_name || "Unknown Customer"}</span>
                    {m.provider ? <span className="ml-1 text-red-500">· {m.provider}</span> : ""}
                    {m.esiid ? <span className="ml-1 font-mono text-red-600"> · {m.esiid}</span> : ""}
                    {m.service_address ? <span className="ml-1 text-red-500"> · {m.service_address}</span> : ""}
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-red-200 text-red-800 font-bold uppercase text-[10px]">{m.deal_status}</span>
                    <span className="ml-1 text-red-400">({m.source === "lead" ? "Pipeline" : "Imported"})</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-600 pl-6 font-medium">Saving will create a duplicate. Only proceed if intentional.</p>
            </div>
          )}

          {/* Flags */}
          <div>
            <p className="text-sm text-slate-700 mb-2">Flags</p>
            <div className="flex flex-wrap gap-2">
              {DEAL_FLAGS.map(flag => {
                const key = DEAL_FLAG_KEYS[flag];
                const active = (form as any)[key];
                return (
                  <button key={flag} type="button" onClick={() => toggleFlag(key)}
                    className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                      flag === "DE LINKED"
                        ? active ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-300 hover:border-red-400"
                        : active ? "bg-[#0F1D5E] text-white border-[#0F1D5E]" : "bg-white text-slate-700 border-slate-300 hover:border-[#0F1D5E]/40"
                    }`}>
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
              <FormSelect label="Status" value={form.deal_status} onChange={v => setStr("deal_status", v)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </FormSelect>

              <FormSelect label="Supplier / REP *" error={errors.supplier} value={form.supplier} onChange={v => setStr("supplier", v)}>
                <option value="">— Select —</option>
                {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
              </FormSelect>

              <FormInput label="Deal Name" placeholder="e.g. Main Meter"
                value={form.deal_name} onChange={v => setStr("deal_name", v)} />

              <FormSelect label="Product Type *" error={errors.product_type} value={form.product_type} onChange={v => setStr("product_type", v)}>
                <option value="">— Select —</option>
                <option value="Fixed Rate">Fixed Rate</option>
                <option value="Month-Month">Month-Month</option>
                <option value="FreeNight &amp; Weekend">FreeNight &amp; Weekend</option>
                <option value="Solar Buy-Back">Solar Buy-Back</option>
              </FormSelect>

              <FormSelect label="Meter Type *" error={errors.meter_type} value={form.meter_type} onChange={v => setStr("meter_type", v)}>
                <option value="">— Select —</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Small Commercial">Small Commercial</option>
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

              <FormInput label="Energy Rate ($/kWh) *" placeholder="0.0850" type="number" error={errors.energy_rate}
                value={form.energy_rate} onChange={v => setStr("energy_rate", v)} />

              <FormInput label="Adder ($/kWh) *" placeholder="0.0070" type="number" error={errors.adder}
                value={form.adder} onChange={v => setStr("adder", v)} />

              <FormInput label="Contract Signed Date *" type="date" error={errors.contract_signed_date}
                value={form.contract_signed_date} onChange={v => setStr("contract_signed_date", v)} />

              <FormInput label="Contract Start Date *" type="date" error={errors.contract_start_date}
                value={form.contract_start_date} onChange={v => setStr("contract_start_date", v)} />

              <div>
                <label className={labelCls}>Contract End Date * <span className="text-slate-400 font-normal text-xs">(auto-filled)</span></label>
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
                value={form.service_address}
                onChange={v => { setStr("service_address", v); setActiveConflicts([]); }}
                onBlur={() => { if (form.service_address.trim()) checkDup({ service_address: form.service_address.trim() }); }} />
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
                  value={form.esiid}
                  onChange={v => { setStr("esiid", v); setActiveConflicts([]); }}
                  onBlur={() => { if (form.esiid.trim()) checkDup({ esiid: form.esiid.trim() }); }} />
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
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Add Deal"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const canDeleteNotes = user?.role === "admin";
  const isAdmin = user?.role === "admin" || user?.role === "manager";
  const id = params.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [showSms, setShowSms] = useState(false);
  const [renewDeal, setRenewDeal] = useState<any>(null);
  const [terminateDeal, setTerminateDeal] = useState<any>(null);
  const [editDeal, setEditDeal] = useState<any>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "", phone: "", email: "", dob: "",
    mailing_address: "", city: "", state: "", postal_code: "", notes: "", anxh: "",
  });
  const [saving, setSaving] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");

  // Tasks state
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [newTask, setNewTask] = useState({ title: "", task_type: "call", due_date: "", priority: "medium", description: "" });

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachError, setAttachError] = useState("");
  const [openingAttachment, setOpeningAttachment] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCustomer = useCallback(async () => {
    const data = await api.getCrmCustomer(id);
    setCustomer(data);
    setDeals(data.deals || []);
    const deals = data.deals || [];
    const firstAnxh = deals.map((d: any) => d.anxh).find(Boolean) || "";
    setEditForm({
      full_name: data.full_name || "",
      phone: data.phone || "",
      email: data.email || "",
      dob: data.dob || "",
      mailing_address: data.mailing_address || "",
      city: data.city || "",
      state: data.state || "",
      postal_code: data.postal_code || "",
      notes: data.notes || "",
      anxh: firstAnxh,
    });
  }, [id]);

  const loadNotes = useCallback(async () => {
    try { setNotes(await api.getCrmCustomerNotes(id)); } catch {}
  }, [id]);

  const loadTasks = useCallback(async () => {
    try { setTasks(await api.getTasks({ customer_id: id })); } catch {}
  }, [id]);

  const loadAttachments = useCallback(async () => {
    try { setAttachments(await api.getCrmCustomerAttachments(id)); } catch {}
  }, [id]);

  useEffect(() => {
    loadCustomer()
      .catch(e => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
    loadNotes();
    loadTasks();
    loadAttachments();
  }, [id, loadCustomer, loadNotes, loadTasks, loadAttachments]);

  const cancelEdit = () => {
    const firstAnxh = deals.map((d: any) => d.anxh).find(Boolean) || "";
    setEditForm({
      full_name: customer.full_name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      dob: customer.dob || "",
      mailing_address: customer.mailing_address || "",
      city: customer.city || "",
      state: customer.state || "",
      postal_code: customer.postal_code || "",
      notes: customer.notes || "",
      anxh: firstAnxh,
    });
    setEditing(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const updated = await api.updateCrmCustomer(id, editForm);
      setCustomer((prev: any) => ({ ...prev, ...updated }));
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const handleDealStatusUpdate = (dealId: string, newStatus: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, deal_status: newStatus } : d));
  };

  const handleDeleteDeal = async (e: React.MouseEvent, dealId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this deal? This cannot be undone.")) return;
    try {
      await api.deleteCrmDeal(dealId);
      setDeals(prev => prev.filter(d => d.id !== dealId));
    } catch {}
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    setNoteError("");
    try {
      await api.createCrmCustomerNote(id, { content: noteText.trim(), author_name: user?.name || "" });
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
    await api.deleteCrmCustomerNote(id, noteId).catch(() => {});
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim() || !newTask.due_date) return;
    setSavingTask(true);
    setTaskError("");
    try {
      await api.createTask({ ...newTask, customer_id: id });
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

  const handleCompleteTask = async (taskId: string) => {
    await api.updateTask(taskId, { status: "completed" }).catch(() => {});
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "completed" } : t));
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    await api.deleteTask(taskId).catch(() => {});
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setUploadingFile(true);
    setAttachError("");
    try {
      const created = await api.uploadCrmCustomerAttachment(id, file);
      setAttachments(prev => [created, ...prev]);
    } catch (err: any) {
      const raw = err?.message || "Upload failed";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      try { setAttachError(JSON.parse(body)?.detail ?? body); } catch { setAttachError(body); }
    }
    setUploadingFile(false);
  };

  const handleOpenAttachment = async (attachmentId: string) => {
    setOpeningAttachment(attachmentId);
    try {
      const { url } = await api.getCrmAttachmentUrl(id, attachmentId);
      window.open(url, "_blank", "noopener");
    } catch {}
    setOpeningAttachment(null);
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm("Delete this attachment? This cannot be undone.")) return;
    await api.deleteCrmCustomerAttachment(id, attachmentId).catch(() => {});
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  if (loading || authLoading) return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center text-slate-400 text-sm">Loading...</div>
  );
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!customer) return null;

  const active = deals.filter(d => d.deal_status === "ACTIVE");
  const renewed = deals.filter(d => d.deal_status === "RENEWED");
  const inactive = deals.filter(d => d.deal_status !== "ACTIVE" && d.deal_status !== "RENEWED");
  const anxhValues = [...new Set(deals.map((d: any) => d.anxh).filter(Boolean))];
  const isCsr = user?.role === "csr";
  const maskAnxh = (val: string) => user?.role === "csr" ? "****" + String(val).slice(-4) : val;

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">
      {showAddDeal && (
        <AddDealModal
          customerId={id}
          onClose={() => setShowAddDeal(false)}
          onSaved={async () => { setShowAddDeal(false); await loadCustomer(); }}
        />
      )}

      {renewDeal && (
        <RenewDealModal
          deal={renewDeal}
          customerId={id}
          onClose={() => setRenewDeal(null)}
          onSaved={async () => { setRenewDeal(null); await loadCustomer(); }}
        />
      )}

      {terminateDeal && (
        <TerminateDealModal
          deal={terminateDeal}
          onClose={() => setTerminateDeal(null)}
          onSaved={async () => { setTerminateDeal(null); await loadCustomer(); }}
        />
      )}

      {editDeal && (
        <EditDealModal
          deal={editDeal}
          onClose={() => setEditDeal(null)}
          onSaved={async () => { setEditDeal(null); await loadCustomer(); }}
        />
      )}

      {showSms && customer?.phone && (
        <SendSmsModal
          to={customer.phone}
          contactName={customer.full_name || customer.name || "Customer"}
          customerId={id}
          onClose={() => setShowSms(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0F1D5E] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </button>
        {customer?.phone && (
          <button
            onClick={() => setShowSms(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> Send SMS
          </button>
        )}
      </div>

      {/* ── Customer Hero ── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0F1D5E] via-[#1a2d7a] to-[#2a3f96] shadow-lg p-6 text-white">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold">{customer.full_name}</h2>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 uppercase">Customer</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2.5">
                {customer.phone && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-xs text-blue-50">
                    <Phone className="w-3 h-3 text-blue-200" /> {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-xs text-blue-50 break-all">
                    <Mail className="w-3 h-3 text-blue-200" /> {customer.email}
                  </span>
                )}
                {customer.dob && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-xs text-blue-50">
                    <Calendar className="w-3 h-3 text-blue-200" /> DOB {fmtDate(customer.dob)}
                  </span>
                )}
                {customer.mailing_address && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-xs text-blue-50">
                    <MapPin className="w-3 h-3 text-blue-200" />
                    {customer.mailing_address}{customer.city ? `, ${customer.city}, ${customer.state} ${customer.postal_code || ""}` : ""}
                  </span>
                )}
                {anxhValues.map((a: any) => (
                  <span key={a} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-xs font-mono text-blue-50">
                    <Hash className="w-3 h-3 text-blue-200" /> {maskAnxh(String(a))}
                  </span>
                ))}
              </div>
              {customer.notes && <p className="text-xs text-blue-200/80 mt-2 max-w-2xl">{customer.notes}</p>}
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <div className="flex items-center gap-5 text-center">
              <div><p className="text-2xl font-bold text-emerald-300">{active.length}</p><p className="text-[11px] text-blue-200/80 mt-0.5">Active</p></div>
              <div><p className="text-2xl font-bold text-indigo-200">{renewed.length}</p><p className="text-[11px] text-blue-200/80 mt-0.5">Renewed</p></div>
              <div><p className="text-2xl font-bold text-white/50">{inactive.length}</p><p className="text-[11px] text-blue-200/80 mt-0.5">Inactive</p></div>
            </div>
            {!editing && (
              <button onClick={() => setEditing(true)} className="p-2 rounded-xl bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors" title="Edit customer info">
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit form ── */}
      {editing && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-[#0F1D5E]">Edit Customer Info</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Full Name</label>
              <input className={inputCls} value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Phone</label>
              <input className={inputCls} value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Email</label>
              <input className={inputCls} value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-6 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">DOB</label>
              <input type="date" className={inputCls} value={editForm.dob} onChange={e => setEditForm(f => ({ ...f, dob: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Street Address</label>
              <input className={inputCls} value={editForm.mailing_address} onChange={e => setEditForm(f => ({ ...f, mailing_address: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">City</label>
              <input className={inputCls} value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">State</label>
              <input className={inputCls} value={editForm.state} onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">ZIP</label>
              <input className={inputCls} value={editForm.postal_code} onChange={e => setEditForm(f => ({ ...f, postal_code: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {!isCsr && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">ANXH</label>
                <input className={`${inputCls} font-mono`} placeholder="Account number" value={editForm.anxh} onChange={e => setEditForm(f => ({ ...f, anxh: e.target.value }))} />
              </div>
            )}
            <div className={isCsr ? "col-span-3" : "col-span-2"}>
              <label className="text-xs text-slate-500 mb-1 block">Notes</label>
              <textarea className={`${inputCls} resize-none`} rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={saveEdit} disabled={saving}
              className="px-5 flex items-center gap-1.5 py-2 rounded-xl bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-50">
              <Check className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={cancelEdit}
              className="px-5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}


          {/* Deals */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F1D5E]">Deals ({deals.length})</h3>
              <button onClick={() => setShowAddDeal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-[#0F1D5E] text-white text-xs font-semibold rounded-xl hover:bg-[#0F1D5E]/90 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Deal
              </button>
            </div>
            {deals.length === 0 ? (
              <div className="p-14 text-center">
                <Zap className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">No deals yet</p>
                <p className="text-slate-300 text-xs mt-1">Click Add Deal to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {[...active, ...inactive, ...renewed].map(d => {
                  const accent = d.deal_status === "ACTIVE" ? "border-l-emerald-400" : d.deal_status === "RENEWED" ? "border-l-indigo-400" : "border-l-slate-300";
                  return (
                    <div key={d.id}
                      className={`px-6 py-5 hover:bg-slate-50/70 cursor-pointer transition-colors border-l-4 ${accent}`}
                      onClick={() => router.push(`/crm/deals/${d.id}`)}>

                      {/* Row 1: name + provider + flags + actions */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-base font-bold text-[#0F1D5E]">{d.deal_name || d.business_name || "Unnamed Deal"}</span>
                          {d.provider && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{d.provider}</span>
                          )}
                          <StatusBadge status={d.deal_status} />
                          {DEAL_FLAGS.map(flag => {
                            const key = DEAL_FLAG_KEYS[flag];
                            if (!(d as any)[key]) return null;
                            return (
                              <span key={flag} className={`px-2 py-0.5 rounded-full text-xs font-bold border ${flag === "DE LINKED" ? "bg-red-100 text-red-600 border-red-200" : "bg-[#EEF1FA] text-[#0F1D5E] border-[#0F1D5E]/20"}`}>
                                {flag}
                              </span>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                          {d.deal_status === "ACTIVE" && (
                            <>
                              <button onClick={e => { e.stopPropagation(); setRenewDeal(d); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                                <RefreshCw className="w-3 h-3" /> Renew
                              </button>
                              <button onClick={e => { e.stopPropagation(); setTerminateDeal(d); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                                <Ban className="w-3 h-3" /> Terminate
                              </button>
                            </>
                          )}
                          <button onClick={e => { e.stopPropagation(); setEditDeal(d); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                            <FileEdit className="w-3 h-3" /> Edit
                          </button>
                          {isAdmin && (
                            <button onClick={e => handleDeleteDeal(e, d.id)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Row 2: stat chips */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {d.energy_rate != null && (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500">
                            Rate <span className="font-bold text-slate-700">${parseFloat(d.energy_rate).toFixed(4)}/kWh</span>
                          </span>
                        )}
                        {d.adder != null && (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500">
                            Adder <span className="font-bold text-slate-700">${parseFloat(d.adder).toFixed(4)}/kWh</span>
                          </span>
                        )}
                        {d.meter_type && (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-600">{d.meter_type}</span>
                        )}
                        {d.sales_agent && (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500">
                            Agent <span className="font-bold text-slate-700">{d.sales_agent}</span>
                          </span>
                        )}
                        {d.contract_start_date && d.contract_end_date && (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500">
                            {fmtDate(d.contract_start_date)} <span className="text-slate-300 mx-1">→</span> {fmtDate(d.contract_end_date)}
                          </span>
                        )}
                        {d.esiid && (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-xs font-mono text-slate-500">{d.esiid}</span>
                        )}
                      </div>

                      {/* Row 3: address + terminated */}
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        {d.service_address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />{d.service_address}
                          </span>
                        )}
                        {d.deal_status === "INACTIVE" && d.contract_end_date && (
                          <span className="text-red-500 font-semibold">Terminated: {fmtDate(d.contract_end_date)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Account Notes */}
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
                <button onClick={handleAddNote} disabled={savingNote || !noteText.trim()}
                  className="px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-40 transition-colors">
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

          {/* Attachments */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#0F1D5E]" />
                <h3 className="text-sm font-bold text-[#0F1D5E]">Attachments ({attachments.length})</h3>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadAttachment} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F1D5E] border border-[#0F1D5E]/20 rounded-xl hover:bg-[#EEF1FA] transition-colors disabled:opacity-50">
                {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploadingFile ? "Uploading..." : "Upload File"}
              </button>
            </div>
            {attachError && <p className="text-xs text-red-500 px-5 py-2">{attachError}</p>}
            {attachments.length === 0 ? (
              <p className="px-5 py-8 text-center text-slate-400 text-sm">No attachments yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {attachments.map(a => (
                  <div key={a.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/50 group">
                    <div className="w-9 h-9 rounded-xl bg-[#EEF1FA] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[#0F1D5E]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 truncate">{a.file_name}</p>
                      <p className="text-xs text-slate-400">
                        {fmtBytes(a.file_size)}
                        {a.uploaded_by && <> · {a.uploaded_by}</>}
                        {a.created_at && <> · {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleOpenAttachment(a.id)} disabled={openingAttachment === a.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F1D5E] hover:bg-[#EEF1FA] transition-colors disabled:opacity-50" title="Download">
                        {openingAttachment === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDeleteAttachment(a.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks & Follow-Ups */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#0F1D5E]" />
                <h3 className="text-sm font-bold text-[#0F1D5E]">Tasks & Follow-Ups ({tasks.length})</h3>
              </div>
              <button onClick={() => setShowAddTask(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F1D5E] border border-[#0F1D5E]/20 rounded-xl hover:bg-[#EEF1FA] transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>
            {showAddTask && (
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 grid grid-cols-5 gap-3 items-end">
                {([
                  { label: "Title", col: "col-span-2", el: <input className={inputCls} placeholder="Task title" value={newTask.title} onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))} /> },
                  { label: "Type", col: "", el: <select className={inputCls} value={newTask.task_type} onChange={e => setNewTask(f => ({ ...f, task_type: e.target.value }))}><option value="call">Call</option><option value="text">Text</option><option value="email">Email</option><option value="general">General</option></select> },
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
                      <th key={h || "actions"} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
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
