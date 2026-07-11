'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createDraft, updateDraft, deleteDraft } from '@/app/draft-actions'
import type { DraftStatus } from '@/app/draft-actions'

export type Draft = {
  id: string
  title: string
  content: string
  source_url: string | null
  status: DraftStatus
  created_at: string
}

const STATUS_CYCLE: DraftStatus[] = ['draft', 'ready', 'posted']
const STATUS_LABEL: Record<DraftStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  posted: 'Posted',
}
const STATUS_STYLE: Record<DraftStatus, string> = {
  draft: 'bg-[#1a1a1a] border-[#2a2a2a] text-[#999]',
  ready: 'bg-[#12261a] border-[#1f3d2a] text-[#7fcfa0]',
  posted: 'bg-[#14203a] border-[#22345c] text-[#8ab0e6]',
}

function AutoTextarea({
  value,
  onChange,
  onBlur,
  placeholder,
  minRows = 3,
}: {
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder?: string
  minRows?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={minRows}
      className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] leading-relaxed text-[#c8c8c8] placeholder:text-[#444] focus:outline-none focus:border-[#2c2c2c] resize-none whitespace-pre-wrap overflow-hidden"
    />
  )
}

function DraftCard({ draft }: { draft: Draft }) {
  const [, startTransition] = useTransition()
  const [title, setTitle] = useState(draft.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [content, setContent] = useState(draft.content)
  const [status, setStatus] = useState<DraftStatus>(draft.status)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const saveTitle = () => {
    setEditingTitle(false)
    const t = title.trim() || 'Untitled draft'
    setTitle(t)
    if (t !== draft.title) startTransition(() => updateDraft(draft.id, { title: t }))
  }
  const saveContent = () => {
    if (content !== draft.content) startTransition(() => updateDraft(draft.id, { content }))
  }
  const cycleStatus = () => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length]
    setStatus(next)
    startTransition(() => updateDraft(draft.id, { status: next }))
  }
  const copy = () => {
    try { navigator.clipboard?.writeText(content) } catch {}
  }

  return (
    <div className="border border-[#161616] rounded-xl bg-[#0c0c0c] px-3.5 py-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitle(draft.title); setEditingTitle(false) } }}
            className="flex-1 bg-[#111] border border-[#252525] rounded px-2 py-1 text-[13px] text-[#e6e6e6] focus:outline-none focus:border-[#333]"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="flex-1 text-left text-[13px] font-medium text-[#e6e6e6] hover:text-white truncate"
          >{title}</button>
        )}
        <button
          onClick={cycleStatus}
          className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${STATUS_STYLE[status]}`}
        >{STATUS_LABEL[status]}</button>
      </div>

      <AutoTextarea value={content} onChange={setContent} onBlur={saveContent} placeholder="Write the draft…" />

      <div className="flex items-center gap-3 mt-2">
        {draft.source_url && (
          <a
            href={draft.source_url}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-[#6b93c9] hover:text-[#8ab0e6] truncate max-w-[55%]"
          >🔗 inspiration</a>
        )}
        <button onClick={copy} className="text-[11px] text-[#777] hover:text-[#aaa] transition-colors">Copy</button>
        <div className="ml-auto">
          {confirmDelete ? (
            <span className="flex items-center gap-2">
              <button
                onClick={() => startTransition(() => deleteDraft(draft.id))}
                className="text-[11px] text-[#d08b8b] hover:text-[#e6a0a0]"
              >Delete?</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-[#666] hover:text-[#999]">Cancel</button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-[11px] text-[#555] hover:text-[#999] transition-colors">Delete</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DraftsPanel({ drafts }: { drafts: Draft[] }) {
  const [, startTransition] = useTransition()
  const [localDrafts, setLocalDrafts] = useState<Draft[]>(drafts)
  useEffect(() => { setLocalDrafts(drafts) }, [drafts])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [expanded, setExpanded] = useState(false)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() && !content.trim()) return
    const fd = new FormData()
    fd.set('title', title.trim() || 'Untitled draft')
    fd.set('content', content)
    if (sourceUrl.trim()) fd.set('source_url', sourceUrl.trim())
    // optimistic
    setLocalDrafts(ds => [{
      id: `tmp-${ds.length}-${title.length}`,
      title: title.trim() || 'Untitled draft',
      content,
      source_url: sourceUrl.trim() || null,
      status: 'draft',
      created_at: new Date().toISOString(),
    }, ...ds])
    setTitle(''); setContent(''); setSourceUrl(''); setExpanded(false)
    startTransition(() => createDraft(fd))
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-6 space-y-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="New draft — a title or topic…"
          autoComplete="off"
          className="w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2.5 text-[13px] text-[#ccc] placeholder:text-[#444] focus:outline-none focus:border-[#333]"
        />
        {expanded && (
          <>
            <AutoTextarea value={content} onChange={setContent} placeholder="Draft content / initial thoughts…" />
            <div className="flex items-center gap-2">
              <input
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="Inspiration link (optional)"
                autoComplete="off"
                className="flex-1 bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[12px] text-[#b8b8b8] placeholder:text-[#444] focus:outline-none focus:border-[#2c2c2c]"
              />
              <button
                type="submit"
                className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#ccc] rounded-lg px-3 py-2 text-[12px] hover:bg-[#242424] transition-colors whitespace-nowrap"
              >+ Add</button>
            </div>
          </>
        )}
      </form>

      {localDrafts.length === 0 ? (
        <p className="text-[12px] text-[#666] text-center py-10">No drafts yet. Send Bot a thought to capture one.</p>
      ) : (
        localDrafts.map(d => <DraftCard key={d.id} draft={d} />)
      )}
    </div>
  )
}
