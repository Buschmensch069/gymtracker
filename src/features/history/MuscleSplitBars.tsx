import { computeMuscleSplit } from '../../lib/analytics'
import { MUSCLE_COLORS } from '../../lib/muscleColors'
import { MUSCLE_LABELS, type Exercise, type PrimaryMuscle, type SetLog } from '../../db/types'

/** Horizontal percentage bars for which muscle groups a set of sets (typically one workout) hit, weighted by MUSCLE_SET_WEIGHT. */
export function MuscleSplitBars({
  sets,
  exerciseById,
}: {
  sets: SetLog[]
  exerciseById: Map<string, Exercise>
}) {
  const totals = computeMuscleSplit(sets, exerciseById)
  const entries = (Object.entries(totals) as [PrimaryMuscle, number][])
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
  const sum = entries.reduce((s, [, v]) => s + v, 0)

  if (entries.length === 0 || sum === 0) return null

  return (
    <div className="space-y-2.5">
      {entries.map(([muscle, value]) => {
        const pct = Math.round((value / sum) * 100)
        return (
          <div key={muscle} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-sm text-slate-300">{MUSCLE_LABELS[muscle]}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: MUSCLE_COLORS[muscle] }}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-mono text-sm tabular-nums text-slate-400">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}
