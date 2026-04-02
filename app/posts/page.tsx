import { supabase } from '@/lib/supabase'
import PostsTable from './PostsTable'

export const revalidate = 0

export type PostRow = {
  id: string
  hook: string
  published_at: string
  reactions: number
  impressions: number
  hook_score: number | null
  hook_alternatives: string[] | null
  post_url: string | null
}

export default async function PostsPage() {
  const { data, error } = await supabase
    .from('linkedin_posts')
    .select('id, hook, published_at, reactions, impressions, hook_score, hook_alternatives, post_url')
    .gte('published_at', '2023-01-01')
    .lt('published_at', '2024-01-01')
    .order('impressions', { ascending: false })

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <a href="/" className="text-sm text-gray-600 hover:text-gray-300 transition-colors">← Home</a>
          <h1 className="text-xl font-semibold mt-3">LinkedIn 2023 — Hook Analysis</h1>
          <p className="text-gray-600 text-sm mt-1">{data.length} posts · click to expand</p>
        </div>
        <PostsTable posts={data as PostRow[]} />
      </div>
    </div>
  )
}
