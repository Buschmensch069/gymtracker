import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Textarea } from '../../components/ui/Textarea'
import { useUnitPreference } from '../../hooks/useSettings'
import { usePRProgression } from '../../hooks/usePRProgression'
import { db } from '../../db/schema'
import type { Exercise } from '../../db/types'
// Same displayed numbering as the active workout — a warmup reads "W" and the
// working sets renumber around it. Stored setNumber is untouched; see setTypes.
import { SET_TYPE_LABELS, SET_TYPE_TEXT_CLASS, setDisplayInfo } from '../../lib/setTypes'
import { computeWorkoutSummary } from './workoutStats'
import { formatDate, formatDuration, formatTime } from '../../lib/dates'
import { weightForDisplay } from '../../lib/units'
import { useWorkoutExercises } from '../workout/useActiveWorkout'
import { MuscleSplitBars } from './MuscleSplitBars'
import { useWorkout } from './useWorkoutHistory'

export function WorkoutDetailPage() {
  const { workoutId } = useParams<{ workoutId: string }>()
  const workout = useWorkout(workoutId)
  const workoutExercises = useWorkoutExercises(workoutId)
  const prProgression = usePRProgression()
  const [unit] = useUnitPreference()
  const [notes, setNotes] = useState<string | undefined>(undefined)

  if (!workout) return null
  const notesValue = notes ?? workout.notes

  const summary = workoutExercises ? computeWorkoutSummary(workoutExercises) : undefined
  const prCount =
    workoutExercises?.reduce((count, we) => {
      const prSets = we.sets.filter((set) => {
        const flags = prProgression?.bySetId.get(set.id)
        return flags && (flags.isE1RMPR || flags.isWeightForRepsPR)
      })
      return count + prSets.length
    }, 0) ?? 0

  const exerciseById = new Map<string, Exercise>()
  for (const we of workoutExercises ?? []) {
    if (we.exercise) exerciseById.set(we.exerciseId, we.exercise)
  }
  const allSets = workoutExercises?.flatMap((we) => we.sets) ?? []

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title={formatDate(workout.startedAt)} />
      <div className="flex-1 scroll-touch pb-4">
        <div className="border-b border-border px-4 py-2 text-sm text-slate-500">
          {formatTime(workout.startedAt)}
        </div>

        {summary && (
          <Card className="mx-4 mt-3 grid grid-cols-2 gap-x-3 gap-y-4 p-4">
            <Stat label="Duration" value={formatDuration(workout.startedAt, workout.finishedAt)} />
            <Stat
              label="Volume"
              value={`${Math.round(weightForDisplay(summary.totalVolumeKg, unit)).toLocaleString()} ${unit}`}
            />
            <Stat label="Sets" value={String(summary.totalSets)} />
            <Stat label="PRs" value={String(prCount)} accent={prCount > 0} />
          </Card>
        )}

        {allSets.length > 0 && (
          <div className="mt-5 px-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-400">Muscle Split</h2>
            <MuscleSplitBars sets={allSets} exerciseById={exerciseById} />
          </div>
        )}

        {workoutExercises?.map((we) => (
          <div key={we.id} className="mt-3 first:mt-0">
            <p className="px-4 py-2 font-semibold text-slate-100">{we.exercise?.name ?? 'Exercise'}</p>
            <div className="px-4">
              {setDisplayInfo(we.sets).map((display, index) => {
                const set = we.sets[index]
                const flags = prProgression?.bySetId.get(set.id)
                const isPR = Boolean(flags && (flags.isE1RMPR || flags.isWeightForRepsPR))
                return (
                  <div
                    key={set.id}
                    className="flex items-center gap-3 border-b border-surface-2 py-2 text-sm"
                  >
                    <span
                      className={`w-5 font-mono font-semibold tabular-nums ${SET_TYPE_TEXT_CLASS[set.type]}`}
                    >
                      {display.label}
                    </span>
                    <span className="font-mono tabular-nums text-slate-100">
                      {weightForDisplay(set.weightKg, unit)} {unit} × {set.reps}
                    </span>
                    {set.rpe !== undefined && (
                      <span className="font-mono text-xs tabular-nums text-slate-500">RPE {set.rpe}</span>
                    )}
                    {set.type !== 'normal' && (
                      <span className="text-xs text-slate-500">{SET_TYPE_LABELS[set.type]}</span>
                    )}
                    {isPR && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                        <Trophy size={13} />
                        PR
                      </span>
                    )}
                    {set.completed && <span className="ml-auto text-accent">✓</span>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div className="mt-5 px-4">
          <label className="mb-2 block text-sm font-medium text-slate-400">Notes</label>
          <Textarea
            className="min-h-24"
            value={notesValue}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={(e) => db.workouts.update(workout.id, { notes: e.target.value })}
            placeholder="No notes for this workout."
          />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${accent ? 'text-amber-400' : 'text-slate-100'}`}>
        {value}
      </p>
    </div>
  )
}
