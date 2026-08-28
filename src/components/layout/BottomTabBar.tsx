import { NavLink } from 'react-router-dom'
import { BarChart3, Dumbbell, History, ListChecks, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Tab {
  to: string
  label: string
  Icon: LucideIcon
}

const tabs: Tab[] = [
  { to: '/workouts', label: 'Workouts', Icon: Dumbbell },
  { to: '/history', label: 'History', Icon: History },
  { to: '/analytics', label: 'Analytics', Icon: BarChart3 },
  { to: '/exercises', label: 'Exercises', Icon: ListChecks },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

export function BottomTabBar() {
  return (
    // pb-home-indicator, not pb-safe: reserving the full 34px inset inside the
    // bar left an empty strip under the icons. See index.css.
    <nav className="flex shrink-0 border-t border-border bg-surface-1 pb-home-indicator">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className="flex flex-1 flex-col items-center justify-center gap-1 py-2">
          {({ isActive }) => (
            <>
              <Icon size={24} strokeWidth={2} className={isActive ? 'text-accent' : 'text-slate-500'} />
              <span className={`text-xs font-medium ${isActive ? 'text-accent' : 'text-slate-500'}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
