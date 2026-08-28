import { useEffect, useRef, useState } from 'react'
import { playAlarm } from '../../lib/alarm'
import { useWakeLockHolder } from '../../hooks/useWakeLock'
import { ALARM_MAX_LATENESS_MS, isAbandoned, stopRestTimer, useRestTimer } from './useRestTimer'

/**
 * Mounted exactly once, in AppShell. Owns the three things that must happen
 * once per timer rather than once per component displaying it: the wake lock,
 * the alarm, and the full-screen flash.
 *
 * The countdown itself is rendered separately (RestTimerBar on the workout
 * page, ActiveWorkoutBanner elsewhere) — those are pure readouts and can be
 * mounted anywhere, any number of times.
 */

/** Long enough to catch the eye from across the room, short enough not to be in the way. */
const FLASH_DURATION_MS = 6_000

export function RestTimerController() {
  const { state, remainingMs, isRunning } = useRestTimer()
  const [flashingFor, setFlashingFor] = useState<number | null>(null)
  // Keyed by endsAt so restarting a timer re-arms the alarm, while a re-render
  // — or the many ticks that follow zero — can't fire it twice for one
  // countdown.
  const firedFor = useRef<number | null>(null)
  const clearedFor = useRef<number | null>(null)

  // Hold the screen awake for the duration. Without this iOS suspends the app
  // as soon as the screen dims and the timer stops advancing entirely.
  useWakeLockHolder(isRunning)

  useEffect(() => {
    if (!state || remainingMs === undefined) return

    // Clear out a countdown that was abandoned rather than watched through.
    // Guarded because this effect re-runs on every tick and the delete is
    // async — without it we'd queue a delete per tick until the query updates.
    if (isAbandoned(remainingMs)) {
      if (clearedFor.current !== state.endsAt) {
        clearedFor.current = state.endsAt
        void stopRestTimer()
      }
      return
    }

    if (remainingMs > 0 || firedFor.current === state.endsAt) return
    firedFor.current = state.endsAt

    // Only alarm for a crossing we actually witnessed — see
    // ALARM_MAX_LATENESS_MS. A return from suspension long after zero gets the
    // overtime readout and nothing else.
    if (remainingMs > -ALARM_MAX_LATENESS_MS) {
      playAlarm()
      setFlashingFor(state.endsAt)
    }
  }, [state, remainingMs])

  // Separate effect so the flash's lifetime is tied to the flash, not to the
  // 250ms tick. Tearing this down from the effect above would cancel the
  // timeout on the very next tick and leave the flash stuck on.
  useEffect(() => {
    if (flashingFor === null) return
    const timeout = setTimeout(() => setFlashingFor(null), FLASH_DURATION_MS)
    return () => clearTimeout(timeout)
  }, [flashingFor])

  if (flashingFor === null) return null

  return (
    // Pointer-events-none so it never blocks the set you're about to log. The
    // flash is the alert of record when the ring switch is on silent, so it's
    // full-screen rather than a subtle highlight. Keyed so a second timer
    // finishing restarts the animation instead of reusing a finished one.
    <div
      key={flashingFor}
      className="pointer-events-none fixed inset-0 z-40 animate-rest-flash bg-accent"
      aria-hidden="true"
    />
  )
}
