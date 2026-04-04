import { supabase } from '@/lib/supabase'
import TasksView from '@/components/TasksView'

export const revalidate = 0

export type Task = {
  id: string
  title: string
  bucket: 'must_do' | 'nice_to_have'
  due_date: string            // YYYY-MM-DD
  recurring_task_id: string | null
  completed_date: string | null  // YYYY-MM-DD
  category: string | null
  task_type: string | null
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function TasksPage() {
  const today = new Date()
  const mondayOffset = (today.getDay() + 6) % 7

  // Monday of current week
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - mondayOffset)

  // Sunday of next week (13 days from that Monday)
  const nextWeekEnd = new Date(weekStart)
  nextWeekEnd.setDate(weekStart.getDate() + 13)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, bucket, task_type, category, due_date, recurring_task_id, completed_date')
    .gte('due_date', toDateStr(weekStart))
    .lte('due_date', toDateStr(nextWeekEnd))
    .order('due_date', { ascending: true })

  return (
    <TasksView tasks={(tasks ?? []) as Task[]} />
  )
}
