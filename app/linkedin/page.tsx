import { supabase } from '@/lib/supabase'
import LinkedInTable from './LinkedInTable'

export const revalidate = 0

export type PostRow = {
  id: string
  hook: string
  published_at: string
  reactions: number
  comments: number
  reposts: number
  impressions: number
  hook_score: number | null
  hook_alternatives: string[] | null
  parent_id: string | null
  is_sunset: boolean
  post_url: string | null
}

export default async function LinkedInPage() {
  const { data, error } = await supabase
    .from('linkedin_posts')
    .select('id, hook, published_at, reactions, comments, reposts, impressions, hook_score, hook_alternatives, parent_id, is_sunset, post_url')
    .order('published_at', { ascending: false })

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>
  }

  return (
    <div className="h-full flex flex-col">
      <LinkedInTable posts={(data ?? []) as PostRow[]} />
    </div>
  )
}
