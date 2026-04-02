'use client'

import { useState, useTransition, useMemo } from 'react'
import type { PostRow } from './page'
import { saveHookScore, toggleSunset, fetchPostContent } from './actions'

type SortKey = 'published_at' | 'reactions' | 'comments' | 'reposts' | 'impressions' | 'hook_score'
type SortDir = 'asc' | 'desc'

const SCORE_COLOR: Record<number, string> = {
  1: 'text-red-400', 2: 'text-red-400', 3: 'text-orange-400', 4: 'text-orange-400',
  5: 'text-yellow-400', 6: 'text-yellow-400', 7: 'text-lime-400', 8: 'text-lime-400',
  9: 'text-green-400', 10: 'text-green-300',
}

function ScoreBadge({ score }: { score: number | null }) {
  if (!score) return <span className="text-[#333] text-xs">—</span>
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
            current === n
              ? `${SCORE_COLOR[n]} bg-[#1a1a1a] ring-1 ring-current`
              : 'text-[#444] hover:text-[#aaa]'
          }`}
        >{n}</button>
      ))}
    </div>
  )
}

export default function LinkedInTable({ posts }: { posts: PostRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'published_at', dir: 'desc' })
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showSunset, setShowSunset] = useState(false)
  const [showDupes, setShowDupes] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [contentCache, setContentCache] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [sunsets, setSunsets] = useState<Record<string, boolean>>(
    Object.fromEntries(posts.map(p => [p.id, p.is_sunset]))
  )
  const [scores, setScores] = useState<Record<string, number | null>>(
    Object.fromEntries(posts.map(p => [p.id, p.hook_score]))
  )
  const [, startTransition] = useTransition()

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

  const visible = useMemo(() => {
    return posts.filter(p => {
      if (p.parent_id && !showDupes) return false
      if (sunsets[p.id] && !showSunset) return false
      if (dateFrom && p.published_at < dateFrom) return false
      if (dateTo && p.published_at > dateTo + 'T23:59:59') return false
      return true
    }).sort((a, b) => {
      const av = (a[sort.key] as number | string | null) ?? -1
      const bv = (b[sort.key] as number | string | null) ?? -1
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

  function handleSunset(e: React.MouseEvent, postId: string) {
    e.stopPropagation()
    const next = !sunsets[postId]
    setSunsets(s => ({ ...s, [postId]: next }))
    if (next) setExpandedId(null)
    startTransition(() => toggleSunset(postId, next))
  }

  const sortCols: { key: SortKey; label: string }[] = [
    { key: 'published_at', label: 'Date' },
    { key: 'reactions',    label: '👍'  },
    { key: 'comments',     label: '💬'  },
    { key: 'reposts',      label: '🔁'  },
    { key: 'impressions',  label: '👁'  },
    { key: 'hook_score',   label: 'Score' },
  ]

  function SortTh({ colKey, label }: { colKey: SortKey; label: string }) {
    const active = sort.key === colKey
    return (
      <th
        onClick={() => toggleSort(colKey)}
        className={`px-3 py-2 text-[10px] font-medium uppercase tracking-wider cursor-pointer select-none whitespace-nowrap text-right ${
          active ? 'text-[#aaa]' : 'text-[#2e2e2e] hover:text-[#666]'
        }`}
      >
        {label}{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
      </th>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header + filters */}
      <div className="px-6 pt-5 pb-3 border-b border-[#111]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[16px] font-semibold text-white">LinkedIn Posts</h1>
          <span className="text-xs text-[#333]">{visible.length} / {posts.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-md px-2 py-1 text-[11px] text-[#555] focus:outline-none focus:border-[#333] w-[130px]"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-md px-2 py-1 text-[11px] text-[#555] focus:outline-none focus:border-[#333] w-[130px]"
          />
          <button
            onClick={() => setShowDupes(v => !v)}
            className={`px-3 py-1 rounded-md text-[11px] border transition-colors ${
              showDupes
                ? 'bg-[#141414] border-[#252525] text-[#777]'
                : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#333]'
            }`}
          >Show dupes</button>
          <button
            onClick={() => setShowSunset(v => !v)}
            className={`px-3 py-1 rounded-md text-[11px] border transition-colors ${
              showSunset
                ? 'bg-[#141414] border-[#252525] text-[#777]'
                : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#333]'
            }`}
          >Show sunset</button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-[#0a0a0a] z-10">
            <tr className="border-b border-[#111]">
              <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[#2e2e2e] text-left w-[40%]">Hook</th>
              {sortCols.map(c => <SortTh key={c.key} colKey={c.key} label={c.label} />)}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[#333] text-sm">
                  No posts match the current filters.
                </td>
              </tr>
            )}
            {visible.map(post => {
              const isOpen = expandedId === post.id
              const score = scores[post.id]
              const isSunset = sunsets[post.id]
              const dupeCount = childrenOf[post.id]?.length ?? 0
              const alts = post.hook_alternatives

              return (
                <>
                  <tr
                    key={post.id}
                    onClick={() => handleRowClick(post.id)}
                    className={`cursor-pointer border-b border-[#0d0d0d] transition-colors ${
                      isOpen ? 'bg-[#0d0d0d]' : isSunset ? 'opacity-40 hover:bg-[#0d0d0d]' : 'hover:bg-[#0d0d0d]'
                    }`}
                  >
                    <td className="px-3 py-[9px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[12px] text-[#bbb] truncate max-w-[280px] md:max-w-none">
                          {post.hook}
                        </span>
                        {dupeCount > 0 && (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-[#0f1e32] text-[#3b7dd8]">
                            ×{dupeCount + 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-[9px] text-[12px] text-[#555] text-right whitespace-nowrap">
                      {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-3 py-[9px] text-[12px] text-[#666] text-right tabular-nums">{post.reactions}</td>
                    <td className="px-3 py-[9px] text-[12px] text-[#666] text-right tabular-nums">{post.comments ?? '—'}</td>
                    <td className="px-3 py-[9px] text-[12px] text-[#666] text-right tabular-nums">{post.reposts ?? '—'}</td>
                    <td className="px-3 py-[9px] text-[12px] text-[#666] text-right tabular-nums">
                      {post.impressions > 0 ? post.impressions.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-[9px] text-right"><ScoreBadge score={score ?? null} /></td>
                    <td className="px-2 py-[9px] text-center">
                      <button
                        onClick={e => handleSunset(e, post.id)}
                        title={isSunset ? 'Restore' : 'Sunset this post'}
                        className={`text-[13px] px-1 py-0.5 rounded transition-colors ${
                          isSunset ? 'text-orange-400' : 'text-[#2a2a2a] hover:text-[#888]'
                        }`}
                      >🌅</button>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr key={post.id + '-exp'} className="bg-[#0d0d0d]">
                      <td colSpan={8} className="px-4 pb-5 pt-2 border-b border-[#111]">
                        <div className="space-y-4 max-w-2xl">
                          <p className="text-sm text-[#aaa] whitespace-pre-wrap leading-relaxed">
                            {loadingId === post.id
                              ? <span className="text-[#333] animate-pulse">Loading…</span>
                              : contentCache[post.id]}
                          </p>

                          {dupeCount > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold text-[#333] uppercase tracking-widest">
                                Reposted {dupeCount}×
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {childrenOf[post.id].map(child => (
                                  <a
                                    key={child.id}
                                    href={child.post_url ?? '#'}
                                    target="_blank" rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-xs px-2 py-1 rounded bg-[#111] text-[#555] hover:text-[#aaa] transition-colors"
                                  >
                                    {new Date(child.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                                    {child.impressions > 0 && <span className="text-[#333] ml-1">· {child.impressions.toLocaleString()} imp</span>}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {alts && alts.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold text-[#333] uppercase tracking-widest">10/10 alternatives</p>
                              {alts.map((alt, i) => (
                                <div key={i} className="flex gap-2 items-start">
                                  <span className="text-xs text-[#333] mt-0.5 shrink-0">{i + 1}.</span>
                                  <p className="text-sm text-[#999] leading-snug">{alt}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-4 flex-wrap pt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#444]">Score</span>
                              <ScorePicker current={score ?? null} onSelect={n => handleScore(post.id, n)} />
                            </div>
                            {post.post_url && (
                              <a
                                href={post.post_url}
                                target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-xs text-[#444] hover:text-[#aaa] ml-auto"
                              >
                                LinkedIn →
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
    </div>
  )
}
