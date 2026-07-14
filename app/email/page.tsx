"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Mail, Plus, Pencil, Trash2, X, RefreshCw } from "lucide-react";

const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20";

function TemplateModal({ template, onClose, onSaved }: { template?: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(template?.name || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [desc, setDesc] = useState(template?.description || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim() || !subject.trim() || !body.trim()) { setError("Name, subject, and message are required."); return; }
    setSaving(true); setError("");
    try {
      if (template?.id) {
        await api.updateEmailTemplate(template.id, { name: name.trim(), subject: subject.trim(), body: body.trim(), description: desc.trim() || null });
      } else {
        await api.createEmailTemplate({ name: name.trim(), subject: subject.trim(), body: body.trim(), description: desc.trim() || null, is_active: true });
      }
      onSaved();
    } catch (e: any) {
      setError("Failed to save template.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-[#0F1D5E]">{template ? "Edit Email Template" : "New Email Template"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className="block text-xs font-medium text-slate-500 mb-1">Template name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Welcome / Rate follow-up" className={inputCls} /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Your Saigon Power update" className={inputCls} /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={7} placeholder={"Hi {{first_name}},\n\n…"} className={inputCls + " font-mono"} />
            <p className="text-[11px] text-slate-400 mt-1">Personalization tags — replaced with each customer's real details when sent:{" "}
              {["first_name", "last_name", "service_address", "city", "state", "zip", "esi_id", "phone", "email", "contract_start_date", "contract_end_date"].map((t, i) => (
                <span key={t}>{i > 0 ? " " : ""}<code className="bg-slate-100 px-1 rounded">{`{{${t}}}`}</code></span>
              ))}
            </p></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">Description (optional)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} className={inputCls} /></div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

export default function EmailAdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<"templates" | "logs">("templates");
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const reloadTemplates = async () => { setTemplates(await api.getEmailTemplates().catch(() => [])); };
  const reloadLogs = async () => { setLogs(await api.getEmailLogs({ limit: "100" }).catch(() => [])); };

  useEffect(() => {
    Promise.all([reloadTemplates(), reloadLogs()]).finally(() => setLoading(false));
  }, []);

  async function del(id: string) {
    await api.deleteEmailTemplate(id).catch(() => {});
    await reloadTemplates();
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-[#0F1D5E] via-[#1a2d7a] to-[#2a3f96] p-6 text-white flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center"><Mail className="w-6 h-6" /></div>
        <div><h1 className="text-xl font-bold">Customer Email</h1>
          <p className="text-sm text-blue-200/80 mt-0.5">Branded templates and a full send history. Compose from any customer or lead page.</p></div>
      </div>

      <div className="flex items-center gap-2">
        {(["templates", "logs"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize ${tab === t ? "bg-[#0F1D5E] text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{t}</button>
        ))}
        {tab === "templates" && isAdmin && (
          <button onClick={() => setCreating(true)} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> New Template
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-400 text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : tab === "templates" ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {templates.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No templates yet. {isAdmin ? "Create one to reuse across the team." : ""}</div>
          ) : templates.map(t => (
            <div key={t.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">{t.name}</span>
                  {!t.is_active && <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">inactive</span>}
                </div>
                <p className="text-sm text-slate-500 mt-0.5"><span className="text-slate-400">Subject:</span> {t.subject}</p>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 whitespace-pre-wrap">{t.body}</p>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditing(t)} className="p-2 text-slate-400 hover:text-[#0F1D5E]"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => del(t.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No emails sent yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["When", "To", "Subject", "Status"].map(h => <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>)}
              </tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                    <td className="px-4 py-2.5 text-slate-600">{l.to_email}</td>
                    <td className="px-4 py-2.5 text-slate-700">{l.subject}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${l.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`} title={l.error || ""}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {(creating || editing) && (
        <TemplateModal template={editing || undefined}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); reloadTemplates(); }} />
      )}
    </div>
  );
}
