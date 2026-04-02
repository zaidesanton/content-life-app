'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function saveHookScore(postId: string, score: number) {
  const { error } = await supabase
    .from('linkedin_posts')
    .update({ hook_score: score })
    .eq('id', postId)

  if (error) throw new Error(error.message)
  revalidatePath('/posts')
}

export async function fetchPostContent(postId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('linkedin_posts')
    .select('content')
    .eq('id', postId)
    .single()

  if (error || !data) return null
  return data.content
}
