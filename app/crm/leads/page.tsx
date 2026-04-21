"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Search, UserPlus, ChevronRight, X, AlertCircle } from "lucide-react";

// ── Design tokens ──────────────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 placeholder:text-slate-400";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1";

// ── Module-level form field (NOT inside any component — prevents remount) ──────
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

// ── Badges ─────────────────────────────────────────────────────────────────────
function LeadBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
      status === "converted" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
    }`}>
      {status === "converted" ? "Converted" : "Lead"}
    </span>
  );
}

// ── Add Lead Modal ─────────────────────────────────────────────────────────────
const EMPTY_LEAD = {
  first_name: "", last_name: "", address: "", city: "",
  state: "TX", zip: "", phone: "", email: "",
};

const US_STATES = [
  "TX","AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","UT","VT",
  "VA","WA","WV","WI","WY",
];

function AddLeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: (lead: any) => void }) {
  const [form, setForm] = useState(EMPTY_LEAD);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof EMPTY_LEAD, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const required: (keyof typeof EMPTY_LEAD)[] = ["first_name", "last_name", "address", "city", "state", "zip", "phone"];
    for (const f of required) if (!form[f].trim()) e[f] = "Required";
    if (form.phone && !/^[\d\s\-\(\)\+\.]{10,}$/.test(form.phone)) e.phone = "Invalid format";
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

          <FormInput label="Address" required placeholder="123 Main St"
            value={form.address} onChange={v => set("address", v)} error={errors.address} />

          <div className="grid grid-cols-3 gap-4">
            <FormInput label="City" required placeholder="Houston"
              value={form.city} onChange={v => set("city", v)} error={errors.city} />

            <div>
              <label className={labelCls}>State <span className="text-red-500">*</span></label>
              <select
                className={inputCls}
                value={form.state}
                onChange={e => set("state", e.target.value)}
              >
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <FormInput label="ZIP Code" required placeholder="77001"
              value={form.zip} onChange={v => set("zip", v)} error={errors.zip} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Phone" required placeholder="(555) 555-5555" type="tel"
              value={form.phone} onChange={v => set("phone", v)} error={errors.phone} />
            <FormInput label="Email" placeholder="john@email.com" type="email"
              value={form.email} onChange={v => set("email", v)} />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Leads Table ────────────────────────────────────────────────────────────────
function LeadsTable({ leads, onRowClick }: { leads: any[]; onRowClick: (id: string) => void }) {
  if (leads.length === 0) {
    return <div className="p-12 text-center text-slate-400 text-sm">No leads found.</div>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100">
          {["Full Name", "Phone", "Address", "City", "Deals", "Status", "Created", "action"].map(h => (
            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h === "action" ? "" : h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {leads.map(l => (
          <tr
            key={l.id}
            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer"
            onClick={() => onRowClick(l.id)}
          >
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
            <td className="px-5 py-3.5 text-slate-300"><ChevronRight className="w-4 h-4" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Customers Table ────────────────────────────────────────────────────────────
function CustomersTable({ customers, onRowClick }: { customers: any[]; onRowClick: (id: string) => void }) {
  if (customers.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        No converted customers yet.<br />Add a deal with <strong>Active</strong> status to convert a lead.
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100">
          {["Customer", "Phone", "Address", "Active Deals", "Customer Since", "action"].map(h => (
            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h === "action" ? "" : h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {customers.map(c => (
          <tr
            key={c.id}
            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer"
            onClick={() => onRowClick(c.lead_id)}
          >
            <td className="px-5 py-3.5">
              <div className="font-semibold text-[#0F1D5E]">{c.full_name}</div>
              {c.email && <div className="text-xs text-slate-400 mt-0.5">{c.email}</div>}
            </td>
            <td className="px-5 py-3.5 text-slate-500">{c.phone || "—"}</td>
            <td className="px-5 py-3.5 text-slate-500 max-w-[200px] truncate">
              {c.address ? `${c.address}, ${c.city} ${c.state}` : "—"}
            </td>
            <td className="px-5 py-3.5">
              <span className="font-semibold text-emerald-600">{c.active_deal_count}</span>
              <span className="text-slate-400"> active</span>
            </td>
            <td className="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">
              {c.customer_since ? new Date(c.customer_since).toLocaleDateString() : "—"}
            </td>
            <td className="px-5 py-3.5 text-slate-300"><ChevronRight className="w-4 h-4" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"leads" | "customers">("leads");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
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

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      setCustomers(await api.getLeadCustomers(params));
    } catch {}
    setLoading(false);
  }, [search]);

  useEffect(() => {
    if (tab === "leads") loadLeads();
    else loadCustomers();
  }, [tab, loadLeads, loadCustomers]);

  const handleLeadSaved = (lead: any) => {
    setShowAdd(false);
    setLeads(prev => [{
      ...lead,
      full_name: `${lead.first_name} ${lead.last_name}`,
      deal_count: 0,
      active_deal_count: 0,
    }, ...prev]);
  };

  const selectCls = "border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 text-slate-700";

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onSaved={handleLeadSaved} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E]">Leads & Customers</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage your pipeline and track conversions</p>
        </div>
        {tab === "leads" && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0F1D5E] text-white text-sm font-semibold rounded-xl hover:bg-[#0F1D5E]/90 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Add Lead
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-slate-100 px-5 pt-4">
          {(["leads", "customers"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch(""); setStatusFilter(""); }}
              className={`px-4 pb-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t ? "border-[#0F1D5E] text-[#0F1D5E]" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {t === "leads" ? "All Leads" : "Converted Customers"}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={tab === "leads" ? "Search name, phone, address..." : "Search name or phone..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 bg-white"
            />
          </div>
          {tab === "leads" && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
              <option value="">All Statuses</option>
              <option value="lead">Lead</option>
              <option value="converted">Converted</option>
            </select>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading...</div>
        ) : tab === "leads" ? (
          <LeadsTable leads={leads} onRowClick={id => router.push(`/crm/leads/${id}`)} />
        ) : (
          <CustomersTable customers={customers} onRowClick={id => router.push(`/crm/leads/${id}`)} />
        )}

        {!loading && (
          <div className="px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Showing {tab === "leads" ? leads.length : customers.length} {tab === "leads" ? "leads" : "customers"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
