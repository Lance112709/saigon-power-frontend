"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Bell, Plus, Check, Trash2, X, ChevronDown } from "lucide-react";

const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20 placeholder:text-slate-400";

function StatusBadge({ status, dealId, onUpdate }: { status: string; dealId: string; onUpdate: (s: string) => void }) {
  const [saving, setSaving] = useState(false);
  const isActive = status === "ACTIVE";

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = isActive ? "INACTIVE" : "ACTIVE";
    setSaving(true);
    try {
      await api.updateCrmDeal(dealId, { deal_status: next });
      onUpdate(next);
    } catch {}
    setSaving(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors
        ${isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}
        ${saving ? "opacity-50" : ""}`}
    >
      {saving ? "..." : status}
      <ChevronDown className="w-3.5 h-3.5 opacity-60" />
    </button>
  );
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const canDeleteNotes = user?.role === "admin";
  const id = params.id as string;

  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const loadNotes = useCallback(async () => {
    try { setNotes(await api.getCrmDealNotes(id)); } catch {}
  }, [id]);

  const loadTasks = useCallback(async () => {
    try { setTasks(await api.getTasks({ crm_deal_id: id })); } catch {}
  }, [id]);

  useEffect(() => {
    api.getCrmDeal(id)
      .then(data => setDeal(data))
      .catch(() => setError("Deal not found"))
      .finally(() => setLoading(false));
    loadNotes();
    loadTasks();
  }, [id, loadNotes, loadTasks]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    setNoteError("");
    try {
      await api.createCrmDealNote(id, { content: noteText.trim(), author_name: user?.name || "" });
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
    await api.deleteCrmDealNote(id, noteId).catch(() => {});
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim() || !newTask.due_date) return;
    setSavingTask(true);
    setTaskError("");
    try {
      await api.createTask({ ...newTask, crm_deal_id: id });
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

  if (loading) return <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center text-slate-400 text-sm">Loading...</div>;
  if (error || !deal) return <div className="p-8 text-red-500">{error || "Not found"}</div>;

  const customer = deal.crm_customers;

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0F1D5E] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {customer?.id && (
          <button
            onClick={() => router.push(`/crm/customers/${customer.id}`)}
            className="text-xs text-[#0F1D5E] font-semibold hover:underline"
          >
            View Customer Profile →
          </button>
        )}
      </div>

      {/* Deal header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F1D5E]">{deal.deal_name || deal.business_name || "Deal"}</h1>
            {customer?.full_name && <p className="text-sm text-slate-500 mt-0.5">{customer.full_name}</p>}
            {customer?.email && <p className="text-xs text-slate-400">{customer.email}</p>}
          </div>
          <StatusBadge status={deal.deal_status} dealId={id} onUpdate={s => setDeal((d: any) => ({ ...d, deal_status: s }))} />
        </div>

        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
          {[
            ["Provider", deal.provider || "—"],
            ["ESIID", deal.esiid || "—"],
            ["Type", deal.meter_type || "—"],
            ["Rate", deal.energy_rate != null ? parseFloat(deal.energy_rate).toFixed(4) : "—"],
            ["Adder", deal.adder != null ? parseFloat(deal.adder).toFixed(4) : "—"],
            ["Term", deal.contract_term || "—"],
            ["Agent", deal.sales_agent || "—"],
            ["Service Address", deal.service_address || "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-sm text-slate-700 ${label === "ESIID" ? "font-mono" : ""}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          {[
            ["Contract Start", deal.contract_start_date ? deal.contract_start_date.slice(0, 10) : "—"],
            ["Contract End", deal.contract_end_date ? deal.contract_end_date.slice(0, 10) : "—"],
            ["ANXH", deal.anxh || "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-sm text-slate-700">{value}</p>
            </div>
          ))}
        </div>
      </div>

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
            placeholder="Add a note about this deal..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleAddNote(); }}
          />
          {noteError && <p className="text-xs text-red-500 mt-1">{noteError}</p>}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">⌘ + Enter to submit</p>
            <button
              onClick={handleAddNote}
              disabled={savingNote || !noteText.trim()}
              className="px-4 py-2 rounded-xl bg-[#0F1D5E] text-white text-xs font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-40 transition-colors"
            >
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
          <button
            onClick={() => setShowAddTask(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F1D5E] border border-[#0F1D5E]/20 rounded-xl hover:bg-[#EEF1FA] transition-colors"
          >
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
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
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
    </div>
  );
}
