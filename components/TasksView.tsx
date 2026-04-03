'use client'

import { useState, useTransition, useMemo, useEffect, useRef } from 'react'
import type { Task } from '@/app/page'
import { createTask, toggleTask, deleteTask, updateTaskType } from '@/app/actions'

type View = 'today' | 'this_week' | 'next_week'
type TaskType = 'linkedin' | 'newsletter' | 'home'

const VIEW_LABELS: Record<View, string> = {
  today: 'Today',
  this_week: 'This Week',
  next_week: 'Next Week',
}

// 0=Sun 1=Mon … 6=Sat  — matches JS Date.getDay()
const DAY_LABELS: { day: number; short: string }[] = [
  { day: 1, short: 'Mon' },
  { day: 2, short: 'Tue' },
  { day: 3, short: 'Wed' },
  { day: 4, short: 'Thu' },
  { day: 5, short: 'Fri' },
  { day: 6, short: 'Sat' },
  { day: 0, short: 'Sun' },
]

// ── Task type config ──────────────────────────────────────────────────────────

function LinkedInSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="0.6" y="0.6" width="11.8" height="11.8" rx="2.4"/>
      <line x1="3.8" y1="5.8" x2="3.8" y2="9.5"/>
      <circle cx="3.8" cy="3.9" r="0.55" fill="currentColor" stroke="none"/>
      <path d="M6.3 5.8v3.7M6.3 7.3c0-1.5 3.3-1.8 3.3 0v2.2"/>
    </svg>
  )
}

function HomeSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 6.8L6.5 2l5 4.8"/>
      <path d="M3.2 5.8V11h2.4V8.5h1.8V11H9.8V5.8"/>
    </svg>
  )
}

function EmptyCircleSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.1">
      <circle cx="6.5" cy="6.5" r="5"/>
    </svg>
  )
}

const TYPE_CONFIG: Record<TaskType, { label: string; icon: React.ReactNode }> = {
  linkedin:   { label: 'LinkedIn',   icon: <LinkedInSvg /> },
  newsletter: { label: 'Newsletter', icon: <span className="text-[12px] leading-none">🐝</span> },
  home:       { label: 'Home',       icon: <HomeSvg /> },
}

const TASK_TYPES = Object.entries(TYPE_CONFIG) as [TaskType, { label: string; icon: React.ReactNode }][]

// ── TypePicker ────────────────────────────────────────────────────────────────

function TypePicker({
  current, onChange, inline = false,
}: {
  current: string | null
  onChange: (t: TaskType | null) => void
  /** inline=true renders the options directly (for use in forms) */
  inline?: boolean
}) {
  const [open, setOpen] = useState(false)

  const currentIcon = current && current in TYPE_CONFIG
    ? TYPE_CONFIG[current as TaskType].icon
    : <EmptyCircleSvg />

  if (inline) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`w-7 h-7 flex items-center justify-center rounded border transition-colors ${
            !current
              ? 'border-[#333] bg-[#1e1e1e] text-[#777]'
              : 'border-[#1a1a1a] bg-[#0f0f0f] text-[#555] hover:text-[#777]'
          }`}
          title="No type"
        >
          <EmptyCircleSvg />
        </button>
        {TASK_TYPES.map(([t, cfg]) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={`w-7 h-7 flex items-center justify-center rounded border transition-colors ${
              current === t
                ? 'border-[#333] bg-[#1e1e1e] text-[#aaa]'
                : 'border-[#1a1a1a] bg-[#0f0f0f] text-[#666] hover:text-[#999]'
            }`}
            title={cfg.label}
          >
            {cfg.icon}
          </button>
        ))}
      </div>
    )
  }

  // Attach close listener AFTER the current event loop so the click that
  // opened the popup doesn't immediately close it. Uses contains() to detect
  // outside clicks — no stopPropagation needed, works reliably on mobile too.
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const tid = setTimeout(() => {
      document.addEventListener('click', close)
      document.addEventListener('touchstart', close)
    }, 0)
    return () => {
      clearTimeout(tid)
      document.removeEventListener('click', close)
      document.removeEventListener('touchstart', close)
    }
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center justify-center w-5 h-5 transition-colors ${
          current ? 'text-[#777] hover:text-[#aaa]' : 'text-[#555] hover:text-[#888]'
        }`}
        title={current ? TYPE_CONFIG[current as TaskType]?.label : 'Set task type'}
      >
        {currentIcon}
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-50 bg-[#1c1c1c] border border-[#333] rounded-lg p-2 flex gap-1.5 shadow-2xl">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
              !current ? 'bg-[#2a2a2a] text-[#777]' : 'text-[#555] hover:text-[#999] hover:bg-[#252525]'
            }`}
            title="No type"
          >
            <EmptyCircleSvg />
          </button>
          {TASK_TYPES.map(([t, cfg]) => (
            <button
              key={t}
              type="button"
              onClick={() => { onChange(t); setOpen(false) }}
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                current === t ? 'bg-[#2a2a2a] text-[#ccc]' : 'text-[#555] hover:text-[#999] hover:bg-[#252525]'
              }`}
              title={cfg.label}
            >
              {cfg.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayISO() {
  return toLocalDateStr(new Date())
}

/** Returns [monday, sunday] YYYY-MM-DD strings for the week offset weeks from now */
function weekRange(offset = 0): [string, string] {
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return [toLocalDateStr(mon), toLocalDateStr(sun)]
}

function defaultDueDate(view: View): string {
  if (view === 'next_week') return weekRange(1)[0]
  return todayISO()
}

function viewSubtitle(view: View): string {
  if (view === 'today') {
    return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  }
  if (view === 'this_week') {
    const [s, e] = weekRange(0)
    const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return `${fmt(s)} – ${fmt(e)}`
  }
  const [s, e] = weekRange(1)
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(s)} – ${fmt(e)}`
}

function isTaskInView(task: Task, view: View): boolean {
  const today = todayISO()
  const [thisStart, thisEnd] = weekRange(0)
  const [nextStart, nextEnd] = weekRange(1)

  if (task.is_recurring && task.recurrence_day !== null) {
    const completedToday = task.last_completed_date === today
    if (view === 'today') {
      return new Date().getDay() === task.recurrence_day && !completedToday
    }
    return true
  }

  const due = task.due_date
  if (!due) return view === 'today'
  if (view === 'today') return due === today
  if (view === 'this_week') return due >= thisStart && due <= thisEnd
  return due >= nextStart && due <= nextEnd
}

function isCompleted(task: Task, view: View): boolean {
  if (task.is_recurring) {
    if (!task.last_completed_date || task.recurrence_day === null) return false
    const lcd = task.last_completed_date
    if (view === 'today') return lcd === todayISO()
    // For week views: done if completed on or after the task's scheduled day in that week.
    // Using >= (not a range) means the check naturally resets each week — last week's
    // completion date will be before the next occurrence, so the task appears fresh again.
    const weekOffset = view === 'next_week' ? 1 : 0
    const occurrence = toLocalDateStr(recurringDateInWeek(task.recurrence_day, weekOffset))
    return lcd >= occurrence
  }
  return task.completed
}

function recurringDateInWeek(recurrenceDay: number, weekOffset: number): Date {
  const [weekStart] = weekRange(weekOffset)
  const monday = new Date(weekStart + 'T12:00:00')
  const offset = (recurrenceDay - 1 + 7) % 7
  const d = new Date(monday)
  d.setDate(monday.getDate() + offset)
  return d
}

function recurringDateLabel(recurrenceDay: number, weekOffset: number): string {
  return recurringDateInWeek(recurrenceDay, weekOffset)
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function taskSortDate(task: Task, view: View): string {
  if (task.is_recurring && task.recurrence_day !== null) {
    if (view === 'today') return todayISO()
    const weekOffset = view === 'next_week' ? 1 : 0
    return toLocalDateStr(recurringDateInWeek(task.recurrence_day, weekOffset))
  }
  return task.due_date ?? '9999-12-31'
}

// ── Bucket ────────────────────────────────────────────────────────────────────

function Bucket({
  title, tasks, onToggle, onDelete, onTypeChange, completing, view,
}: {
  title: string
  tasks: Task[]
  onToggle: (t: Task) => void
  onDelete: (t: Task) => void
  onTypeChange: (t: Task, type: TaskType | null) => void
  completing: Set<string>
  view: View
}) {
  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aDone = isCompleted(a, view) && !completing.has(a.id) ? 1 : 0
      const bDone = isCompleted(b, view) && !completing.has(b.id) ? 1 : 0
      if (aDone !== bDone) return aDone - bDone
      const aDate = taskSortDate(a, view)
      const bDate = taskSortDate(b, view)
      return aDate < bDate ? -1 : aDate > bDate ? 1 : 0
    })
  }, [tasks, view, completing])

  if (sorted.length === 0) return null

  return (
    <div className="mb-6">
      <p className="text-[10px] font-semibold text-[#777] uppercase tracking-[.08em] mb-2.5">{title}</p>
      <div className="divide-y divide-[#0f0f0f]">
        {sorted.map(task => {
          const done = isCompleted(task, view)
          const isAnimating = completing.has(task.id)

          let dateLabel = ''
          if (task.is_recurring && task.recurrence_day !== null) {
            if (view === 'today') {
              dateLabel = 'weekly'
            } else {
              const weekOffset = view === 'next_week' ? 1 : 0
              dateLabel = recurringDateLabel(task.recurrence_day, weekOffset)
            }
          } else if (task.due_date) {
            dateLabel = new Date(task.due_date + 'T12:00:00')
              .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          }

          return (
            <div
              key={task.id}
              className={`group flex items-center gap-2.5 py-2 transition-all duration-500 ${
                isAnimating ? 'opacity-0 translate-y-1' : ''
              }`}
            >
              {/* Completion toggle */}
              <button
                onClick={() => onToggle(task)}
                className={`w-[15px] h-[15px] rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  done ? 'border-[#222] bg-[#1a1a1a]' : 'border-[#333] hover:border-[#555]'
                }`}
              >
                {done && <span className="text-[8px] text-[#555]">✓</span>}
              </button>

              {/* Title */}
              <span className={`text-[13px] flex-1 transition-colors duration-200 ${done ? 'line-through text-[#666]' : 'text-[#d4d4d4]'}`}>
                {task.title}
              </span>

              {/* Date label */}
              {dateLabel && (
                <span className={`text-[11px] tabular-nums shrink-0 ${done ? 'text-[#4a4a4a]' : 'text-[#777]'}`}>
                  {dateLabel}
                </span>
              )}

              {/* Type icon */}
              <TypePicker
                current={task.task_type}
                onChange={type => onTypeChange(task, type)}
              />

              {/* Recurring indicator */}
              {task.is_recurring && view !== 'today' && (
                <span className={`text-[11px] shrink-0 leading-none ${done ? 'opacity-40' : 'opacity-70'}`}>🔁</span>
              )}

              {/* Category badge */}
              {task.category && (
                <span className="text-[10px] text-[#666] border border-[#222] rounded-full px-1.5 py-0.5 shrink-0">
                  {task.category}
                </span>
              )}

              {/* Delete */}
              <button
                onClick={() => onDelete(task)}
                className="text-[#444] hover:text-[#999] transition-colors shrink-0 px-1"
                title={task.is_recurring ? 'Delete entire recurring series' : 'Delete task'}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1.5 3h9M4.5 3V2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M2.5 3l.5 7h6l.5-7"/>
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TasksView({ tasks }: { tasks: Task[] }) {
  const [view, setView] = useState<View>('today')
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks)
  const [completing, setCompleting] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  // Add-task form state
  const [addTitle, setAddTitle] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurDay, setRecurDay] = useState<number>(1)
  const [dueDate, setDueDate] = useState(defaultDueDate('today'))
  const [bucket, setBucket] = useState<'must_do' | 'nice_to_have'>('must_do')
  const [newTaskType, setNewTaskType] = useState<TaskType | null>(null)

  function switchView(v: View) {
    setView(v)
    if (!isRecurring) setDueDate(defaultDueDate(v))
  }

  const viewTasks = localTasks.filter(t => isTaskInView(t, view))
  const mustDo = viewTasks.filter(t => t.bucket === 'must_do')
  const niceTo = viewTasks.filter(t => t.bucket === 'nice_to_have')
  const nextWeekCount = localTasks.filter(t => isTaskInView(t, 'next_week')).length

  function handleDelete(task: Task) {
    if (task.is_recurring) {
      if (!window.confirm(`Delete the entire "${task.title}" recurring series? This cannot be undone.`)) return
    }
    setLocalTasks(ts => ts.filter(t => t.id !== task.id))
    startTransition(() => deleteTask(task.id))
  }

  function handleToggle(task: Task) {
    const done = isCompleted(task, view)
    const next = !done

    setLocalTasks(ts => ts.map(t => {
      if (t.id !== task.id) return t
      if (task.is_recurring) return { ...t, last_completed_date: next ? todayISO() : null }
      return { ...t, completed: next }
    }))

    if (next) {
      setCompleting(s => new Set([...s, task.id]))
      setTimeout(() => {
        setCompleting(s => {
          const n = new Set(s)
          n.delete(task.id)
          return n
        })
      }, 500)
    }

    startTransition(() => toggleTask(task.id, next, task.is_recurring))
  }

  function handleTypeChange(task: Task, type: TaskType | null) {
    setLocalTasks(ts => ts.map(t => t.id === task.id ? { ...t, task_type: type } : t))
    startTransition(() => updateTaskType(String(task.id), type))
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = addTitle.trim()
    if (!title) return

    const fd = new FormData()
    fd.set('title', title)
    fd.set('bucket', bucket)
    fd.set('is_recurring', isRecurring ? 'true' : 'false')
    if (isRecurring) {
      fd.set('recurrence_day', String(recurDay))
    } else {
      fd.set('due_date', dueDate)
    }
    if (newTaskType) fd.set('task_type', newTaskType)

    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      bucket,
      due_date: isRecurring ? null : dueDate,
      is_recurring: isRecurring,
      recurrence_day: isRecurring ? recurDay : null,
      last_completed_date: null,
      completed: false,
      category: null,
      task_type: newTaskType,
      created_at: new Date().toISOString(),
    }

    setLocalTasks(ts => [...ts, newTask])
    setAddTitle('')
    startTransition(() => createTask(fd))
  }

  return (
    <div className="px-6 md:px-8 pt-8 pb-6 max-w-xl">
      {/* Title */}
      <h1 className="text-[20px] font-semibold text-white mb-1">{VIEW_LABELS[view]}</h1>
      <p suppressHydrationWarning className="text-[12px] text-[#888] mb-5">{viewSubtitle(view)}</p>

      {/* View toggle */}
      <div className="inline-flex bg-[#111] border border-[#1a1a1a] rounded-md mb-6">
        {(['today', 'this_week', 'next_week'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => switchView(v)}
            className={`px-3.5 py-1.5 text-[12px] rounded-[5px] transition-colors ${
              view === v ? 'bg-[#1e1e1e] text-[#ccc]' : 'text-[#666] hover:text-[#999]'
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      {/* Add task form — only in Today view */}
      {view !== 'today' ? null : <form onSubmit={handleAdd} className="mb-7 space-y-2">
        <input
          value={addTitle}
          onChange={e => setAddTitle(e.target.value)}
          placeholder="Add a task…"
          autoComplete="off"
          className="w-full bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-[13px] text-[#ccc] placeholder:text-[#2e2e2e] focus:outline-none focus:border-[#2a2a2a]"
        />

        <div className="flex items-center gap-2 flex-wrap">

          {/* Due date OR day picker */}
          {isRecurring ? (
            <div className="flex gap-1">
              {DAY_LABELS.map(({ day, short }) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setRecurDay(day)}
                  className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                    recurDay === day
                      ? 'bg-[#1e1e1e] border-[#333] text-[#ccc]'
                      : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#666] hover:text-[#999]'
                  }`}
                >{short}</button>
              ))}
            </div>
          ) : (
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-md px-2 py-1 text-[11px] text-[#777] focus:outline-none focus:border-[#333]"
            />
          )}

          {/* Task type picker */}
          <TypePicker inline current={newTaskType} onChange={t => setNewTaskType(t)} />

          {/* Recurring toggle */}
          <button
            type="button"
            onClick={() => setIsRecurring(v => !v)}
            className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors ${
              isRecurring
                ? 'bg-[#1e1e1e] border-[#333] text-[#aaa]'
                : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#666] hover:text-[#999]'
            }`}
          >🔁 Recurring</button>

          {/* Bucket toggle */}
          <button
            type="button"
            onClick={() => setBucket(b => b === 'must_do' ? 'nice_to_have' : 'must_do')}
            className="px-2.5 py-1 rounded-md text-[11px] border border-[#1a1a1a] bg-[#0f0f0f] text-[#666] hover:text-[#999] transition-colors"
          >
            {bucket === 'must_do' ? '★ Must Do' : '◇ Nice to Have'}
          </button>

          <button
            type="submit"
            className="ml-auto bg-[#1e1e1e] border border-[#2a2a2a] text-[#ccc] rounded-lg px-3 py-1.5 text-[12px] hover:bg-[#242424] transition-colors"
          >
            + Add
          </button>
        </div>
      </form>}

      {/* Buckets */}
      <Bucket title="Must Do"       tasks={mustDo} onToggle={handleToggle} onDelete={handleDelete} onTypeChange={handleTypeChange} completing={completing} view={view} />
      <Bucket title="Nice to Have"  tasks={niceTo} onToggle={handleToggle} onDelete={handleDelete} onTypeChange={handleTypeChange} completing={completing} view={view} />

      {/* Next week collapsed row */}
      {view !== 'next_week' && (
        <button
          onClick={() => switchView('next_week')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#0d0d0d] border border-[#141414] rounded-lg mt-2 text-left"
        >
          <span className="text-[12px] text-[#888]">Next Week</span>
          <span className="text-[12px] text-[#777]">{nextWeekCount} tasks ›</span>
        </button>
      )}
    </div>
  )
}
