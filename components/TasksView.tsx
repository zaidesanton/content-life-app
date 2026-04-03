'use client'

import { useState, useTransition } from 'react'
import type { Task } from '@/app/page'
import { createTask, toggleTask } from '@/app/actions'

type View = 'today' | 'this_week' | 'next_week'

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

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

/** Returns [monday, sunday] YYYY-MM-DD strings for the week offset weeks from now */
function weekRange(offset = 0): [string, string] {
  const now = new Date()
  const dow = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((dow + 6) % 7) + offset * 7)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return [mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)]
}

function defaultDueDate(view: View): string {
  if (view === 'next_week') return weekRange(1)[0] // Next Monday
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
    // Show recurring in this_week and next_week (they always recur)
    return true
  }

  const due = task.due_date
  if (!due) return view === 'today'
  if (view === 'today') return due === today
  if (view === 'this_week') return due >= thisStart && due <= thisEnd
  return due >= nextStart && due <= nextEnd
}

function isCompleted(task: Task): boolean {
  if (task.is_recurring) return task.last_completed_date === todayISO()
  return task.completed
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** For a recurring task, return the actual calendar date it falls on within the given week offset */
function recurringDateLabel(recurrenceDay: number, weekOffset: number): string {
  const [weekStart] = weekRange(weekOffset)
  const monday = new Date(weekStart + 'T12:00:00')
  const offset = (recurrenceDay - 1 + 7) % 7 // Mon=0 … Sun=6
  const d = new Date(monday)
  d.setDate(monday.getDate() + offset)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function Bucket({
  title, tasks, onToggle, view,
}: {
  title: string
  tasks: Task[]
  onToggle: (t: Task) => void
  view: View
}) {
  if (tasks.length === 0) return null
  return (
    <div className="mb-6">
      <p className="text-[10px] font-semibold text-[#555] uppercase tracking-[.08em] mb-2.5">{title}</p>
      <div className="divide-y divide-[#0f0f0f]">
        {tasks.map(task => {
          const done = isCompleted(task)
          // Compute date label
          let dateLabel = ''
          if (task.is_recurring && task.recurrence_day !== null) {
            if (view === 'today') {
              dateLabel = '🔁 weekly'
            } else {
              const weekOffset = view === 'next_week' ? 1 : 0
              dateLabel = recurringDateLabel(task.recurrence_day, weekOffset)
            }
          } else if (task.due_date) {
            dateLabel = new Date(task.due_date + 'T12:00:00')
              .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          }

          return (
            <div key={task.id} className="flex items-center gap-2.5 py-2">
              <button
                onClick={() => onToggle(task)}
                className={`w-[15px] h-[15px] rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  done ? 'border-[#222] bg-[#1a1a1a]' : 'border-[#333] hover:border-[#555]'
                }`}
              >
                {done && <span className="text-[8px] text-[#555]">✓</span>}
              </button>
              <span className={`text-[13px] flex-1 ${done ? 'line-through text-[#333]' : 'text-[#bbb]'}`}>
                {task.title}
              </span>
              {dateLabel && (
                <span className={`text-[11px] tabular-nums shrink-0 ${done ? 'text-[#333]' : 'text-[#666]'}`}>
                  {task.is_recurring && view !== 'today' && <span className="mr-1 text-[#444]">🔁</span>}
                  {dateLabel.replace('🔁 ', '')}
                </span>
              )}
              {task.category && (
                <span className="text-[10px] text-[#444] border border-[#1a1a1a] rounded-full px-1.5 py-0.5">
                  {task.category}
                </span>
              )}
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
  const [, startTransition] = useTransition()

  // Add-task form state
  const [addTitle, setAddTitle] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurDay, setRecurDay] = useState<number>(1) // Default Monday
  const [dueDate, setDueDate] = useState(defaultDueDate('today'))
  const [bucket, setBucket] = useState<'must_do' | 'nice_to_have'>('must_do')

  // Re-sync due date default when view changes
  function switchView(v: View) {
    setView(v)
    if (!isRecurring) setDueDate(defaultDueDate(v))
  }

  const viewTasks = localTasks.filter(t => isTaskInView(t, view))
  const mustDo = viewTasks.filter(t => t.bucket === 'must_do')
  const niceTo = viewTasks.filter(t => t.bucket === 'nice_to_have')
  const nextWeekCount = localTasks.filter(t => isTaskInView(t, 'next_week')).length

  function handleToggle(task: Task) {
    const done = isCompleted(task)
    const next = !done
    setLocalTasks(ts => ts.map(t => {
      if (t.id !== task.id) return t
      if (task.is_recurring) return { ...t, last_completed_date: next ? todayISO() : null }
      return { ...t, completed: next }
    }))
    startTransition(() => toggleTask(task.id, next, task.is_recurring))
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
      <p suppressHydrationWarning className="text-[12px] text-[#666] mb-5">{viewSubtitle(view)}</p>

      {/* View toggle */}
      <div className="inline-flex bg-[#111] border border-[#1a1a1a] rounded-md mb-6">
        {(['today', 'this_week', 'next_week'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => switchView(v)}
            className={`px-3.5 py-1.5 text-[12px] rounded-[5px] transition-colors ${
              view === v ? 'bg-[#1e1e1e] text-[#ccc]' : 'text-[#444] hover:text-[#777]'
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      {/* Add task form */}
      <form onSubmit={handleAdd} className="mb-7 space-y-2">
        {/* Row 1: title input */}
        <input
          value={addTitle}
          onChange={e => setAddTitle(e.target.value)}
          placeholder="Add a task…"
          autoComplete="off"
          className="w-full bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-[13px] text-[#ccc] placeholder:text-[#2e2e2e] focus:outline-none focus:border-[#2a2a2a]"
        />

        {/* Row 2: options */}
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
                      : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#444] hover:text-[#777]'
                  }`}
                >{short}</button>
              ))}
            </div>
          ) : (
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-md px-2 py-1 text-[11px] text-[#555] focus:outline-none focus:border-[#333]"
            />
          )}

          {/* Recurring toggle */}
          <button
            type="button"
            onClick={() => setIsRecurring(v => !v)}
            className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors ${
              isRecurring
                ? 'bg-[#1e1e1e] border-[#333] text-[#aaa]'
                : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#444] hover:text-[#777]'
            }`}
          >🔁 Recurring</button>

          {/* Bucket toggle */}
          <button
            type="button"
            onClick={() => setBucket(b => b === 'must_do' ? 'nice_to_have' : 'must_do')}
            className="px-2.5 py-1 rounded-md text-[11px] border border-[#1a1a1a] bg-[#0f0f0f] text-[#444] hover:text-[#777] transition-colors"
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
      </form>

      {/* Buckets */}
      <Bucket title="Must Do" tasks={mustDo} onToggle={handleToggle} view={view} />
      <Bucket title="Nice to Have" tasks={niceTo} onToggle={handleToggle} view={view} />

      {/* Next week collapsed row */}
      {view !== 'next_week' && (
        <button
          onClick={() => switchView('next_week')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#0d0d0d] border border-[#141414] rounded-lg mt-2 text-left"
        >
          <span className="text-[12px] text-[#666]">Next Week</span>
          <span className="text-[12px] text-[#555]">{nextWeekCount} tasks ›</span>
        </button>
      )}
    </div>
  )
}
