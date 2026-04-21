"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft, User, MapPin, Phone, Mail, Calendar, Hash,
  Pencil, Check, X, ChevronDown, Bell, Plus, Trash2, Zap,
} from "lucide-react";

const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 placeholder:text-slate-400";

function IconBox({ icon: Icon }: { icon: any }) {
  return (
    <div className="w-9 h-9 rounded-xl bg-[#EEF1FA] flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-[#0F1D5E]" />
    </div>
  );
}

function StatusBadge({ status, dealId, onUpdate }: { status: string; dealId: string; onUpdate: (id: string, s: string) => void }) {
  const [saving, setSaving] = useState(false);
  const isActive = status === "ACTIVE";
  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = isActive ? "INACTIVE" : "ACTIVE";
    setSaving(true);
    try { await api.updateCrmDeal(dealId, { deal_status: next }); onUpdate(dealId, next); } catch {}
    setSaving(false);
  };
  return (
    <button onClick={toggle} disabled={saving}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer
        ${isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}
        ${saving ? "opacity-50" : ""}`}>
      {saving ? "..." : status}
      <ChevronDown className="w-3 h-3 opacity-60" />
    </button>
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
              <input className={inputCls} placeholder="e.g. DISCOUNT POWER" value={form.provider} onChange={e => set("provider", e.target.value)} />
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
              <input className={inputCls} placeholder="Agent name" value={form.sales_agent} onChange={e => set("sales_agent", e.target.value)} />
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
  const { user } = useAuth();
  const canDeleteNotes = user?.role === "admin";
  const id = params.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddDeal, setShowAddDeal] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", notes: "" });
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
    setEditForm({ full_name: data.full_name || "", phone: data.phone || "", notes: data.notes || "" });
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
    setEditForm({ full_name: customer.full_name || "", phone: customer.phone || "", notes: customer.notes || "" });
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

  if (loading) return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center text-slate-400 text-sm">Loading...</div>
  );
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!customer) return null;

  const active = deals.filter(d => d.deal_status === "ACTIVE");
  const inactive = deals.filter(d => d.deal_status !== "ACTIVE");
  const anxhValues = [...new Set(deals.map((d: any) => d.anxh).filter(Boolean))];

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">
      {showAddDeal && (
        <AddDealModal
          customerId={id}
          onClose={() => setShowAddDeal(false)}
          onSaved={async () => { setShowAddDeal(false); await loadCustomer(); }}
        />
      )}

      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0F1D5E] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      <div className="grid grid-cols-3 gap-5">
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
              {customer.email && (
                <div className="flex items-start gap-3 text-slate-600">
                  <IconBox icon={Mail} />
                  <span className="break-all pt-2">{customer.email}</span>
                </div>
              )}
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
              {customer.dob && (
                <div className="flex items-center gap-3 text-slate-600">
                  <IconBox icon={Calendar} />
                  <span>DOB: {customer.dob}</span>
                </div>
              )}
              {(customer.mailing_address || customer.city) && (
                <div className="flex items-start gap-3 text-slate-600">
                  <IconBox icon={MapPin} />
                  <div className="pt-2">
                    {customer.mailing_address && <div>{customer.mailing_address}</div>}
                    {customer.city && <div>{customer.city}, {customer.state} {customer.postal_code}</div>}
                  </div>
                </div>
              )}
              {anxhValues.length > 0 && (
                <div className="flex items-start gap-3 text-slate-600">
                  <IconBox icon={Hash} />
                  <div className="pt-2">
                    <span className="text-slate-400 text-xs block mb-1">ANXH</span>
                    {anxhValues.map((a: any) => (
                      <span key={a} className="block font-mono text-xs">{a}</span>
                    ))}
                  </div>
                </div>
              )}
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
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{active.length}</p>
                <p className="text-xs text-slate-500 mt-1">Active Deals</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-400">{inactive.length}</p>
                <p className="text-xs text-slate-500 mt-1">Inactive</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-2 space-y-5">

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

          {/* Deals — card layout, no horizontal scroll */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F1D5E]">All Deals ({deals.length})</h3>
              <button onClick={() => setShowAddDeal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F1D5E] border border-[#0F1D5E]/20 rounded-xl hover:bg-[#EEF1FA] transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Deal
              </button>
            </div>
            {deals.length === 0 ? (
              <div className="p-10 text-center">
                <Zap className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No deals yet. Click Add Deal to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {[...active, ...inactive].map(d => (
                  <div key={d.id}
                    className="px-5 py-4 hover:bg-slate-50/60 cursor-pointer transition-colors"
                    onClick={() => router.push(`/crm/deals/${d.id}`)}>
                    {/* Row 1: Deal name + provider + status */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-[#0F1D5E] truncate">{d.deal_name || d.business_name || "Unnamed Deal"}</span>
                        {d.provider && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">{d.provider}</span>
                        )}
                      </div>
                      <div onClick={e => e.stopPropagation()}>
                        <StatusBadge status={d.deal_status} dealId={d.id} onUpdate={handleDealStatusUpdate} />
                      </div>
                    </div>
                    {/* Row 2: key fields in a wrapping flex */}
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                      {d.esiid && <span><span className="text-slate-400">ESIID:</span> <span className="font-mono">{d.esiid}</span></span>}
                      {d.energy_rate != null && <span><span className="text-slate-400">Rate:</span> ${parseFloat(d.energy_rate).toFixed(4)}/kWh</span>}
                      {d.adder != null && <span><span className="text-slate-400">Adder:</span> ${parseFloat(d.adder).toFixed(4)}/kWh</span>}
                      {d.meter_type && <span><span className="text-slate-400">Type:</span> {d.meter_type}</span>}
                      {d.sales_agent && <span><span className="text-slate-400">Agent:</span> {d.sales_agent}</span>}
                      {d.contract_start_date && <span><span className="text-slate-400">Start:</span> {d.contract_start_date.slice(0, 10)}</span>}
                      {d.contract_end_date && <span><span className="text-slate-400">End:</span> {d.contract_end_date.slice(0, 10)}</span>}
                    </div>
                    {d.service_address && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />{d.service_address}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
