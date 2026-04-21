"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  AlertCircle, Clock, CalendarDays, CheckCircle2, Plus, X,
  Trash2, Check, ChevronDown, Bell,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Task = {
  id: string; lead_id?: string; deal_id?: string; customer_id?: string;
  task_type: string; title: string; description?: string;
  due_date: string; status: string; priority: string;
  assigned_to?: string; entity_name?: string; completed_at?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  call: "Call", text: "Text", email: "Email",
  renewal_followup: "Renewal", general: "General",
};

const PRIORITY_CLS: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-slate-100 text-slate-500",
};

const STATUS_CLS: Record<string, string> = {
  overdue:   "bg-red-100 text-red-700",
  pending:   "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTimeLocal(d: string) {
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

// ── Add Task Modal ─────────────────────────────────────────────────────────────
function AddTaskModal({ onClose, onSaved, prefillLeadId }: {
  onClose: () => void; onSaved: () => void; prefillLeadId?: string;
}) {
  const [form, setForm] = useState({
    title: "", task_type: "call", due_date: "", priority: "medium",
    description: "", assigned_to: "", lead_id: prefillLeadId || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!form.due_date) { setError("Due date is required"); return; }
    if (!form.lead_id.trim()) { setError("Lead ID is required"); return; }
    setSaving(true);
    try {
      await api.createTask({ ...form, lead_id: form.lead_id || undefined });
      onSaved();
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    }
    setSaving(false);
  };

  const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F1D5E]/20";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Add Task</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Title *</label>
            <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Type</label>
              <select className={inputCls} value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}>
                <option value="call">Call</option>
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="renewal_followup">Renewal</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Priority</label>
              <select className={inputCls} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Due Date *</label>
            <input type="datetime-local" className={inputCls} value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Lead ID *</label>
            <input className={inputCls} value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))} placeholder="Paste lead UUID" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Assigned To</label>
            <input className={inputCls} value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} placeholder="Name or email" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes..." />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 disabled:opacity-50">
            {saving ? "Saving..." : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task Row ───────────────────────────────────────────────────────────────────
function TaskRow({ task, onComplete, onDelete }: {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <tr className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/70 ${task.status === "completed" ? "opacity-50" : ""}`}>
      <td className="px-4 py-3">
        <p className="font-semibold text-sm text-slate-800">{task.title}</p>
        {task.entity_name && <p className="text-xs text-slate-400 mt-0.5">{task.entity_name}</p>}
        {task.description && <p className="text-xs text-slate-400 mt-0.5 italic">{task.description}</p>}
      </td>
      <td className="px-4 py-3">
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EEF1FA] text-[#0F1D5E]">
          {TYPE_LABELS[task.task_type] ?? task.task_type}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmtDate(task.due_date)}</td>
      <td className="px-4 py-3">
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITY_CLS[task.priority] ?? ""}`}>
          {task.priority}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLS[task.status] ?? ""}`}>
          {task.status}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">{task.assigned_to || "—"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {task.status !== "completed" && (
            <button
              onClick={() => onComplete(task.id)}
              className="text-slate-300 hover:text-emerald-500 transition-colors"
              title="Mark complete"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(task.id)}
            className="text-slate-300 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Task Table ─────────────────────────────────────────────────────────────────
function TaskTable({ tasks, onComplete, onDelete, empty }: {
  tasks: Task[]; onComplete: (id: string) => void;
  onDelete: (id: string) => void; empty: string;
}) {
  if (tasks.length === 0) return <p className="px-5 py-8 text-center text-slate-400 text-sm">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100">
          {["Task", "Type", "Due Date", "Priority", "Status", "Assigned", ""].map(h => (
            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tasks.map(t => (
          <TaskRow key={t.id} task={t} onComplete={onComplete} onDelete={onDelete} />
        ))}
      </tbody>
    </table>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "overdue",   label: "Overdue",   icon: AlertCircle,   color: "text-red-500" },
  { key: "today",     label: "Due Today", icon: Clock,         color: "text-amber-500" },
  { key: "upcoming",  label: "Upcoming",  icon: CalendarDays,  color: "text-blue-500" },
  { key: "completed", label: "Completed", icon: CheckCircle2,  color: "text-emerald-500" },
] as const;

export default function TasksPage() {
  const [stats, setStats] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab]     = useState<string>("overdue");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadStats = useCallback(async () => {
    const s = await api.getTaskStats().catch(() => null);
    setStats(s);
  }, []);

  const loadTasks = useCallback(async (window: string) => {
    setLoading(true);
    const data = await api.getTasks({ window }).catch(() => []);
    setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadTasks(tab); }, [tab, loadTasks]);

  const handleComplete = async (id: string) => {
    await api.updateTask(id, { status: "completed" }).catch(() => {});
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: "completed" } : t));
    loadStats();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    await api.deleteTask(id).catch(() => {});
    setTasks(prev => prev.filter(t => t.id !== id));
    loadStats();
  };

  const handleSaved = () => {
    setShowAdd(false);
    loadTasks(tab);
    loadStats();
  };

  const statCards = [
    { key: "overdue",       label: "Overdue",      icon: AlertCircle,  bg: "bg-red-50",    iconCls: "text-red-500",    val: stats?.overdue ?? 0 },
    { key: "due_today",     label: "Due Today",    icon: Clock,        bg: "bg-amber-50",  iconCls: "text-amber-500",  val: stats?.due_today ?? 0 },
    { key: "this_week",     label: "This Week",    icon: CalendarDays, bg: "bg-blue-50",   iconCls: "text-blue-500",   val: stats?.this_week ?? 0 },
    { key: "total_pending", label: "Total Pending",icon: Bell,         bg: "bg-slate-50",  iconCls: "text-slate-500",  val: stats?.total_pending ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 space-y-6">
      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onSaved={handleSaved} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1D5E]">Tasks & Follow-Ups</h1>
          <p className="text-slate-500 text-sm mt-1">Track every lead, deal, and renewal reminder</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F1D5E] text-white text-sm font-semibold hover:bg-[#0F1D5E]/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(({ key, label, icon: Icon, bg, iconCls, val }) => (
          <div
            key={key}
            onClick={() => { if (key === "due_today") setTab("today"); else if (key === "overdue") setTab("overdue"); else if (key === "this_week") setTab("upcoming"); }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${iconCls}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{val}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-slate-100">
          {TABS.map(({ key, label, icon: Icon, color }) => {
            const count = key === "overdue" ? stats?.overdue
              : key === "today" ? stats?.due_today
              : key === "upcoming" ? stats?.this_week : null;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === key
                    ? "border-[#0F1D5E] text-[#0F1D5E]"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className={`w-4 h-4 ${tab === key ? color : ""}`} />
                {label}
                {count != null && count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    key === "overdue" ? "bg-red-100 text-red-600" :
                    key === "today" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <TaskTable
              tasks={tasks}
              onComplete={handleComplete}
              onDelete={handleDelete}
              empty={
                tab === "overdue" ? "No overdue tasks. You're all caught up! ✅" :
                tab === "today"   ? "Nothing due today." :
                tab === "upcoming"? "No upcoming tasks in the next 7 days." :
                                    "No completed tasks yet."
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
