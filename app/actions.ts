'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function createTask(formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  const bucket = formData.get('bucket') as string
  const week = formData.get('week') as string
  if (!title) return
  await supabase.from('tasks').insert({ title, bucket, week })
  revalidatePath('/')
}

export async function toggleTask(id: string, completed: boolean) {
  await supabase.from('tasks').update({ completed }).eq('id', id)
  revalidatePath('/')
}
