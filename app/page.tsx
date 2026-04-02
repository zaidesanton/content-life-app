import { supabase } from '@/lib/supabase'
import TasksView from '@/components/TasksView'

export const revalidate = 0

export type Task = {
  id: string
  title: string
  bucket: 'must_do' | 'nice_to_have'
  week: 'today' | 'this_week' | 'next_week'
  category: string | null
  completed: boolean
  created_at: string
}

export default async function TasksPage() {
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true })

  return <TasksView tasks={(data ?? []) as Task[]} />
}
