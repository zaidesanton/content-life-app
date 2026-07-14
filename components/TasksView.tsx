'use client'

import { useState, useTransition, useMemo, useEffect, useRef } from 'react'
import type { Task } from '@/app/page'
import { createTask, toggleTask, deleteTask, deleteRecurringTask, updateTaskType, updateTaskDate, updateTaskDescription, updateTaskTitle, updateRecurringSeries, skipTask } from '@/app/actions'
import PageTabs from '@/components/PageTabs'
import DraftsPanel from '@/components/DraftsPanel'
import type { Draft } from '@/components/DraftsPanel'
import BotTasksPanel from '@/components/BotTasksPanel'
import type { BotTask } from '@/components/BotTasksPanel'
import Sidebar from '@/components/Sidebar'
import type { Section } from '@/components/Sidebar'

type View = 'today' | 'this_week' | 'next_week'
type TaskType = 'linkedin' | 'newsletter' | 'home'
type EditScope = 'instance' | 'series'
type EditPatch = { title?: string; description?: string | null }

// ── SVG icons ─────────────────────────────────────────────────────────────────

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
  inline?: boolean
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
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
            !current ? 'border-[#333] bg-[#1e1e1e] text-[#777]' : 'border-[#1a1a1a] bg-[#0f0f0f] text-[#555] hover:text-[#777]'
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
              current === t ? 'border-[#333] bg-[#1e1e1e] text-[#aaa]' : 'border-[#1a1a1a] bg-[#0f0f0f] text-[#666] hover:text-[#999]'
            }`}
            title={cfg.label}
          >
            {cfg.icon}
          </button>
        ))}
      </div>
    )
  }

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

// Returns [sunday, saturday] of the given week (offset 0 = current, 1 = next)
function weekRange(offset = 0): [string, string] {
  const now = new Date()
  const sun = new Date(now)
  sun.setDate(now.getDate() - now.getDay() + offset * 7)
  sun.setHours(0, 0, 0, 0)
  const sat = new Date(sun)
  sat.setDate(sun.getDate() + 6)
  return [toLocalDateStr(sun), toLocalDateStr(sat)]
}

function defaultDueDate(view: View): string {
  if (view === 'next_week') return weekRange(1)[0]
  return todayISO()
}

function viewSubtitle(view: View): string {
  if (view === 'today') {
    return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  }
  const [s, e] = weekRange(view === 'next_week' ? 1 : 0)
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(s)} – ${fmt(e)}`
}

// ── Task helpers ──────────────────────────────────────────────────────────────

function isCompleted(task: Task): boolean {
  return !!task.completed_date
}

function isSkipped(task: Task): boolean {
  return !!task.skipped_date
}

// Resolved = done with, either way: completed OR marked "won't do".
function isResolved(task: Task): boolean {
  return !!task.completed_date || !!task.skipped_date
}

function isTaskInView(task: Task, view: View): boolean {
  const today = todayISO()
  if (view === 'today') {
    return task.due_date === today || (task.due_date < today && !isResolved(task))
  }
  if (view === 'next_week') {
    const [start, end] = weekRange(1)
    return task.due_date >= start && task.due_date <= end
  }
  // this_week: tasks due this week, PLUS anything overdue and still open (shown
  // with its real — earlier — date so you can see how far behind it is).
  const [start, end] = weekRange(0)
  if (task.due_date > end) return false
  if (task.due_date >= start) return true
  return !isResolved(task)
}

// ── Burst + All-Done ──────────────────────────────────────────────────────────

const BURST_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff', '#ff9f43', '#ff6bff', '#06d6a0', '#fb923c', '#38bdf8']

function BurstParticles() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const count = 48
    const particles = Array.from({ length: count }, (_, i) => {
      const angle = (360 / count) * i + (Math.random() * 14 - 7)
      const dist = 90 + Math.random() * 160
      const tx = Math.cos((angle * Math.PI) / 180) * dist
      const ty = Math.sin((angle * Math.PI) / 180) * dist - 40
      const size = 5 + Math.random() * 9
      const isCircle = i % 3 !== 0

      const p = document.createElement('div')
      p.style.cssText = `
        position:absolute; left:50%; top:50%;
        width:${size}px; height:${isCircle ? size : size * 0.5}px;
        background:${BURST_COLORS[i % BURST_COLORS.length]};
        border-radius:${isCircle ? '50%' : '2px'};
        opacity:0;
      `
      el.appendChild(p)
      return { p, tx, ty }
    })

    particles.forEach(({ p, tx, ty }) => {
      const delay = Math.random() * 180
      const dur = 650 + Math.random() * 350
      setTimeout(() => {
        p.animate(
          [
            { transform: 'translate(-50%,-50%) scale(0)', opacity: 1 },
            { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0.15)`, opacity: 0 },
          ],
          { duration: dur, easing: 'cubic-bezier(0.2,0.8,0.4,1)', fill: 'forwards' }
        )
      }, delay)
    })

    return () => { particles.forEach(({ p }) => { try { p.remove() } catch {} }) }
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
      {/* Expanding ring at center */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: 56, height: 56, marginLeft: -28, marginTop: -28,
        border: '3px solid rgba(255,255,255,0.65)',
        borderRadius: '50%',
        animation: 'pulseRingOut 0.65s ease-out forwards',
      }} />
      {/* Second ring, slightly delayed */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: 56, height: 56, marginLeft: -28, marginTop: -28,
        border: '2px solid rgba(255,220,100,0.5)',
        borderRadius: '50%',
        animation: 'pulseRingOut 0.65s ease-out 120ms forwards',
      }} />
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  )
}

function AllDoneScreen() {
  return (
    <div className="-mx-6 md:-mx-8 pt-2 pb-6">
      <img
        src="/all-done.jpg"
        alt="You are all done. Rest."
        className="w-full rounded-2xl shadow-2xl object-cover"
        style={{
          height: 'calc(100svh - 9rem)',
          animation: 'restImageIn 0.9s cubic-bezier(0.22,1,0.36,1) forwards',
        }}
      />
    </div>
  )
}

// ── Day labels ────────────────────────────────────────────────────────────────

const DAY_LABELS: { day: number; short: string }[] = [
  { day: 0, short: 'Sun' },
  { day: 1, short: 'Mon' },
  { day: 2, short: 'Tue' },
  { day: 3, short: 'Wed' },
  { day: 4, short: 'Thu' },
  { day: 5, short: 'Fri' },
  { day: 6, short: 'Sat' },
]

// ── TaskRow ───────────────────────────────────────────────────────────────────

function NoteSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 2.5h9v6l-2.5 2.5h-6.5z"/>
      <path d="M11.5 8.5H9v2.5"/>
      <path d="M4.5 5h5M4.5 7h3"/>
    </svg>
  )
}

// Circle-with-slash — "won't do (but was planned)"
function BanSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <circle cx="7" cy="7" r="5.2"/>
      <line x1="3.3" y1="3.3" x2="10.7" y2="10.7"/>
    </svg>
  )
}

function TaskRow({
  task, onToggle, onDelete, onTypeChange, onDateChange, onEdit, onSkip, isAnimating, view,
}: {
  task: Task
  onToggle: (t: Task) => void
  onDelete: (t: Task) => void
  onTypeChange: (t: Task, type: TaskType | null) => void
  onDateChange: (t: Task, newDate: string) => void
  onEdit: (t: Task, patch: EditPatch, scope: EditScope) => void
  onSkip: (t: Task) => void
  isAnimating: boolean
  view: View
}) {
  const done = isCompleted(task)
  const skipped = isSkipped(task)
  const isRecurring = !!task.recurring_task_id
  const dateInputRef = useRef<HTMLInputElement>(null)

  // Edits to a recurring task are stashed here until the user picks a scope
  // (this instance vs. the whole series). Non-recurring edits apply immediately.
  const [pending, setPending] = useState<EditPatch | null>(null)

  const displayTitle = pending?.title ?? task.title
  const displayDescription = pending && 'description' in pending ? pending.description : task.description
  const hasDescription = !!displayDescription?.trim()

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [showNote, setShowNote] = useState(false)
  const [draft, setDraft] = useState(task.description ?? '')
  const noteRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setDraft(task.description ?? '') }, [task.description])

  // Grow the note box to fit its content (wrapped lines included), so long
  // notes aren't clipped when expanded.
  useEffect(() => {
    const el = noteRef.current
    if (!showNote || !el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [showNote, draft])
  useEffect(() => { setTitleDraft(task.title) }, [task.title])

  // Route an edit: recurring tasks defer to the scope chooser; others save now.
  function applyEdit(patch: EditPatch) {
    if (isRecurring) setPending(p => ({ ...(p ?? {}), ...patch }))
    else onEdit(task, patch, 'instance')
  }

  function chooseScope(scope: EditScope) {
    if (pending) onEdit(task, pending, scope)
    setPending(null)
  }

  function commitTitle() {
    setEditingTitle(false)
    const next = titleDraft.trim()
    if (!next || next === displayTitle) { setTitleDraft(displayTitle); return }
    applyEdit({ title: next })
  }

  function commitNote() {
    const next = draft.trim() || null
    if (next !== (displayDescription ?? null)) applyEdit({ description: next })
    if (!next) setShowNote(false)
  }

  const fullDateLabel = new Date(task.due_date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
  const isOverdue = task.due_date < todayISO() && !isResolved(task)
  // In the week views every row shows its date. In Today, only overdue rows do
  // (so you can see how far behind they are); on-time rows show the day-picker icon.
  const dateLabel = view === 'today' ? '' : fullDateLabel

  return (
   <div className={`group transition-all duration-500 ${isAnimating ? 'opacity-0 translate-y-1' : ''}`}>
    <div className="flex items-center gap-2.5 py-2">
      <button
        onClick={() => onToggle(task)}
        className={`w-[15px] h-[15px] rounded-full border flex items-center justify-center shrink-0 transition-colors ${
          done ? 'border-[#222] bg-[#1a1a1a]' : 'border-[#333] hover:border-[#555]'
        }`}
      >
        {done && <span className="text-[8px] text-[#555]">✓</span>}
      </button>

      {editingTitle ? (
        <input
          autoFocus
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitTitle() }
            else if (e.key === 'Escape') { setTitleDraft(displayTitle); setEditingTitle(false) }
          }}
          className="flex-1 min-w-0 bg-[#0d0d0d] border border-[#2c2c2c] rounded px-1.5 py-0.5 text-[13px] text-[#d4d4d4] focus:outline-none focus:border-[#3a3a3a]"
        />
      ) : (
        <span
          onClick={() => { setTitleDraft(displayTitle); setEditingTitle(true) }}
          title="Click to edit"
          className={`text-[13px] flex-1 min-w-0 cursor-text transition-colors duration-200 ${
            done ? 'line-through text-[#666]' : skipped ? 'line-through italic text-[#5c5c5c]' : 'text-[#d4d4d4]'
          }`}
        >
          {displayTitle}
          {skipped && (
            <span className="ml-2 align-middle text-[9px] not-italic uppercase tracking-wide text-[#9a6a6a] border border-[#3a2b2b] rounded px-1 py-[1px]">
              won&apos;t do
            </span>
          )}
        </span>
      )}

      {view === 'today' ? (
        isOverdue ? (
          // Overdue in Today view: show its real (past) date so you can see how
          // far behind it is. Still clickable to reschedule.
          <div className="relative shrink-0 cursor-pointer" onClick={() => { try { dateInputRef.current?.showPicker() } catch {} }} title="Overdue — change day">
            <span className="text-[11px] tabular-nums text-[#c08a5a] hover:text-[#d9a06a] transition-colors">
              {fullDateLabel}
            </span>
            <input
              ref={dateInputRef}
              key={task.due_date}
              type="date"
              defaultValue={task.due_date}
              onChange={e => { if (e.target.value) onDateChange(task, e.target.value) }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              tabIndex={-1}
            />
          </div>
        ) : (
          // On-time: a calendar icon opens the date picker so the day can still be changed.
          <div className="relative shrink-0 cursor-pointer" onClick={() => { try { dateInputRef.current?.showPicker() } catch {} }} title="Change day">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-colors ${done ? 'text-[#555]' : 'text-[#777] hover:text-[#bbb]'}`}>
              <rect x="1.5" y="2.5" width="11" height="10" rx="1.5"/>
              <path d="M1.5 5.5h11M4.5 1v2.5M9.5 1v2.5"/>
            </svg>
            <input
              ref={dateInputRef}
              key={task.due_date}
              type="date"
              defaultValue={task.due_date}
              onChange={e => { if (e.target.value) onDateChange(task, e.target.value) }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              tabIndex={-1}
            />
          </div>
        )
      ) : dateLabel && (
        <div className="relative shrink-0 cursor-pointer" onClick={() => { try { dateInputRef.current?.showPicker() } catch {} }}>
          <span className={`text-[11px] tabular-nums transition-colors ${done ? 'text-[#555]' : 'text-[#999] hover:text-[#bbb]'}`}>
            {dateLabel}
          </span>
          <input
            ref={dateInputRef}
            key={task.due_date}
            type="date"
            defaultValue={task.due_date}
            onChange={e => { if (e.target.value) onDateChange(task, e.target.value) }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            tabIndex={-1}
          />
        </div>
      )}

      <TypePicker current={task.task_type} onChange={type => onTypeChange(task, type)} />

      {isRecurring && view !== 'today' && (
        <span className={`text-[11px] shrink-0 leading-none ${done ? 'opacity-40' : 'opacity-70'}`}>🔁</span>
      )}

      {task.category && (
        <span className="text-[10px] text-[#666] border border-[#222] rounded-full px-1.5 py-0.5 shrink-0">
          {task.category}
        </span>
      )}

      <button
        onClick={() => onSkip(task)}
        className={`transition-colors shrink-0 px-1 ${
          skipped ? 'text-[#a06a6a] hover:text-[#c98a8a]' : 'text-[#333] hover:text-[#888] opacity-0 group-hover:opacity-100'
        }`}
        title={skipped ? "Undo — didn't skip after all" : "Won't do (but was planned)"}
      >
        <BanSvg />
      </button>

      <button
        onClick={() => setShowNote(v => !v)}
        className={`transition-colors shrink-0 px-1 ${
          hasDescription ? 'text-[#777] hover:text-[#bbb]' : 'text-[#333] hover:text-[#888] opacity-0 group-hover:opacity-100'
        }`}
        title={hasDescription ? 'Show note' : 'Add a note'}
      >
        <NoteSvg />
      </button>

      <button
        onClick={() => onDelete(task)}
        className="text-[#444] hover:text-[#999] transition-colors shrink-0 px-1"
        title={isRecurring ? 'Delete recurring series' : 'Delete task'}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 3h9M4.5 3V2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M2.5 3l.5 7h6l.5-7"/>
        </svg>
      </button>
    </div>

    {showNote && (
      <div className="pl-[25px] pr-1 pb-2 -mt-0.5">
        <textarea
          ref={noteRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitNote}
          placeholder="Add a note…"
          rows={2}
          className="w-full min-h-[3.5rem] max-h-72 overflow-y-auto bg-[#0d0d0d] border border-[#1a1a1a] rounded-md px-2.5 py-1.5 text-[12px] leading-relaxed text-[#b0b0b0] placeholder:text-[#3a3a3a] focus:outline-none focus:border-[#2c2c2c] resize-none whitespace-pre-wrap"
        />
      </div>
    )}

    {pending && isRecurring && (
      <div className="pl-[25px] pr-1 pb-2 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-[#888]">Apply edit to</span>
        <button
          type="button"
          onClick={() => chooseScope('instance')}
          className="px-2.5 py-1 rounded-md text-[11px] border border-[#2a2a2a] bg-[#161616] text-[#ccc] hover:bg-[#1e1e1e] transition-colors"
        >This task only</button>
        <button
          type="button"
          onClick={() => chooseScope('series')}
          className="px-2.5 py-1 rounded-md text-[11px] border border-[#2a2a2a] bg-[#161616] text-[#ccc] hover:bg-[#1e1e1e] transition-colors"
        >🔁 Whole series</button>
        <button
          type="button"
          onClick={() => setPending(null)}
          className="px-2 py-1 rounded-md text-[11px] text-[#666] hover:text-[#999] transition-colors"
        >Cancel</button>
      </div>
    )}
   </div>
  )
}

// ── Bucket ────────────────────────────────────────────────────────────────────

function Bucket({
  title, tasks, onToggle, onDelete, onTypeChange, onDateChange, onEdit, onSkip, completing, view,
}: {
  title: string
  tasks: Task[]
  onToggle: (t: Task) => void
  onDelete: (t: Task) => void
  onTypeChange: (t: Task, type: TaskType | null) => void
  onDateChange: (t: Task, newDate: string) => void
  onEdit: (t: Task, patch: EditPatch, scope: EditScope) => void
  onSkip: (t: Task) => void
  completing: Set<string>
  view: View
}) {
  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aDone = isResolved(a) && !completing.has(String(a.id)) ? 1 : 0
      const bDone = isResolved(b) && !completing.has(String(b.id)) ? 1 : 0
      if (aDone !== bDone) return aDone - bDone
      return a.due_date < b.due_date ? -1 : 1
    })
  }, [tasks, completing])

  if (sorted.length === 0) return null

  return (
    <div className="mb-6">
      <p className="text-[10px] font-semibold text-[#999] uppercase tracking-[.08em] mb-2.5">{title}</p>
      <div className="divide-y divide-[#0f0f0f]">
        {sorted.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={onToggle}
            onDelete={onDelete}
            onTypeChange={onTypeChange}
            onDateChange={onDateChange}
            onEdit={onEdit}
            onSkip={onSkip}
            isAnimating={completing.has(String(task.id))}
            view={view}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TasksView({ tasks, drafts, botTasks }: { tasks: Task[]; drafts: Draft[]; botTasks: BotTask[] }) {
  const [view, setView] = useState<View>('today')
  const [section, setSection] = useState<Section>('tasks')
  // Start collapsed (safe for SSR/hydration), then expand on desktop after mount.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) setSidebarCollapsed(false)
  }, [])
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks)
  const [completing, setCompleting] = useState<Set<string>>(new Set())

  function selectSection(s: Section) {
    setSection(s)
    // On mobile the sidebar is a drawer — close it after picking a section.
    if (window.matchMedia('(max-width: 767px)').matches) setSidebarCollapsed(true)
  }

  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])
  const [burstActive, setBurstActive] = useState(false)
  const [, startTransition] = useTransition()

  const [doneForSession, setDoneForSession] = useState(false)

  const [addTitle, setAddTitle] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [formExpanded, setFormExpanded] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurFreq, setRecurFreq] = useState<'weekly' | 'daily'>('weekly')
  const [recurDay, setRecurDay] = useState<number>(1)
  const [dueDate, setDueDate] = useState(defaultDueDate('today'))
  const dueDateInputRef = useRef<HTMLInputElement>(null)
  const [bucket, setBucket] = useState<'must_do' | 'nice_to_have'>('must_do')
  const [newTaskType, setNewTaskType] = useState<TaskType | null>(null)

  function switchView(v: View) {
    setView(v)
    setBurstActive(false)
    setDoneForSession(false)
    if (!isRecurring) setDueDate(defaultDueDate(v))
  }

  const viewTasks = localTasks.filter(t => isTaskInView(t, view))
  const mustDo = viewTasks.filter(t => t.bucket === 'must_do')
  const niceTo = viewTasks.filter(t => t.bucket === 'nice_to_have')
  const nextWeekCount = localTasks.filter(t => isTaskInView(t, 'next_week')).length

  // Show rest image when every task in view is resolved (done or won't-do)
  const allViewDone = viewTasks.every(t => isResolved(t))
  const showRest = doneForSession || (allViewDone && completing.size === 0 && !burstActive)

  function handleDelete(task: Task) {
    if (task.recurring_task_id) {
      if (!window.confirm(`Stop the "${task.title}" recurring series? Completed tasks will be kept.`)) return
      setLocalTasks(ts => ts.filter(t => !(t.recurring_task_id === task.recurring_task_id && !t.completed_date)))
      startTransition(() => deleteRecurringTask(task.recurring_task_id!))
    } else {
      setLocalTasks(ts => ts.filter(t => t.id !== task.id))
      startTransition(() => deleteTask(String(task.id)))
    }
  }

  function handleToggle(task: Task) {
    const next = !isCompleted(task)
    const today = todayISO()

    const updatedTasks = localTasks.map(t =>
      t.id === task.id ? { ...t, completed_date: next ? today : null } : t
    )
    setLocalTasks(updatedTasks)
    startTransition(() => toggleTask(String(task.id), next))

    if (next) {
      setCompleting(s => new Set([...s, String(task.id)]))

      // Detect if this was the last incomplete task in view
      const vt = updatedTasks.filter(t => isTaskInView(t, view))
      const willBeAllDone = vt.every(t => isResolved(t))

      if (willBeAllDone) {
        // Sequence: task exit (500ms) → burst (900ms) → rest image fades in
        setTimeout(() => {
          setBurstActive(true)
          setDoneForSession(true)
          setCompleting(s => { const n = new Set(s); n.delete(String(task.id)); return n })
          setTimeout(() => setBurstActive(false), 900)
        }, 500)
      } else {
        setTimeout(() => {
          setCompleting(s => { const n = new Set(s); n.delete(String(task.id)); return n })
        }, 500)
      }
    } else {
      // Un-completing hides the rest image immediately
      setBurstActive(false)
    }
  }

  function handleTypeChange(task: Task, type: TaskType | null) {
    setLocalTasks(ts => ts.map(t => t.id === task.id ? { ...t, task_type: type } : t))
    startTransition(() => updateTaskType(String(task.id), type))
  }

  function handleEdit(task: Task, patch: EditPatch, scope: EditScope) {
    // Optimistic: series scope touches every instance of the series; otherwise
    // just this row.
    setLocalTasks(ts => ts.map(t => {
      const hit = scope === 'series' && task.recurring_task_id
        ? t.recurring_task_id === task.recurring_task_id
        : t.id === task.id
      return hit ? { ...t, ...patch } : t
    }))

    startTransition(() => {
      if (scope === 'series' && task.recurring_task_id) {
        updateRecurringSeries(task.recurring_task_id, patch)
      } else {
        if (patch.title !== undefined) updateTaskTitle(String(task.id), patch.title)
        if (patch.description !== undefined) updateTaskDescription(String(task.id), patch.description)
      }
    })
  }

  function handleSkip(task: Task) {
    const next = !isSkipped(task)
    setLocalTasks(ts => ts.map(t => t.id === task.id
      ? { ...t, skipped_date: next ? todayISO() : null, completed_date: next ? null : t.completed_date }
      : t))
    startTransition(() => skipTask(String(task.id), next))
  }

  function handleDateChange(task: Task, newDate: string) {
    setLocalTasks(ts => ts.map(t => t.id === task.id ? { ...t, due_date: newDate } : t))
    startTransition(() => updateTaskDate(String(task.id), newDate))
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = addTitle.trim()
    if (!title) return

    const description = addDescription.trim()

    const fd = new FormData()
    fd.set('title', title)
    fd.set('bucket', bucket)
    fd.set('is_recurring', isRecurring ? 'true' : 'false')
    if (isRecurring) {
      fd.set('frequency', recurFreq)
      if (recurFreq === 'weekly') fd.set('recurrence_day', String(recurDay))
    } else {
      fd.set('due_date', dueDate)
    }
    if (newTaskType) fd.set('task_type', newTaskType)
    if (description) fd.set('description', description)

    // Optimistic add for non-recurring tasks only
    if (!isRecurring) {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title,
        bucket,
        due_date: dueDate,
        recurring_task_id: null,
        completed_date: null,
        skipped_date: null,
        category: null,
        task_type: newTaskType,
        description: description || null,
      }
      setLocalTasks(ts => [...ts, newTask])
    }

    setAddTitle('')
    setAddDescription('')
    setIsRecurring(false)
    setFormExpanded(false)
    startTransition(() => createTask(fd))
  }

  const sectionTitle = section === 'bot' ? "Bot's tasks" : section === 'drafts' ? 'LinkedIn drafts' : ''

  const pageTabs = (
    <PageTabs
      tabs={[
        { key: 'today',     label: 'Today'     },
        { key: 'this_week', label: 'This Week'  },
        { key: 'next_week', label: 'Next Week'  },
      ]}
      active={view}
      onChange={k => switchView(k as View)}
    />
  )

  // Hamburger — opens the drawer on mobile (sidebar is off-screen when collapsed).
  const menuButton = (
    <button
      onClick={() => setSidebarCollapsed(false)}
      aria-label="Open menu"
      className="md:hidden p-1.5 rounded-md text-[#888] hover:text-[#ccc] transition-colors shrink-0"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  )

  return (
    <div className="flex min-h-full">
      <Sidebar
        section={section}
        onSelect={selectSection}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
      {/* Mobile: fixed header row — hamburger + tabs / title */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 h-14 flex items-center px-2 bg-[#0a0a0a] border-b border-[#141414] overflow-hidden">
        {menuButton}
        {section === 'tasks'
          ? pageTabs
          : <span className="ml-1 text-[13px] font-medium text-white">{sectionTitle}</span>}
      </div>
      {/* Desktop: sticky header — tabs (tasks) or section title */}
      <div className="hidden md:block sticky top-0 z-10 border-b border-[#141414] bg-[#0a0a0a]">
        <div className="max-w-xl mx-auto px-6 md:px-8">
          {section === 'tasks'
            ? pageTabs
            : <div className="px-4 py-3 text-[13px] font-medium text-white">{sectionTitle}</div>}
        </div>
      </div>

      <div className="px-6 md:px-8 pt-4 pb-6 w-full max-w-xl md:mx-auto">
        <p suppressHydrationWarning className="text-[12px] text-[#aaa] mb-5">
          {section === 'bot'
            ? "What Bot's working on — its tasks and schedule"
            : section === 'drafts' ? 'LinkedIn drafts' : viewSubtitle(view)}
        </p>

        {section === 'bot' ? (
          <BotTasksPanel botTasks={botTasks} />
        ) : section === 'drafts' ? (
          <DraftsPanel drafts={drafts} />
        ) : (
        <div className="relative">
          {burstActive && <BurstParticles />}
          <div className={`transition-opacity duration-300 ${burstActive ? 'opacity-0' : 'opacity-100'}`}>

            {/* Add task form — today only, hidden during all-done animation */}
            {view === 'today' && !doneForSession && (
              <form onSubmit={handleAdd} className="mb-7 space-y-2">
                <input
                  value={addTitle}
                  onChange={e => setAddTitle(e.target.value)}
                  onFocus={() => setFormExpanded(true)}
                  placeholder="Add a task…"
                  autoComplete="off"
                  className="w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2.5 text-[13px] text-[#ccc] placeholder:text-[#444] focus:outline-none focus:border-[#333]"
                />
                {formExpanded && (
                  <textarea
                    value={addDescription}
                    onChange={e => setAddDescription(e.target.value)}
                    placeholder="Notes (optional)…"
                    rows={2}
                    className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[12px] leading-relaxed text-[#b8b8b8] placeholder:text-[#444] focus:outline-none focus:border-[#2c2c2c] resize-none whitespace-pre-wrap"
                  />
                )}
                {formExpanded && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {isRecurring ? (
                      <div className="flex gap-1 items-center flex-wrap">
                        <button
                          type="button"
                          onClick={() => setRecurFreq(f => f === 'weekly' ? 'daily' : 'weekly')}
                          className="px-2 py-1 rounded text-[11px] border bg-[#1e1e1e] border-[#333] text-[#ccc] transition-colors"
                        >{recurFreq === 'weekly' ? 'Weekly' : 'Daily'}</button>
                        {recurFreq === 'weekly' && DAY_LABELS.map(({ day, short }) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setRecurDay(day)}
                            className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                              recurDay === day ? 'bg-[#1e1e1e] border-[#333] text-[#ccc]' : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#666] hover:text-[#999]'
                            }`}
                          >{short}</button>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="relative bg-[#0f0f0f] border border-[#1a1a1a] rounded-md px-2 py-1 cursor-pointer"
                        onClick={() => { try { dueDateInputRef.current?.showPicker() } catch { dueDateInputRef.current?.focus() } }}
                      >
                        <span className="text-[11px] text-[#777] pointer-events-none">
                          {new Date(dueDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <input
                          ref={dueDateInputRef}
                          type="date"
                          value={dueDate}
                          onChange={e => { if (e.target.value) setDueDate(e.target.value) }}
                          className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
                          tabIndex={-1}
                        />
                      </div>
                    )}
                    <TypePicker inline current={newTaskType} onChange={t => setNewTaskType(t)} />
                    <button
                      type="button"
                      onClick={() => setIsRecurring(v => !v)}
                      className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors ${
                        isRecurring ? 'bg-[#1e1e1e] border-[#333] text-[#aaa]' : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#666] hover:text-[#999]'
                      }`}
                    >🔁 Recurring</button>
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
                    >+ Add</button>
                  </div>
                )}
              </form>
            )}

            {showRest ? (
              <AllDoneScreen />
            ) : (
              <>
                <Bucket title="Must Do"      tasks={mustDo} onToggle={handleToggle} onDelete={handleDelete} onTypeChange={handleTypeChange} onDateChange={handleDateChange} onEdit={handleEdit} onSkip={handleSkip} completing={completing} view={view} />
                <Bucket title="Nice to Have" tasks={niceTo} onToggle={handleToggle} onDelete={handleDelete} onTypeChange={handleTypeChange} onDateChange={handleDateChange} onEdit={handleEdit} onSkip={handleSkip} completing={completing} view={view} />
              </>
            )}

            {view !== 'next_week' && !showRest && (
              <button
                onClick={() => switchView('next_week')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#0d0d0d] border border-[#141414] rounded-lg mt-2 text-left"
              >
                <span className="text-[12px] text-[#aaa]">Next Week</span>
                <span className="text-[12px] text-[#999]">{nextWeekCount} tasks ›</span>
              </button>
            )}

          </div>
        </div>
        )}
      </div>
      </div>
    </div>
  )
}
