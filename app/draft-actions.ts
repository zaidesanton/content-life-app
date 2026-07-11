'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export type DraftStatus = 'draft' | 'ready' | 'posted'

export type DraftPatch = {
  title?: string
  content?: string
  source_url?: string | null
  status?: DraftStatus
}

export async function createDraft(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const title = (formData.get('title') as string)?.trim() || 'Untitled draft'
  const content = (formData.get('content') as string) ?? ''
  const source_url = (formData.get('source_url') as string)?.trim() || null
  await supabase.from('linkedin_drafts').insert({ title, content, source_url })
  revalidatePath('/')
}

export async function updateDraft(id: string, patch: DraftPatch) {
  const supabase = await createSupabaseServerClient()
  await supabase
    .from('linkedin_drafts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/')
}

export async function deleteDraft(id: string) {
  const supabase = await createSupabaseServerClient()
  await supabase.from('linkedin_drafts').delete().eq('id', id)
  revalidatePath('/')
}
