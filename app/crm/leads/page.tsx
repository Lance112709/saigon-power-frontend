"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Search, UserPlus, ChevronRight, X, AlertCircle, Trash2 } from "lucide-react";

const inputCls =
  "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 placeholder:text-slate-400";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1";

function FormInput({
  label, required, error, type = "text", value, onChange, placeholder,
}: {
  label: string; required?: boolean; error?: string; type?: string;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
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

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
}

function PhoneInput({ label, required, error, value, onChange }: {
  label: string; required?: boolean; error?: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type="tel"
        className={`${inputCls} ${error ? "border-red-400 ring-1 ring-red-400/30" : ""}`}
        placeholder="000-000-0000"
        value={value}
        onChange={e => onChange(formatPhone(e.target.value))}
        maxLength={12}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function LeadBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
      status === "converted" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
    }`}>
      {status === "converted" ? "Converted" : "Lead"}
    </span>
  );
}

const EMPTY_LEAD = {
  first_name: "", last_name: "", business_name: "", address: "", city: "",
  state: "TX", zip: "", phone: "", phone2: "", email: "", email2: "",
  sales_agent: "", referral_by: "", source: "",
};

const US_STATES = [
  "TX","AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","UT","VT",
  "VA","WA","WV","WI","WY",
];

function ReferralSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setQuery(value); }, [value]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const data = await api.getLeadCustomers({ search: q, limit: "8" });
      setResults(data);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    search(v);
  };

  const select = (c: any) => {
    const label = c.sgp_customer_id ? `${c.full_name} (${c.sgp_customer_id})` : c.full_name;
    setQuery(label);
    onChange(label);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={ref} className="relative">
      <input
        className={inputCls}
        placeholder="Type customer name to search..."
        value={query}
        onChange={handleInput}
        onFocus={() => query.trim() && results.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {loading && <div className="px-4 py-3 text-xs text-slate-400">Searching...</div>}
          {!loading && results.length === 0 && <div className="px-4 py-3 text-xs text-slate-400">No customers found</div>}
          {!loading && results.map(c => (
            <button key={c.lead_id} type="button" onMouseDown={() => select(c)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#EEF1FA] transition-colors text-left">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0F1D5E] truncate">{c.full_name}</p>
                {c.sgp_customer_id && <p className="text-xs text-slate-400">{c.sgp_customer_id}</p>}
              </div>
              {c.active_deal_count > 0 && (
                <span className="shrink-0 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  {c.active_deal_count} active
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddLeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: (lead: any) => void }) {
  const [form, setForm] = useState(EMPTY_LEAD);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    api.getSalesAgents().then(setAgents).catch(() => {});
  }, []);

  const set = (k: keyof typeof EMPTY_LEAD, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const required: (keyof typeof EMPTY_LEAD)[] = ["first_name", "last_name", "address", "city", "state", "zip", "phone", "email", "sales_agent"];
    for (const f of required) if (!form[f].trim()) e[f] = "Required";
    if (form.phone && !/^[\d\s\-\(\)\+\.]{10,}$/.test(form.phone)) e.phone = "Invalid format";
    if (form.phone2 && !/^[\d\s\-\(\)\+\.]{10,}$/.test(form.phone2)) e.phone2 = "Invalid format";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    setApiError("");
    try {
      const lead = await api.createLead(form);
      onSaved(lead);
    } catch (err: any) {
      const raw = err?.message || "Failed to save lead";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      try { setApiError(JSON.parse(body)?.detail ?? body); } catch { setApiError(body); }
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-[#0F1D5E]">Add New Lead</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {apiError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormInput label="First Name" required placeholder="John"
              value={form.first_name} onChange={v => set("first_name", v)} error={errors.first_name} />
            <FormInput label="Last Name" required placeholder="Doe"
              value={form.last_name} onChange={v => set("last_name", v)} error={errors.last_name} />
          </div>

          <FormInput label="Business Name" placeholder="Acme Corp (optional)"
            value={form.business_name} onChange={v => set("business_name", v)} />

          <FormInput label="Address" required placeholder="123 Main St"
            value={form.address} onChange={v => set("address", v)} error={errors.address} />

          <div className="grid grid-cols-3 gap-4">
            <FormInput label="City" required placeholder="Houston"
              value={form.city} onChange={v => set("city", v)} error={errors.city} />
            <div>
              <label className={labelCls}>State <span className="text-red-500">*</span></label>
              <select className={inputCls} value={form.state} onChange={e => set("state", e.target.value)}>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <FormInput label="ZIP Code" required placeholder="77001"
              value={form.zip} onChange={v => set("zip", v)} error={errors.zip} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <PhoneInput label="Phone" required
              value={form.phone} onChange={v => set("phone", v)} error={errors.phone} />
            <PhoneInput label="Phone 2"
              value={form.phone2} onChange={v => set("phone2", v)} error={errors.phone2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Email" required placeholder="john@email.com" type="email"
              value={form.email} onChange={v => set("email", v)} error={errors.email} />
            <FormInput label="Email 2" placeholder="alt@email.com" type="email"
              value={form.email2} onChange={v => set("email2", v)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Sales Agent <span className="text-red-500">*</span></label>
              <select
                className={`${inputCls} ${errors.sales_agent ? "border-red-400 ring-1 ring-red-400/30" : ""}`}
                value={form.sales_agent}
                onChange={e => set("sales_agent", e.target.value)}
              >
                <option value="">— Select agent —</option>
                {agents.map((a: any) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
              {errors.sales_agent && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>
            <div>
              <label className={labelCls}>Referral By</label>
              <ReferralSearch value={form.referral_by} onChange={v => set("referral_by", v)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Source</label>
            <select
              className={inputCls}
              value={form.source}
              onChange={e => set("source", e.target.value)}
            >
              <option value="">— Select source —</option>
              <option value="Customer Referral">Customer Referral</option>
              <option value="Social Media">Social Media</option>
              <option value="website">Website</option>
              <option value="manual">Manual / Walk-in</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Add Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canDelete = user?.role === "admin" || user?.role === "manager";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      setLeads(await api.getLeads(params));
    } catch {}
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Mark leads as seen when this page is visited
  useEffect(() => {
    if (!user) return;
    const key = `leads_last_seen_${user.id || user.name}`;
    localStorage.setItem(key, new Date().toISOString());
  }, [user]);

  const handleLeadSaved = (lead: any) => {
    setShowAdd(false);
    setLeads(prev => [{
      ...lead,
      full_name: `${lead.first_name} ${lead.last_name}`,
      deal_count: 0,
      active_deal_count: 0,
    }, ...prev]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead and all their deals? This cannot be undone.")) return;
    try {
      await api.deleteLead(id);
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch {}
  };

  const selectCls = "border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onSaved={handleLeadSaved} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E]">Leads</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage your sales pipeline</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F1D5E] text-white text-sm font-semibold rounded-xl hover:bg-[#0F1D5E]/90 transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, phone, address..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 bg-white"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="">All Statuses</option>
            <option value="lead">Lead</option>
            <option value="converted">Converted</option>
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No leads found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Full Name", "Phone", "Address", "City", "Deals", "Status", "Created", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer"
                  onClick={() => router.push(`/crm/leads/${l.id}`)}>
                  <td className="px-5 py-3.5 font-semibold text-[#0F1D5E]">{l.full_name}</td>
                  <td className="px-5 py-3.5 text-slate-500">{l.phone}</td>
                  <td className="px-5 py-3.5 text-slate-500 max-w-[180px] truncate">{l.address}</td>
                  <td className="px-5 py-3.5 text-slate-500">{l.city}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-emerald-600">{l.active_deal_count}</span>
                    <span className="text-slate-400"> / {l.deal_count}</span>
                  </td>
                  <td className="px-5 py-3.5"><LeadBadge status={l.status} /></td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                    {l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    {canDelete ? (
                      <button onClick={e => { e.stopPropagation(); handleDelete(l.id); }}
                        className="text-slate-300 hover:text-red-500 transition-colors" title="Delete lead">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && (
          <div className="px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Showing {leads.length} leads</p>
          </div>
        )}
      </div>
    </div>
  );
}
