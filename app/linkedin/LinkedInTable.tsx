'use client'

import { useState, useTransition, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import type { PostRow } from './page'
import { toggleSunset } from './actions'

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

export default function LinkedInTable({ posts }: { posts: PostRow[] }) {
  const router = useRouter()
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'published_at', dir: 'desc' })
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showSunset, setShowSunset] = useState(false)
  const [showDupes, setShowDupes] = useState(false)
  const [sunsets, setSunsets] = useState<Record<string, boolean>>(
    Object.fromEntries(posts.map(p => [p.id, p.is_sunset]))
  )
  const [scores] = useState<Record<string, number | null>>(
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

  function handleSunset(e: React.MouseEvent, postId: string) {
    e.stopPropagation()
    const next = !sunsets[postId]
    setSunsets(s => ({ ...s, [postId]: next }))
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
        className={`px-2 py-2 text-[10px] font-medium uppercase tracking-wider cursor-pointer select-none whitespace-nowrap text-right w-[68px] ${
          active ? 'text-[#aaa]' : 'text-[#555] hover:text-[#999]'
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
          <span className="text-xs text-[#666]">{visible.length} / {posts.length}</span>
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
                : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#666]'
            }`}
          >Show dupes</button>
          <button
            onClick={() => setShowSunset(v => !v)}
            className={`px-3 py-1 rounded-md text-[11px] border transition-colors ${
              showSunset
                ? 'bg-[#141414] border-[#252525] text-[#777]'
                : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#666]'
            }`}
          >Show sunset</button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full border-collapse table-fixed">
          <thead className="sticky top-0 bg-[#0a0a0a] z-10">
            <tr className="border-b border-[#111]">
              <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[#555] text-left">Hook</th>
              {sortCols.map(c => <SortTh key={c.key} colKey={c.key} label={c.label} />)}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[#555] text-sm">
                  No posts match the current filters.
                </td>
              </tr>
            )}
            {visible.map(post => {
              const score = scores[post.id]
              const isSunset = sunsets[post.id]
              const dupeCount = childrenOf[post.id]?.length ?? 0

              return (
                <Fragment key={post.id}>
                  <tr
                    onClick={() => router.push(`/linkedin/${post.id}`)}
                    className={`cursor-pointer border-b border-[#0d0d0d] transition-colors ${
                      isSunset ? 'opacity-40 hover:bg-[#0d0d0d]' : 'hover:bg-[#0d0d0d]'
                    }`}
                  >
                    <td className="px-3 py-[9px] max-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[12px] text-[#bbb] truncate">
                          {post.hook}
                        </span>
                        {dupeCount > 0 && (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-[#0f1e32] text-[#3b7dd8]">
                            ×{dupeCount + 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-[9px] text-[12px] text-[#555] text-right whitespace-nowrap w-[68px]">
                      {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-2 py-[9px] text-[12px] text-[#666] text-right tabular-nums w-[68px]">{post.reactions}</td>
                    <td className="px-2 py-[9px] text-[12px] text-[#666] text-right tabular-nums w-[68px]">{post.comments ?? '—'}</td>
                    <td className="px-2 py-[9px] text-[12px] text-[#666] text-right tabular-nums w-[68px]">{post.reposts ?? '—'}</td>
                    <td className="px-2 py-[9px] text-[12px] text-[#666] text-right tabular-nums w-[68px]">
                      {post.impressions > 0 ? post.impressions.toLocaleString() : '—'}
                    </td>
                    <td className="px-2 py-[9px] text-right w-[68px]"><ScoreBadge score={score ?? null} /></td>
                    <td className="px-2 py-[9px] text-center w-8">
                      <button
                        onClick={e => handleSunset(e, post.id)}
                        title={isSunset ? 'Restore' : 'Sunset this post'}
                        className={`text-[13px] px-1 py-0.5 rounded transition-colors ${
                          isSunset ? 'text-orange-400' : 'text-[#2a2a2a] hover:text-[#888]'
                        }`}
                      >🌅</button>
                    </td>
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
