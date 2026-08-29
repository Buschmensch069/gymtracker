import { useState } from 'react'
import { Check } from 'lucide-react'
import { SwipeToDelete } from '../../components/ui/SwipeToDelete'
import type { SetLog, SetType, UnitPreference } from '../../db/types'
import { useLastSessionSet } from '../../hooks/useLastSessionSet'
import type { SetDisplay } from '../../lib/setTypes'
import { SET_TYPE_LABELS, SET_TYPE_TEXT_CLASS } from '../../lib/setTypes'
import { weightForDisplay, weightStep, weightToKg } from '../../lib/units'
import { SetTypeSheet } from './SetTypeSheet'
import { WeightRepsInput } from './WeightRepsInput'
import { deleteSet, updateSet } from './useActiveWorkout'
import { startRestTimer } from './useRestTimer'

/** undefined = unset; cycling wraps back around to it. */
const RPE_CYCLE: (number | undefined)[] = [undefined, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

interface SetLogRowProps {
  set: SetLog
  unit: UnitPreference
  /** Displayed numbering/letter for this row — computed across the exercise's sets, see setDisplayInfo. */
  display: SetDisplay
  /** Resolved rest for this exercise; 0 disables the timer for it. */
  restSeconds: number
  exerciseName: string | undefined
}

export function SetLogRow({ set, unit, display, restSeconds, exerciseName }: SetLogRowProps) {
  const lastSession = useLastSessionSet(set.exerciseId, set.workoutId)
  const [showTypeSheet, setShowTypeSheet] = useState(false)
  const touched = set.touched ?? true

  const remove = () => deleteSet(set.id, set.workoutExerciseId)

  const toggleComplete = () => {
    const completed = !set.completed
    updateSet(set.id, { completed, timestamp: Date.now() })
    // Synchronously inside the tap: startRestTimer primes the AudioContext,
    // and iOS only allows that from a user gesture. Un-completing a set is a
    // correction, not a finished set, so it deliberately leaves any running
    // timer alone.
    if (completed) startRestTimer(restSeconds, exerciseName)
  }

  const cycleRpe = () => {
    const currentIndex = RPE_CYCLE.indexOf(set.rpe)
    updateSet(set.id, { rpe: RPE_CYCLE[(currentIndex + 1) % RPE_CYCLE.length] })
  }

  return (
    <>
      <SwipeToDelete onDelete={remove} className="bg-surface-0">
        {/* The green wash sits on this inner layer rather than on the sliding
            layer itself, so it composites over the row's opaque background
            instead of replacing it and letting the red panel show through. */}
        <div className={`px-2 py-2 ${set.completed ? 'bg-emerald-500/15' : ''}`}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowTypeSheet(true)}
              aria-label={`Set ${display.label}, ${SET_TYPE_LABELS[set.type]} — change set type`}
              className={`flex h-11 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 font-mono text-base font-bold tabular-nums ${SET_TYPE_TEXT_CLASS[set.type]}`}
            >
              {display.label}
            </button>

            <WeightRepsInput
              compact
              ariaLabel="weight"
              value={weightForDisplay(set.weightKg, unit)}
              onChange={(v) => updateSet(set.id, { weightKg: weightToKg(v, unit) })}
              step={weightStep(unit)}
              decimals={1}
              inputMode="decimal"
              boxWidthClass="w-16"
              touched={touched}
              placeholder={lastSession ? weightForDisplay(lastSession.weightKg, unit) : undefined}
            />

            <WeightRepsInput
              compact
              ariaLabel="reps"
              value={set.reps}
              onChange={(v) => updateSet(set.id, { reps: v })}
              step={1}
              inputMode="numeric"
              boxWidthClass="w-10"
              touched={touched}
              placeholder={lastSession?.reps}
            />

            <button
              type="button"
              onClick={toggleComplete}
              aria-label="Mark set complete"
              aria-pressed={set.completed}
              className={`ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                set.completed ? 'bg-emerald-500 text-white' : 'bg-surface-2 text-slate-500'
              }`}
            >
              <Check size={22} strokeWidth={3} />
            </button>
          </div>

          <div className="mt-1 flex items-center gap-2 pl-0.5">
            <button
              type="button"
              onClick={cycleRpe}
              aria-label="RPE"
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                set.rpe !== undefined ? 'bg-surface-2 text-accent' : 'bg-transparent text-slate-600'
              }`}
            >
              {set.rpe !== undefined ? `RPE ${set.rpe}` : 'RPE'}
            </button>
            {set.type !== 'normal' && (
              <span className={`text-[11px] font-medium ${SET_TYPE_TEXT_CLASS[set.type]}`}>
                {SET_TYPE_LABELS[set.type]}
              </span>
            )}
          </div>
        </div>
      </SwipeToDelete>

      {showTypeSheet && (
        <SetTypeSheet
          current={set.type}
          numberIfNormal={display.numberIfNormal}
          onSelect={(type: SetType) => updateSet(set.id, { type })}
          onRemove={remove}
          onClose={() => setShowTypeSheet(false)}
        />
      )}
    </>
  )
}
