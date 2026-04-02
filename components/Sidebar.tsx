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
