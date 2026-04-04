'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import type { DiaryEntry } from './actions'
import { saveDiaryEntry } from './actions'

const SCORE_COLOR: Record<number, string> = {
  1: 'text-red-400',    2: 'text-red-400',
  3: 'text-orange-400', 4: 'text-orange-400',
  5: 'text-yellow-400', 6: 'text-yellow-400',
  7: 'text-lime-400',   8: 'text-lime-400',
  9: 'text-green-400',  10: 'text-green-300',
}

function fmt(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ── Today's entry editor ──────────────────────────────────────────────────────

function TodayEditor({ todayStr, initial }: { todayStr: string; initial: DiaryEntry | null }) {
  const [score, setScore] = useState<number | null>(initial?.score ?? null)
  const [goodThing, setGoodThing] = useState(initial?.good_thing ?? '')
  const [thoughts, setThoughts] = useState(initial?.thoughts ?? '')
  const [, startTransition] = useTransition()

  // Debounce timer ref shared across fields
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback((fields: { score?: number | null; good_thing?: string; thoughts?: string }) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(() => saveDiaryEntry(todayStr, fields))
    }, 600)
  }, [todayStr])

  function handleScore(n: number) {
    const next = score === n ? null : n
    setScore(next)
    save({ score: next, good_thing: goodThing, thoughts })
  }

  function handleGoodThing(val: string) {
    setGoodThing(val)
    save({ score, good_thing: val, thoughts })
  }

  function handleThoughts(val: string) {
    setThoughts(val)
    save({ score, good_thing: goodThing, thoughts: val })
  }

  return (
    <div className="space-y-5">
      {/* Score */}
      <div>
        <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest mb-2.5">
          How was your day?
        </p>
        <div className="flex gap-1 flex-wrap">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              onClick={() => handleScore(n)}
              className={`w-8 h-8 rounded text-[13px] font-semibold transition-all ${
                score === n
                  ? `${SCORE_COLOR[n]} bg-[#1a1a1a] ring-1 ring-current`
                  : 'text-[#555] hover:text-[#aaa]'
              }`}
            >{n}</button>
          ))}
        </div>
      </div>

      {/* One good thing */}
      <div>
        <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest mb-2.5">
          One good thing today
        </p>
        <input
          value={goodThing}
          onChange={e => handleGoodThing(e.target.value)}
          placeholder="Something that went well…"
          className="w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2.5 text-[13px] text-[#ccc] placeholder:text-[#444] focus:outline-none focus:border-[#333]"
        />
      </div>

      {/* Thoughts */}
      <div>
        <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest mb-2.5">
          Thoughts
        </p>
        <textarea
          value={thoughts}
          onChange={e => handleThoughts(e.target.value)}
          placeholder="What's on your mind…"
          rows={5}
          className="w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2.5 text-[13px] text-[#ccc] placeholder:text-[#444] focus:outline-none focus:border-[#333] resize-none leading-relaxed"
        />
      </div>
    </div>
  )
}

// ── Past entry compact row ────────────────────────────────────────────────────

function PastEntry({ entry }: { entry: DiaryEntry }) {
  const [expanded, setExpanded] = useState(false)

  const firstLine = entry.thoughts?.split('\n')[0]?.trim() ?? ''
  const preview = firstLine.length > 60 ? firstLine.slice(0, 60) + '…' : firstLine

  return (
    <div
      className="border-b border-[#0f0f0f] py-3 cursor-pointer"
      onClick={() => setExpanded(v => !v)}
    >
      {/* Compact row */}
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[#555] shrink-0 w-[88px]">{fmt(entry.date)}</span>
        {entry.score ? (
          <span className={`text-[12px] font-bold tabular-nums shrink-0 ${SCORE_COLOR[entry.score]}`}>
            {entry.score}/10
          </span>
        ) : (
          <span className="text-[12px] text-[#555] shrink-0">—</span>
        )}
        {preview && (
          <span className="text-[12px] text-[#444] truncate flex-1">{preview}</span>
        )}
        <span className={`text-[10px] text-[#555] shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-3 pl-[100px]">
          {entry.good_thing && (
            <div>
              <p className="text-[9px] font-semibold text-[#555] uppercase tracking-widest mb-1">Good thing</p>
              <p className="text-[13px] text-[#888]">{entry.good_thing}</p>
            </div>
          )}
          {entry.thoughts && (
            <div>
              <p className="text-[9px] font-semibold text-[#555] uppercase tracking-widest mb-1">Thoughts</p>
              <p className="text-[13px] text-[#777] whitespace-pre-wrap leading-relaxed">{entry.thoughts}</p>
            </div>
          )}
          {!entry.good_thing && !entry.thoughts && (
            <p className="text-[12px] text-[#555] italic">No notes recorded.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function DiaryView({
  todayStr,
  todayEntry,
  history,
}: {
  todayStr: string
  todayEntry: DiaryEntry | null
  history: DiaryEntry[]
}) {
  return (
    <div className="px-6 md:px-8 pt-8 pb-10 max-w-xl">
      {/* Header */}
      <h1 className="text-[20px] font-semibold text-white mb-1">Diary</h1>
      <p className="text-[12px] text-[#555] mb-7">
        {new Date(todayStr + 'T12:00:00').toLocaleDateString('en-GB', {
          weekday: 'long', day: 'numeric', month: 'long',
        })}
      </p>

      {/* Today's editor */}
      <TodayEditor todayStr={todayStr} initial={todayEntry} />

      {/* History */}
      {history.length > 0 && (
        <div className="mt-10">
          <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest mb-3">
            Previous days
          </p>
          <div>
            {history.map(entry => (
              <PastEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
