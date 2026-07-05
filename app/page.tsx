import { createSupabaseServerClient } from '@/lib/supabase-server'
import TasksView from '@/components/TasksView'
import { expandRules, toDateStr } from '@/lib/recurrence'
import type { RecurringRule, RecurringException } from '@/lib/recurrence'

export const revalidate = 0

export type Task = {
  id: string
  title: string
  bucket: 'must_do' | 'nice_to_have'
  due_date: string            // YYYY-MM-DD
  recurring_task_id: string | null
  completed_date: string | null  // YYYY-MM-DD
  skipped_date: string | null    // YYYY-MM-DD; "won't do (but was planned)"
  category: string | null
  task_type: string | null
  description: string | null
}

export default async function TasksPage() {
  const supabase = await createSupabaseServerClient()
  const today = new Date()

  // Sunday of current week
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())

  // Saturday of next week
  const nextWeekEnd = new Date(weekStart)
  nextWeekEnd.setDate(weekStart.getDate() + 13)

  const windowStart = toDateStr(weekStart)
  const windowEnd   = toDateStr(nextWeekEnd)

  // ── Recurring occurrences: expand rules over the window, overlay exceptions.
  // Nothing is written on read — a series can't "run out".
  const { data: rules } = await supabase
    .from('recurring_tasks')
    .select('id, title, bucket, task_type, description, recurrence_day, frequency, starts_on, ends_on')

  const ruleIds = (rules ?? []).map(r => r.id)
  let exceptions: RecurringException[] = []
  if (ruleIds.length > 0) {
    const { data: ex } = await supabase
      .from('recurring_exceptions')
      .select('recurring_task_id, occurrence_date, completed_date, skipped_date, moved_to_date, title, description, task_type')
      .gte('occurrence_date', windowStart)
      .lte('occurrence_date', windowEnd)
    exceptions = (ex ?? []) as RecurringException[]
  }

  const recurring = expandRules(
    (rules ?? []) as RecurringRule[],
    exceptions,
    windowStart,
    windowEnd,
  )

  // ── One-off tasks: in-window, plus overdue (up to 60 days back, unresolved).
  const pastStart = new Date(today)
  pastStart.setDate(today.getDate() - 60)

  const { data: oneOff } = await supabase
    .from('tasks')
    .select('id, title, bucket, task_type, category, description, due_date, recurring_task_id, completed_date, skipped_date')
    .is('recurring_task_id', null)
    .gte('due_date', toDateStr(pastStart))
    .lte('due_date', windowEnd)
    .order('due_date', { ascending: true })

  // Overdue one-offs (before this week) only count if still unresolved.
  const oneOffTasks = (oneOff ?? []).filter(t => {
    if (t.due_date >= windowStart) return true
    return !t.completed_date && !t.skipped_date
  })

  const allTasks = [...oneOffTasks, ...recurring].sort((a, b) =>
    a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0,
  )

  return (
    <TasksView tasks={allTasks as Task[]} />
  )
}
