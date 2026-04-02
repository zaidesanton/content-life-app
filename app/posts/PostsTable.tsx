'use client'

import { useState, useTransition } from 'react'
import type { PostRow } from './page'
import { saveHookScore, fetchPostContent } from './actions'

type SortKey = 'published_at' | 'reactions' | 'impressions' | 'hook_score'
type SortDir = 'asc' | 'desc'

const SCORE_COLOR: Record<number, string> = {
  1: 'text-red-400', 2: 'text-red-400', 3: 'text-orange-400',
  4: 'text-orange-400', 5: 'text-yellow-400', 6: 'text-yellow-400',
  7: 'text-lime-400', 8: 'text-lime-400', 9: 'text-green-400', 10: 'text-green-300',
}

export default function PostsTable({ posts }: { posts: PostRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'impressions', dir: 'desc' })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [contentCache, setContentCache] = useState<Record<string, string>>({})
  const [scores, setScores] = useState<Record<string, number | null>>(
    Object.fromEntries(posts.map((p) => [p.id, p.hook_score]))
  )
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function toggleSort(key: SortKey) {
    setSort((s) => s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })
  }

  const sorted = [...posts].sort((a, b) => {
    const av = a[sort.key] ?? -1
    const bv = b[sort.key] ?? -1
    return sort.dir === 'asc' ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1)
  })

  async function handleRowClick(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!contentCache[id]) {
      setLoadingId(id)
      const content = await fetchPostContent(id)
      setContentCache((c) => ({ ...c, [id]: content ?? '' }))
      setLoadingId(null)
    }
  }

  function handleScore(postId: string, score: number) {
    setScores((s) => ({ ...s, [postId]: score }))
    startTransition(() => saveHookScore(postId, score))
  }

  const cols: { key: SortKey; label: string }[] = [
    { key: 'published_at', label: 'Date' },
    { key: 'reactions', label: '👍' },
    { key: 'impressions', label: '👁' },
    { key: 'hook_score', label: 'Score' },
  ]

  return (
    <div className="divide-y divide-gray-800 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2 bg-gray-900 text-xs text-gray-500 font-medium">
        <span>Hook</span>
        {cols.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            className={`text-right hover:text-gray-200 transition-colors ${sort.key === key ? 'text-gray-200' : ''}`}
          >
            {label} {sort.key === key ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
          </button>
        ))}
      </div>

      {sorted.map((post) => {
        const isOpen = expandedId === post.id
        const score = scores[post.id]
        const alts = post.hook_alternatives

        return (
          <div key={post.id}>
            {/* Row */}
            <div
              onClick={() => handleRowClick(post.id)}
              className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 cursor-pointer items-start transition-colors ${isOpen ? 'bg-gray-900/60' : 'hover:bg-gray-900/40'}`}
            >
              <p className="text-sm text-gray-200 leading-snug line-clamp-2">{post.hook}</p>
              <span className="text-xs text-gray-500 whitespace-nowrap text-right">
                {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <span className="text-xs text-gray-400 text-right">{post.reactions}</span>
              <span className="text-xs text-gray-400 text-right">
                {post.impressions > 0 ? post.impressions.toLocaleString() : '—'}
              </span>
              <span className={`text-xs font-bold text-right w-10 ${score ? SCORE_COLOR[score] : 'text-gray-700'}`}>
                {score ? `${score}/10` : '—'}
              </span>
            </div>

            {/* Expanded */}
            {isOpen && (
              <div className="px-4 pb-5 pt-2 bg-gray-900/40 border-t border-gray-800 space-y-5">

                {/* Full content */}
                <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed max-w-2xl">
                  {loadingId === post.id
                    ? <span className="text-gray-600 animate-pulse">Loading…</span>
                    : contentCache[post.id]}
                </div>

                {/* Alternatives */}
                {alts && alts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">10/10 alternatives</p>
                    <div className="space-y-2">
                      {alts.map((alt, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="text-xs text-gray-600 mt-0.5 w-4 shrink-0">{i + 1}.</span>
                          <p className="text-sm text-gray-200 leading-snug">{alt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Score + link */}
                <div className="flex items-center gap-6 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Score</span>
                    <div className="flex gap-1">
                      {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                        <button
                          key={n}
                          onClick={() => handleScore(post.id, n)}
                          className={`w-6 h-6 rounded text-xs font-semibold transition-all ${
                            score === n
                              ? `${SCORE_COLOR[n]} bg-gray-800 ring-1 ring-current`
                              : 'text-gray-600 hover:text-gray-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  {post.post_url && (
                    <a
                      href={post.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-gray-600 hover:text-gray-300 ml-auto"
                    >
                      LinkedIn →
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
