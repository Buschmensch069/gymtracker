import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Textarea } from '../../components/ui/Textarea'
import { useUnitPreference } from '../../hooks/useSettings'
import { usePRProgression } from '../../hooks/usePRProgression'
import { db } from '../../db/schema'
import { formatDate, formatDuration, formatTime } from '../../lib/dates'
import { weightForDisplay } from '../../lib/units'
import { useWorkoutExercises } from '../workout/useActiveWorkout'
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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title={formatDate(workout.startedAt)} />
      <div className="flex-1 scroll-touch pb-4">
        <div className="border-b border-border px-4 py-2 text-sm text-slate-500">
          {formatTime(workout.startedAt)} · {formatDuration(workout.startedAt, workout.finishedAt)}
        </div>

        {workoutExercises?.map((we) => (
          <div key={we.id} className="mt-3 first:mt-0">
            <p className="px-4 py-2 font-semibold text-slate-100">{we.exercise?.name ?? 'Exercise'}</p>
            <div className="px-4">
              {we.sets.map((set) => {
                const flags = prProgression?.bySetId.get(set.id)
                const isPR = Boolean(flags && (flags.isE1RMPR || flags.isWeightForRepsPR))
                return (
                  <div
                    key={set.id}
                    className="flex items-center gap-3 border-b border-surface-2 py-2 text-sm"
                  >
                    <span className="w-5 text-slate-500">{set.setNumber}</span>
                    <span className="font-mono tabular-nums text-slate-100">
                      {weightForDisplay(set.weightKg, unit)} {unit} × {set.reps}
                    </span>
                    {set.rpe !== undefined && (
                      <span className="font-mono text-xs tabular-nums text-slate-500">RPE {set.rpe}</span>
                    )}
                    {set.type !== 'normal' && (
                      <span className="text-xs text-slate-500 uppercase">{set.type}</span>
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
