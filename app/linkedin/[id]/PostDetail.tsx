'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { PostFull, DupeRow } from './page'
import { saveHookScore, toggleSunset, updatePostTags } from '../actions'

const SCORE_COLOR: Record<number, string> = {
  1: 'text-red-400', 2: 'text-red-400', 3: 'text-orange-400', 4: 'text-orange-400',
  5: 'text-yellow-400', 6: 'text-yellow-400', 7: 'text-lime-400', 8: 'text-lime-400',
  9: 'text-green-400', 10: 'text-green-300',
}

// ── Tag editor ────────────────────────────────────────────────────────────────

function TagEditor({
  tags, allTags, onChange,
}: {
  tags: string[]
  allTags: string[]
  onChange: (tags: string[]) => void
}) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const suggestions = allTags.filter(
    t => t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t)
  )

  // Close suggestion list on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const tid = setTimeout(() => {
      document.addEventListener('click', handler)
      document.addEventListener('touchstart', handler)
    }, 0)
    return () => {
      clearTimeout(tid)
      document.removeEventListener('click', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  function add(tag: string) {
    const clean = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!clean || tags.includes(clean)) return
    onChange([...tags, clean])
    setInput('')
    setOpen(false)
  }

  function remove(tag: string) {
    onChange(tags.filter(t => t !== tag))
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map(tag => (
        <span
          key={tag}
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#111] border border-[#1e1e1e] text-[11px] text-[#888]"
        >
          {tag}
          <button
            onClick={() => remove(tag)}
            className="text-[#555] hover:text-[#999] transition-colors leading-none ml-0.5"
          >×</button>
        </span>
      ))}

      {/* Add tag input */}
      <div className="relative" ref={containerRef}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); add(input) }
            if (e.key === 'Escape') { setOpen(false); setInput('') }
          }}
          placeholder="+ add tag"
          className="bg-transparent border border-dashed border-[#333] rounded-full px-2.5 py-0.5 text-[11px] text-[#777] placeholder:text-[#555] focus:outline-none focus:border-[#555] w-20 focus:w-28 transition-all"
        />
        {open && (input || suggestions.length > 0) && (
          <div className="absolute top-7 left-0 z-20 bg-[#141414] border border-[#252525] rounded-lg overflow-hidden min-w-[140px] shadow-xl">
            {suggestions.length > 0 ? (
              suggestions.slice(0, 8).map(s => (
                <button
                  key={s}
                  onMouseDown={e => e.preventDefault()} // keep input focused
                  onClick={() => add(s)}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-[#777] hover:text-[#ccc] hover:bg-[#1a1a1a] transition-colors"
                >
                  {s}
                </button>
              ))
            ) : input.trim() ? (
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => add(input)}
                className="w-full text-left px-3 py-1.5 text-[11px] text-[#555] hover:text-[#ccc] hover:bg-[#1a1a1a] transition-colors"
              >
                Create &ldquo;{input.trim().toLowerCase()}&rdquo;
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PostDetail({
  post, dupes, allTags,
}: {
  post: PostFull
  dupes: DupeRow[]
  allTags: string[]
}) {
  const [score, setScore] = useState<number | null>(post.hook_score)
  const [isSunset, setIsSunset] = useState(post.is_sunset)
  const [tags, setTags] = useState<string[]>(post.tags ?? [])
  const [, startTransition] = useTransition()

  function handleScore(n: number) {
    setScore(n)
    startTransition(() => saveHookScore(post.id, n))
  }

  function handleSunset() {
    const next = !isSunset
    setIsSunset(next)
    startTransition(() => toggleSunset(post.id, next))
  }

  function handleTagsChange(next: string[]) {
    setTags(next)
    startTransition(() => updatePostTags(post.id, next))
  }

  return (
    <div className="px-6 md:px-10 pt-8 pb-16 max-w-2xl">
      {/* Back */}
      <Link
        href="/linkedin"
        className="text-[12px] text-[#555] hover:text-[#999] transition-colors mb-8 inline-block"
      >
        ← LinkedIn Posts
      </Link>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-[12px] text-[#555]">
        <span>{new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <span>👍 {post.reactions}</span>
        <span>💬 {post.comments ?? 0}</span>
        <span>🔁 {post.reposts ?? 0}</span>
        {post.impressions > 0 && <span>👁 {post.impressions.toLocaleString()}</span>}
        {isSunset && <span className="text-orange-400 text-[11px]">🌅 sunset</span>}
      </div>

      {/* Hook */}
      <h1 className="text-[20px] font-semibold text-white leading-snug mb-6">
        {post.hook}
      </h1>

      {/* Full content */}
      {post.content && (
        <p className="text-[14px] text-[#999] whitespace-pre-wrap leading-relaxed mb-8">
          {post.content}
        </p>
      )}

      <div className="border-t border-[#141414] pt-6 space-y-7">

        {/* Tags */}
        <div>
          <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest mb-3">Tags</p>
          <TagEditor tags={tags} allTags={allTags} onChange={handleTagsChange} />
        </div>

        {/* Score */}
        <div>
          <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest mb-3">Hook Score</p>
          <div className="flex items-center gap-3 flex-wrap">
            {score && (
              <span className={`text-sm font-bold tabular-nums ${SCORE_COLOR[score]}`}>{score}/10</span>
            )}
            <div className="flex gap-1">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  onClick={() => handleScore(n)}
                  className={`w-7 h-7 rounded text-[12px] font-semibold transition-all ${
                    score === n
                      ? `${SCORE_COLOR[n]} bg-[#1a1a1a] ring-1 ring-current`
                      : 'text-[#555] hover:text-[#aaa]'
                  }`}
                >{n}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Hook alternatives */}
        {post.hook_alternatives && post.hook_alternatives.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest mb-3">10/10 Alternatives</p>
            <div className="space-y-3">
              {post.hook_alternatives.map((alt, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-[11px] text-[#555] mt-0.5 shrink-0 w-4 tabular-nums">{i + 1}.</span>
                  <p className="text-[14px] text-[#888] leading-snug">{alt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Duplicate reposts */}
        {dupes.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest mb-3">
              Reposted {dupes.length}×
            </p>
            <div className="flex flex-wrap gap-2">
              {dupes.map(dupe => (
                <a
                  key={dupe.id}
                  href={dupe.post_url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] px-2.5 py-1.5 rounded bg-[#111] border border-[#1a1a1a] text-[#666] hover:text-[#aaa] transition-colors"
                >
                  {new Date(dupe.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                  {dupe.impressions > 0 && (
                    <span className="text-[#666] ml-1">· {dupe.impressions.toLocaleString()} imp</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap pt-1">
          <button
            onClick={handleSunset}
            className={`text-[12px] px-3 py-1.5 rounded-md border transition-colors ${
              isSunset
                ? 'border-orange-800/50 text-orange-400 bg-orange-950/20'
                : 'border-[#222] text-[#666] hover:text-orange-400 hover:border-orange-800/50'
            }`}
          >
            {isSunset ? '↩ Restore post' : '🌅 Sunset this post'}
          </button>
          {post.post_url && (
            <a
              href={post.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-[#666] hover:text-[#999] transition-colors"
            >
              View on LinkedIn →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
