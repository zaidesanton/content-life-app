'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

const NAV = [
  { href: '/',            icon: '✓',  label: 'Tasks'      },
  { href: '/diary',       icon: '◑',  label: 'Diary'      },
  { href: '/newsletter',  icon: '✉',  label: 'Newsletter' },
  { href: '/linkedin',    icon: 'in', label: 'LinkedIn'   },
  { href: '/capture',     icon: '⚡', label: 'Capture'    },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close drawer when navigating to a new page
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Close drawer on click/touch outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    // Delay so the tap that opens the drawer doesn't immediately close it
    const tid = setTimeout(() => {
      document.addEventListener('mousedown', handler)
      document.addEventListener('touchstart', handler)
    }, 0)
    return () => {
      clearTimeout(tid)
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
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
                  active ? 'text-white' : 'text-[#999] hover:text-white'
                }`}
              >
                <span className="w-4 text-center text-[14px] leading-none">{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* ── Mobile hamburger button ────────────────────────────────────── */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 w-8 h-8 flex items-center justify-center text-[#777] hover:text-white transition-colors"
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close navigation' : 'Open navigation'}
      >
        {open ? (
          // X icon when open
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="2" y1="2" x2="14" y2="14"/>
            <line x1="14" y1="2" x2="2" y2="14"/>
          </svg>
        ) : (
          // Hamburger icon when closed
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="0" y1="1" x2="18" y2="1"/>
            <line x1="0" y1="7" x2="18" y2="7"/>
            <line x1="0" y1="13" x2="18" y2="13"/>
          </svg>
        )}
      </button>

      {/* ── Mobile backdrop ────────────────────────────────────────────── */}
      <div
        className={`md:hidden fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ── Mobile slide-in drawer ─────────────────────────────────────── */}
      <div
        ref={drawerRef}
        className={`md:hidden fixed top-0 left-0 h-full w-[220px] bg-[#0d0d0d] border-r border-[#1a1a1a] z-50 flex flex-col pt-7 pb-6 transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
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
                  active ? 'text-white' : 'text-[#999] hover:text-white'
                }`}
              >
                <span className="w-4 text-center text-[14px] leading-none">{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
