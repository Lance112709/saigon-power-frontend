"use client";
import { useEffect, useRef, useState } from "react";
import { X, Megaphone, Send, Eye, Users, Beaker, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Props {
  mode: "selected" | "filter";
  leadIds: string[];
  filters?: Record<string, string>;
  audienceCount: number;
  sampleVariables?: Record<string, string>;
  onClose: () => void;
  onSent?: () => void;
}

interface Template { id: string; name: string; subject: string; body: string; is_active: boolean; }

// Mirrors backend MERGE_TAGS (app/services/merge_vars.py).
const TAGS: { tag: string; label: string }[] = [
  { tag: "first_name", label: "First name" },
  { tag: "last_name", label: "Last name" },
  { tag: "service_address", label: "Service address" },
  { tag: "city", label: "City" },
  { tag: "state", label: "State" },
  { tag: "zip", label: "Zipcode" },
  { tag: "esi_id", label: "ESI ID" },
  { tag: "phone", label: "Phone number" },
  { tag: "email", label: "Email" },
  { tag: "contract_start_date", label: "Contract start date" },
  { tag: "contract_end_date", label: "Contract end date" },
];

export default function BulkEmailModal({ mode, leadIds, filters, audienceCount, sampleVariables, onClose, onSent }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [testState, setTestState] = useState<"" | "sending" | "sent" | "error">("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");

  const sample = sampleVariables || {};

  useEffect(() => {
    api.getEmailTemplates().then((t: Template[]) => setTemplates((t || []).filter(x => x.is_active))).catch(() => {});
  }, []);

  function insertTag(tag: string) {
    const token = `{{${tag}}}`;
    setPreview(null);
    if (lastFocused.current === "subject") {
      const el = subjectRef.current, pos = el?.selectionStart ?? subject.length;
      setSubject(subject.slice(0, pos) + token + subject.slice(el?.selectionEnd ?? pos));
      requestAnimationFrame(() => { el?.focus(); const c = pos + token.length; el?.setSelectionRange(c, c); });
    } else {
      const el = bodyRef.current, pos = el?.selectionStart ?? body.length;
      setBody(body.slice(0, pos) + token + body.slice(el?.selectionEnd ?? pos));
      requestAnimationFrame(() => { el?.focus(); const c = pos + token.length; el?.setSelectionRange(c, c); });
    }
  }

  function applyTemplate(id: string) {
    const t = templates.find(x => x.id === id);
    if (!t) return;
    setSubject(t.subject); setBody(t.body); setPreview(null);
    if (!name.trim()) setName(t.name);
  }

  async function showPreview() {
    try {
      const r = await api.previewEmail({ subject, body, variables: sample });
      setPreview(r.html);
    } catch { setPreview(null); }
  }

  async function sendTest() {
    if (!subject.trim() || !body.trim() || !user?.email) return;
    setTestState("sending");
    try {
      await api.sendEmail({ to: user.email, subject: subject.trim(), body: body.trim(), variables: sample });
      setTestState("sent");
    } catch { setTestState("error"); }
  }

  async function launch() {
    if (!name.trim() || !subject.trim() || !body.trim()) { setError("Name, subject, and message are all required."); return; }
    setLaunching(true); setError("");
    try {
      const payload: any = { name: name.trim(), subject: subject.trim(), body: body.trim(), mode };
      if (mode === "selected") payload.lead_ids = leadIds;
      else payload.filters = filters || {};
      const r = await api.createCampaign(payload);
      setResult(r);
    } catch (err: any) {
      setError((err?.message || "").split(":").slice(1).join(":").trim() || "Failed to start campaign.");
      setConfirming(false);
    } finally {
      setLaunching(false);
    }
  }

  const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#0F1D5E]" />
            <h2 className="font-semibold text-[#0F1D5E]">Bulk Email Campaign</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Success state */}
        {result ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-[#0F1D5E]">Campaign started 🎉</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              <span className="font-semibold">{result.total_recipients.toLocaleString()}</span> recipients queued.
              Sending up to <span className="font-semibold">{result.daily_cap}/day</span> — about{" "}
              <span className="font-semibold">{result.est_days} day{result.est_days > 1 ? "s" : ""}</span> to finish.
              The first batch is going out now.
              {result.skipped_no_email > 0 && <><br /><span className="text-amber-600">{result.skipped_no_email} skipped (no email on file).</span></>}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => onSent?.()} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Done</button>
              <a href="/crm/campaigns" className="px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90">View progress</a>
            </div>
          </div>
        ) : confirming ? (
          /* Confirm step */
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                You're about to email <span className="font-bold">{audienceCount.toLocaleString()}</span> customer{audienceCount === 1 ? "" : "s"}
                {mode === "filter" ? " matching the current filters" : " you selected"}. Recipients with no email are skipped automatically.
                This can't be undone once sending starts (but you can pause it).
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-1">
              <div><span className="text-slate-400">Campaign:</span> <span className="font-semibold text-slate-700">{name}</span></div>
              <div><span className="text-slate-400">Subject:</span> {subject}</div>
            </div>
            {error && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-4 py-2.5">{error}</div>}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button onClick={() => setConfirming(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Back</button>
              <button onClick={launch} disabled={launching}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-50">
                <Send className="w-4 h-4" /> {launching ? "Starting…" : `Send to ${audienceCount.toLocaleString()}`}
              </button>
            </div>
          </div>
        ) : (
          /* Compose step */
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm bg-[#EEF1FA] text-[#0F1D5E] rounded-xl px-4 py-2.5">
              <Users className="w-4 h-4" />
              <span><span className="font-bold">{audienceCount.toLocaleString()}</span> recipient{audienceCount === 1 ? "" : "s"} {mode === "filter" ? "match your filters" : "selected"} (those with an email on file).</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Campaign name <span className="text-slate-300">(internal only)</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. October renewal blast" className={inputCls} />
            </div>

            {templates.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Start from a template</label>
                <select onChange={e => e.target.value && applyTemplate(e.target.value)} defaultValue="" className={inputCls}>
                  <option value="">— None —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
              <input ref={subjectRef} value={subject} onFocus={() => { lastFocused.current = "subject"; }}
                onChange={e => { setSubject(e.target.value); setPreview(null); }}
                placeholder="Your Saigon Power update" className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Message</label>
              <textarea ref={bodyRef} value={body} onFocus={() => { lastFocused.current = "body"; }}
                onChange={e => { setBody(e.target.value); setPreview(null); }} rows={8}
                placeholder={"Hi {{first_name}},\n\nWrite your message here…\n\nThank you,\nSaigon Power"}
                className={inputCls + " font-mono"} />
              <div className="mt-2">
                <p className="text-[11px] text-slate-400 mb-1">Click to insert a personalization tag (each recipient gets their own details):</p>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map(t => (
                    <button key={t.tag} type="button" onClick={() => insertTag(t.tag)}
                      title={sample[t.tag] ? `${t.label}: ${sample[t.tag]}` : t.label}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-[#0F1D5E]/10 text-[11px] font-medium text-slate-600 transition-colors">
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {preview && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2 bg-slate-50 border-b border-slate-100">Preview (sample recipient)</div>
                <iframe title="preview" srcDoc={preview} className="w-full h-64 bg-white" />
              </div>
            )}

            {testState === "sent" && <div className="text-sm bg-emerald-50 text-emerald-700 rounded-xl px-4 py-2.5">✓ Test sent to {user?.email}.</div>}
            {testState === "error" && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-4 py-2.5">Test failed to send.</div>}
            {error && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-4 py-2.5">{error}</div>}

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 mt-2 pt-4">
              <div className="flex items-center gap-2">
                <button onClick={showPreview} disabled={!subject.trim() || !body.trim()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
                  <Eye className="w-4 h-4" /> Preview
                </button>
                <button onClick={sendTest} disabled={!subject.trim() || !body.trim() || testState === "sending" || !user?.email}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
                  <Beaker className="w-4 h-4" /> {testState === "sending" ? "Sending…" : "Test to me"}
                </button>
              </div>
              <button onClick={() => { if (!name.trim() || !subject.trim() || !body.trim()) { setError("Name, subject, and message are all required."); return; } setError(""); setConfirming(true); }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90">
                <Send className="w-4 h-4" /> Review & send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
