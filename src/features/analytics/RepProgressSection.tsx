import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { ExercisePickerSheet } from '../exercises/ExercisePickerSheet'
import type { UnitPreference } from '../../db/types'
import {
  MIN_SESSIONS_FOR_REP_TREND,
  STALL_WEEKS,
  computeRepProgressByExercise,
  type ExerciseRepProgress,
} from '../../lib/analytics'
import { formatDate } from '../../lib/dates'
import { formatWeight } from '../../lib/units'
import { EmptyChart } from './EmptyChart'
import type { AnalyticsData } from './useAnalyticsData'

/**
 * "Am I getting stronger at this movement?", answered only with sets that
 * were actually performed: the heaviest weight reached at each rep count, and
 * when that best was last beaten.
 *
 * Deliberately spans **all history**, ignoring the shared time-range
 * selector — the same choice the PR list makes, and for the same reason. A
 * best is a best; scoped to the default 8 weeks it would quietly disagree
 * with the PR list, and the stall window needs a longer lookback than that
 * range can offer anyway.
 */
export function RepProgressSection({ data, unit }: { data: AnalyticsData; unit: UnitPreference }) {
  const [exerciseId, setExerciseId] = useState<string | undefined>(undefined)
  const [showPicker, setShowPicker] = useState(false)

  const progressByExercise = useMemo(() => computeRepProgressByExercise(data.setLogs), [data.setLogs])

  const stalled = useMemo(
    () =>
      Array.from(progressByExercise.values())
        .filter((progress) => progress.stalled)
        .sort((a, b) => (b.weeksSinceImprovement ?? 0) - (a.weeksSinceImprovement ?? 0)),
    [progressByExercise],
  )

  const selected = exerciseId ? progressByExercise.get(exerciseId) : undefined
  const exerciseName = exerciseId ? data.exerciseById.get(exerciseId)?.name : undefined

  return (
    <div>
      {stalled.length > 0 && (
        <Card className="mb-3 px-4 py-3">
          <p className="text-sm font-semibold text-amber-400">
            Stalled · {stalled.length} exercise{stalled.length === 1 ? '' : 's'}
          </p>
          <p className="mb-2 text-xs text-slate-500">
            No heavier set at the rep count you train most, for {STALL_WEEKS}+ weeks.
          </p>
          {stalled.map((progress) => (
            <button
              key={progress.exerciseId}
              type="button"
              onClick={() => setExerciseId(progress.exerciseId)}
              className="flex min-h-11 w-full items-center justify-between gap-3 border-t border-border pt-2 text-left text-sm"
            >
              <span className="min-w-0 flex-1 truncate text-slate-100">
                {data.exerciseById.get(progress.exerciseId)?.name ?? 'Exercise'}
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-slate-500">
                {progress.anchor?.reps}×{' '}
                {progress.anchor ? formatWeight(progress.anchor.bestWeightKg, unit) : ''}
                {unit} · {progress.weeksSinceImprovement}w
              </span>
            </button>
          ))}
        </Card>
      )}

      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className="mb-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-border bg-surface-1 px-3 text-slate-100"
      >
        <span className={exerciseName ? 'font-medium' : 'text-slate-500'}>
          {exerciseName ?? 'Pick an exercise'}
        </span>
        <ChevronDown size={18} className="text-slate-500" />
      </button>

      {selected === undefined ? (
        <EmptyChart
          message={
            exerciseId
              ? 'No working sets logged for this exercise yet.'
              : 'Pick an exercise to see your best weight at each rep count.'
          }
        />
      ) : (
        <RepBestsTable progress={selected} unit={unit} />
      )}

      {showPicker && (
        <ExercisePickerSheet
          title="Choose Exercise"
          onPick={(id) => {
            setExerciseId(id)
            setShowPicker(false)
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

function RepBestsTable({ progress, unit }: { progress: ExerciseRepProgress; unit: UnitPreference }) {
  return (
    <div>
      {!progress.hasEnoughData && (
        <p className="mb-2 text-xs text-slate-500">
          {progress.sessionCount} session{progress.sessionCount === 1 ? '' : 's'} logged.{' '}
          {MIN_SESSIONS_FOR_REP_TREND - progress.sessionCount} more before a stall can be called — until
          then a flat week is indistinguishable from a plateau.
        </p>
      )}
      {progress.hasEnoughData && progress.dormant && (
        <p className="mb-2 text-xs text-slate-500">
          Not trained in {STALL_WEEKS}+ weeks — dormant, not stalled.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex items-center gap-3 border-b border-border bg-surface-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span className="w-16 shrink-0">Reps</span>
          <span className="w-20 shrink-0">Best</span>
          <span className="flex-1">Last improved</span>
        </div>
        {progress.repBests.map((rep) => {
          const isAnchor = progress.anchor?.reps === rep.reps
          return (
            <div
              key={rep.reps}
              className="flex items-center gap-3 border-b border-surface-2 px-3 py-2 text-sm last:border-b-0"
            >
              <span className="w-16 shrink-0 font-mono tabular-nums text-slate-300">{rep.reps}</span>
              <span className="w-20 shrink-0 font-mono tabular-nums text-slate-100">
                {formatWeight(rep.bestWeightKg, unit)} {unit}
              </span>
              <span className="flex-1 truncate text-slate-500">{formatDate(rep.lastImprovedAt)}</span>
              {isAnchor && progress.stalled && (
                <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-amber-400">
                  Stalled
                </span>
              )}
              {isAnchor && !progress.stalled && (
                <span
                  className="shrink-0 text-[11px] font-medium text-slate-600"
                  title="The rep count you train this movement at most"
                >
                  Most trained
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
