"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { MessageSquare, Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight, Clock, Send } from "lucide-react";

const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 placeholder:text-slate-400";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-600",
    queued: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

function TemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [trigger, setTrigger] = useState(template?.trigger_type || "");
  const [body, setBody] = useState(template?.message_body || "");
  const [desc, setDesc] = useState(template?.description || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!trigger.trim() || !body.trim()) { setError("Trigger type and message are required."); return; }
    setSaving(true);
    setError("");
    try {
      if (template?.id) {
        await api.updateSmsTemplate(template.id, { message_body: body.trim(), description: desc.trim() || null });
      } else {
        await api.createSmsTemplate({ trigger_type: trigger.trim(), message_body: body.trim(), description: desc.trim() || null, is_active: true });
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message?.includes("409") ? "A template with this trigger already exists." : "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-[#0F1D5E]">{template ? "Edit Template" : "New Template"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Trigger Type <span className="text-gray-400">(e.g. new_lead, proposal_sent, renewal_30d)</span></label>
            <input
              value={trigger}
              onChange={e => setTrigger(e.target.value)}
              disabled={!!template}
              placeholder="new_lead"
              className={inputCls + (template ? " bg-gray-50 text-gray-400" : "")}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Message Body <span className="text-gray-400">(use {"{{first_name}}"}, {"{{plan_name}}"}, etc.)</span></label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              maxLength={320}
              className={inputCls + " resize-none"}
            />
            <p className="text-xs text-gray-400 text-right mt-1">{320 - body.length} chars left</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="When this fires..." className={inputCls} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#0F1D5E] text-white text-sm font-medium rounded-xl hover:bg-[#0F1D5E]/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SmsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [tab, setTab] = useState<"logs" | "templates">("logs");

  // Logs
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [tmplLoading, setTmplLoading] = useState(true);
  const [editingTmpl, setEditingTmpl] = useState<any | null>(null);
  const [showNewTmpl, setShowNewTmpl] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.getSmsLogs({ limit: "100" }).then(setLogs).catch(() => {}).finally(() => setLogsLoading(false));
    api.getSmsTemplates().then(setTemplates).catch(() => {}).finally(() => setTmplLoading(false));
  }, []);

  const reloadTemplates = async () => {
    const data = await api.getSmsTemplates().catch(() => []);
    setTemplates(data);
    setShowNewTmpl(false);
    setEditingTmpl(null);
  };

  const toggleActive = async (t: any) => {
    setTogglingId(t.id);
    try {
      await api.updateSmsTemplate(t.id, { is_active: !t.is_active });
      setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x));
    } catch {}
    setTogglingId(null);
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    setDeletingId(id);
    try {
      await api.deleteSmsTemplate(id);
      setTemplates(prev => prev.filter(x => x.id !== id));
    } catch {}
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E]">SMS</h1>
          <p className="text-sm text-slate-500 mt-0.5">Outbound messages and automation templates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm w-fit border border-slate-200">
        {(["logs", "templates"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-[#0F1D5E] text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t === "logs" ? "Message Logs" : "Templates"}
          </button>
        ))}
      </div>

      {/* ── Logs Tab ── */}
      {tab === "logs" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {logsLoading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No messages sent yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left">To</th>
                  <th className="px-4 py-3 text-left">Message</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Sent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{log.phone_number}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs">
                      <p className="truncate">{log.message_body}</p>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Templates Tab ── */}
      {tab === "templates" && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowNewTmpl(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0F1D5E] text-white text-sm font-medium rounded-xl hover:bg-[#0F1D5E]/90"
              >
                <Plus className="w-4 h-4" /> New Template
              </button>
            </div>
          )}

          {tmplLoading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              No templates yet.{isAdmin ? " Click 'New Template' to create one." : ""}
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(t => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="font-mono text-sm font-semibold text-[#0F1D5E] bg-[#EEF1FA] px-2 py-0.5 rounded-lg">
                          {t.trigger_type}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                          {t.is_active ? "Active" : "Inactive"}
                        </span>
                        {t.description && (
                          <span className="text-xs text-slate-400">{t.description}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{t.message_body}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleActive(t)}
                          disabled={togglingId === t.id}
                          title={t.is_active ? "Deactivate" : "Activate"}
                          className="text-slate-400 hover:text-[#0F1D5E] disabled:opacity-50"
                        >
                          {t.is_active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => setEditingTmpl(t)} className="text-slate-400 hover:text-[#0F1D5E]">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTemplate(t.id)}
                          disabled={deletingId === t.id}
                          className="text-slate-400 hover:text-red-500 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Built-in trigger reference */}
          <div className="bg-[#EEF1FA] rounded-2xl p-5">
            <p className="text-sm font-semibold text-[#0F1D5E] mb-3">Automatic Trigger Reference</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
              {[
                ["new_lead", "Fires when a new lead is created — variables: {{first_name}}"],
                ["proposal_sent", "Fires when a proposal is created — variables: {{first_name}}, {{plan_name}}, {{rep_name}}"],
                ["renewal_30d", "Fires 30 days before contract end — variables: {{first_name}}, {{days}}, {{end_date}}"],
                ["renewal_60d", "Fires 60 days before contract end — variables: {{first_name}}, {{days}}, {{end_date}}"],
              ].map(([key, desc]) => (
                <div key={key} className="flex gap-2">
                  <span className="font-mono font-semibold text-[#0F1D5E] shrink-0">{key}</span>
                  <span className="text-slate-500">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(showNewTmpl || editingTmpl) && (
        <TemplateModal
          template={editingTmpl}
          onClose={() => { setShowNewTmpl(false); setEditingTmpl(null); }}
          onSaved={reloadTemplates}
        />
      )}
    </div>
  );
}
