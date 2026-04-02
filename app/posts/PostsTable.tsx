'use client'

import { useState, useTransition } from 'react'
import type { PostRow } from './page'
import { saveHookScore, fetchPostContent } from './actions'

type SortKey = keyof Pick<PostRow, 'published_at' | 'reactions' | 'comments' | 'reposts' | 'impressions' | 'hook_score'>
type SortDir = 'asc' | 'desc'

const SCORE_COLORS: Record<number, string> = {
  1: 'bg-red-900 text-red-300',
  2: 'bg-red-900 text-red-300',
  3: 'bg-orange-900 text-orange-300',
  4: 'bg-orange-900 text-orange-300',
  5: 'bg-yellow-900 text-yellow-300',
  6: 'bg-yellow-900 text-yellow-300',
  7: 'bg-green-900 text-green-300',
  8: 'bg-green-900 text-green-300',
  9: 'bg-emerald-900 text-emerald-300',
  10: 'bg-emerald-800 text-emerald-200',
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-600 text-xs">—</span>
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${SCORE_COLORS[score]}`}>
      {score}/10
    </span>
  )
}

function ScorePicker({ current, onSelect }: { current: number | null; onSelect: (s: number) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          onClick={() => onSelect(n)}
          className={`w-7 h-7 rounded text-xs font-bold transition-all ${
            current === n
              ? `${SCORE_COLORS[n]} ring-2 ring-white/40 scale-110`
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-700 ml-1">↕</span>
  return <span className="text-blue-400 ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function PostsTable({ posts }: { posts: PostRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('published_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [contentCache, setContentCache] = useState<Record<string, string>>({})
  const [scores, setScores] = useState<Record<string, number | null>>(
    Object.fromEntries(posts.map((p) => [p.id, p.hook_score]))
  )
  const [loading, setLoading] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...posts].sort((a, b) => {
    const av = a[sortKey] ?? -1
    const bv = b[sortKey] ?? -1
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  async function handleRowClick(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!contentCache[id]) {
      setLoading(id)
      const content = await fetchPostContent(id)
      setContentCache((c) => ({ ...c, [id]: content ?? '(no content)' }))
      setLoading(null)
    }
  }

  function handleScore(postId: string, score: number) {
    setScores((s) => ({ ...s, [postId]: score }))
    startTransition(() => saveHookScore(postId, score))
  }

  const cols: { key: SortKey; label: string; title?: string }[] = [
    { key: 'published_at', label: 'Date' },
    { key: 'reactions', label: '👍' },
    { key: 'comments', label: '💬' },
    { key: 'reposts', label: '🔁' },
    { key: 'impressions', label: '👁️' },
    { key: 'hook_score', label: 'Score', title: 'Hook score' },
  ]

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-gray-400 text-left">
            <th className="px-4 py-3 font-medium w-full">Hook</th>
            <th className="px-3 py-3 font-medium whitespace-nowrap">Type</th>
            {cols.map(({ key, label, title }) => (
              <th
                key={key}
                className="px-3 py-3 font-medium whitespace-nowrap cursor-pointer hover:text-gray-200 select-none"
                title={title}
                onClick={() => toggleSort(key)}
              >
                {label}
                <SortIcon active={sortKey === key} dir={sortDir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((post) => {
            const isOpen = expandedId === post.id
            const isLoadingContent = loading === post.id
            const content = contentCache[post.id]

            return (
              <>
                <tr
                  key={post.id}
                  onClick={() => handleRowClick(post.id)}
                  className={`border-t border-gray-800 cursor-pointer transition-colors ${
                    isOpen ? 'bg-gray-900' : 'hover:bg-gray-900/50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="text-gray-200 leading-snug line-clamp-2">{post.hook}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {post.content_type ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-3 py-3 text-gray-300 whitespace-nowrap">{post.reactions}</td>
                  <td className="px-3 py-3 text-gray-300 whitespace-nowrap">{post.comments}</td>
                  <td className="px-3 py-3 text-gray-300 whitespace-nowrap">{post.reposts}</td>
                  <td className="px-3 py-3 text-gray-300 whitespace-nowrap">
                    {post.impressions > 0 ? post.impressions.toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <ScoreBadge score={scores[post.id] ?? null} />
                  </td>
                </tr>

                {isOpen && (
                  <tr key={`${post.id}-expanded`} className="border-t border-gray-800 bg-gray-900">
                    <td colSpan={8} className="px-4 py-5">
                      <div className="max-w-3xl space-y-4">
                        {/* Full content */}
                        <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                          {isLoadingContent ? (
                            <span className="text-gray-600 animate-pulse">Loading…</span>
                          ) : (
                            content
                          )}
                        </div>

                        {/* Score + link row */}
                        <div className="flex items-center gap-6 pt-2 border-t border-gray-800">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Hook score</span>
                            <ScorePicker
                              current={scores[post.id] ?? null}
                              onSelect={(s) => handleScore(post.id, s)}
                            />
                            {isPending && <span className="text-gray-600 text-xs">Saving…</span>}
                          </div>
                          {post.post_url && (
                            <a
                              href={post.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-blue-400 hover:text-blue-300 transition-colors ml-auto"
                            >
                              View on LinkedIn →
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
