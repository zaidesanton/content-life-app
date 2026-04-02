import { supabase } from '@/lib/supabase'
import PostsTable from './PostsTable'

export const revalidate = 0

export type PostRow = {
  id: string
  hook: string
  published_at: string
  content_type: string | null
  reactions: number
  comments: number
  reposts: number
  impressions: number
  hook_score: number | null
  image_url: string | null
  post_url: string | null
}

export default async function PostsPage() {
  const { data, error } = await supabase
    .from('linkedin_posts')
    .select('id, hook, published_at, content_type, reactions, comments, reposts, impressions, hook_score, image_url, post_url')
    .gte('published_at', '2023-01-01')
    .lt('published_at', '2024-01-01')
    .order('published_at', { ascending: false })

  if (error) {
    return <div className="p-8 text-red-500">Error loading posts: {error.message}</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">← Home</a>
          <h1 className="text-2xl font-bold mt-3">LinkedIn Posts — 2023</h1>
          <p className="text-gray-500 text-sm mt-1">{data.length} posts · Click any row to read the full post and score the hook</p>
        </div>
        <PostsTable posts={data as PostRow[]} />
      </div>
    </div>
  )
}
