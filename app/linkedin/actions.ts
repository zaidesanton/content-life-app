'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function saveHookScore(postId: string, score: number) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('linkedin_posts')
    .update({ hook_score: score })
    .eq('id', postId)
  if (error) throw new Error(error.message)
  revalidatePath('/linkedin')
}

export async function toggleSunset(postId: string, value: boolean) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('linkedin_posts')
    .update({ is_sunset: value })
    .eq('id', postId)
  if (error) throw new Error(error.message)
  revalidatePath('/linkedin')
}

export async function updatePostTags(postId: string, tags: string[]) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('linkedin_posts')
    .update({ tags })
    .eq('id', postId)
  if (error) throw new Error(error.message)
  revalidatePath('/linkedin')
  revalidatePath(`/linkedin/${postId}`)
}

export async function createDraft(hook: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('linkedin_posts')
    .insert({
      id: crypto.randomUUID(),
      hook,
      content: '',
      status: 'draft',
      published_at: new Date().toISOString(),
      reactions: 0,
      comments: 0,
      reposts: 0,
      impressions: 0,
      tags: [],
    })
  if (error) throw new Error(error.message)
  revalidatePath('/linkedin')
}

export async function updateDraftHook(postId: string, hook: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('linkedin_posts')
    .update({ hook })
    .eq('id', postId)
  if (error) throw new Error(error.message)
}

export async function deleteDraft(postId: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('linkedin_posts')
    .delete()
    .eq('id', postId)
  if (error) throw new Error(error.message)
  revalidatePath('/linkedin')
}

export async function fetchPostContent(postId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('linkedin_posts')
    .select('content')
    .eq('id', postId)
    .single()
  if (error || !data) return null
  return data.content
}
