import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'
import { formatDuration } from '../../lib/dates'
import { useActiveWorkout } from './useActiveWorkout'

const TICK_MS = 1000

/**
 * Persistent "workout in progress" banner, rendered in AppShell as a normal
 * flex sibling between the page Outlet and BottomTabBar (not position:fixed
 * — see CLAUDE.md's bottom-action-bar note). Visible on every route except
 * /workout itself, where the full active-workout page already shows this.
 */
export function ActiveWorkoutBanner() {
  const activeWorkout = useActiveWorkout()
  const navigate = useNavigate()
  const location = useLocation()
  const [, forceTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), TICK_MS)
    return () => clearInterval(interval)
  }, [])

  if (!activeWorkout || location.pathname === '/workout') return null

  return (
    <button
      type="button"
      onClick={() => navigate('/workout')}
      className="flex min-h-12 shrink-0 items-center gap-2 border-t border-border bg-accent px-4 text-accent-fg active:opacity-90"
    >
      <Dumbbell size={18} />
      <span className="font-medium">Workout in progress</span>
      <span className="ml-auto font-mono text-sm tabular-nums">
        {formatDuration(activeWorkout.startedAt)}
      </span>
    </button>
  )
}
