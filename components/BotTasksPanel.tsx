'use client'

import { useState, useTransition, useEffect } from 'react'
import { createBotTask, cancelBotTask, reopenBotTask, deleteBotTask } from '@/app/bot-task-actions'

export type BotTaskStatus = 'queued' | 'scheduled' | 'in_progress' | 'done' | 'cancelled'

export type BotTask = {
  id: string
  title: string
  description: string | null
  status: BotTaskStatus
  scheduled_for: string | null   // ISO timestamp
  cadence: string | null
  next_run: string | null        // ISO timestamp
  last_run: string | null        // ISO timestamp
  created_by: string             // 'anton' | 'bot'
  result: string | null
  created_at: string
}

const STATUS_STYLE: Record<BotTaskStatus, string> = {
  queued:      'bg-[#1a1a1a] border-[#2a2a2a] text-[#999]',
  scheduled:   'bg-[#14203a] border-[#22345c] text-[#8ab0e6]',
  in_progress: 'bg-[#2a2410] border-[#4a3d18] text-[#e0c063]',
  done:        'bg-[#12261a] border-[#1f3d2a] text-[#7fcfa0]',
  cancelled:   'bg-[#241416] border-[#3a2426] text-[#c98a8a]',
}
const STATUS_LABEL: Record<BotTaskStatus, string> = {
  queued: 'Queued',
  scheduled: 'Scheduled',
  in_progress: 'Running',
  done: 'Done',
  cancelled: 'Cancelled',
}

const ACTIVE: BotTaskStatus[] = ['queued', 'scheduled', 'in_progress']

function fmtWhen(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function BotTaskRow({ task }: { task: BotTask }) {
  const [, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const resolved = task.status === 'done' || task.status === 'cancelled'

  const when = task.next_run ?? task.scheduled_for
  const byMe = task.created_by === 'anton' ? 'you' : 'Bot'

  return (
    <div className="border border-[#161616] rounded-xl bg-[#0c0c0c] px-3.5 py-2.5 mb-2.5">
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[13px] ${resolved ? 'text-[#777]' : 'text-[#e6e6e6]'} ${task.status === 'cancelled' ? 'line-through' : ''}`}>
              {task.title}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] border ${STATUS_STYLE[task.status]}`}>
              {STATUS_LABEL[task.status]}
            </span>
            {task.cadence && (
              <span className="text-[10px] text-[#7a7a7a] border border-[#222] rounded-full px-1.5 py-0.5">
                🔁 {task.cadence}
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-[12px] text-[#9a9a9a] mt-1 whitespace-pre-wrap leading-relaxed">{task.description}</p>
          )}

          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] text-[#666]">
            {when && <span className="tabular-nums text-[#8a8a8a]">🕑 {fmtWhen(when)}</span>}
            <span>added by {byMe}</span>
            {task.last_run && <span className="tabular-nums">last run {fmtWhen(task.last_run)}</span>}
          </div>

          {task.result && (
            <p className="text-[11px] text-[#6f9a7f] mt-1">↳ {task.result}</p>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2 pt-0.5">
          {!resolved && (
            <button
              onClick={() => startTransition(() => cancelBotTask(task.id))}
              className="text-[11px] text-[#555] hover:text-[#c98a8a] transition-colors"
            >Cancel</button>
          )}
          {resolved && (
            <>
              <button
                onClick={() => startTransition(() => reopenBotTask(task.id))}
                className="text-[11px] text-[#555] hover:text-[#8ab0e6] transition-colors"
              >Reopen</button>
              {confirmDelete ? (
                <span className="flex items-center gap-1.5">
                  <button onClick={() => startTransition(() => deleteBotTask(task.id))} className="text-[11px] text-[#d08b8b] hover:text-[#e6a0a0]">Delete?</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-[#666] hover:text-[#999]">No</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="text-[11px] text-[#444] hover:text-[#999] transition-colors">✕</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BotTasksPanel({ botTasks }: { botTasks: BotTask[] }) {
  const [, startTransition] = useTransition()
  const [local, setLocal] = useState<BotTask[]>(botTasks)
  useEffect(() => { setLocal(botTasks) }, [botTasks])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [expanded, setExpanded] = useState(false)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const fd = new FormData()
    fd.set('title', title.trim())
    if (description.trim()) fd.set('description', description.trim())
    if (scheduledFor) fd.set('scheduled_for', scheduledFor)
    // optimistic
    setLocal(ts => [{
      id: `tmp-${ts.length}-${title.length}`,
      title: title.trim(),
      description: description.trim() || null,
      status: scheduledFor ? 'scheduled' : 'queued',
      scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      cadence: null, next_run: null, last_run: null,
      created_by: 'anton', result: null,
      created_at: new Date().toISOString(),
    }, ...ts])
    setTitle(''); setDescription(''); setScheduledFor(''); setExpanded(false)
    startTransition(() => createBotTask(fd))
  }

  const active = local
    .filter(t => ACTIVE.includes(t.status))
    .sort((a, b) => {
      const aw = a.next_run ?? a.scheduled_for ?? a.created_at
      const bw = b.next_run ?? b.scheduled_for ?? b.created_at
      return aw < bw ? -1 : aw > bw ? 1 : 0
    })
  const resolved = local
    .filter(t => !ACTIVE.includes(t.status))
    .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-6 space-y-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="Assign Bot a task…"
          autoComplete="off"
          className="w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2.5 text-[13px] text-[#ccc] placeholder:text-[#444] focus:outline-none focus:border-[#333]"
        />
        {expanded && (
          <>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Details (optional)…"
              rows={2}
              className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[12px] leading-relaxed text-[#b8b8b8] placeholder:text-[#444] focus:outline-none focus:border-[#2c2c2c] resize-none whitespace-pre-wrap"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-[11px] text-[#777] flex items-center gap-1.5">
                <span>When:</span>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={e => setScheduledFor(e.target.value)}
                  className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-md px-2 py-1 text-[11px] text-[#aaa] focus:outline-none focus:border-[#2c2c2c] [color-scheme:dark]"
                />
              </label>
              <span className="text-[10px] text-[#555]">leave blank for “whenever”</span>
              <button
                type="submit"
                className="ml-auto bg-[#1e1e1e] border border-[#2a2a2a] text-[#ccc] rounded-lg px-3 py-1.5 text-[12px] hover:bg-[#242424] transition-colors"
              >+ Assign</button>
            </div>
          </>
        )}
      </form>

      {local.length === 0 ? (
        <p className="text-[12px] text-[#666] text-center py-10">
          No Bot tasks yet. Assign one above, or ask Bot in chat — its schedule shows up here.
        </p>
      ) : (
        <>
          {active.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-semibold text-[#999] uppercase tracking-[.08em] mb-2.5">Active &amp; scheduled</p>
              {active.map(t => <BotTaskRow key={t.id} task={t} />)}
            </div>
          )}
          {resolved.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-semibold text-[#666] uppercase tracking-[.08em] mb-2.5">Done &amp; cancelled</p>
              {resolved.map(t => <BotTaskRow key={t.id} task={t} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
