"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  FileSignature, ChevronRight, Send, Loader2, Plug, CheckCircle, XCircle,
  RefreshCw, Eye, Search,
} from "lucide-react";

const STATUS_META: Record<string, { label: string; badge: string }> = {
  submitted:        { label: "New",              badge: "bg-blue-100 text-blue-700" },
  needs_review:     { label: "Needs Review",     badge: "bg-amber-100 text-amber-700" },
  sent_to_provider: { label: "Sent to Provider", badge: "bg-violet-100 text-violet-700" },
  accepted:         { label: "Accepted",         badge: "bg-emerald-100 text-emerald-700" },
  active:           { label: "Active 🎉",        badge: "bg-emerald-100 text-emerald-800" },
  rejected:         { label: "Rejected",         badge: "bg-red-100 text-red-700" },
  cancelled:        { label: "Cancelled",        badge: "bg-slate-100 text-slate-500" },
};
const STATUSES = Object.keys(STATUS_META);

const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1";

function fmtDT(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── Integration editor ─────────────────────────────────────────────────────────
function IntegrationEditor({ integrations, reload }: { integrations: any[]; reload: () => void }) {
  const [provider, setProvider] = useState("");
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [msg, setMsg] = useState("");

  const openProvider = (name: string) => {
    setProvider(name);
    setPreview(null);
    setMsg("");
    const ex = integrations.find(i => i.provider_name === name);
    setForm({
      integration_type: ex?.integration_type ?? "manual",
      endpoint_url: ex?.endpoint_url ?? "",
      http_method: ex?.http_method ?? "POST",
      auth_type: ex?.auth_type ?? "none",
      auth_credentials: JSON.stringify(ex?.auth_credentials ?? {}, null, 2),
      extra_headers: JSON.stringify(ex?.extra_headers ?? {}, null, 2),
      field_mapping: JSON.stringify(
        ex?.field_mapping && Object.keys(ex.field_mapping).length ? ex.field_mapping : {
          first_name: "{{first_name}}", last_name: "{{last_name}}",
          phone: "{{phone}}", email: "{{email}}",
          esiid: "{{esiid}}", service_address: "{{service_address}}",
          city: "{{service_city}}", zip: "{{service_zip}}",
          plan: "{{plan_name}}", term_months: "{{term_months}}",
          requested_start: "{{requested_start_date}}",
          broker_id: "BR200202",
        }, null, 2),
      is_active: ex?.is_active ?? false,
      test_mode: ex?.test_mode ?? true,
    });
  };

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const payload = {
        ...form,
        auth_credentials: JSON.parse(form.auth_credentials || "{}"),
        extra_headers: JSON.parse(form.extra_headers || "{}"),
        field_mapping: JSON.parse(form.field_mapping || "{}"),
      };
      await api.saveEnrollmentIntegration(provider, payload);
      setMsg("Saved ✓");
      reload();
    } catch (e: any) {
      setMsg(`Error: ${e.message?.includes("JSON") ? "one of the JSON boxes is invalid" : e.message}`);
    }
    setSaving(false);
  };

  const doPreview = async () => {
    try {
      const p = await api.previewEnrollmentIntegration(provider);
      setPreview(p);
    } catch (e: any) {
      setMsg(e.message || "Preview failed — save first.");
    }
  };

  const PROVIDERS = ["Budget Power", "Discount Power", "NRG", "Iron Horse", "Chariot", "CleanSky Energy", "Heritage Power"];

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1.5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Providers</p>
        {PROVIDERS.map(p => {
          const ex = integrations.find(i => i.provider_name === p);
          const live = ex?.integration_type === "rest" && ex?.is_active && !ex?.test_mode;
          return (
            <button key={p} onClick={() => openProvider(p)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-left ${
                provider === p ? "bg-[#EEF1FA] text-[#0F1D5E]" : "hover:bg-slate-50 text-slate-600"
              }`}>
              {p}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                live ? "bg-emerald-100 text-emerald-700"
                  : ex?.integration_type === "rest" ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-400"
              }`}>
                {live ? "LIVE API" : ex?.integration_type === "rest" ? "TEST" : "MANUAL"}
              </span>
            </button>
          );
        })}
        <p className="text-[11px] text-slate-400 pt-2 leading-relaxed">
          <b>Manual</b>: enrollments queue and you key them into the provider portal.<br />
          <b>API</b>: paste the provider's endpoint + credentials and enrollments submit themselves.
        </p>
      </div>

      {form && (
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#0F1D5E] flex items-center gap-2"><Plug className="w-4 h-4" /> {provider}</h3>
            {msg && <span className={`text-xs font-semibold ${msg.startsWith("Saved") ? "text-emerald-600" : "text-red-600"}`}>{msg}</span>}
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Mode</label>
              <select className={inputCls} value={form.integration_type} onChange={e => setForm((f: any) => ({ ...f, integration_type: e.target.value }))}>
                <option value="manual">Manual (I submit in their portal)</option>
                <option value="rest">API (auto-submit)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Provider enrollment API URL</label>
              <input className={inputCls} placeholder="https://api.provider.com/v1/enrollments" value={form.endpoint_url}
                onChange={e => setForm((f: any) => ({ ...f, endpoint_url: e.target.value }))} />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Auth</label>
              <select className={inputCls} value={form.auth_type} onChange={e => setForm((f: any) => ({ ...f, auth_type: e.target.value }))}>
                <option value="none">None</option>
                <option value="bearer">Bearer token</option>
                <option value="basic">Basic (user/pass)</option>
                <option value="api_key_header">API key header</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Credentials JSON
                <span className="font-normal text-slate-400"> — bearer: {"{\"token\":…}"} · basic: {"{\"username\":…,\"password\":…}"} · key: {"{\"header_name\":…,\"api_key\":…}"}</span>
              </label>
              <textarea rows={2} className={`${inputCls} font-mono text-xs`} value={form.auth_credentials}
                onChange={e => setForm((f: any) => ({ ...f, auth_credentials: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={labelCls}>
              Payload template <span className="font-normal text-slate-400">— shape it exactly how the provider wants; {"{{placeholders}}"} fill from the enrollment
              ({"first_name, last_name, phone, email, esiid, service_address, service_city, service_state, service_zip, plan_name, rate, term_months, requested_start_date, enrollment_type, id"})</span>
            </label>
            <textarea rows={8} className={`${inputCls} font-mono text-xs`} value={form.field_mapping}
              onChange={e => setForm((f: any) => ({ ...f, field_mapping: e.target.value }))} />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm((f: any) => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              Active (dispatch on new enrollments)
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form.test_mode} onChange={e => setForm((f: any) => ({ ...f, test_mode: e.target.checked }))} className="rounded" />
              Test mode (render but don't send)
            </label>
            <div className="ml-auto flex gap-2">
              <button onClick={doPreview} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <Eye className="w-4 h-4" /> Preview request
              </button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-bold hover:bg-[#0F1D5E]/90 disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          {preview && (
            <pre className="bg-slate-900 text-emerald-300 rounded-xl p-4 text-[11px] overflow-auto max-h-64">
{JSON.stringify(preview.request, null, 2)}
            </pre>
          )}
        </div>
      )}
      {!form && (
        <div className="lg:col-span-2 bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Pick a provider to configure its enrollment API.
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function EnrollmentsAdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"queue" | "integrations">("queue");
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (search) params.search = search;
      const d = await api.listEnrollments(params);
      setRows(d.enrollments ?? []);
      setCounts(d.counts ?? {});
    } catch {}
    setLoading(false);
  }, [status, search]);

  const loadIntegrations = useCallback(() => {
    api.listEnrollmentIntegrations().then(setIntegrations).catch(() => {});
  }, []);

  useEffect(() => { load(); loadIntegrations(); }, [load, loadIntegrations]);

  const act = async (id: string, fn: () => Promise<any>) => {
    setBusy(id);
    try { await fn(); await load(); } catch (e: any) { alert(e.message || "Failed"); }
    setBusy(null);
  };

  if (!user || !["admin", "manager"].includes(user.role)) return null;

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E] flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-emerald-500" /> Enrollments
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Customer signups from saigonpower.com/enroll — auto-submitted when a provider API is live, queued for you otherwise.
          </p>
        </div>
        <div className="flex rounded-xl bg-white border border-slate-200 p-1">
          {(["queue", "integrations"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${tab === t ? "bg-[#0F1D5E] text-white" : "text-slate-500"}`}>
              {t === "queue" ? `Queue (${counts.submitted ?? 0} new)` : "Provider APIs"}
            </button>
          ))}
        </div>
      </div>

      {tab === "integrations" ? (
        <IntegrationEditor integrations={integrations} reload={loadIntegrations} />
      ) : (
        <>
          {/* status chips */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setStatus("")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${!status ? "bg-[#0F1D5E] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
              All ({Object.values(counts).reduce((a: number, b) => a + Number(b || 0), 0)})
            </button>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${status === s ? "bg-[#0F1D5E] text-white" : `${STATUS_META[s].badge} opacity-80`}`}>
                {STATUS_META[s].label} ({counts[s] ?? 0})
              </button>
            ))}
            <div className="relative ml-auto">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white w-44" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <p className="p-8 text-center text-slate-400 text-sm">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="p-10 text-center text-slate-400 text-sm">No enrollments{status ? " with this status" : " yet — share saigonpower.com/enroll!"}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map(r => (
                  <div key={r.id}>
                    <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50">
                      <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform shrink-0 ${expanded === r.id ? "rotate-90" : ""}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800">{r.first_name} {r.last_name}
                          <span className="text-slate-400 font-normal text-xs ml-2">{r.phone}</span></p>
                        <p className="text-xs text-slate-400 truncate">{r.service_address}, {r.service_city} · {r.plan_name || "no plan"} · {r.provider || "—"}</p>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0 hidden sm:block">{fmtDT(r.created_at)}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${STATUS_META[r.status]?.badge ?? "bg-slate-100"}`}>
                        {STATUS_META[r.status]?.label ?? r.status}
                      </span>
                    </button>
                    {expanded === r.id && (
                      <div className="px-12 pb-4 space-y-3 bg-[#F8FAFF]">
                        <div className="grid sm:grid-cols-3 gap-3 text-xs pt-3">
                          <p><span className="text-slate-400">ESI ID:</span> <span className="font-mono">{r.esiid || "— (backfills from statements)"}</span></p>
                          <p><span className="text-slate-400">Type:</span> {r.enrollment_type} {r.requested_start_date ? `· starts ${r.requested_start_date}` : ""}</p>
                          <p><span className="text-slate-400">Rate:</span> {r.rate ?? "—"}¢ · {r.term_months ?? "—"} mo</p>
                          <p><span className="text-slate-400">Email:</span> {r.email || "—"}</p>
                          <p><span className="text-slate-400">Confirmation:</span> {r.provider_confirmation || "—"}</p>
                          <p><span className="text-slate-400">Ref:</span> SGP-{r.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                        {(r.submission_log ?? []).length > 0 && (
                          <div className="text-[11px] bg-white rounded-xl border border-slate-100 p-3 space-y-1 max-h-36 overflow-y-auto">
                            {[...r.submission_log].reverse().map((l: any, i: number) => (
                              <p key={i} className={l.success ? "text-emerald-600" : "text-slate-500"}>
                                {l.success ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1 text-slate-300" />}
                                {fmtDT(l.at)} — {l.message}
                              </p>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => act(r.id, () => api.dispatchEnrollment(r.id, true))} disabled={busy === r.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0F1D5E] text-white text-xs font-bold disabled:opacity-50">
                            {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send to provider
                          </button>
                          {["sent_to_provider", "accepted", "active", "rejected", "needs_review", "cancelled"].map(s => (
                            r.status !== s && (
                              <button key={s} onClick={() => act(r.id, () => api.updateEnrollment(r.id, { status: s }))}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-white ${STATUS_META[s].badge}`}>
                                Mark {STATUS_META[s].label}
                              </button>
                            )
                          ))}
                          {r.lead_id && (
                            <a href={`/crm/leads/${r.lead_id}`} className="px-3 py-2 rounded-lg text-xs font-semibold text-blue-600 hover:underline">
                              Open lead →
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </>
      )}
    </div>
  );
}
