'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export type DiaryEntry = {
  id: number
  date: string          // YYYY-MM-DD
  score: number | null
  good_thing: string | null
  thoughts: string | null
  created_at: string
}

export async function saveDiaryEntry(
  date: string,
  fields: { score?: number | null; good_thing?: string; thoughts?: string }
) {
  await supabase
    .from('diary_entries')
    .upsert({ date, ...fields }, { onConflict: 'date' })
  revalidatePath('/diary')
}
