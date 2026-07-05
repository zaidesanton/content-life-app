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
  // Detach resolved instances (completed OR marked won't-do) so CASCADE keeps
  // them as history; only unresolved future instances get removed.
  await supabase.from('tasks')
    .update({ recurring_task_id: null })
    .eq('recurring_task_id', id)
    .or('completed_date.not.is.null,skipped_date.not.is.null')
  // ON DELETE CASCADE removes remaining (unresolved) instances
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

export async function updateTaskTitle(id: string, title: string) {
  const supabase = await createSupabaseServerClient()
  const clean = title.trim()
  if (!clean) return
  await supabase.from('tasks').update({ title: clean }).eq('id', id)
  revalidatePath('/')
}

// Edit a recurring series: update the template AND propagate to every instance,
// so the change shows on already-generated rows and all future ones. Used when
// the user picks "whole series" after editing a recurring task's title/note.
export async function updateRecurringSeries(
  recurringTaskId: string,
  patch: { title?: string; description?: string | null },
) {
  const supabase = await createSupabaseServerClient()
  const fields: { title?: string; description?: string | null } = {}
  if (patch.title !== undefined) {
    const t = patch.title.trim()
    if (t) fields.title = t
  }
  if (patch.description !== undefined) {
    fields.description = patch.description?.trim() || null
  }
  if (Object.keys(fields).length === 0) return

  await supabase.from('recurring_tasks').update(fields).eq('id', recurringTaskId)
  await supabase.from('tasks').update(fields).eq('recurring_task_id', recurringTaskId)
  revalidatePath('/')
}

export async function toggleTask(id: string, completed: boolean) {
  const supabase = await createSupabaseServerClient()
  const completed_date = completed ? toDateStr(new Date()) : null
  // Completing a task clears any "won't do" mark — the two are mutually exclusive.
  const patch = completed ? { completed_date, skipped_date: null } : { completed_date }
  await supabase.from('tasks').update(patch).eq('id', id)
  revalidatePath('/')
}

// Mark a task (or a single recurring instance) as "won't do (but was planned)".
// Distinct from deletion: the row stays, so recurring series are untouched.
export async function skipTask(id: string, skipped: boolean) {
  const supabase = await createSupabaseServerClient()
  const skipped_date = skipped ? toDateStr(new Date()) : null
  // Skipping clears any completion — the two are mutually exclusive.
  const patch = skipped ? { skipped_date, completed_date: null } : { skipped_date }
  await supabase.from('tasks').update(patch).eq('id', id)
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
