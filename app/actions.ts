'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function createTask(formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  const bucket = (formData.get('bucket') as string) || 'must_do'
  const task_type = (formData.get('task_type') as string) || null
  const is_recurring = formData.get('is_recurring') === 'true'

  if (!title) return

  if (is_recurring) {
    const recurrence_day = parseInt(formData.get('recurrence_day') as string)
    if (isNaN(recurrence_day)) return

    // Create recurring task template
    const { data: rt, error } = await supabase
      .from('recurring_tasks')
      .insert({ title, bucket, task_type, recurrence_day })
      .select()
      .single()
    if (error || !rt) return

    // Generate instances: 1 year back to 2 years forward
    const instances: Array<{
      title: string
      bucket: string
      task_type: string | null
      category: null
      due_date: string
      recurring_task_id: string
    }> = []
    const start = new Date()
    start.setFullYear(start.getFullYear() - 1)
    const end = new Date()
    end.setFullYear(end.getFullYear() + 2)

    const cur = new Date(start)
    while (cur <= end) {
      if (cur.getDay() === recurrence_day) {
        instances.push({
          title: rt.title,
          bucket: rt.bucket,
          task_type: rt.task_type,
          category: null,
          due_date: toDateStr(cur),
          recurring_task_id: rt.id,
        })
      }
      cur.setDate(cur.getDate() + 1)
    }

    await supabase.from('tasks').insert(instances)
  } else {
    const due_date = (formData.get('due_date') as string) || toDateStr(new Date())
    await supabase.from('tasks').insert({ title, bucket, task_type, due_date })
  }

  revalidatePath('/')
}

export async function deleteTask(id: string) {
  await supabase.from('tasks').delete().eq('id', id)
  revalidatePath('/')
}

export async function deleteRecurringTask(id: string) {
  // ON DELETE CASCADE removes all linked task instances
  await supabase.from('recurring_tasks').delete().eq('id', id)
  revalidatePath('/')
}

export async function updateTaskType(id: string, taskType: string | null) {
  await supabase.from('tasks').update({ task_type: taskType }).eq('id', id)
  revalidatePath('/')
}

export async function toggleTask(id: string, completed: boolean) {
  const completed_date = completed ? toDateStr(new Date()) : null
  await supabase.from('tasks').update({ completed_date }).eq('id', id)
  revalidatePath('/')
}
