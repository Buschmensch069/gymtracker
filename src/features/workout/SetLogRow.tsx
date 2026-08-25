import type { SetLog, SetType, UnitPreference } from '../../db/types'
import { weightForDisplay, weightStep, weightToKg } from '../../lib/units'
import { WeightRepsInput } from './WeightRepsInput'
import { deleteSet, updateSet } from './useActiveWorkout'

const TYPE_ABBREVIATION: Record<SetType, string> = {
  warmup: 'W',
  normal: 'N',
  dropset: 'D',
  failure: 'F',
}

const TYPE_ORDER: SetType[] = ['normal', 'warmup', 'dropset', 'failure']

interface SetLogRowProps {
  set: SetLog
  unit: UnitPreference
}

export function SetLogRow({ set, unit }: SetLogRowProps) {
  const cycleType = () => {
    const nextIndex = (TYPE_ORDER.indexOf(set.type) + 1) % TYPE_ORDER.length
    updateSet(set.id, { type: TYPE_ORDER[nextIndex] })
  }

  return (
    <div className={`px-2 py-2 ${set.completed ? 'bg-slate-900/40' : ''}`}>
      <div className="flex items-center gap-1">
        <WeightRepsInput
          value={weightForDisplay(set.weightKg, unit)}
          onChange={(v) => updateSet(set.id, { weightKg: weightToKg(v, unit) })}
          step={weightStep(unit)}
          decimals={1}
          inputMode="decimal"
          boxWidthClass="w-16"
        />

        <WeightRepsInput
          value={set.reps}
          onChange={(v) => updateSet(set.id, { reps: v })}
          step={1}
          inputMode="numeric"
          boxWidthClass="w-10"
        />

        <button
          type="button"
          onClick={() => updateSet(set.id, { completed: !set.completed, timestamp: Date.now() })}
          aria-label="Mark set complete"
          className={`ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${
            set.completed ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500'
          }`}
        >
          ✓
        </button>
      </div>

      <div className="mt-1 flex items-center gap-2 pl-1">
        <span className="text-xs text-slate-500">Set {set.setNumber}</span>
        <button
          type="button"
          onClick={cycleType}
          aria-label="Set type"
          className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold text-slate-400"
        >
          {TYPE_ABBREVIATION[set.type]}
        </button>
        <button
          type="button"
          onClick={() => deleteSet(set.id, set.workoutExerciseId)}
          className="ml-auto text-xs text-slate-600"
        >
          Remove
        </button>
      </div>
    </div>
  )
}
