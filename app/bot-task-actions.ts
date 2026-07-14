'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// Server actions for the shared Bot task board (bot_tasks). These run as the
// logged-in user (Anton) — RLS in migration 0011 lets both Anton and the bot
// user work this table. Bot itself writes to bot_tasks out-of-band via
// tools/bot-task.mjs (authenticated as the bot user).

// Anton assigns Bot a new task.
export async function createBotTask(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const title = (formData.get('title') as string)?.trim()
  if (!title) return

  const description = (formData.get('description') as string)?.trim() || null
  // A datetime-local value ("YYYY-MM-DDTHH:mm") or empty for "whenever".
  const scheduledRaw = (formData.get('scheduled_for') as string)?.trim()
  const scheduled_for = scheduledRaw ? new Date(scheduledRaw).toISOString() : null

  await supabase.from('bot_tasks').insert({
    title,
    description,
    scheduled_for,
    status: scheduled_for ? 'scheduled' : 'queued',
    created_by: 'anton',
  })

  revalidatePath('/')
}

// Cancel a task (soft — keeps the row so Bot sees it was pulled).
export async function cancelBotTask(id: string) {
  const supabase = await createSupabaseServerClient()
  await supabase.from('bot_tasks').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/')
}

// Reopen a cancelled/done task.
export async function reopenBotTask(id: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('bot_tasks').select('scheduled_for').eq('id', id).single()
  const status = data?.scheduled_for ? 'scheduled' : 'queued'
  await supabase.from('bot_tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/')
}

// Hard-delete (for clearing out noise).
export async function deleteBotTask(id: string) {
  const supabase = await createSupabaseServerClient()
  await supabase.from('bot_tasks').delete().eq('id', id)
  revalidatePath('/')
}
