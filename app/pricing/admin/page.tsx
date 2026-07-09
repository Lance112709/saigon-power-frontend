"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Upload, CheckCircle2, X, Settings, History, AlertCircle, Plus, RefreshCw } from "lucide-react";

const fmtWhen = (s?: string | null) => s ? new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const fmtRate = (v: any) => v != null ? `$${Number(v).toFixed(5)}` : "—";
const badge = (status?: string) =>
  status === "published" ? "bg-emerald-100 text-emerald-700"
  : status === "draft" ? "bg-amber-100 text-amber-700"
  : "bg-slate-100 text-slate-500";

export default function PricingAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dash, setDash] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [wizard, setWizard] = useState<null | { step: number; provider: string; result?: any; error?: string; busy?: boolean }>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [savingMargin, setSavingMargin] = useState<string | null>(null);
  const [newProv, setNewProv] = useState({ code: "", name: "", margin: "0.003" });
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAll = useCallback(async () => {
    try {
      const [d, h, p] = await Promise.all([
        (api as any).getPricingDashboard(),
        (api as any).getPricingHistory(),
        (api as any).getPricingProviders(),
      ]);
      setDash(d); setHistory(h); setProviders(p);
    } catch {}
  }, []);
  useEffect(() => { if (user?.role === "admin") loadAll(); }, [user, loadAll]);

  if (user && user.role !== "admin") { router.push("/pricing"); return null; }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !wizard) return;
    setWizard(w => w && { ...w, step: 3, busy: true, error: undefined });
    try {
      const res = await (api as any).uploadPricingMatrix(wizard.provider, file);
      setWizard(w => w && { ...w, step: 4, busy: false, result: res });
    } catch (err: any) {
      const raw = err?.message || "Upload failed";
      const body = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
      let msg = body;
      try { msg = JSON.parse(body)?.detail ?? body; } catch {}
      setWizard(w => w && { ...w, step: 2, busy: false, error: msg });
    }
  };

  const publish = async (uploadId: string) => {
    setPublishing(uploadId);
    try {
      await (api as any).publishPricingUpload(uploadId);
      setWizard(null);
      await loadAll();
    } catch {}
    setPublishing(null);
  };

  const saveMargin = async (p: any, margin: string) => {
    setSavingMargin(p.id);
    try { await (api as any).updatePricingProvider(p.id, { margin: parseFloat(margin) }); await loadAll(); } catch {}
    setSavingMargin(null);
  };

  const addProvider = async () => {
    if (!newProv.code.trim() || !newProv.name.trim()) return;
    try {
      await (api as any).addPricingProvider({ code: newProv.code, name: newProv.name, margin: parseFloat(newProv.margin) || 0.003 });
      setNewProv({ code: "", name: "", margin: "0.003" });
      await loadAll();
    } catch {}
  };

  const nrg = dash.find(d => d.provider?.code === "NRG");

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/pricing")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0F1D5E]">
          <ArrowLeft className="w-4 h-4" /> Agent pricing view
        </button>
        <button onClick={() => setWizard({ step: 1, provider: "NRG" })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90">
          <Upload className="w-4 h-4" /> Upload Matrix
        </button>
      </div>

      {/* Today's status per provider */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Today's Pricing</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dash.filter(d => d.provider.has_parser || d.current || d.drafts.length).map(d => {
            const cur = d.current;
            return (
              <div key={d.provider.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#0F1D5E]">{d.provider.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge(cur ? "published" : d.drafts.length ? "draft" : undefined)}`}>
                      {cur ? "Published" : d.drafts.length ? "Draft pending" : "No pricing"}
                    </span>
                  </div>
                  {cur && <span className="text-xs text-slate-400">v{cur.version}</span>}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><p className="text-[11px] text-slate-400 uppercase">Last upload</p><p className="font-medium text-slate-700">{fmtWhen(cur?.created_at)}</p></div>
                  <div><p className="text-[11px] text-slate-400 uppercase">Uploaded by</p><p className="font-medium text-slate-700">{cur?.uploaded_by || "—"}</p></div>
                  <div><p className="text-[11px] text-slate-400 uppercase">Effective</p><p className="font-medium text-slate-700">{cur?.effective_date || "—"}</p></div>
                  <div><p className="text-[11px] text-slate-400 uppercase">Valid until</p><p className="font-medium text-slate-700">{fmtWhen(cur?.expiration_at)}</p></div>
                  <div><p className="text-[11px] text-slate-400 uppercase">Rows imported</p><p className="font-medium text-slate-700">{cur?.rows_imported?.toLocaleString() || "—"}</p></div>
                  <div><p className="text-[11px] text-slate-400 uppercase">Company margin</p><p className="font-medium text-slate-700">{cur ? `+$${Number(cur.margin_used).toFixed(3)}/kWh` : `+$${Number(d.provider.margin).toFixed(3)}/kWh`}</p></div>
                </div>
                {d.drafts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    {d.drafts.map((dr: any) => (
                      <div key={dr.id} className="flex items-center justify-between text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <span className="text-amber-700 font-medium">Draft v{dr.version} · {dr.rows_imported.toLocaleString()} rows · {fmtWhen(dr.created_at)}</span>
                        <div className="flex gap-2">
                          <button onClick={async () => {
                            const res = await (api as any).getPricingUploadPreview(dr.id);
                            setWizard({ step: 4, provider: d.provider.code, result: res });
                          }} className="font-semibold text-[#0F1D5E] hover:underline">Preview</button>
                          <button onClick={() => publish(dr.id)} disabled={publishing === dr.id}
                            className="font-semibold text-emerald-700 hover:underline disabled:opacity-50">
                            {publishing === dr.id ? "Publishing…" : "Publish"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <History className="w-4 h-4 text-[#0F1D5E]" />
          <h3 className="text-sm font-bold text-[#0F1D5E]">Pricing History</h3>
        </div>
        {history.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-400 text-sm">No uploads yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Version", "Provider", "Status", "Uploaded", "Uploaded By", "Published", "Rows", "Margin", "File"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((u: any) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-semibold text-slate-700">v{u.version}</td>
                    <td className="px-4 py-2.5 text-slate-600">{u.pricing_providers?.name}</td>
                    <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge(u.status)}`}>{u.status}</span></td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtWhen(u.created_at)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{u.uploaded_by || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtWhen(u.published_at)}</td>
                    <td className="px-4 py-2.5 text-slate-700">{u.rows_imported?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-slate-500">+${Number(u.margin_used).toFixed(3)}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs max-w-[200px] truncate" title={u.original_filename}>{u.original_filename}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provider settings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#0F1D5E]" />
          <h3 className="text-sm font-bold text-[#0F1D5E]">Providers & Margins</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {providers.map((p: any) => (
            <ProviderRow key={p.id} p={p} saving={savingMargin === p.id} onSave={saveMargin} />
          ))}
          <div className="px-5 py-4 flex flex-wrap items-center gap-3 bg-slate-50/50">
            <Plus className="w-4 h-4 text-slate-400" />
            <input className="px-3 py-2 border border-slate-200 rounded-xl text-sm w-36" placeholder="Code (e.g. TXU)"
              value={newProv.code} onChange={e => setNewProv(v => ({ ...v, code: e.target.value }))} />
            <input className="px-3 py-2 border border-slate-200 rounded-xl text-sm w-48" placeholder="Display name"
              value={newProv.name} onChange={e => setNewProv(v => ({ ...v, name: e.target.value }))} />
            <input className="px-3 py-2 border border-slate-200 rounded-xl text-sm w-28" type="number" step="0.001" min="0" max="0.05"
              value={newProv.margin} onChange={e => setNewProv(v => ({ ...v, margin: e.target.value }))} />
            <button onClick={addProvider} className="px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#0F1D5E]/90">
              Add Provider
            </button>
            <p className="text-xs text-slate-400">New providers need a parser before uploads work — margins apply automatically.</p>
          </div>
        </div>
      </div>

      {/* Upload wizard */}
      {wizard && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#0F1D5E]">
                Upload Pricing Matrix — step {Math.min(wizard.step, 4)} of 4
              </h2>
              <button onClick={() => setWizard(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {wizard.error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {wizard.error}
                </div>
              )}
              {wizard.step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Choose the provider this matrix came from:</p>
                  <div className="flex flex-wrap gap-2">
                    {providers.filter((p: any) => p.active).map((p: any) => (
                      <button key={p.id} disabled={!p.has_parser}
                        onClick={() => setWizard(w => w && { ...w, provider: p.code, step: 2 })}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-semibold ${
                          p.has_parser ? "border-[#0F1D5E]/30 text-[#0F1D5E] hover:bg-[#EEF1FA]" : "border-slate-200 text-slate-300 cursor-not-allowed"
                        }`}>
                        {p.name}{!p.has_parser && " (no parser yet)"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {wizard.step === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Upload the <span className="font-semibold">{wizard.provider}</span> daily matrix (.xlsx, .xls, .xlsm, or .csv).
                    The system finds the pricing table automatically.
                  </p>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.xlsm,.csv" className="hidden" onChange={handleFile} />
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 rounded-2xl py-10 text-sm text-slate-500 hover:border-[#0F1D5E]/40 hover:bg-[#EEF1FA]/40">
                    <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    Click to choose the pricing file
                  </button>
                </div>
              )}
              {wizard.step === 3 && (
                <div className="py-10 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Parsing spreadsheet, applying company margin…
                </div>
              )}
              {wizard.step === 4 && wizard.result && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-slate-50 rounded-xl p-3"><p className="text-[11px] text-slate-400 uppercase">Rows imported</p><p className="font-bold text-slate-800">{wizard.result.preview.rows_imported.toLocaleString()}</p></div>
                    <div className="bg-slate-50 rounded-xl p-3"><p className="text-[11px] text-slate-400 uppercase">Margin applied</p><p className="font-bold text-slate-800">+${Number(wizard.result.preview.margin).toFixed(3)}/kWh</p></div>
                    <div className="bg-slate-50 rounded-xl p-3"><p className="text-[11px] text-slate-400 uppercase">Valid until</p><p className="font-bold text-slate-800">{fmtWhen(wizard.result.upload.expiration_at)}</p></div>
                    <div className="bg-slate-50 rounded-xl p-3"><p className="text-[11px] text-slate-400 uppercase">Version</p><p className="font-bold text-slate-800">v{wizard.result.upload.version} (draft)</p></div>
                  </div>
                  {(wizard.result.preview.warnings || []).map((w: string, i: number) => (
                    <p key={i} className="text-xs text-slate-400">ℹ️ {w}</p>
                  ))}
                  <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[320px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr className="border-b border-slate-100">
                          {["Utility", "Zone", "Product", "Start", "Term", "Original Rate", "Margin", "Customer Rate"].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {wizard.result.preview.sample.map((r: any, i: number) => (
                          <tr key={i} className="border-b border-slate-50">
                            <td className="px-3 py-1.5 font-medium text-slate-700">{r.utility}</td>
                            <td className="px-3 py-1.5 text-slate-500">{r.zone}</td>
                            <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{r.product}</td>
                            <td className="px-3 py-1.5 text-slate-400">{r.start_month}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.term} mo</td>
                            <td className="px-3 py-1.5 text-slate-500">{fmtRate(r.rate)}</td>
                            <td className="px-3 py-1.5 text-slate-400">+${Number(wizard.result.preview.margin).toFixed(3)}</td>
                            <td className="px-3 py-1.5 font-bold text-emerald-600">{fmtRate(r.customer_rate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setWizard(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                      Keep as draft
                    </button>
                    <button onClick={() => publish(wizard.result.upload.id)} disabled={publishing === wizard.result.upload.id}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {publishing === wizard.result.upload.id ? "Publishing…" : "Publish to all agents"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderRow({ p, saving, onSave }: { p: any; saving: boolean; onSave: (p: any, m: string) => void }) {
  const [margin, setMargin] = useState(String(p.margin));
  return (
    <div className="px-5 py-3 flex flex-wrap items-center gap-4">
      <div className="w-40">
        <p className="text-sm font-semibold text-slate-700">{p.name}</p>
        <p className="text-[11px] text-slate-400">{p.code}{p.has_parser ? " · parser ready" : " · no parser yet"}</p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400 text-xs">Margin $/kWh</span>
        <input type="number" step="0.001" min="0" max="0.05" value={margin} onChange={e => setMargin(e.target.value)}
          className="w-28 px-3 py-1.5 border border-slate-200 rounded-lg text-sm" />
        {margin !== String(p.margin) && (
          <button onClick={() => onSave(p, margin)} disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-[#0F1D5E] text-white text-xs font-semibold disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
        {p.active ? "Active" : "Disabled"}
      </span>
    </div>
  );
}
