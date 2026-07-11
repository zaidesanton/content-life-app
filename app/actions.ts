'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { parseOccId, toDateStr } from '@/lib/recurrence'

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>

// Merge a patch into the exception row for one recurring occurrence
// (recurring_task_id + occurrence_date). Only the columns in `patch` change.
async function upsertException(
  supabase: SupabaseServer,
  recurringTaskId: string,
  occurrenceDate: string,
  patch: Record<string, string | null>,
) {
  await supabase
    .from('recurring_exceptions')
    .upsert(
      { recurring_task_id: recurringTaskId, occurrence_date: occurrenceDate, ...patch },
      { onConflict: 'recurring_task_id,occurrence_date' },
    )
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
    const frequency = (formData.get('frequency') as string) === 'daily' ? 'daily' : 'weekly'
    // recurrence_day only matters for weekly; store 0 for daily as a filler.
    const recurrence_day = frequency === 'weekly'
      ? parseInt(formData.get('recurrence_day') as string)
      : 0
    if (frequency === 'weekly' && isNaN(recurrence_day)) return

    // Store the rule only — page.tsx expands it on read. starts_on = today so
    // it doesn't backfill into the past.
    await supabase.from('recurring_tasks').insert({
      title, bucket, task_type, description,
      recurrence_day, frequency, starts_on: toDateStr(new Date()),
    })
  } else {
    const due_date = (formData.get('due_date') as string) || toDateStr(new Date())
    // tasks.description is NOT NULL (default ''); never send an explicit null or
    // the insert is rejected and the task silently "disappears".
    await supabase.from('tasks').insert({ title, bucket, task_type, description: description ?? '', due_date })
  }

  revalidatePath('/')
}

export async function deleteTask(id: string) {
  const supabase = await createSupabaseServerClient()
  const occ = parseOccId(id)
  if (occ) {
    // Deleting a single recurring occurrence = skip it (the series is untouched).
    await upsertException(supabase, occ.recurringTaskId, occ.occurrenceDate, {
      skipped_date: toDateStr(new Date()),
      completed_date: null,
    })
  } else {
    await supabase.from('tasks').delete().eq('id', id)
  }
  revalidatePath('/')
}

export async function deleteRecurringTask(id: string) {
  const supabase = await createSupabaseServerClient()
  // Detach any leftover placeholder instance rows so the FK doesn't block the
  // delete, then remove the rule. Its exceptions go via ON DELETE CASCADE.
  await supabase.from('tasks').update({ recurring_task_id: null }).eq('recurring_task_id', id)
  await supabase.from('recurring_tasks').delete().eq('id', id)
  revalidatePath('/')
}

export async function updateTaskType(id: string, taskType: string | null) {
  const supabase = await createSupabaseServerClient()
  const occ = parseOccId(id)
  if (occ) {
    await upsertException(supabase, occ.recurringTaskId, occ.occurrenceDate, { task_type: taskType })
  } else {
    await supabase.from('tasks').update({ task_type: taskType }).eq('id', id)
  }
  revalidatePath('/')
}

export async function updateTaskDescription(id: string, description: string | null) {
  const supabase = await createSupabaseServerClient()
  const clean = description?.trim() || null
  const occ = parseOccId(id)
  if (occ) {
    await upsertException(supabase, occ.recurringTaskId, occ.occurrenceDate, { description: clean })
  } else {
    // tasks.description is NOT NULL — coalesce a cleared note to '' not null.
    await supabase.from('tasks').update({ description: clean ?? '' }).eq('id', id)
  }
  revalidatePath('/')
}

export async function updateTaskTitle(id: string, title: string) {
  const supabase = await createSupabaseServerClient()
  const clean = title.trim()
  if (!clean) return
  const occ = parseOccId(id)
  if (occ) {
    await upsertException(supabase, occ.recurringTaskId, occ.occurrenceDate, { title: clean })
  } else {
    await supabase.from('tasks').update({ title: clean }).eq('id', id)
  }
  revalidatePath('/')
}

// Edit a recurring series: just update the rule. Instances are generated from
// it on read, so the change shows everywhere immediately — no per-row fan-out.
// (Per-instance overrides in recurring_exceptions still win for their date.)
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
  revalidatePath('/')
}

export async function toggleTask(id: string, completed: boolean) {
  const supabase = await createSupabaseServerClient()
  const completed_date = completed ? toDateStr(new Date()) : null
  const occ = parseOccId(id)
  if (occ) {
    // Completing clears any "won't do" mark (mutually exclusive).
    await upsertException(supabase, occ.recurringTaskId, occ.occurrenceDate,
      completed ? { completed_date, skipped_date: null } : { completed_date })
  } else {
    const patch = completed ? { completed_date, skipped_date: null } : { completed_date }
    await supabase.from('tasks').update(patch).eq('id', id)
  }
  revalidatePath('/')
}

// Mark a task (or a single recurring occurrence) as "won't do (but was planned)".
export async function skipTask(id: string, skipped: boolean) {
  const supabase = await createSupabaseServerClient()
  const skipped_date = skipped ? toDateStr(new Date()) : null
  const occ = parseOccId(id)
  if (occ) {
    // Skipping clears any completion (mutually exclusive).
    await upsertException(supabase, occ.recurringTaskId, occ.occurrenceDate,
      skipped ? { skipped_date, completed_date: null } : { skipped_date })
  } else {
    const patch = skipped ? { skipped_date, completed_date: null } : { skipped_date }
    await supabase.from('tasks').update(patch).eq('id', id)
  }
  revalidatePath('/')
}

export async function updateTaskDate(id: string, newDate: string) {
  const supabase = await createSupabaseServerClient()
  const occ = parseOccId(id)
  if (occ) {
    // Moving one recurring occurrence to another day = an exception.
    await upsertException(supabase, occ.recurringTaskId, occ.occurrenceDate, { moved_to_date: newDate })
    revalidatePath('/')
    return
  }

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
