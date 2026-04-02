# App Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the app as a 4-tab (Tasks / Newsletter / LinkedIn / Capture) dark-minimal single-page app with a persistent text sidebar and URL-based routing.

**Architecture:** Each tab is a Next.js App Router route (`/`, `/newsletter`, `/linkedin`, `/capture`). A client-side `Sidebar` component lives in the root layout so it persists across navigation. The existing `/posts` LinkedIn analysis moves to `/linkedin` with an HTTP redirect kept at `/posts` for backwards compat.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, Supabase (postgres + anon key), server components + server actions, `usePathname` for active nav state.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/globals.css` | Modify | Force dark background always (remove light mode vars) |
| `app/layout.tsx` | Modify | Full-height flex layout: `<Sidebar>` + `<main>` |
| `components/Sidebar.tsx` | Create | Client component — nav items, active state via `usePathname` |
| `app/page.tsx` | Replace | Tasks server component — fetches tasks, renders `TasksView` |
| `components/TasksView.tsx` | Create | Client component — Today/Week toggle, buckets, add-task input |
| `app/actions.ts` | Create | Server actions — `createTask`, `toggleTask` |
| `app/linkedin/page.tsx` | Create | Server component — fetches linkedin_posts with comments+reposts |
| `app/linkedin/LinkedInTable.tsx` | Create | Client component — enhanced PostsTable with inline sunset btn |
| `app/linkedin/actions.ts` | Create | Server actions — `saveHookScore`, `toggleSunset`, `fetchPostContent` |
| `app/newsletter/page.tsx` | Create | Placeholder server component |
| `app/capture/page.tsx` | Create | Placeholder server component |
| `app/posts/page.tsx` | Replace | Permanent redirect to `/linkedin` |
| `lib/supabase.ts` | Keep | Unchanged |

---

## Task 1: DB — Create tasks table

**Files:**
- Supabase SQL (run via MCP or Supabase dashboard)

- [ ] **Step 1: Create the tasks table**

Run this SQL in Supabase (MCP `execute_sql` or the SQL editor):

```sql
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  bucket text not null check (bucket in ('must_do', 'nice_to_have')),
  week text not null check (week in ('today', 'this_week', 'next_week')),
  category text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Allow anon read + insert + update (RLS off for now, private app)
alter table tasks enable row level security;
create policy "allow all" on tasks for all using (true) with check (true);
```

- [ ] **Step 2: Verify the table exists**

Run: `select * from tasks limit 1;`
Expected: empty result, no error.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add tasks table to supabase"
```

---

## Task 2: Dark theme — globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace globals.css**

```css
@import "tailwindcss";

:root {
  --background: #0a0a0a;
  --foreground: #ededed;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans, Arial, sans-serif);
}

html, body, #__next {
  height: 100%;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "style: force dark theme always"
```

---

## Task 3: Sidebar component

**Files:**
- Create: `components/Sidebar.tsx`

- [ ] **Step 1: Create the Sidebar**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/',            icon: '✓',  label: 'Tasks'      },
  { href: '/newsletter',  icon: '✉',  label: 'Newsletter' },
  { href: '/linkedin',    icon: 'in', label: 'LinkedIn'   },
  { href: '/capture',     icon: '⚡', label: 'Capture'    },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[180px] shrink-0 border-r border-[#141414] pt-7 pb-6">
        <span className="px-5 mb-6 text-[13px] font-semibold text-white tracking-tight">
          Content + Life
        </span>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-5 py-[9px] text-[13px] transition-colors ${
                  active ? 'text-white' : 'text-[#444] hover:text-[#888]'
                }`}
              >
                <span className="w-4 text-center text-[14px] leading-none">{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex border-t border-[#141414] bg-[#0a0a0a] z-50">
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 flex-1 py-3 text-[10px] transition-colors ${
                active ? 'text-white' : 'text-[#444]'
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "feat: add Sidebar nav component"
```

---

## Task 4: Update root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Content + Life',
  description: 'Anton Zaides — content dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full flex bg-[#0a0a0a] text-[#ededed]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 min-w-0">
          {children}
        </main>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify the app starts**

Run: `npm run dev`
Open http://localhost:3000 — should show dark background with sidebar on left (desktop) or bottom nav (mobile). No content in main yet.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add sidebar layout to root"
```

---

## Task 5: LinkedIn page — migrate /posts → /linkedin

**Files:**
- Create: `app/linkedin/page.tsx`
- Create: `app/linkedin/LinkedInTable.tsx`
- Create: `app/linkedin/actions.ts`
- Modify: `app/posts/page.tsx` (redirect)
- Modify: `app/posts/actions.ts` (leave, redirect only)

> **Note:** The linkedin_posts table has `comments` and `reposts` columns from the original CSV import. If they don't exist yet, run: `alter table linkedin_posts add column if not exists comments int default 0; alter table linkedin_posts add column if not exists reposts int default 0;`

- [ ] **Step 1: Create app/linkedin/actions.ts**

```ts
'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function saveHookScore(postId: string, score: number) {
  const { error } = await supabase
    .from('linkedin_posts')
    .update({ hook_score: score })
    .eq('id', postId)
  if (error) throw new Error(error.message)
  revalidatePath('/linkedin')
}

export async function toggleSunset(postId: string, value: boolean) {
  const { error } = await supabase
    .from('linkedin_posts')
    .update({ is_sunset: value })
    .eq('id', postId)
  if (error) throw new Error(error.message)
  revalidatePath('/linkedin')
}

export async function fetchPostContent(postId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('linkedin_posts')
    .select('content')
    .eq('id', postId)
    .single()
  if (error || !data) return null
  return data.content
}
```

- [ ] **Step 2: Create app/linkedin/page.tsx**

```tsx
import { supabase } from '@/lib/supabase'
import LinkedInTable from './LinkedInTable'

export const revalidate = 0

export type PostRow = {
  id: string
  hook: string
  published_at: string
  reactions: number
  comments: number
  reposts: number
  impressions: number
  hook_score: number | null
  hook_alternatives: string[] | null
  parent_id: string | null
  is_sunset: boolean
  post_url: string | null
}

export default async function LinkedInPage() {
  const { data, error } = await supabase
    .from('linkedin_posts')
    .select('id, hook, published_at, reactions, comments, reposts, impressions, hook_score, hook_alternatives, parent_id, is_sunset, post_url')
    .order('published_at', { ascending: false })

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>
  }

  return (
    <div className="h-full flex flex-col">
      <LinkedInTable posts={(data ?? []) as PostRow[]} />
    </div>
  )
}
```

- [ ] **Step 3: Create app/linkedin/LinkedInTable.tsx**

This is the enhanced version of PostsTable — adds 💬 comments + 🔁 reposts columns and puts the 🌅 sunset button directly on each row (not just in the expanded panel).

```tsx
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
            className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-md px-2 py-1 text-[11px] text-[#555] focus:outline-none focus:border-[#333] w-[120px]"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-md px-2 py-1 text-[11px] text-[#555] focus:outline-none focus:border-[#333] w-[120px]"
          />
          <button
            onClick={() => setShowDupes(v => !v)}
            className={`px-3 py-1 rounded-md text-[11px] border transition-colors ${
              showDupes
                ? 'bg-[#141414] border-[#252525] text-[#777]'
                : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#333]'
            }`}
          >Hide dupes</button>
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

                  {/* Expanded row */}
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
```

- [ ] **Step 4: Replace app/posts/page.tsx with a redirect**

```tsx
import { redirect } from 'next/navigation'

export default function PostsPage() {
  redirect('/linkedin')
}
```

- [ ] **Step 5: Verify LinkedIn page works**

Run `npm run dev`, open http://localhost:3000/linkedin — should see the posts table with the new columns and inline sunset button.

- [ ] **Step 6: Commit**

```bash
git add app/linkedin/ app/posts/page.tsx
git commit -m "feat: migrate posts → /linkedin with comments, reposts + inline sunset"
```

---

## Task 6: Tasks page

**Files:**
- Replace: `app/page.tsx`
- Create: `app/actions.ts`
- Create: `components/TasksView.tsx`

- [ ] **Step 1: Create app/actions.ts**

```ts
'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function createTask(formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  const bucket = formData.get('bucket') as string
  const week = formData.get('week') as string
  if (!title) return
  await supabase.from('tasks').insert({ title, bucket, week })
  revalidatePath('/')
}

export async function toggleTask(id: string, completed: boolean) {
  await supabase.from('tasks').update({ completed }).eq('id', id)
  revalidatePath('/')
}
```

- [ ] **Step 2: Replace app/page.tsx**

```tsx
import { supabase } from '@/lib/supabase'
import TasksView from '@/components/TasksView'

export const revalidate = 0

export type Task = {
  id: string
  title: string
  bucket: 'must_do' | 'nice_to_have'
  week: 'today' | 'this_week' | 'next_week'
  category: string | null
  completed: boolean
  created_at: string
}

export default async function TasksPage() {
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true })

  return <TasksView tasks={(data ?? []) as Task[]} />
}
```

- [ ] **Step 3: Create components/TasksView.tsx**

```tsx
'use client'

import { useState, useTransition, useOptimistic } from 'react'
import type { Task } from '@/app/page'
import { createTask, toggleTask } from '@/app/actions'

type View = 'today' | 'this_week' | 'next_week'

const VIEW_LABELS: Record<View, string> = {
  today: 'Today',
  this_week: 'This Week',
  next_week: 'Next Week',
}

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function weekLabel() {
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(mon)} – ${fmt(sun)}`
}

export default function TasksView({ tasks }: { tasks: Task[] }) {
  const [view, setView] = useState<View>('today')
  const [, startTransition] = useTransition()
  const [optimisticTasks, setOptimisticTask] = useOptimistic(
    tasks,
    (state: Task[], { id, completed }: { id: string; completed: boolean }) =>
      state.map(t => t.id === id ? { ...t, completed } : t)
  )

  const viewTasks = optimisticTasks.filter(t => t.week === view)
  const mustDo = viewTasks.filter(t => t.bucket === 'must_do')
  const niceTo = viewTasks.filter(t => t.bucket === 'nice_to_have')

  // Next-week task count for the collapsed row
  const nextWeekCount = optimisticTasks.filter(t => t.week === 'next_week').length

  function handleToggle(task: Task) {
    const next = !task.completed
    startTransition(async () => {
      setOptimisticTask({ id: task.id, completed: next })
      await toggleTask(task.id, next)
    })
  }

  return (
    <div className="px-6 md:px-8 pt-8 pb-6 max-w-xl">
      {/* Title */}
      <h1 className="text-[20px] font-semibold text-white mb-1">
        {VIEW_LABELS[view]}
      </h1>
      <p className="text-[12px] text-[#333] mb-5">
        {view === 'today' ? todayLabel() : view === 'this_week' ? weekLabel() : 'Next week'}
      </p>

      {/* View toggle */}
      <div className="inline-flex bg-[#111] border border-[#1a1a1a] rounded-md mb-6">
        {(['today', 'this_week', 'next_week'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3.5 py-1.5 text-[12px] rounded-[5px] transition-colors ${
              view === v ? 'bg-[#1e1e1e] text-[#ccc]' : 'text-[#444] hover:text-[#777]'
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      {/* Add task form */}
      <form
        action={async (fd) => {
          fd.set('week', view)
          fd.set('bucket', 'must_do')
          await createTask(fd)
        }}
        className="flex gap-2 mb-7"
      >
        <input
          name="title"
          placeholder="Add a task…"
          autoComplete="off"
          className="flex-1 bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-[13px] text-[#ccc] placeholder:text-[#2e2e2e] focus:outline-none focus:border-[#2a2a2a]"
        />
        <button
          type="submit"
          className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#ccc] rounded-lg px-3 py-2.5 text-[12px] hover:bg-[#242424] transition-colors"
        >
          + Add
        </button>
      </form>

      {/* Must Do bucket */}
      <Bucket
        title="Must Do"
        tasks={mustDo}
        onToggle={handleToggle}
      />

      {/* Nice to Have bucket */}
      <Bucket
        title="Nice to Have"
        tasks={niceTo}
        onToggle={handleToggle}
      />

      {/* Next week collapsed row — only show when viewing today or this_week */}
      {view !== 'next_week' && (
        <button
          onClick={() => setView('next_week')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#0d0d0d] border border-[#141414] rounded-lg mt-2 text-left"
        >
          <span className="text-[12px] text-[#333]">Next Week</span>
          <span className="text-[12px] text-[#2a2a2a]">{nextWeekCount} tasks ›</span>
        </button>
      )}
    </div>
  )
}

function Bucket({ title, tasks, onToggle }: { title: string; tasks: Task[]; onToggle: (t: Task) => void }) {
  if (tasks.length === 0) return null
  return (
    <div className="mb-6">
      <p className="text-[10px] font-semibold text-[#2a2a2a] uppercase tracking-[.08em] mb-2.5">{title}</p>
      <div className="divide-y divide-[#0f0f0f]">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-2.5 py-1.5">
            <button
              onClick={() => onToggle(task)}
              className={`w-[15px] h-[15px] rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                task.completed
                  ? 'border-[#222] bg-[#1a1a1a]'
                  : 'border-[#222] hover:border-[#444]'
              }`}
            >
              {task.completed && <span className="text-[8px] text-[#3a3a3a]">✓</span>}
            </button>
            <span className={`text-[13px] flex-1 ${task.completed ? 'line-through text-[#2e2e2e]' : 'text-[#bbb]'}`}>
              {task.title}
            </span>
            {task.category && (
              <span className="text-[10px] text-[#2e2e2e] border border-[#1a1a1a] rounded-full px-1.5 py-0.5">
                {task.category}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Test tasks page**

Run `npm run dev`, open http://localhost:3000.
- Should see Tasks view with Today/This Week/Next Week toggle
- Add a task via the form — it should appear in the list
- Check a task — it should show strikethrough

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/actions.ts components/TasksView.tsx
git commit -m "feat: Tasks tab with Today/Week toggle, Must Do / Nice to Have buckets"
```

---

## Task 7: Placeholder pages (Newsletter + Capture)

**Files:**
- Create: `app/newsletter/page.tsx`
- Create: `app/capture/page.tsx`

- [ ] **Step 1: Create app/newsletter/page.tsx**

```tsx
export default function NewsletterPage() {
  return (
    <div className="flex items-center justify-center h-full text-[#222] text-sm">
      Newsletter — coming soon
    </div>
  )
}
```

- [ ] **Step 2: Create app/capture/page.tsx**

```tsx
export default function CapturePage() {
  return (
    <div className="flex items-center justify-center h-full text-[#222] text-sm">
      Capture — coming soon
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/newsletter/page.tsx app/capture/page.tsx
git commit -m "feat: placeholder pages for Newsletter and Capture tabs"
```

---

## Task 8: Final check + deploy

- [ ] **Step 1: Full smoke test**

Run `npm run dev`. Check each route:
- `/` — Tasks view, toggle works, add-task works, sidebar shows Tasks as active
- `/newsletter` — Placeholder, sidebar shows Newsletter as active
- `/linkedin` — Posts table with 💬 🔁 columns, inline 🌅 button, filters work, sidebar shows LinkedIn as active
- `/capture` — Placeholder, sidebar shows Capture as active
- `/posts` — Should redirect to `/linkedin`
- Mobile (resize to <768px) — Bottom nav appears, sidebar hidden

- [ ] **Step 2: Build check**

```bash
npm run build
```
Expected: No TypeScript errors, no build failures.

- [ ] **Step 3: Push and deploy**

```bash
git push
```
Vercel will auto-deploy. Check https://vercel.com/dashboard for build status.

- [ ] **Step 4: Verify production**

Open the Vercel production URL. Confirm all 4 tabs work.

---

## Self-Review

**Spec coverage:**
- ✅ 4 tabs: Tasks, Newsletter, LinkedIn, Capture
- ✅ Sidebar nav with text labels + app title
- ✅ URL-based routing (`/`, `/newsletter`, `/linkedin`, `/capture`)
- ✅ Mobile-friendly (bottom nav on mobile)
- ✅ Tasks: Today/This Week/Next Week toggle
- ✅ Tasks: Must Do / Nice to Have buckets
- ✅ Tasks: Quick-add input
- ✅ Tasks: Completion toggle
- ✅ LinkedIn: 💬 comments + 🔁 reposts columns
- ✅ LinkedIn: Inline 🌅 sunset button on each row
- ✅ LinkedIn: All existing features preserved (sort, filter, expand, score, alternatives)
- ✅ Newsletter + Capture: Placeholders
- ✅ Dark minimal style throughout
- ✅ /posts redirects to /linkedin

**Type consistency check:**
- `Task` type defined in `app/page.tsx`, imported in `components/TasksView.tsx` — ✅
- `PostRow` defined in `app/linkedin/page.tsx`, imported in `app/linkedin/LinkedInTable.tsx` — ✅
- Server actions in `app/actions.ts` called from `components/TasksView.tsx` — ✅
- Server actions in `app/linkedin/actions.ts` called from `app/linkedin/LinkedInTable.tsx` — ✅
- `toggleTask(id, completed)` signature used consistently — ✅
- `handleSunset(e, postId)` signature matches usage in JSX — ✅
