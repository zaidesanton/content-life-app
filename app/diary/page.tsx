import { createSupabaseServerClient } from '@/lib/supabase-server'
import DiaryView from './DiaryView'
import type { DiaryEntry } from './actions'

export const revalidate = 0

export default async function DiaryPage() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('diary_entries')
    .select('id, date, score, good_thing, thoughts, created_at')
    .order('date', { ascending: false })
    .limit(60)

  const entries = (data ?? []) as DiaryEntry[]

  // Separate today from history
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const todayEntry = entries.find(e => e.date === todayStr) ?? null
  const history = entries.filter(e => e.date !== todayStr)

  // Last 7 days (excluding today) with no entry
  const entryDates = new Set(entries.map(e => e.date))
  const missedDays: string[] = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!entryDates.has(ds)) missedDays.push(ds)
  }

  return <DiaryView todayStr={todayStr} todayEntry={todayEntry} history={history} missedDays={missedDays} />
}
