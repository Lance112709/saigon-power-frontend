"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft, PlugZap, Mail, Phone, MapPin, Zap, CalendarClock,
  User, Trash2, Lock, ExternalLink, Loader2, Pencil, X, Check,
} from "lucide-react";

const STATUSES = ["NEW", "CONTACTED", "ACTIVE", "CANCELLED"] as const;

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  CONTACTED: "bg-amber-50 text-amber-700 border-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  }) : "—";

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function GiaDienReDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;
  const canDeleteNotes = user?.role === "admin";

  const [sub, setSub] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [savingStatus, setSavingStatus] = useState(false);
  const [savingAgent, setSavingAgent] = useState(false);

  // Notes
  const [noteText, setNoteText] = useState("");
  const [noteInternal, setNoteInternal] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");

  // Edit info
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "", email: "", phone: "", service_address: "",
    city: "", state: "", zip: "", current_provider: "", utility_provider: "",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const data = await api.getGdrSubscription(id);
      setSub(data.subscription);
      setCustomer(data.customer);
      setActivity(data.activity || []);
      setEditForm({
        full_name: data.subscription.full_name || "",
        email: data.subscription.email || "",
        phone: data.subscription.phone || "",
        service_address: data.subscription.service_address || "",
        city: data.subscription.city || "",
        state: data.subscription.state || "TX",
        zip: data.subscription.zip || "",
        current_provider: data.subscription.current_provider || "",
        utility_provider: data.subscription.utility_provider || "",
      });
    } catch {
      setError("Subscription not found.");
    }
  }, [id]);

  const loadNotes = useCallback(async () => {
    try { setNotes(await api.getGdrNotes(id)); } catch {}
  }, [id]);

  useEffect(() => {
    Promise.allSettled([
      load(),
      loadNotes(),
      api.getCrmAgents().then((a: any) => setAgents(Array.isArray(a) ? a : [])),
    ]).then(() => setLoading(false));
  }, [load, loadNotes]);

  const updateField = async (payload: Record<string, any>, spinner: (b: boolean) => void) => {
    spinner(true);
    try {
      const updated = await api.updateGdrSubscription(id, payload);
      setSub(updated);
    } catch {}
    spinner(false);
  };

  const handleSaveInfo = async () => {
    const errs: Record<string, string> = {};
    if (!editForm.full_name.trim()) errs.full_name = "Required";
    if (!editForm.email.trim() && !editForm.phone.trim()) {
      errs.email = "Email or phone is required";
      errs.phone = "Email or phone is required";
    }
    if (editForm.zip && !/^\d{5}$/.test(editForm.zip)) errs.zip = "5 digits";
    setEditErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const updated = await api.updateGdrSubscription(id, editForm);
      setSub(updated);
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) { setNoteError("Note content is required"); return; }
    setNoteError("");
    setSavingNote(true);
    try {
      await api.createGdrNote(id, {
        content: noteText.trim(),
        author_name: user?.name || "",
        is_internal: noteInternal,
      });
      setNoteText("");
      setNoteInternal(false);
      await loadNotes();
    } catch {
      setNoteError("Failed to save note.");
    }
    setSavingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.deleteGdrNote(id, noteId);
      await loadNotes();
    } catch {}
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (error || !sub) {
    return (
      <div className="p-8">
        <p className="text-slate-500">{error || "Subscription not found."}</p>
        <button onClick={() => router.push("/crm/giadienre")} className="mt-3 text-sm text-[#0F1D5E] underline">
          Back to GiaDienRe Subscription
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <button
        onClick={() => router.push("/crm/giadienre")}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> GiaDienRe Subscription
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF1FA] flex items-center justify-center">
            <PlugZap className="w-6 h-6 text-[#0F1D5E]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F1D5E]">{sub.full_name}</h1>
            <p className="text-sm text-slate-400">
              {sub.lead_source || "GiaDienRe Website"} ·{" "}
              {sub.form_type === "signup" ? "Signup" : "Bill Analysis"} · Ref GDR-{String(sub.id).slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status */}
          <select
            value={(sub.status || "NEW").toUpperCase()}
            disabled={savingStatus}
            onChange={e => updateField({ status: e.target.value }, setSavingStatus)}
            className={`px-3 py-2 rounded-xl border text-sm font-semibold ${STATUS_STYLES[(sub.status || "NEW").toUpperCase()] || "bg-white border-slate-200 text-slate-600"}`}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {/* Assigned agent */}
          <select
            value={sub.assigned_agent || ""}
            disabled={savingAgent}
            onChange={e => updateField({ assigned_agent: e.target.value || null }, setSavingAgent)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-600"
          >
            <option value="">Unassigned</option>
            {agents.map((a: any) => {
              const name = typeof a === "string" ? a : a?.name;
              return name ? <option key={name} value={name}>{name}</option> : null;
            })}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-[#0F1D5E]">Customer Information</h2>
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0F1D5E]">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditing(false); setEditErrors({}); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-50">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <button onClick={handleSaveInfo} disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0F1D5E] text-white text-sm font-semibold disabled:opacity-50">
                    <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>

            {!editing ? (
              <div className="grid sm:grid-cols-2 gap-x-6">
                <InfoRow icon={User} label="Full Name" value={sub.full_name} />
                <InfoRow icon={Phone} label="Phone" value={sub.phone} />
                <InfoRow icon={Mail} label="Email" value={sub.email} />
                <InfoRow icon={MapPin} label="Service Address"
                  value={[sub.service_address, sub.city, sub.state, sub.zip].filter(Boolean).join(", ")} />
                <InfoRow icon={Zap} label="Current Provider (REP)" value={sub.current_provider} />
                <InfoRow icon={Zap} label="Utility (TDU)" value={sub.utility_provider} />
                <InfoRow icon={CalendarClock} label="Contract End Date"
                  value={sub.contract_end_date ? new Date(sub.contract_end_date).toLocaleDateString("en-US") : null} />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {([
                  ["full_name", "Full Name"], ["phone", "Phone"], ["email", "Email"],
                  ["service_address", "Service Address"], ["city", "City"], ["state", "State"],
                  ["zip", "ZIP"], ["current_provider", "Current Provider"], ["utility_provider", "Utility"],
                ] as const).map(([key, label]) => (
                  <div key={key} className={key === "service_address" ? "sm:col-span-2" : ""}>
                    <label className="text-xs font-semibold text-slate-500">{label}</label>
                    <input
                      value={(editForm as any)[key]}
                      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-[#0F1D5E]/40 ${editErrors[key] ? "border-red-400" : "border-slate-200"}`}
                    />
                    {editErrors[key] && <p className="text-xs text-red-500 mt-1">{editErrors[key]}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subscription info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-[#0F1D5E] mb-3">Subscription</h2>
            <div className="grid sm:grid-cols-2 gap-x-6">
              <InfoRow icon={PlugZap} label="Plan"
                value={sub.plan_name || (sub.form_type === "bill_analysis" ? "Bill analysis request (no plan yet)" : null)} />
              <InfoRow icon={CalendarClock} label="Billing" value={sub.billing_cycle} />
              <InfoRow icon={CalendarClock} label="Date Subscribed" value={fmtDateTime(sub.subscribed_at || sub.created_at)} />
              <InfoRow icon={CalendarClock} label="Last Updated" value={fmtDateTime(sub.updated_at)} />
              <InfoRow icon={User} label="Lead Source" value={sub.lead_source} />
              <InfoRow icon={User} label="Submissions"
                value={`${sub.submission_count || 1}× (last: ${fmtDateTime(sub.last_submission_at)})`} />
            </div>
            {(sub.card_last4 || sub.last_payment_at) && (
              <div className="mt-3 pt-3 border-t border-slate-100 grid sm:grid-cols-2 gap-x-6">
                <InfoRow icon={CalendarClock} label="Card on File"
                  value={sub.card_last4
                    ? `${(sub.card_brand || "Card").toUpperCase()} •••• ${sub.card_last4}${sub.card_expiry ? ` · exp ${sub.card_expiry}` : ""}`
                    : "None"} />
                <InfoRow icon={CalendarClock} label="Last Payment"
                  value={sub.last_payment_at
                    ? `${fmtDateTime(sub.last_payment_at)}${sub.last_payment_amount ? ` · $${sub.last_payment_amount}` : ""}`
                    : "—"} />
                {sub.next_billing_date && (
                  <InfoRow icon={CalendarClock} label="Next Billing"
                    value={new Date(sub.next_billing_date).toLocaleDateString("en-US")} />
                )}
              </div>
            )}
            {sub.extra && Object.keys(sub.extra).length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-1.5">Additional website fields</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(sub.extra).map(([k, v]) => (
                    <span key={k} className="px-2.5 py-1 rounded-full bg-slate-100 text-xs text-slate-600">
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-[#0F1D5E] mb-3">
              Notes & Internal Comments <span className="text-slate-300 font-normal">({notes.length})</span>
            </h2>
            <div className="mb-4">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleAddNote(); }}
                placeholder="Add a note… (⌘+Enter to save)"
                rows={3}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-[#0F1D5E]/40 ${noteError ? "border-red-400" : "border-slate-200"}`}
              />
              {noteError && <p className="text-xs text-red-500 mt-1">{noteError}</p>}
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
                  <input type="checkbox" checked={noteInternal} onChange={e => setNoteInternal(e.target.checked)}
                    className="rounded border-slate-300" />
                  <Lock className="w-3.5 h-3.5" /> Internal comment (staff only)
                </label>
                <button onClick={handleAddNote} disabled={savingNote}
                  className="px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold disabled:opacity-50">
                  {savingNote ? "Saving…" : "Add Note"}
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {notes.map((n: any) => (
                <div key={n.id}
                  className={`rounded-xl p-3.5 border ${n.is_internal ? "bg-amber-50/60 border-amber-100" : "bg-slate-50 border-slate-100"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-6 h-6 rounded-full bg-[#0F1D5E] text-white flex items-center justify-center text-[10px] font-bold">
                        {(n.author_name || "?").slice(0, 1).toUpperCase()}
                      </span>
                      <span className="font-semibold text-slate-500">{n.author_name || "Unknown"}</span>
                      {n.is_internal && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                          <Lock className="w-2.5 h-2.5" /> INTERNAL
                        </span>
                      )}
                      <span>· {fmtDateTime(n.created_at)}</span>
                    </div>
                    {canDeleteNotes && (
                      <button onClick={() => handleDeleteNote(n.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-sm text-slate-300">No notes yet.</p>}
            </div>
          </div>
        </div>

        {/* Right: CRM link + activity */}
        <div className="space-y-6">
          {/* Linked CRM customer */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-[#0F1D5E] mb-3">CRM Customer</h2>
            {customer ? (
              <div>
                <p className="text-sm font-semibold text-slate-700">{customer.full_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{customer.email || customer.phone || ""}</p>
                <Link href={`/crm/customers/${customer.id}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F1D5E] hover:underline">
                  Open customer profile <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  This subscriber is linked to the CRM customer record — the CRM stays the single source of truth.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Not linked to a CRM customer yet. The link is created automatically on intake.
              </p>
            )}
          </div>

          {/* Activity log */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-[#0F1D5E] mb-3">Activity</h2>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {activity.map((a: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0F1D5E]/40 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-600">
                      <span className="font-semibold">{a.action}</span>
                      {a.reason ? <span className="text-slate-400"> — {a.reason}</span> : null}
                    </p>
                    <p className="text-xs text-slate-400">{a.actor} · {fmtDateTime(a.created_at)}</p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && <p className="text-sm text-slate-300">No activity recorded.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
