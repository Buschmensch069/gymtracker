import { X } from 'lucide-react'
import { StepperButton } from '../../components/ui/Stepper'
import { WAKE_LOCK_SUPPORTED, useWakeLockHeld } from '../../hooks/useWakeLock'
import { REST_STEP_SECONDS } from '../../lib/restTimer'
import { RestCountdown } from './RestCountdown'
import { adjustRestTimer, stopRestTimer, useRestTimer } from './useRestTimer'

/**
 * The rest timer as shown on the active-workout page: big countdown, ±15s,
 * dismiss, and — when the screen can't be held awake — a plain warning that
 * the timer will stop if the phone locks.
 *
 * The warning matters more than it looks. iOS suspends a backgrounded web
 * app's JS, so without a wake lock this timer silently stops the moment the
 * screen dims. Saying that outright beats letting it look like it's running.
 */
export function RestTimerBar() {
  const { state, remainingMs, isRunning } = useRestTimer()
  // Read-only: RestTimerController is the single owner of the actual lock.
  const held = useWakeLockHeld()

  if (!state || remainingMs === undefined) return null

  return (
    <div className="shrink-0 border-t border-border bg-surface-1 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-400">
            {remainingMs > 0 ? 'Rest' : 'Rest over'}
            {state.exerciseName ? ` · ${state.exerciseName}` : ''}
          </p>
          <RestCountdown remainingMs={remainingMs} />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <StepperButton
            label={`Subtract ${REST_STEP_SECONDS} seconds`}
            onStep={() => adjustRestTimer(-REST_STEP_SECONDS)}
          >
            −
          </StepperButton>
          <StepperButton
            label={`Add ${REST_STEP_SECONDS} seconds`}
            onStep={() => adjustRestTimer(REST_STEP_SECONDS)}
          >
            +
          </StepperButton>
          <button
            type="button"
            onClick={() => stopRestTimer()}
            aria-label="Dismiss rest timer"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-surface-2"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {isRunning && !held && (
        <p className="mt-2 text-xs text-amber-400">
          {WAKE_LOCK_SUPPORTED
            ? "Couldn't keep the screen awake — this timer stops if the phone locks. Keep the app open."
            : 'Screen Wake Lock unavailable (needs iOS 18.4+ on the home-screen app) — this timer stops if the phone locks.'}
        </p>
      )}
    </div>
  )
}
