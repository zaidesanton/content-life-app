import { createSupabaseServerClient } from '@/lib/supabase-server'
import TasksView from '@/components/TasksView'

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

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

  // Fetch existing tasks in window
  const { data: existing } = await supabase
    .from('tasks')
    .select('id, title, bucket, task_type, category, description, due_date, recurring_task_id, completed_date, skipped_date')
    .gte('due_date', windowStart)
    .lte('due_date', windowEnd)
    .order('due_date', { ascending: true })

  // On-demand: generate any missing recurring instances for this window
  const { data: recurringTasks } = await supabase
    .from('recurring_tasks')
    .select('id, title, bucket, task_type, description, recurrence_day')

  let tasks = existing ?? []

  if (recurringTasks && recurringTasks.length > 0) {
    const existingKeys = new Set(
      tasks
        .filter(t => t.recurring_task_id)
        .map(t => `${t.recurring_task_id}:${t.due_date}`)
    )

    const toInsert: Array<{
      title: string
      bucket: string
      task_type: string | null
      description: string | null
      category: null
      due_date: string
      recurring_task_id: string
    }> = []

    for (const rt of recurringTasks) {
      const cur = new Date(weekStart)
      while (cur <= nextWeekEnd) {
        if (cur.getDay() === rt.recurrence_day) {
          const ds = toDateStr(cur)
          if (!existingKeys.has(`${rt.id}:${ds}`)) {
            toInsert.push({
              title: rt.title,
              bucket: rt.bucket,
              task_type: rt.task_type,
              description: rt.description,
              category: null,
              due_date: ds,
              recurring_task_id: rt.id,
            })
          }
        }
        cur.setDate(cur.getDate() + 1)
      }
    }

    if (toInsert.length > 0) {
      await supabase.from('tasks').insert(toInsert)
      // Re-fetch to get DB-assigned IDs for the new instances
      const { data: fresh } = await supabase
        .from('tasks')
        .select('id, title, bucket, task_type, category, description, due_date, recurring_task_id, completed_date, skipped_date')
        .gte('due_date', windowStart)
        .lte('due_date', windowEnd)
        .order('due_date', { ascending: true })
      tasks = fresh ?? []
    }
  }

  // Fetch unresolved tasks from before this week (overdue, up to 60 days back).
  // Skipped ("won't do") past tasks are resolved, so they don't resurface here.
  const pastStart = new Date(today)
  pastStart.setDate(today.getDate() - 60)
  const { data: overdue } = await supabase
    .from('tasks')
    .select('id, title, bucket, task_type, category, description, due_date, recurring_task_id, completed_date, skipped_date')
    .lt('due_date', windowStart)
    .gte('due_date', toDateStr(pastStart))
    .is('completed_date', null)
    .is('skipped_date', null)
    .order('due_date', { ascending: true })

  const allTasks = [...(overdue ?? []), ...tasks]

  return (
    <TasksView tasks={allTasks as Task[]} />
  )
}
