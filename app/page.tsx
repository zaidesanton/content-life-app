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
  completed: boolean               // used for non-recurring only
  category: string | null
  task_type: string | null         // 'linkedin' | 'newsletter' | 'home' | null
  created_at: string
}

export type Completion = {
  task_id: string
  completed_date: string           // YYYY-MM-DD
}

export default async function TasksPage() {
  const [{ data: tasks }, { data: completions }] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: true }),
    supabase.from('task_completions').select('task_id, completed_date'),
  ])

  return (
    <TasksView
      tasks={(tasks ?? []) as Task[]}
      completions={(completions ?? []) as Completion[]}
    />
  )
}
