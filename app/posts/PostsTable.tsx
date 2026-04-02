'use client'

import { useState, useTransition, useMemo } from 'react'
import type { PostRow } from './page'
import { saveHookScore, toggleSunset, fetchPostContent } from './actions'

type SortKey = 'published_at' | 'reactions' | 'impressions' | 'hook_score'
type SortDir = 'asc' | 'desc'

const SCORE_COLOR: Record<number, string> = {
  1: 'text-red-400', 2: 'text-red-400', 3: 'text-orange-400', 4: 'text-orange-400',
  5: 'text-yellow-400', 6: 'text-yellow-400', 7: 'text-lime-400', 8: 'text-lime-400',
  9: 'text-green-400', 10: 'text-green-300',
}

// ── Filters bar ──────────────────────────────────────────────────────────────

function FiltersBar({
  dateFrom, dateTo, showSunset, showDupes, totalShown, totalAll,
  onDateFrom, onDateTo, onToggleSunset, onToggleDupes,
}: {
  dateFrom: string; dateTo: string; showSunset: boolean; showDupes: boolean
  totalShown: number; totalAll: number
  onDateFrom: (v: string) => void; onDateTo: (v: string) => void
  onToggleSunset: () => void; onToggleDupes: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={e => onDateFrom(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-gray-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">To</label>
        <input
          type="date"
          value={dateTo}
          onChange={e => onDateTo(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-gray-500"
        />
      </div>
      <div className="w-px h-4 bg-gray-800" />
      <Toggle active={showDupes} onToggle={onToggleDupes} label="Show dupes" />
      <Toggle active={showSunset} onToggle={onToggleSunset} label="Show sunset" />
      <span className="ml-auto text-xs text-gray-600">{totalShown} / {totalAll} posts</span>
    </div>
  )
}

function Toggle({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
        active ? 'bg-gray-700 text-gray-200' : 'bg-gray-900 text-gray-600 border border-gray-800'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-blue-400' : 'bg-gray-600'}`} />
      {label}
    </button>
  )
}

// ── Score badge / picker ─────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | null }) {
  if (!score) return <span className="text-gray-700 text-xs">—</span>
  return <span className={`text-xs font-bold tabular-nums ${SCORE_COLOR[score]}`}>{score}/10</span>
}

function ScorePicker({ current, onSelect }: { current: number | null; onSelect: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <button
          key={n}
          onClick={() => onSelect(n)}
          className={`w-6 h-6 rounded text-xs font-semibold transition-all ${
            current === n ? `${SCORE_COLOR[n]} bg-gray-800 ring-1 ring-current` : 'text-gray-600 hover:text-gray-300'
          }`}
        >{n}</button>
      ))}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PostsTable({ posts }: { posts: PostRow[] }) {
  // Sort
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'published_at', dir: 'desc' })
  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showSunset, setShowSunset] = useState(false)
  const [showDupes, setShowDupes] = useState(false)
  // Expanded rows
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [contentCache, setContentCache] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  // Local state for mutations
  const [sunsets, setSunsets] = useState<Record<string, boolean>>(
    Object.fromEntries(posts.map(p => [p.id, p.is_sunset]))
  )
  const [scores, setScores] = useState<Record<string, number | null>>(
    Object.fromEntries(posts.map(p => [p.id, p.hook_score]))
  )
  const [, startTransition] = useTransition()

  // Build a lookup: parentId -> children
  const childrenOf = useMemo(() => {
    const map: Record<string, PostRow[]> = {}
    for (const p of posts) {
      if (p.parent_id) {
        if (!map[p.parent_id]) map[p.parent_id] = []
        map[p.parent_id].push(p)
      }
    }
    return map
  }, [posts])

  // Filter + sort
  const visible = useMemo(() => {
    return posts.filter(p => {
      // Hide duplicates (has parent_id) unless showDupes
      if (p.parent_id && !showDupes) return false
      // Hide sunset unless showSunset
      if (sunsets[p.id] && !showSunset) return false
      // Date range
      if (dateFrom && p.published_at < dateFrom) return false
      if (dateTo && p.published_at > dateTo + 'T23:59:59') return false
      return true
    }).sort((a, b) => {
      const av = a[sort.key] ?? -1
      const bv = b[sort.key] ?? -1
      return sort.dir === 'asc' ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1)
    })
  }, [posts, sort, dateFrom, dateTo, showSunset, showDupes, sunsets])

  function toggleSort(key: SortKey) {
    setSort(s => s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })
  }

  async function handleRowClick(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!contentCache[id]) {
      setLoadingId(id)
      const content = await fetchPostContent(id)
      setContentCache(c => ({ ...c, [id]: content ?? '' }))
      setLoadingId(null)
    }
  }

  function handleScore(postId: string, score: number) {
    setScores(s => ({ ...s, [postId]: score }))
    startTransition(() => saveHookScore(postId, score))
  }

  function handleSunset(postId: string) {
    const next = !sunsets[postId]
    setSunsets(s => ({ ...s, [postId]: next }))
    if (next) setExpandedId(null)
    startTransition(() => toggleSunset(postId, next))
  }

  const cols: { key: SortKey; label: string }[] = [
    { key: 'published_at', label: 'Date' },
    { key: 'reactions', label: '👍' },
    { key: 'impressions', label: '👁' },
    { key: 'hook_score', label: 'Score' },
  ]

  return (
    <>
      <FiltersBar
        dateFrom={dateFrom} dateTo={dateTo}
        showSunset={showSunset} showDupes={showDupes}
        totalShown={visible.length} totalAll={posts.length}
        onDateFrom={setDateFrom} onDateTo={setDateTo}
        onToggleSunset={() => setShowSunset(v => !v)}
        onToggleDupes={() => setShowDupes(v => !v)}
      />

      <div className="divide-y divide-gray-800 border border-gray-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2 bg-gray-900 text-xs text-gray-500 font-medium select-none">
          <span>Hook</span>
          {cols.map(({ key, label }) => (
            <button key={key} onClick={() => toggleSort(key)}
              className={`text-right hover:text-gray-200 transition-colors whitespace-nowrap ${sort.key === key ? 'text-gray-200' : ''}`}
            >
              {label}{sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
            </button>
          ))}
        </div>

        {visible.length === 0 && (
          <div className="px-4 py-10 text-center text-gray-600 text-sm">No posts match the current filters.</div>
        )}

        {visible.map(post => {
          const isOpen = expandedId === post.id
          const score = scores[post.id]
          const isSunset = sunsets[post.id]
          const dupeCount = childrenOf[post.id]?.length ?? 0
          const alts = post.hook_alternatives

          return (
            <div key={post.id} className={isSunset ? 'opacity-40' : ''}>
              {/* Row */}
              <div
                onClick={() => handleRowClick(post.id)}
                className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 cursor-pointer items-start transition-colors ${
                  isOpen ? 'bg-gray-900/70' : 'hover:bg-gray-900/40'
                }`}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <p className="text-sm text-gray-200 leading-snug line-clamp-2 flex-1">{post.hook}</p>
                  <div className="flex gap-1 shrink-0 mt-0.5">
                    {dupeCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400 font-medium">
                        ×{dupeCount + 1}
                      </span>
                    )}
                    {isSunset && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">sunset</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap text-right">
                  {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                </span>
                <span className="text-xs text-gray-400 text-right tabular-nums">{post.reactions}</span>
                <span className="text-xs text-gray-400 text-right tabular-nums">
                  {post.impressions > 0 ? post.impressions.toLocaleString() : '—'}
                </span>
                <span className="text-right w-10"><ScoreBadge score={score ?? null} /></span>
              </div>

              {/* Expanded */}
              {isOpen && (
                <div className="px-4 pb-5 pt-2 bg-gray-900/40 border-t border-gray-800 space-y-5">

                  {/* Full content */}
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed max-w-2xl">
                    {loadingId === post.id
                      ? <span className="text-gray-600 animate-pulse">Loading…</span>
                      : contentCache[post.id]}
                  </p>

                  {/* Duplicate versions */}
                  {dupeCount > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Reposted {dupeCount}× on
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {childrenOf[post.id].map(child => (
                          <a
                            key={child.id}
                            href={child.post_url ?? '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
                          >
                            {new Date(child.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                            {child.impressions > 0 && <span className="text-gray-600 ml-1">· {child.impressions.toLocaleString()} imp</span>}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alternatives */}
                  {alts && alts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">10/10 alternatives</p>
                      {alts.map((alt, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="text-xs text-gray-700 mt-0.5 shrink-0">{i + 1}.</span>
                          <p className="text-sm text-gray-300 leading-snug">{alt}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions row */}
                  <div className="flex items-center gap-4 pt-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Score</span>
                      <ScorePicker current={score ?? null} onSelect={n => handleScore(post.id, n)} />
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleSunset(post.id) }}
                      className={`text-xs px-2.5 py-1 rounded transition-colors ml-auto ${
                        isSunset
                          ? 'bg-gray-800 text-gray-400 hover:text-gray-200'
                          : 'bg-gray-900 border border-gray-700 text-gray-500 hover:text-orange-400 hover:border-orange-800'
                      }`}
                    >
                      {isSunset ? '↩ Restore' : '🌅 Sunset'}
                    </button>
                    {post.post_url && (
                      <a
                        href={post.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-gray-600 hover:text-gray-300"
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
    </>
  )
}
