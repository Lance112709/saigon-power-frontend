"use client";
import { useEffect, useRef, useState } from "react";
import { X, Mail, Send, Eye } from "lucide-react";
import { api } from "@/lib/api";

interface Props {
  to: string;
  contactName: string;
  leadId?: string;
  customerId?: string;
  dealId?: string;
  onClose: () => void;
  onSent?: () => void;
}

interface Template { id: string; name: string; subject: string; body: string; is_active: boolean; }
interface MergeTag { tag: string; label: string; }

export default function SendEmailModal({ to, contactName, leadId, customerId, dealId, onClose, onSent }: Props) {
  const firstName = (contactName || "").trim().split(/\s+/)[0] || "there";
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tags, setTags] = useState<MergeTag[]>([]);
  const [mergeVars, setMergeVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");

  // Fetched values take precedence; keep name/to for backwards compatibility.
  const variables = { first_name: firstName, name: contactName || "", to, ...mergeVars };

  useEffect(() => {
    api.getEmailTemplates().then((t: Template[]) => setTemplates((t || []).filter(x => x.is_active))).catch(() => {});
    const params: Record<string, string> = {};
    if (leadId) params.lead_id = leadId;
    if (customerId) params.customer_id = customerId;
    if (leadId || customerId) {
      api.getEmailMergeVars(params)
        .then((r: { variables: Record<string, string>; tags: MergeTag[] }) => {
          setMergeVars(r.variables || {});
          setTags(r.tags || []);
        })
        .catch(() => {});
    }
  }, [leadId, customerId]);

  function insertTag(tag: string) {
    const token = `{{${tag}}}`;
    if (lastFocused.current === "subject") {
      const el = subjectRef.current;
      const pos = el?.selectionStart ?? subject.length;
      const next = subject.slice(0, pos) + token + subject.slice(el?.selectionEnd ?? pos);
      setSubject(next); setPreview(null);
      requestAnimationFrame(() => { el?.focus(); const c = pos + token.length; el?.setSelectionRange(c, c); });
    } else {
      const el = bodyRef.current;
      const pos = el?.selectionStart ?? body.length;
      const next = body.slice(0, pos) + token + body.slice(el?.selectionEnd ?? pos);
      setBody(next); setPreview(null);
      requestAnimationFrame(() => { el?.focus(); const c = pos + token.length; el?.setSelectionRange(c, c); });
    }
  }

  function applyTemplate(id: string) {
    const t = templates.find(x => x.id === id);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
    setPreview(null);
  }

  async function showPreview() {
    try {
      const r = await api.previewEmail({ subject, body, variables });
      setPreview(r.html);
    } catch { setPreview(null); }
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await api.sendEmail({ to, subject: subject.trim(), body: body.trim(), variables, lead_id: leadId, customer_id: customerId, deal_id: dealId });
      setResult({ ok: res.ok ?? true });
      if (res.ok ?? true) { onSent?.(); setTimeout(onClose, 1200); }
    } catch (err: any) {
      const msg = (err?.message || "").split(":").slice(1).join(":") || "Failed to send.";
      setResult({ ok: false, error: msg });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#0F1D5E]" />
            <h2 className="font-semibold text-[#0F1D5E]">Email {contactName || "Customer"}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-xs text-slate-500">To <span className="font-semibold text-slate-700">{to}</span></div>

          {templates.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Start from a template</label>
              <select onChange={e => e.target.value && applyTemplate(e.target.value)} defaultValue=""
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20">
                <option value="">— None —</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
            <input ref={subjectRef} value={subject}
              onFocus={() => { lastFocused.current = "subject"; }}
              onChange={e => { setSubject(e.target.value); setPreview(null); }}
              placeholder="Your Saigon Power update"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Message</label>
            <textarea ref={bodyRef} value={body}
              onFocus={() => { lastFocused.current = "body"; }}
              onChange={e => { setBody(e.target.value); setPreview(null); }} rows={8}
              placeholder={`Hi {{first_name}},\n\nWrite your message here…\n\nThank you,\nSaigon Power`}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 font-mono" />
            {tags.length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] text-slate-400 mb-1">Click to insert a personalization tag (fills in automatically when sent):</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(t => {
                    const val = mergeVars[t.tag];
                    return (
                      <button key={t.tag} type="button" onClick={() => insertTag(t.tag)}
                        title={val ? `${t.label}: ${val}` : `${t.label} (no value on file)`}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-[#0F1D5E]/10 text-[11px] font-medium text-slate-600 transition-colors">
                        {t.label}{!val && <span className="text-amber-500 ml-1">•</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1.5">Tags like <code className="bg-slate-100 px-1 rounded">{"{{first_name}}"}</code> are replaced with the customer's real details when sent. Your message is wrapped in the Saigon Power branded template. A <span className="text-amber-500">•</span> means that detail isn't on file for this contact.</p>
          </div>

          {preview && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2 bg-slate-50 border-b border-slate-100">Preview</div>
              <iframe title="email-preview" srcDoc={preview} className="w-full h-64 bg-white" />
            </div>
          )}

          {result && (
            <div className={`text-sm rounded-xl px-4 py-2.5 ${result.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {result.ok ? "✓ Email sent." : result.error || "Failed to send."}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-5 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={showPreview} disabled={!subject.trim() || !body.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-50">
            <Send className="w-4 h-4" /> {sending ? "Sending…" : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
