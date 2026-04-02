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

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function weekLabel() {
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(mon)} – ${fmt(sun)}`
}

export default function TasksView({ tasks }: { tasks: Task[] }) {
  const [view, setView] = useState<View>('today')
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks)
  const [, startTransition] = useTransition()

  const viewTasks = localTasks.filter(t => t.week === view)
  const mustDo = viewTasks.filter(t => t.bucket === 'must_do')
  const niceTo = viewTasks.filter(t => t.bucket === 'nice_to_have')
  const nextWeekCount = localTasks.filter(t => t.week === 'next_week').length

  function handleToggle(task: Task) {
    const next = !task.completed
    setLocalTasks(ts => ts.map(t => t.id === task.id ? { ...t, completed: next } : t))
    startTransition(() => toggleTask(task.id, next))
  }

  async function handleAdd(fd: FormData) {
    const title = (fd.get('title') as string)?.trim()
    if (!title) return
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      bucket: fd.get('bucket') as Task['bucket'],
      week: fd.get('week') as Task['week'],
      category: null,
      completed: false,
      created_at: new Date().toISOString(),
    }
    setLocalTasks(ts => [...ts, newTask])
    // Reset input
    const form = document.querySelector('form[data-add-task]') as HTMLFormElement
    form?.reset()
    startTransition(() => createTask(fd))
  }

  return (
    <div className="px-6 md:px-8 pt-8 pb-6 max-w-xl">
      <h1 className="text-[20px] font-semibold text-white mb-1">
        {VIEW_LABELS[view]}
      </h1>
      <p suppressHydrationWarning className="text-[12px] text-[#666] mb-5">
        {view === 'today' ? todayLabel() : view === 'this_week' ? weekLabel() : 'Next week'}
      </p>

      {/* View toggle */}
      <div className="inline-flex bg-[#111] border border-[#1a1a1a] rounded-md mb-6">
        {(['today', 'this_week', 'next_week'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3.5 py-1.5 text-[12px] rounded-[5px] transition-colors ${
              view === v ? 'bg-[#1e1e1e] text-[#ccc]' : 'text-[#444] hover:text-[#777]'
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      {/* Add task form */}
      <form
        data-add-task
        action={async (fd) => {
          fd.set('week', view)
          fd.set('bucket', 'must_do')
          await handleAdd(fd)
        }}
        className="flex gap-2 mb-7"
      >
        <input
          name="title"
          placeholder="Add a task…"
          autoComplete="off"
          className="flex-1 bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-[13px] text-[#ccc] placeholder:text-[#2e2e2e] focus:outline-none focus:border-[#2a2a2a]"
        />
        <button
          type="submit"
          className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#ccc] rounded-lg px-3 py-2.5 text-[12px] hover:bg-[#242424] transition-colors"
        >
          + Add
        </button>
      </form>

      {/* Must Do bucket */}
      <Bucket title="Must Do" tasks={mustDo} onToggle={handleToggle} />

      {/* Nice to Have bucket */}
      <Bucket title="Nice to Have" tasks={niceTo} onToggle={handleToggle} />

      {/* Next week collapsed row */}
      {view !== 'next_week' && (
        <button
          onClick={() => setView('next_week')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#0d0d0d] border border-[#141414] rounded-lg mt-2 text-left"
        >
          <span className="text-[12px] text-[#666]">Next Week</span>
          <span className="text-[12px] text-[#555]">{nextWeekCount} tasks ›</span>
        </button>
      )}
    </div>
  )
}

function Bucket({ title, tasks, onToggle }: { title: string; tasks: Task[]; onToggle: (t: Task) => void }) {
  if (tasks.length === 0) return null
  return (
    <div className="mb-6">
      <p className="text-[10px] font-semibold text-[#555] uppercase tracking-[.08em] mb-2.5">{title}</p>
      <div className="divide-y divide-[#0f0f0f]">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-2.5 py-1.5">
            <button
              onClick={() => onToggle(task)}
              className={`w-[15px] h-[15px] rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                task.completed
                  ? 'border-[#222] bg-[#1a1a1a]'
                  : 'border-[#222] hover:border-[#444]'
              }`}
            >
              {task.completed && <span className="text-[8px] text-[#3a3a3a]">✓</span>}
            </button>
            <span className={`text-[13px] flex-1 ${task.completed ? 'line-through text-[#2e2e2e]' : 'text-[#bbb]'}`}>
              {task.title}
            </span>
            {task.category && (
              <span className="text-[10px] text-[#2e2e2e] border border-[#1a1a1a] rounded-full px-1.5 py-0.5">
                {task.category}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
