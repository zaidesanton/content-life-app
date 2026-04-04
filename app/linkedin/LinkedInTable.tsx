'use client'

import { useState, useTransition, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import type { PostRow } from './page'
import { toggleSunset } from './actions'
import PageTabs from '@/components/PageTabs'
import DraftsList from './DraftsList'

type SortKey = 'published_at' | 'reactions' | 'comments' | 'reposts' | 'impressions' | 'hook_score'
type SortDir = 'asc' | 'desc'

const SCORE_COLOR: Record<number, string> = {
  1: 'text-red-400', 2: 'text-red-400', 3: 'text-orange-400', 4: 'text-orange-400',
  5: 'text-yellow-400', 6: 'text-yellow-400', 7: 'text-lime-400', 8: 'text-lime-400',
  9: 'text-green-400', 10: 'text-green-300',
}

function ScoreBadge({ score }: { score: number | null }) {
  if (!score) return <span className="text-[#777] text-xs">—</span>
  return <span className={`text-xs font-bold tabular-nums ${SCORE_COLOR[score]}`}>{score}/10</span>
}

export default function LinkedInTable({ posts }: { posts: PostRow[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<'published' | 'drafts'>('published')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'published_at', dir: 'desc' })
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showSunset, setShowSunset] = useState(false)
  const [showDupes, setShowDupes] = useState(false)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Split into published vs drafts
  const published = useMemo(() => posts.filter(p => p.status !== 'draft'), [posts])
  const drafts = useMemo(() => posts.filter(p => p.status === 'draft'), [posts])

  const [sunsets, setSunsets] = useState<Record<string, boolean>>(
    Object.fromEntries(published.map(p => [p.id, p.is_sunset]))
  )
  const [scores] = useState<Record<string, number | null>>(
    Object.fromEntries(published.map(p => [p.id, p.hook_score]))
  )

  const childrenOf = useMemo(() => {
    const map: Record<string, PostRow[]> = {}
    for (const p of published) {
      if (p.parent_id) {
        if (!map[p.parent_id]) map[p.parent_id] = []
        map[p.parent_id].push(p)
      }
    }
    return map
  }, [published])

  const allTags = useMemo(
    () => Array.from(new Set(posts.flatMap(p => p.tags ?? []))).sort(),
    [posts],
  )

  const visible = useMemo(() => {
    return published
      .filter(p => {
        if (p.parent_id && !showDupes) return false
        if (sunsets[p.id] && !showSunset) return false
        if (dateFrom && p.published_at < dateFrom) return false
        if (dateTo && p.published_at > dateTo + 'T23:59:59') return false
        if (tagFilter && !(p.tags ?? []).includes(tagFilter)) return false
        return true
      })
      .sort((a, b) => {
        const av = (a[sort.key] as number | string | null) ?? -1
        const bv = (b[sort.key] as number | string | null) ?? -1
        return sort.dir === 'asc' ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1)
      })
  }, [published, sort, dateFrom, dateTo, showSunset, showDupes, sunsets, tagFilter])

  function toggleSort(key: SortKey) {
    setSort(s =>
      s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' },
    )
  }

  function handleSunset(e: React.MouseEvent, postId: string) {
    e.stopPropagation()
    const next = !sunsets[postId]
    setSunsets(s => ({ ...s, [postId]: next }))
    startTransition(() => toggleSunset(postId, next))
  }

  function handleTagClick(e: React.MouseEvent, tag: string) {
    e.stopPropagation()
    setTagFilter(f => (f === tag ? null : tag))
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
          active ? 'text-white' : 'text-[#888] hover:text-[#ccc]'
        }`}
      >
        {label}
        {active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
      </th>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-[#111]">
        {/* Title row */}
        <div className="px-6 pt-4 flex items-center justify-between">
          <h1 className="text-[16px] font-semibold text-white">LinkedIn</h1>
          {tab === 'published' && (
            <span className="text-xs text-[#888]">
              {visible.length} / {published.length}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="px-2">
          <PageTabs
            tabs={[
              { key: 'published', label: 'Published' },
              { key: 'drafts', label: 'Drafts', count: drafts.length },
            ]}
            active={tab}
            onChange={k => setTab(k as 'published' | 'drafts')}
          />
        </div>

        {/* Filters — published only */}
        {tab === 'published' && (
          <div className="px-6 pt-1 pb-3 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-[#0f0f0f] border border-[#252525] rounded-md px-2 py-1 text-[11px] text-[#888] focus:outline-none focus:border-[#444] w-[130px]"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-[#0f0f0f] border border-[#252525] rounded-md px-2 py-1 text-[11px] text-[#888] focus:outline-none focus:border-[#444] w-[130px]"
            />
            <button
              onClick={() => setShowDupes(v => !v)}
              className={`px-3 py-1 rounded-md text-[11px] border transition-colors ${
                showDupes
                  ? 'bg-[#141414] border-[#252525] text-white'
                  : 'bg-[#0f0f0f] border-[#252525] text-[#888] hover:text-[#ccc]'
              }`}
            >
              Show dupes
            </button>
            <button
              onClick={() => setShowSunset(v => !v)}
              className={`px-3 py-1 rounded-md text-[11px] border transition-colors ${
                showSunset
                  ? 'bg-[#141414] border-[#252525] text-white'
                  : 'bg-[#0f0f0f] border-[#252525] text-[#888] hover:text-[#ccc]'
              }`}
            >
              Show sunset
            </button>
          </div>
        )}

        {/* Tag chips — published only */}
        {tab === 'published' && allTags.length > 0 && (
          <div className="px-6 pb-3 flex flex-wrap gap-1.5">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setTagFilter(f => (f === tag ? null : tag))}
                className={`px-2.5 py-0.5 rounded-full text-[11px] border transition-colors ${
                  tagFilter === tag
                    ? 'bg-[#1a2a1a] border-[#2a4a2a] text-[#7ab87a]'
                    : 'bg-[#0f0f0f] border-[#252525] text-[#888] hover:text-[#ccc] hover:border-[#333]'
                }`}
              >
                {tag}
                {tagFilter === tag && <span className="ml-1 opacity-60">×</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {tab === 'published' ? (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <table className="w-full border-collapse table-fixed">
            <thead className="sticky top-0 bg-[#0a0a0a] z-10">
              <tr className="border-b border-[#111]">
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[#888] text-left">
                  Hook
                </th>
                {sortCols.map(c => (
                  <SortTh key={c.key} colKey={c.key} label={c.label} />
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#666] text-sm">
                    No posts match the current filters.
                  </td>
                </tr>
              )}
              {visible.map(post => {
                const score = scores[post.id]
                const isSunset = sunsets[post.id]
                const dupeCount = childrenOf[post.id]?.length ?? 0
                const tags = post.tags ?? []

                return (
                  <Fragment key={post.id}>
                    <tr
                      onClick={() => router.push(`/linkedin/${post.id}`)}
                      className={`cursor-pointer border-b border-[#0d0d0d] transition-colors ${
                        isSunset ? 'opacity-40 hover:bg-[#0d0d0d]' : 'hover:bg-[#0d0d0d]'
                      }`}
                    >
                      <td className="px-3 py-[9px] max-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] text-[#bbb] truncate">{post.hook}</span>
                            {dupeCount > 0 && (
                              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-[#0f1e32] text-[#3b7dd8]">
                                ×{dupeCount + 1}
                              </span>
                            )}
                          </div>
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tags.map(tag => (
                                <span
                                  key={tag}
                                  onClick={e => handleTagClick(e, tag)}
                                  className={`px-1.5 py-0 rounded text-[9px] border cursor-pointer transition-colors ${
                                    tagFilter === tag
                                      ? 'bg-[#1a2a1a] border-[#2a4a2a] text-[#7ab87a]'
                                      : 'bg-[#111] border-[#252525] text-[#888] hover:text-[#ccc] hover:border-[#333]'
                                  }`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-[9px] text-[12px] text-[#999] text-right whitespace-nowrap w-[68px]">
                        {new Date(post.published_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </td>
                      <td className="px-2 py-[9px] text-[12px] text-[#aaa] text-right tabular-nums w-[68px]">
                        {post.reactions}
                      </td>
                      <td className="px-2 py-[9px] text-[12px] text-[#aaa] text-right tabular-nums w-[68px]">
                        {post.comments ?? '—'}
                      </td>
                      <td className="px-2 py-[9px] text-[12px] text-[#aaa] text-right tabular-nums w-[68px]">
                        {post.reposts ?? '—'}
                      </td>
                      <td className="px-2 py-[9px] text-[12px] text-[#aaa] text-right tabular-nums w-[68px]">
                        {post.impressions > 0 ? post.impressions.toLocaleString() : '—'}
                      </td>
                      <td className="px-2 py-[9px] text-right w-[68px]">
                        <ScoreBadge score={score ?? null} />
                      </td>
                      <td className="px-2 py-[9px] text-center w-8">
                        <button
                          onClick={e => handleSunset(e, post.id)}
                          title={isSunset ? 'Restore' : 'Sunset this post'}
                          className={`text-[13px] px-1 py-0.5 rounded transition-colors ${
                            isSunset ? 'text-orange-400' : 'text-[#444] hover:text-[#888]'
                          }`}
                        >
                          🌅
                        </button>
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <DraftsList drafts={drafts} />
      )}
    </div>
  )
}
