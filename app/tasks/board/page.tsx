"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Ellipsis, LayoutList, ListChecks, Plus, X } from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";

const views = [["Kanban", LayoutList], ["Calendar", CalendarDays], ["List", ListChecks]] as const;
const statuses = [
  { key: "todo", label: "To do", color: "var(--color-text-secondary)" },
  { key: "doing", label: "In progress", color: "var(--color-attention-text)" },
  { key: "blocked", label: "Blocked", color: "var(--color-danger-text)" },
  { key: "done", label: "Done", color: "var(--color-success-text)" },
] as const;
const assignees = ["Unassigned", "Marisol", "Danilo", "Ivy", "Rafa"];
const priorities = ["High", "Med", "Low"] as const;
const priorityStyles = {
  High: { background: "var(--color-danger-bg)", color: "var(--color-danger-text)" },
  Med: { background: "var(--color-warning-bg)", color: "var(--color-warning-text)" },
  Low: { background: "var(--color-surface-muted)", color: "var(--color-text-secondary)" },
};

type Status = (typeof statuses)[number]["key"];
type Task = { id: string; title: string; context: string; assignee: string; dueDate: string; priority: (typeof priorities)[number]; category: string; status: Status };
type TaskDraft = Omit<Task, "id">;

function mapBoardToTasks(data: { todo?: unknown[]; doing?: unknown[]; blocked?: unknown[]; done?: unknown[] }): Task[] {
  const columns: [Status, string][] = [["todo", "To do"], ["doing", "In progress"], ["blocked", "Blocked"], ["done", "Done"]];
  return columns.flatMap(([key]) => {
    const rows = (data[key] ?? []) as Array<{ id: string; title: string; description: string | null; category: string; assignee: string | null; dueDate: string | null; priority: string }>;
    return rows.map((task) => ({
      id: task.id,
      title: task.title,
      context: task.description ?? task.category,
      assignee: task.assignee ?? "Unassigned",
      dueDate: task.dueDate ?? "",
      priority: (task.priority === "High" || task.priority === "Med" || task.priority === "Low" ? task.priority : "Med") as Task["priority"],
      category: task.category,
      status: key,
    }));
  });
}

const emptyDraft = (status: Status = "todo"): TaskDraft => ({ title: "", context: "", assignee: "Unassigned", dueDate: "", priority: "Med", category: "General", status });

export default function TasksBoardPage() {
  const { fireToast } = useToast();
  const [view, setView] = useState("Kanban");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editor, setEditor] = useState<{ task?: Task; draft: TaskDraft } | null>(null);
  const savingTask = useRef(false);

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(mapBoardToTasks(data as { todo?: unknown[]; doing?: unknown[]; blocked?: unknown[]; done?: unknown[] })))
      .catch(() => {});
  }, []);

  async function saveTask(draft: TaskDraft) {
    if (!draft.title.trim() || savingTask.current) return;
    savingTask.current = true;
    try {
      const response = await fetch("/api/tasks", { method: editor?.task ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editor?.task?.id, ...draft, title: draft.title.trim() }) });
      const result = await response.json().catch(() => ({})) as { id?: string; error?: string }; if (!response.ok || (!editor?.task && !result.id)) throw new Error(result.error ?? "Unable to save task.");
      if (editor?.task) setTasks((current) => current.map((task) => task.id === editor.task?.id ? { ...task, ...draft, title: draft.title.trim() } : task));
      else setTasks((current) => [...current, { ...draft, id: result.id!, title: draft.title.trim() }]);
      fireToast(editor?.task ? "Task updated." : "Task created.", "success"); setEditor(null);
    } catch (error) { fireToast(error instanceof Error ? error.message : "Unable to save task.", "danger"); }
    finally { savingTask.current = false; }
  }

  async function moveTask(taskId: string, status: Status) {
    const previous = tasks.find((task) => task.id === taskId)?.status;
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status } : task));
    const response = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: taskId, status }) });
    if (!response.ok) { setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status: previous ?? task.status } : task)); fireToast("Unable to move the task.", "danger"); return; }
    fireToast(`Task moved to ${statuses.find((item) => item.key === status)?.label}.`, "success");
  }

  return <div className="flex min-h-full min-w-0 flex-col bg-[var(--color-canvas)]">
    <header className="app-page border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 pb-9 pt-[34px] sm:px-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Projects / Operations</div><h1 className="mt-2 truncate font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em]">Tasks</h1></div><button onClick={() => setEditor({ draft: emptyDraft() })} className="flex h-11 items-center gap-2 self-start rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] xl:self-auto"><Plus className="h-4 w-4" /> Add task</button></div>
      <div className="mt-5 border-t border-[var(--color-border)] pt-4"><nav className="flex w-full gap-1 overflow-x-auto rounded-control bg-[var(--color-surface-muted)] p-1 sm:w-fit" aria-label="Task views">{views.map(([name, Icon]) => <button key={name} onClick={() => setView(name)} className={`flex h-9 shrink-0 items-center gap-1.5 rounded-[5px] px-3 text-sm font-semibold ${view === name ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}><Icon className="h-4 w-4" />{name}</button>)}</nav></div>
    </header>
    <main className="min-w-0 flex-1 overflow-x-auto p-5 sm:p-6 lg:p-8">{view === "Kanban" ? <KanbanBoard tasks={tasks} onAdd={(status) => setEditor({ draft: emptyDraft(status) })} onEdit={(task) => setEditor({ task, draft: { ...task } })} onMove={moveTask} /> : view === "List" ? <TaskList tasks={tasks} onEdit={(task) => setEditor({ task, draft: { ...task } })} /> : <TaskCalendar tasks={tasks} onEdit={(task) => setEditor({ task, draft: { ...task } })} />}</main>
    {editor && <TaskEditor task={editor.task} draft={editor.draft} onClose={() => setEditor(null)} onSave={saveTask} />}
  </div>;
}

function KanbanBoard({ tasks, onAdd, onEdit, onMove }: { tasks: Task[]; onAdd: (status: Status) => void; onEdit: (task: Task) => void; onMove: (id: string, status: Status) => void }) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  return <div className="grid min-w-[1040px] grid-cols-4 gap-4">{statuses.map((column, columnIndex) => { const columnTasks = tasks.filter((task) => task.status === column.key); return <section key={column.key} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId) onMove(draggedId, column.key); setDraggedId(null); }} className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"><div className="flex items-center gap-2 px-1 pb-3"><span className="h-5 w-1.5 rounded-pill" style={{ background: column.color }} /><h2 className="font-display text-base font-semibold">{column.label}</h2><span className="rounded-control bg-[var(--color-surface)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">{columnTasks.length}</span><button className="ml-auto rounded-control p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]" aria-label={`${column.label} options`}><Ellipsis className="h-4 w-4" /></button></div><div className="min-h-12 space-y-3">{columnTasks.map((task, index) => <TaskCard key={task.id} task={task} progress={column.key === "done" ? 100 : Math.min(12 + index * 18 + columnIndex * 18, 82)} onEdit={onEdit} onDragStart={() => setDraggedId(task.id)} />)}</div><button onClick={() => onAdd(column.key)} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-[var(--color-border-strong)] text-sm font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]"><Plus className="h-4 w-4" /> Add task</button></section>; })}</div>;
}

function TaskCard({ task, progress, onEdit, onDragStart }: { task: Task; progress: number; onEdit: (task: Task) => void; onDragStart: () => void }) { return <article draggable onDragStart={onDragStart} onClick={() => onEdit(task)} className="cursor-pointer rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-[0_4px_12px_-10px_rgba(0,0,0,.3)] transition-shadow hover:shadow-sm"><div className="flex items-center justify-between gap-2"><span className="rounded-pill px-2 py-0.5 text-[10px] font-semibold" style={priorityStyles[task.priority]}>{task.priority}</span><span className="rounded-pill bg-[var(--color-indigo-100)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-indigo-800)]">{task.category}</span></div><h3 className="mt-3 text-sm font-semibold leading-5">{task.title}</h3>{task.context ? <p className="mt-1 line-clamp-2 text-xs leading-4 text-[var(--color-text-secondary)]">{task.context}</p> : null}<div className="mt-4 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]"><span>{task.status === "done" ? "Done" : "Progress"}</span><span className="font-medium">{progress}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-[var(--color-surface-muted)]"><div className="h-full rounded-pill bg-[var(--color-kahel-500)]" style={{ width: `${progress}%` }} /></div><div className="mt-4 text-right text-[11px] text-[var(--color-text-muted)]">{formatDueDate(task.dueDate)}</div></article>; }

function TaskList({ tasks, onEdit }: { tasks: Task[]; onEdit: (task: Task) => void }) { return <section className="overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]"><div className="min-w-[640px]"><div className="grid grid-cols-[minmax(280px,1.6fr)_.8fr_.8fr_.8fr] gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-secondary)]"><span>Task</span><span>Priority</span><span>Status</span><span>Due</span></div>{tasks.map((task) => <button key={task.id} onClick={() => onEdit(task)} className="grid w-full grid-cols-[minmax(280px,1.6fr)_.8fr_.8fr_.8fr] items-center gap-4 border-b border-[var(--color-border)] px-5 py-4 text-left text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"><div><div className="font-semibold">{task.title}</div><div className="mt-1 text-xs text-[var(--color-text-muted)]">{task.category}</div></div><span className="w-fit rounded-pill px-2.5 py-1 text-[11px] font-semibold" style={priorityStyles[task.priority]}>{task.priority}</span><span className="w-fit rounded-pill bg-[var(--color-surface-muted)] px-2.5 py-1 text-[11px] font-semibold" style={{ color: statuses.find((status) => status.key === task.status)?.color }}>{statuses.find((status) => status.key === task.status)?.label}</span><span className="text-xs text-[var(--color-text-secondary)]">{formatDueDate(task.dueDate)}</span></button>)}</div></section>; }

function TaskCalendar({ tasks, onEdit }: { tasks: Task[]; onEdit: (task: Task) => void }) { const days = ["Mon 21", "Tue 22", "Wed 23", "Thu 24", "Fri 25"]; return <section className="overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]"><div className="min-w-[850px]"><div className="grid grid-cols-5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">{days.map((day) => <div key={day} className="border-r border-[var(--color-border)] px-4 py-3 text-sm font-semibold last:border-r-0">{day}</div>)}</div><div className="grid min-h-[470px] grid-cols-5">{days.map((day, index) => <div key={day} className="border-r border-[var(--color-border)] p-3 last:border-r-0">{tasks.filter((task) => new Date(`${task.dueDate}T12:00:00`).getDay() === index + 1).map((task) => <button key={task.id} onClick={() => onEdit(task)} className="mb-3 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-left"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: statuses.find((status) => status.key === task.status)?.color }} /><span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-muted)]">{statuses.find((status) => status.key === task.status)?.label}</span></div><div className="mt-2 text-xs font-semibold leading-4">{task.title}</div><div className="mt-1 text-[10px] text-[var(--color-text-secondary)]">{formatDueDate(task.dueDate)}</div></button>)}</div>)}</div></div></section>; }

function TaskEditor({ task, draft, onClose, onSave }: { task?: Task; draft: TaskDraft; onClose: () => void; onSave: (draft: TaskDraft) => void }) { const [form, setForm] = useState(draft); const update = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => setForm((current) => ({ ...current, [key]: value })); return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="Close task editor" /><form onSubmit={(event) => { event.preventDefault(); onSave(form); }} className="relative w-full max-w-xl rounded-card bg-[var(--color-surface)] p-6 shadow-[var(--shadow-menu)]"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">{task ? "Edit task" : "New task"}</h2><button type="button" onClick={onClose} className="rounded-control p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Close"><X className="h-4 w-4" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Task title" className="sm:col-span-2"><input required autoFocus value={form.title} onChange={(event) => update("title", event.target.value)} className="task-field" /></Field><Field label="Context"><input value={form.context} onChange={(event) => update("context", event.target.value)} className="task-field" /></Field><Field label="Category"><input value={form.category} onChange={(event) => update("category", event.target.value)} className="task-field" /></Field><Field label="Assignee"><select value={form.assignee} onChange={(event) => update("assignee", event.target.value)} className="task-field">{assignees.map((assignee) => <option key={assignee}>{assignee}</option>)}</select></Field><Field label="Due date"><input type="date" value={form.dueDate} onChange={(event) => update("dueDate", event.target.value)} className="task-field" /></Field><Field label="Priority"><select value={form.priority} onChange={(event) => update("priority", event.target.value as Task["priority"])} className="task-field">{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></Field><Field label="Status"><select value={form.status} onChange={(event) => update("status", event.target.value as Status)} className="task-field">{statuses.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}</select></Field></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 rounded-control px-4 text-sm font-semibold hover:bg-[var(--color-surface-muted)]">Cancel</button><button className="h-10 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">{task ? "Save changes" : "Create task"}</button></div></form></div>; }

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) { if (label === "Assignee") return null; return <label className={`grid gap-1.5 text-sm font-medium ${className}`}><span>{label}</span>{children}</label>; }
function formatDueDate(value: string) { return value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "No due date"; }
