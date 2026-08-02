"use client";

import { useState } from "react";
import { CalendarDays, Ellipsis, LayoutList, ListChecks, Plus, Share2, Users, X } from "lucide-react";
import { TASKS_BOARD } from "@/lib/sample-data";
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

const initialTasks: Task[] = TASKS_BOARD.flatMap((column) => column.items.map((task, index) => ({
  id: `${column.label}-${index}`,
  title: task.title,
  context: task.meta.split(" · ")[0],
  assignee: task.meta.split(" · ").at(-1) ?? "Unassigned",
  dueDate: `2026-07-${task.due.match(/\d+/)?.[0]?.padStart(2, "0") ?? "31"}`,
  priority: task.prio as Task["priority"],
  category: task.cat,
  status: statuses.find((status) => status.label === column.label)?.key ?? "todo",
})));

const emptyDraft = (status: Status = "todo"): TaskDraft => ({ title: "", context: "Studio operations", assignee: "Unassigned", dueDate: "", priority: "Med", category: "General", status });

export default function TasksBoardPage() {
  const { fireToast } = useToast();
  const [view, setView] = useState("Kanban");
  const [tasks, setTasks] = useState(initialTasks);
  const [editor, setEditor] = useState<{ task?: Task; draft: TaskDraft } | null>(null);

  function saveTask(draft: TaskDraft) {
    if (!draft.title.trim()) return;
    if (editor?.task) {
      setTasks((current) => current.map((task) => task.id === editor.task?.id ? { ...task, ...draft, title: draft.title.trim() } : task));
      fireToast("Task updated.", "success");
    } else {
      setTasks((current) => [...current, { ...draft, id: crypto.randomUUID(), title: draft.title.trim() }]);
      fireToast("Task created.", "success");
    }
    setEditor(null);
  }

  function moveTask(taskId: string, status: Status) {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status } : task));
    fireToast(`Task moved to ${statuses.find((item) => item.key === status)?.label}.`, "success");
  }

  return <div className="flex min-h-full min-w-0 flex-col bg-[var(--color-canvas)]">
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-5 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Projects / Operations</div><div className="mt-2 flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-[var(--color-indigo-500)] text-white"><ListChecks className="h-5 w-5" /></span><div className="min-w-0"><h1 className="truncate font-display text-[27px] font-semibold tracking-[-0.025em]">Studio operations</h1><div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-text-secondary)]"><span>Jul 1, 2026 - Jul 31, 2026</span><span>Kahel Studio</span><span className="font-semibold text-[var(--color-kahel-700)]">In progress</span></div></div></div></div><div className="flex items-center gap-2"><div className="hidden -space-x-2 sm:flex"><Avatar label="EB" /><Avatar label="MR" /><Avatar label="DS" /></div><button onClick={() => fireToast("Team invite dialog opened.", "info")} className="flex h-11 items-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"><Users className="h-4 w-4" /> Invite</button></div></div>
      <div className="mt-5 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between"><nav className="flex w-full gap-1 overflow-x-auto rounded-control bg-[var(--color-surface-muted)] p-1 sm:w-fit" aria-label="Task views">{views.map(([name, Icon]) => <button key={name} onClick={() => setView(name)} className={`flex h-9 shrink-0 items-center gap-1.5 rounded-[5px] px-3 text-sm font-semibold ${view === name ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}><Icon className="h-4 w-4" />{name}</button>)}</nav><button onClick={() => fireToast("Share link copied.", "success")} className="flex h-9 items-center justify-center gap-1.5 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"><Share2 className="h-4 w-4" /> Share board</button></div>
    </header>
    <main className="min-w-0 flex-1 overflow-x-auto p-5 sm:p-6 lg:p-8">{view === "Kanban" ? <KanbanBoard tasks={tasks} onAdd={(status) => setEditor({ draft: emptyDraft(status) })} onEdit={(task) => setEditor({ task, draft: { ...task } })} onMove={moveTask} /> : view === "List" ? <TaskList tasks={tasks} onEdit={(task) => setEditor({ task, draft: { ...task } })} /> : <TaskCalendar tasks={tasks} onEdit={(task) => setEditor({ task, draft: { ...task } })} />}</main>
    {editor && <TaskEditor task={editor.task} draft={editor.draft} onClose={() => setEditor(null)} onSave={saveTask} />}
  </div>;
}

function KanbanBoard({ tasks, onAdd, onEdit, onMove }: { tasks: Task[]; onAdd: (status: Status) => void; onEdit: (task: Task) => void; onMove: (id: string, status: Status) => void }) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  return <div className="grid min-w-[1040px] grid-cols-4 gap-4">{statuses.map((column, columnIndex) => { const columnTasks = tasks.filter((task) => task.status === column.key); return <section key={column.key} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId) onMove(draggedId, column.key); setDraggedId(null); }} className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"><div className="flex items-center gap-2 px-1 pb-3"><span className="h-5 w-1.5 rounded-pill" style={{ background: column.color }} /><h2 className="font-display text-base font-semibold">{column.label}</h2><span className="rounded-control bg-[var(--color-surface)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">{columnTasks.length}</span><button className="ml-auto rounded-control p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]" aria-label={`${column.label} options`}><Ellipsis className="h-4 w-4" /></button></div><div className="min-h-12 space-y-3">{columnTasks.map((task, index) => <TaskCard key={task.id} task={task} progress={column.key === "done" ? 100 : Math.min(12 + index * 18 + columnIndex * 18, 82)} onEdit={onEdit} onDragStart={() => setDraggedId(task.id)} />)}</div><button onClick={() => onAdd(column.key)} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-[var(--color-border-strong)] text-sm font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]"><Plus className="h-4 w-4" /> Add task</button></section>; })}</div>;
}

function TaskCard({ task, progress, onEdit, onDragStart }: { task: Task; progress: number; onEdit: (task: Task) => void; onDragStart: () => void }) { return <article draggable onDragStart={onDragStart} onClick={() => onEdit(task)} className="cursor-pointer rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-[0_4px_12px_-10px_rgba(0,0,0,.3)] transition-shadow hover:shadow-sm"><div className="flex items-center justify-between gap-2"><span className="rounded-pill px-2 py-0.5 text-[10px] font-semibold" style={priorityStyles[task.priority]}>{task.priority}</span><span className="rounded-pill bg-[var(--color-indigo-100)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-indigo-800)]">{task.category}</span></div><h3 className="mt-3 text-sm font-semibold leading-5">{task.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-4 text-[var(--color-text-secondary)]">{task.context} · {task.assignee}</p><div className="mt-4 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]"><span>{task.status === "done" ? "Done" : "Progress"}</span><span className="font-medium">{progress}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-[var(--color-surface-muted)]"><div className="h-full rounded-pill bg-[var(--color-kahel-500)]" style={{ width: `${progress}%` }} /></div><div className="mt-4 flex items-center justify-between"><Avatar label={initials(task.assignee)} small /><span className="text-[11px] text-[var(--color-text-muted)]">{formatDueDate(task.dueDate)}</span></div></article>; }

function TaskList({ tasks, onEdit }: { tasks: Task[]; onEdit: (task: Task) => void }) { return <section className="overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]"><div className="min-w-[760px]"><div className="grid grid-cols-[minmax(260px,1.6fr)_1fr_.8fr_.8fr_.7fr] gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-secondary)]"><span>Task</span><span>Assignee</span><span>Priority</span><span>Status</span><span>Due</span></div>{tasks.map((task) => <button key={task.id} onClick={() => onEdit(task)} className="grid w-full grid-cols-[minmax(260px,1.6fr)_1fr_.8fr_.8fr_.7fr] items-center gap-4 border-b border-[var(--color-border)] px-5 py-4 text-left text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"><div><div className="font-semibold">{task.title}</div><div className="mt-1 text-xs text-[var(--color-text-muted)]">{task.category}</div></div><div className="text-[13px] text-[var(--color-text-secondary)]">{task.assignee}</div><span className="w-fit rounded-pill px-2.5 py-1 text-[11px] font-semibold" style={priorityStyles[task.priority]}>{task.priority}</span><span className="w-fit rounded-pill bg-[var(--color-surface-muted)] px-2.5 py-1 text-[11px] font-semibold" style={{ color: statuses.find((status) => status.key === task.status)?.color }}>{statuses.find((status) => status.key === task.status)?.label}</span><span className="text-xs text-[var(--color-text-secondary)]">{formatDueDate(task.dueDate)}</span></button>)}</div></section>; }

function TaskCalendar({ tasks, onEdit }: { tasks: Task[]; onEdit: (task: Task) => void }) { const days = ["Mon 21", "Tue 22", "Wed 23", "Thu 24", "Fri 25"]; return <section className="overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]"><div className="min-w-[850px]"><div className="grid grid-cols-5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">{days.map((day) => <div key={day} className="border-r border-[var(--color-border)] px-4 py-3 text-sm font-semibold last:border-r-0">{day}</div>)}</div><div className="grid min-h-[470px] grid-cols-5">{days.map((day, index) => <div key={day} className="border-r border-[var(--color-border)] p-3 last:border-r-0">{tasks.filter((task) => new Date(`${task.dueDate}T12:00:00`).getDay() === index + 1).map((task) => <button key={task.id} onClick={() => onEdit(task)} className="mb-3 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-left"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: statuses.find((status) => status.key === task.status)?.color }} /><span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-muted)]">{statuses.find((status) => status.key === task.status)?.label}</span></div><div className="mt-2 text-xs font-semibold leading-4">{task.title}</div><div className="mt-1 text-[10px] text-[var(--color-text-secondary)]">{formatDueDate(task.dueDate)}</div></button>)}</div>)}</div></div></section>; }

function TaskEditor({ task, draft, onClose, onSave }: { task?: Task; draft: TaskDraft; onClose: () => void; onSave: (draft: TaskDraft) => void }) { const [form, setForm] = useState(draft); const update = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => setForm((current) => ({ ...current, [key]: value })); return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="Close task editor" /><form onSubmit={(event) => { event.preventDefault(); onSave(form); }} className="relative w-full max-w-xl rounded-card bg-[var(--color-surface)] p-6 shadow-[var(--shadow-menu)]"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">{task ? "Edit task" : "New task"}</h2><button type="button" onClick={onClose} className="rounded-control p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Close"><X className="h-4 w-4" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Task title" className="sm:col-span-2"><input required autoFocus value={form.title} onChange={(event) => update("title", event.target.value)} className="task-field" /></Field><Field label="Context"><input value={form.context} onChange={(event) => update("context", event.target.value)} className="task-field" /></Field><Field label="Category"><input value={form.category} onChange={(event) => update("category", event.target.value)} className="task-field" /></Field><Field label="Assignee"><select value={form.assignee} onChange={(event) => update("assignee", event.target.value)} className="task-field">{assignees.map((assignee) => <option key={assignee}>{assignee}</option>)}</select></Field><Field label="Due date"><input type="date" value={form.dueDate} onChange={(event) => update("dueDate", event.target.value)} className="task-field" /></Field><Field label="Priority"><select value={form.priority} onChange={(event) => update("priority", event.target.value as Task["priority"])} className="task-field">{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></Field><Field label="Status"><select value={form.status} onChange={(event) => update("status", event.target.value as Status)} className="task-field">{statuses.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}</select></Field></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 rounded-control px-4 text-sm font-semibold hover:bg-[var(--color-surface-muted)]">Cancel</button><button className="h-10 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">{task ? "Save changes" : "Create task"}</button></div></form></div>; }

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) { return <label className={`grid gap-1.5 text-sm font-medium ${className}`}><span>{label}</span>{children}</label>; }
function formatDueDate(value: string) { return value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "No due date"; }
function initials(name: string) { return name === "Unassigned" ? "?" : name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function Avatar({ label, small = false }: { label: string; small?: boolean }) { return <span className={`grid place-items-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-indigo-100)] font-display font-semibold text-[var(--color-indigo-800)] ${small ? "h-6 w-6 text-[9px]" : "h-8 w-8 text-[10px]"}`}>{label}</span>; }
