'use client'

export type Section = 'tasks' | 'drafts'

const ITEMS: { key: Section; label: string; icon: React.ReactNode }[] = [
  {
    key: 'tasks',
    label: 'Tasks',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
      </svg>
    ),
  },
  {
    key: 'drafts',
    label: 'LinkedIn drafts',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
]

export default function Sidebar({
  section,
  onSelect,
  collapsed,
  onToggle,
}: {
  section: Section
  onSelect: (s: Section) => void
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <>
      {/* Mobile backdrop — only when the drawer is open */}
      {!collapsed && (
        <div
          onClick={onToggle}
          className="md:hidden fixed inset-0 z-30 bg-black/60"
        />
      )}

      <aside
        className={`z-40 bg-[#0c0c0c] border-r border-[#1a1a1a] flex flex-col shrink-0 transition-all duration-200
          fixed inset-y-0 left-0 md:sticky md:top-0 md:h-screen
          ${collapsed ? '-translate-x-full md:translate-x-0 md:w-14' : 'translate-x-0 w-60 md:w-52'}`}
      >
        {/* Header: brand + collapse toggle */}
        <div className="h-14 flex items-center px-3 border-b border-[#141414]">
          <button
            onClick={onToggle}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            className="p-1.5 rounded-md text-[#888] hover:text-[#ccc] hover:bg-[#161616] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {!collapsed && (
            <span className="ml-2 text-[13px] font-medium text-[#ccc] whitespace-nowrap">Content + Life</span>
          )}
        </div>

        {/* Section nav */}
        <nav className="flex flex-col gap-1 p-2">
          {ITEMS.map(item => {
            const active = section === item.key
            return (
              <button
                key={item.key}
                onClick={() => onSelect(item.key)}
                title={item.label}
                className={`flex items-center rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                  collapsed ? 'md:justify-center' : ''
                } ${
                  active
                    ? 'bg-[#1b1b1b] text-white'
                    : 'text-[#888] hover:text-[#ccc] hover:bg-[#141414]'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span className="ml-2.5 whitespace-nowrap">{item.label}</span>}
              </button>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
