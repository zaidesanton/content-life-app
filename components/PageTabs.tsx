'use client'

type Tab = { key: string; label: string; count?: number }

export default function PageTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex">
      {tabs.map(tab => {
        const isActive = active === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative px-4 py-3 text-[13px] font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'text-white after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-white after:rounded-full'
                : 'text-[#888] hover:text-[#ccc]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 text-[11px] ${isActive ? 'text-[#777]' : 'text-[#555]'}`}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
