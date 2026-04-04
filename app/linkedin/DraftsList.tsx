'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import type { PostRow } from './page'
import { createDraft, updateDraftHook, deleteDraft } from './actions'

// ── Individual draft card ─────────────────────────────────────────────────────

function DraftCard({
  draft,
  onDelete,
}: {
  draft: PostRow
  onDelete: (id: string) => void
}) {
  const [hook, setHook] = useState(draft.hook)
  const [, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback(
    (val: string) => {
      setHook(val)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        startTransition(() => updateDraftHook(draft.id, val))
      }, 800)
    },
    [draft.id],
  )

  const date = new Date(draft.published_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  })

  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4 space-y-3">
      {/* Top row: date + delete */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#777]">{date}</span>
        <button
          onClick={() => onDelete(draft.id)}
          className="text-[#555] hover:text-[#999] transition-colors"
          title="Delete draft"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1.5 3h9M4.5 3V2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M2.5 3l.5 7h6l.5-7" />
          </svg>
        </button>
      </div>

      {/* Editable hook text */}
      <textarea
        value={hook}
        onChange={e => handleChange(e.target.value)}
        rows={3}
        placeholder="Post idea…"
        className="w-full bg-[#111] border border-[#222] rounded-md px-3 py-2 text-[13px] text-[#ccc] placeholder:text-[#555] focus:outline-none focus:border-[#333] resize-none leading-relaxed"
      />

      {/* Tags */}
      {(draft.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(draft.tags ?? []).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-[11px] bg-[#111] border border-[#222] text-[#888]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DraftsList({ drafts }: { drafts: PostRow[] }) {
  const [newText, setNewText] = useState('')
  const [, startTransition] = useTransition()

  function handleCreate() {
    const text = newText.trim()
    if (!text) return
    setNewText('')
    startTransition(() => createDraft(text))
  }

  function handleDelete(id: string) {
    startTransition(() => deleteDraft(id))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Capture area */}
      <div className="px-6 py-4 border-b border-[#111]">
        <div className="flex gap-2 items-end">
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCreate()
            }}
            placeholder="Capture a post idea… (⌘+Enter to save)"
            rows={2}
            className="flex-1 bg-[#111] border border-[#252525] rounded-lg px-3 py-2.5 text-[13px] text-[#ccc] placeholder:text-[#666] focus:outline-none focus:border-[#444] resize-none leading-relaxed"
          />
          <button
            onClick={handleCreate}
            disabled={!newText.trim()}
            className="shrink-0 bg-[#1e1e1e] border border-[#2a2a2a] text-[#ccc] rounded-lg px-4 py-2.5 text-[13px] hover:bg-[#252525] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            + Save
          </button>
        </div>
      </div>

      {/* Drafts list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {drafts.length === 0 ? (
          <p className="text-center text-[#666] text-sm py-12">
            No drafts yet — capture your first idea above.
          </p>
        ) : (
          drafts.map(draft => (
            <DraftCard key={draft.id} draft={draft} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  )
}
