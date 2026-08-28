import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../../db/schema'
import { primeAlarm } from '../../lib/alarm'
import { defaultRestSecondsFor } from '../../lib/restTimer'
import type { Exercise } from '../../db/types'

export const REST_TIMER_SETTING_KEY = 'restTimer'

/**
 * The running rest timer. Persisted in the `settings` table rather than held in
 * component state, for two reasons:
 *
 * - It has to survive the app being suspended or killed. iOS freezes a
 *   backgrounded web app's JS, so a countdown kept in memory would come back
 *   frozen at whatever number it held when the screen locked. Storing the
 *   *end timestamp* and deriving the remaining time from the wall clock on
 *   every render means a return from suspension shows the true elapsed rest —
 *   including overtime — with no recovery logic.
 * - Both ActiveWorkoutPage and the cross-tab ActiveWorkoutBanner display it,
 *   and Dexie + useLiveQuery is how this app shares state across the tree
 *   (see CLAUDE.md) — no context, no store.
 *
 * This is not the "ephemeral UI state" that CLAUDE.md keeps out of Dexie: it's
 * app state with a lifetime longer than the process.
 */
export interface RestTimerState {
  /** Epoch ms. The single source of truth — remaining time is always derived from this. */
  endsAt: number
  durationSeconds: number
  /** For the countdown label, so the banner can name what you're resting from. */
  exerciseName?: string
}

/** How often the derived countdown re-renders. Fine-grained enough for a seconds display. */
const TICK_MS = 250

/**
 * Don't sound the alarm for a crossing we didn't witness. If the app was
 * suspended through zero and comes back minutes later, the rest is long over
 * and a sudden beep is just noise — the overtime display already says it.
 */
export const ALARM_MAX_LATENESS_MS = 5_000

/**
 * A timer this far past zero was abandoned (workout left running, app closed
 * mid-session), so it clears itself rather than greeting you with yesterday's
 * countdown.
 */
const ABANDONED_AFTER_MS = 10 * 60_000

export interface RestTimer {
  state: RestTimerState | null | undefined
  /** Positive while counting down, negative once past zero. undefined when idle. */
  remainingMs: number | undefined
  isRunning: boolean
  isOvertime: boolean
}

export function useRestTimer(): RestTimer {
  const state = useLiveQuery(async () => {
    const setting = await db.settings.get(REST_TIMER_SETTING_KEY)
    return (setting?.value as RestTimerState | undefined) ?? null
  }, [])

  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!state) return
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), TICK_MS)
    // A wake from suspension fires visibilitychange but not necessarily a tick
    // in time, so resync immediately rather than showing a stale number for up
    // to TICK_MS.
    const onVisible = () => setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [state])

  const remainingMs = state ? state.endsAt - now : undefined

  return {
    state,
    remainingMs,
    isRunning: remainingMs !== undefined && remainingMs > 0,
    isOvertime: remainingMs !== undefined && remainingMs <= 0,
  }
}

/**
 * Start (or restart) the rest timer. Call from the user gesture that completes
 * a set — it primes the AudioContext, which iOS only allows from a gesture.
 * A `seconds` of 0 or less means "no rest timer for this exercise" and clears
 * any running one instead.
 */
export async function startRestTimer(seconds: number, exerciseName?: string): Promise<void> {
  if (seconds <= 0) {
    await stopRestTimer()
    return
  }
  primeAlarm()
  const value: RestTimerState = {
    endsAt: Date.now() + seconds * 1000,
    durationSeconds: seconds,
    exerciseName,
  }
  await db.settings.put({ key: REST_TIMER_SETTING_KEY, value })
}

export async function stopRestTimer(): Promise<void> {
  await db.settings.delete(REST_TIMER_SETTING_KEY)
}

/** Nudge a running timer by ±n seconds, floored at "about to fire" rather than going negative. */
export async function adjustRestTimer(deltaSeconds: number): Promise<void> {
  const setting = await db.settings.get(REST_TIMER_SETTING_KEY)
  const current = setting?.value as RestTimerState | undefined
  if (!current) return
  await db.settings.put({
    key: REST_TIMER_SETTING_KEY,
    value: {
      ...current,
      endsAt: Math.max(Date.now(), current.endsAt + deltaSeconds * 1000),
      durationSeconds: Math.max(0, current.durationSeconds + deltaSeconds),
    },
  })
}

export function isAbandoned(remainingMs: number): boolean {
  return remainingMs < -ABANDONED_AFTER_MS
}

/**
 * Rest length per exercise for the workout in progress: the routine's own
 * `restTimerSeconds` where one is set, otherwise the compound/isolation
 * default for that exercise.
 *
 * Resolving the fallback here rather than migrating routine rows is what lets
 * routines saved before the field existed pick up a sensible rest with no
 * schema change — see RoutineExercise.restTimerSeconds in db/types.ts. A
 * freeform workout (no routineId) simply has no overrides and falls through to
 * the defaults for every exercise.
 */
export function useRestSecondsByExercise(
  routineId: string | undefined,
  exercises: (Exercise | undefined)[],
): Map<string, number> {
  const overrides = useLiveQuery(async () => {
    if (!routineId) return new Map<string, number>()
    const routine = await db.routines.get(routineId)
    if (!routine) return new Map<string, number>()
    return new Map(
      routine.exercises
        .filter((re) => re.restTimerSeconds !== undefined)
        .map((re) => [re.exerciseId, re.restTimerSeconds as number]),
    )
  }, [routineId])

  const result = new Map<string, number>()
  for (const exercise of exercises) {
    if (!exercise) continue
    result.set(exercise.id, overrides?.get(exercise.id) ?? defaultRestSecondsFor(exercise))
  }
  return result
}
