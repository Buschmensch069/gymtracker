import { NavLink } from 'react-router-dom'

interface Tab {
  to: string
  label: string
  icon: (active: boolean) => React.ReactNode
}

const iconProps = (active: boolean) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: active ? '#22d3ee' : '#94a3b8',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

const tabs: Tab[] = [
  {
    to: '/workout',
    label: 'Workout',
    icon: (active) => (
      <svg {...iconProps(active)}>
        <path d="M6.5 6.5v11M17.5 6.5v11M2 9.5v5M22 9.5v5M6.5 12h11" />
      </svg>
    ),
  },
  {
    to: '/exercises',
    label: 'Exercises',
    icon: (active) => (
      <svg {...iconProps(active)}>
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'History',
    icon: (active) => (
      <svg {...iconProps(active)}>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l3 2M9 2h6" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (active) => (
      <svg {...iconProps(active)}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

export function BottomTabBar() {
  return (
    <nav className="flex shrink-0 border-t border-slate-800 bg-slate-950 pb-safe">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
        >
          {({ isActive }) => (
            <>
              {tab.icon(isActive)}
              <span className={`text-xs ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
