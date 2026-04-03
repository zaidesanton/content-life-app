import { supabase } from '@/lib/supabase'
import TasksView from '@/components/TasksView'

export const revalidate = 0

export type Task = {
  id: string
  title: string
  bucket: 'must_do' | 'nice_to_have'
  due_date: string | null          // YYYY-MM-DD, null for recurring
  is_recurring: boolean
  recurrence_day: number | null    // 0=Sun 1=Mon … 6=Sat, null if not recurring
  last_completed_date: string | null // YYYY-MM-DD, tracks recurring completion
  completed: boolean               // used for non-recurring only
  category: string | null
  created_at: string
}

export default async function TasksPage() {
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true })

  return <TasksView tasks={(data ?? []) as Task[]} />
}
