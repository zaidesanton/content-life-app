'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function createTask(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const title = (formData.get('title') as string)?.trim()
  const bucket = (formData.get('bucket') as string) || 'must_do'
  const task_type = (formData.get('task_type') as string) || null
  const description = (formData.get('description') as string)?.trim() || null
  const is_recurring = formData.get('is_recurring') === 'true'

  if (!title) return

  if (is_recurring) {
    const recurrence_day = parseInt(formData.get('recurrence_day') as string)
    if (isNaN(recurrence_day)) return

    // Just store the template — page.tsx generates instances on demand
    await supabase
      .from('recurring_tasks')
      .insert({ title, bucket, task_type, description, recurrence_day })
  } else {
    const due_date = (formData.get('due_date') as string) || toDateStr(new Date())
    await supabase.from('tasks').insert({ title, bucket, task_type, description, due_date })
  }

  revalidatePath('/')
}

export async function deleteTask(id: string) {
  const supabase = await createSupabaseServerClient()
  await supabase.from('tasks').delete().eq('id', id)
  revalidatePath('/')
}

export async function deleteRecurringTask(id: string) {
  const supabase = await createSupabaseServerClient()
  // Detach completed instances so CASCADE doesn't remove them
  await supabase.from('tasks')
    .update({ recurring_task_id: null })
    .eq('recurring_task_id', id)
    .not('completed_date', 'is', null)
  // ON DELETE CASCADE removes remaining (uncompleted) instances
  await supabase.from('recurring_tasks').delete().eq('id', id)
  revalidatePath('/')
}

export async function updateTaskType(id: string, taskType: string | null) {
  const supabase = await createSupabaseServerClient()
  await supabase.from('tasks').update({ task_type: taskType }).eq('id', id)
  revalidatePath('/')
}

export async function updateTaskDescription(id: string, description: string | null) {
  const supabase = await createSupabaseServerClient()
  const clean = description?.trim() || null
  await supabase.from('tasks').update({ description: clean }).eq('id', id)
  revalidatePath('/')
}

export async function toggleTask(id: string, completed: boolean) {
  const supabase = await createSupabaseServerClient()
  const completed_date = completed ? toDateStr(new Date()) : null
  await supabase.from('tasks').update({ completed_date }).eq('id', id)
  revalidatePath('/')
}

export async function updateTaskDate(id: string, newDate: string) {
  const supabase = await createSupabaseServerClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('due_date')
    .eq('id', id)
    .single()
  if (!task) return

  await supabase.from('task_date_changes').insert({
    task_id: parseInt(id),
    old_date: task.due_date,
    new_date: newDate,
  })
  await supabase.from('tasks').update({ due_date: newDate }).eq('id', id)
  revalidatePath('/')
}
