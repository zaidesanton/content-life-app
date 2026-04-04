import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import PostDetail from './PostDetail'

export const revalidate = 0

export type PostFull = {
  id: string
  hook: string
  content: string | null
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
  tags: string[]
}

export type DupeRow = {
  id: string
  published_at: string
  impressions: number
  post_url: string | null
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: post, error }, { data: dupes }, { data: tagRows }] = await Promise.all([
    supabase
      .from('linkedin_posts')
      .select('id, hook, content, published_at, reactions, comments, reposts, impressions, hook_score, hook_alternatives, parent_id, is_sunset, post_url, tags')
      .eq('id', id)
      .single(),
    supabase
      .from('linkedin_posts')
      .select('id, published_at, impressions, post_url')
      .eq('parent_id', id)
      .order('published_at', { ascending: true }),
    supabase
      .from('linkedin_posts')
      .select('tags'),
  ])

  if (error || !post) notFound()

  // Collect all distinct tags across all posts for autocomplete
  const allTags = Array.from(
    new Set((tagRows ?? []).flatMap(r => r.tags ?? []))
  ).sort()

  return (
    <PostDetail
      post={post as PostFull}
      dupes={(dupes ?? []) as DupeRow[]}
      allTags={allTags}
    />
  )
}
