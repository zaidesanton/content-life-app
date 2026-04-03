'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function createTask(formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  const bucket = (formData.get('bucket') as string) || 'must_do'
  const is_recurring = formData.get('is_recurring') === 'true'

  if (!title) return

  if (is_recurring) {
    const recurrence_day = parseInt(formData.get('recurrence_day') as string)
    if (isNaN(recurrence_day)) return
    await supabase.from('tasks').insert({ title, bucket, is_recurring: true, recurrence_day })
  } else {
    const due_date = (formData.get('due_date') as string) || new Date().toISOString().slice(0, 10)
    await supabase.from('tasks').insert({ title, bucket, is_recurring: false, due_date })
  }

  revalidatePath('/')
}

export async function toggleTask(id: string, completed: boolean, isRecurring: boolean) {
  if (isRecurring) {
    const last_completed_date = completed ? new Date().toISOString().slice(0, 10) : null
    await supabase.from('tasks').update({ last_completed_date }).eq('id', id)
  } else {
    await supabase.from('tasks').update({ completed }).eq('id', id)
  }
  revalidatePath('/')
}
