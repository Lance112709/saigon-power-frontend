"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft, User, MapPin, Phone, Mail, Calendar, Hash,
  Pencil, Check, X, ChevronDown, Bell, Plus, Trash2, Zap, MessageSquare, RefreshCw, Ban, FileEdit,
} from "lucide-react";
import SendSmsModal from "@/components/SendSmsModal";

const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 placeholder:text-slate-400";
const fmtDate = (s: string) => { const [y, m, d] = s.slice(0, 10).split("-"); return `${m}-${d}-${y}`; };

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
    anxh:                deal.anxh                 || "",
  });
  const [flags, setFlags] = useState({ ...EMPTY_FLAGS, flag_tos: deal.flag_tos ?? false, flag_toao: deal.flag_toao ?? false, flag_deposit: deal.flag_deposit ?? false, flag_special_deal: deal.flag_special_deal ?? false, flag_promo_10: deal.flag_promo_10 ?? false, flag_delinked: deal.flag_delinked ?? false });
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [agents, setAgents]     = useState<string[]>([]);

  useEffect(() => {
    api.getCrmProviders().then(setProviders).catch(() => {});
    api.getCrmAgents().then(setAgents).catch(() => {});
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const toggleFlag = (key: string) => setFlags(f => ({ ...f, [key]: !(f as any)[key] }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
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
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Provider (REP)</label>
              <select className={inputCls} value={form.provider} onChange={e => set("provider", e.target.value)}>
                <option value="">Select provider…</option>
                {providers.map(p => <option key={p} value={p}>{p}</option>)}
                {form.provider && !providers.includes(form.provider) && (
                  <option value={form.provider}>{form.provider}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Service Address</label>
              <input className={inputCls} value={form.service_address} onChange={e => set("service_address", e.target.value)} />
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
              <input type="number" step="0.0001" className={inputCls} value={form.energy_rate} onChange={e => set("energy_rate", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Adder ($/kWh)</label>
              <input type="number" step="0.0001" className={inputCls} value={form.adder} onChange={e => set("adder", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Contract Term</label>
              <input className={inputCls} placeholder="e.g. 36" value={form.contract_term} onChange={e => set("contract_term", e.target.value)} />
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Signed Date</label>
              <input type="date" className={inputCls} value={form.contract_signed_date} onChange={e => set("contract_signed_date", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Sales Agent</label>
              <select className={inputCls} value={form.sales_agent} onChange={e => set("sales_agent", e.target.value)}>
                <option value="">Select agent…</option>
                {agents.map(a => <option key={a} value={a}>{a}</option>)}
                {form.sales_agent && !agents.includes(form.sales_agent) && (
                  <option value={form.sales_agent}>{form.sales_agent}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
              <select className={inputCls} value={form.deal_status} onChange={e => set("deal_status", e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="RENEWED">Renewed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">ANXH</label>
            <input className={inputCls} value={form.anxh} onChange={e => set("anxh", e.target.value)} />
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

const EMPTY_DEAL = {
  deal_name: "", provider: "", esiid: "", service_address: "",
  meter_type: "Residential", deal_type: "", energy_rate: "", adder: "",
  contract_term: "", contract_start_date: "", contract_end_date: "",
  sales_agent: "", deal_status: "ACTIVE",
};

function AddDealModal({ customerId, onClose, onSaved }: { customerId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(EMPTY_DEAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const [agents, setAgents] = useState<string[]>([]);

  useEffect(() => {
    api.getCrmProviders().then(setProviders).catch(() => {});
    api.getCrmAgents().then(setAgents).catch(() => {});
  }, []);

  const set = (k: keyof typeof EMPTY_DEAL, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createCrmDeal(customerId, form);
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
          <h2 className="text-base font-bold text-[#0F1D5E]">Add New Deal</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Deal Name</label>
              <input className={inputCls} placeholder="e.g. Main Meter" value={form.deal_name} onChange={e => set("deal_name", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Provider (REP)</label>
              <select className={inputCls} value={form.provider} onChange={e => set("provider", e.target.value)}>
                <option value="">Select provider…</option>
                {providers.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">ESIID</label>
              <input className={inputCls} placeholder="17-digit ESIID" value={form.esiid} onChange={e => set("esiid", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Service Address</label>
              <input className={inputCls} placeholder="123 Main St, Houston TX" value={form.service_address} onChange={e => set("service_address", e.target.value)} />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Sales Agent</label>
              <select className={inputCls} value={form.sales_agent} onChange={e => set("sales_agent", e.target.value)}>
                <option value="">Select agent…</option>
                {agents.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
              <select className={inputCls} value={form.deal_status} onChange={e => set("deal_status", e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-50">
              {saving ? "Saving..." : "Add Deal"}
            </button>
          </div>
        </form>
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

  useEffect(() => {
    loadCustomer()
      .catch(e => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
    loadNotes();
    loadTasks();
  }, [id, loadCustomer, loadNotes, loadTasks]);

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

      <div className="grid grid-cols-4 gap-5">
        {/* Left column */}
        <div className="col-span-1 space-y-4">
          {/* Customer info card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#EEF1FA] flex items-center justify-center">
                  <User className="w-5 h-5 text-[#0F1D5E]" />
                </div>
                {editing ? (
                  <input
                    className="text-base font-bold text-[#0F1D5E] border-b-2 border-[#0F1D5E]/30 focus:border-[#0F1D5E] outline-none bg-transparent w-full"
                    value={editForm.full_name}
                    onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                  />
                ) : (
                  <h2 className="text-base font-bold text-[#0F1D5E]">{customer.full_name}</h2>
                )}
              </div>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-[#0F1D5E] transition-colors" title="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={saveEdit} disabled={saving} className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={cancelEdit} className="text-slate-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm">
              {/* Email */}
              <div className="flex items-start gap-3 text-slate-600">
                <IconBox icon={Mail} />
                {editing ? (
                  <input
                    className="border-b border-slate-300 focus:border-[#0F1D5E] outline-none bg-transparent text-sm flex-1 pt-1"
                    value={editForm.email}
                    placeholder="Email address"
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  />
                ) : (
                  <span className="break-all pt-2">{customer.email || "—"}</span>
                )}
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 text-slate-600">
                <IconBox icon={Phone} />
                {editing ? (
                  <input
                    className="border-b border-slate-300 focus:border-[#0F1D5E] outline-none bg-transparent text-sm flex-1"
                    value={editForm.phone}
                    placeholder="Phone number"
                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  />
                ) : (
                  <span>{customer.phone || "—"}</span>
                )}
              </div>

              {/* DOB */}
              <div className="flex items-center gap-3 text-slate-600">
                <IconBox icon={Calendar} />
                {editing ? (
                  <input
                    type="date"
                    className="border-b border-slate-300 focus:border-[#0F1D5E] outline-none bg-transparent text-sm flex-1"
                    value={editForm.dob}
                    onChange={e => setEditForm(f => ({ ...f, dob: e.target.value }))}
                  />
                ) : (
                  <span>{customer.dob ? `DOB: ${customer.dob}` : "—"}</span>
                )}
              </div>

              {/* Address */}
              <div className="flex items-start gap-3 text-slate-600">
                <IconBox icon={MapPin} />
                {editing ? (
                  <div className="flex-1 space-y-1.5">
                    <input
                      className="w-full border-b border-slate-300 focus:border-[#0F1D5E] outline-none bg-transparent text-sm"
                      value={editForm.mailing_address}
                      placeholder="Street address"
                      onChange={e => setEditForm(f => ({ ...f, mailing_address: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border-b border-slate-300 focus:border-[#0F1D5E] outline-none bg-transparent text-sm"
                        value={editForm.city}
                        placeholder="City"
                        onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                      />
                      <input
                        className="w-14 border-b border-slate-300 focus:border-[#0F1D5E] outline-none bg-transparent text-sm"
                        value={editForm.state}
                        placeholder="TX"
                        onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))}
                      />
                      <input
                        className="w-20 border-b border-slate-300 focus:border-[#0F1D5E] outline-none bg-transparent text-sm"
                        value={editForm.postal_code}
                        placeholder="ZIP"
                        onChange={e => setEditForm(f => ({ ...f, postal_code: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    {customer.mailing_address
                      ? <><div>{customer.mailing_address}</div>{customer.city && <div>{customer.city}, {customer.state} {customer.postal_code}</div>}</>
                      : <span className="text-slate-400">—</span>
                    }
                  </div>
                )}
              </div>

              {/* ANXH — editable for non-CSR, masked for CSR */}
              <div className="flex items-start gap-3 text-slate-600">
                <IconBox icon={Hash} />
                <div className="pt-2 flex-1">
                  <span className="text-slate-400 text-xs block mb-1">
                    ANXH {isCsr && <span className="text-slate-300">(last 4 only)</span>}
                  </span>
                  {editing && !isCsr ? (
                    <input
                      className="border-b border-slate-300 focus:border-[#0F1D5E] outline-none bg-transparent text-sm w-full font-mono"
                      value={editForm.anxh}
                      placeholder="Account number"
                      onChange={e => setEditForm(f => ({ ...f, anxh: e.target.value }))}
                    />
                  ) : anxhValues.length > 0 ? (
                    anxhValues.map((a: any) => (
                      <span key={a} className="block font-mono text-xs tracking-wider">{maskAnxh(String(a))}</span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="pt-2 border-t border-slate-100">
                {editing ? (
                  <textarea
                    className="w-full text-xs text-slate-500 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#0F1D5E]/40 resize-none"
                    rows={3}
                    placeholder="Notes..."
                    value={editForm.notes}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  />
                ) : customer.notes ? (
                  <p className="text-xs text-slate-400">{customer.notes}</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Deal count card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{active.length}</p>
                <p className="text-xs text-slate-500 mt-1">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-500">{renewed.length}</p>
                <p className="text-xs text-slate-500 mt-1">Renewed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-400">{inactive.length}</p>
                <p className="text-xs text-slate-500 mt-1">Inactive</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-3 space-y-5">

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

          {/* Deals */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0F1D5E]">All Deals</h3>
                <p className="text-xs text-slate-400 mt-0.5">{deals.length} deal{deals.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setShowAddDeal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#0F1D5E] rounded-xl hover:bg-[#0F1D5E]/90 transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> Add Deal
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

        </div>
      </div>
    </div>
  );
}
