import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Dumbbell, Timer } from 'lucide-react'
import { formatDuration } from '../../lib/dates'
import { RestCountdown } from './RestCountdown'
import { useActiveWorkout } from './useActiveWorkout'
import { useRestTimer } from './useRestTimer'

const TICK_MS = 1000

/**
 * Persistent "workout in progress" banner, rendered in AppShell as a normal
 * flex sibling between the page Outlet and BottomTabBar (not position:fixed
 * — see CLAUDE.md's bottom-action-bar note). Visible on every route except
 * /workout itself, where the full active-workout page already shows this.
 *
 * While a rest timer is running it becomes the rest countdown instead of the
 * workout clock, so the timer is readable from any tab — the workout duration
 * is the less urgent of the two numbers and is always available on the workout
 * page itself.
 */
export function ActiveWorkoutBanner() {
  const activeWorkout = useActiveWorkout()
  const { remainingMs } = useRestTimer()
  const navigate = useNavigate()
  const location = useLocation()
  const [, forceTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), TICK_MS)
    return () => clearInterval(interval)
  }, [])

  if (!activeWorkout || location.pathname === '/workout') return null

  const resting = remainingMs !== undefined
  const overtime = resting && remainingMs <= 0

  return (
    <button
      type="button"
      onClick={() => navigate('/workout')}
      className={`flex min-h-12 shrink-0 items-center gap-2 border-t border-border px-4 active:opacity-90 ${
        resting ? 'bg-surface-2 text-slate-100' : 'bg-accent text-accent-fg'
      }`}
    >
      {resting ? <Timer size={18} /> : <Dumbbell size={18} />}
      <span className="font-medium">
        {resting ? (overtime ? 'Rest over' : 'Resting') : 'Workout in progress'}
      </span>
      <span className="ml-auto">
        {resting ? (
          <RestCountdown remainingMs={remainingMs} size="small" />
        ) : (
          <span className="font-mono text-sm tabular-nums">
            {formatDuration(activeWorkout.startedAt)}
          </span>
        )}
      </span>
    </button>
  )
}
