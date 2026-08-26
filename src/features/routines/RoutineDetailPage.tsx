import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { useExerciseById } from '../exercises/useExercises'
import { MUSCLE_COLORS } from '../../lib/muscleColors'
import { startWorkoutFromRoutine, useActiveWorkout } from '../workout/useActiveWorkout'
import { deleteRoutine, useRoutine } from './useRoutines'

export function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const routine = useRoutine(id)
  const exerciseById = useExerciseById()
  const activeWorkout = useActiveWorkout()
  const navigate = useNavigate()

  if (!routine || !exerciseById) return null

  const handleStart = async () => {
    await startWorkoutFromRoutine(routine.id)
    navigate('/workout')
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${routine.name}"? This cannot be undone.`)) return
    await deleteRoutine(routine.id)
    navigate('/workouts')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title={routine.name}
        action={
          <Link to={`/workouts/${routine.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
        }
      />
      <div className="flex-1 scroll-touch px-4 py-4">
        {routine.exercises.length === 0 ? (
          <p className="text-sm text-slate-500">No exercises in this routine yet.</p>
        ) : (
          <div className="space-y-2">
            {routine.exercises.map((re) => {
              const exercise = exerciseById.get(re.exerciseId)
              return (
                <div
                  key={re.exerciseId}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface-1 px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    {exercise && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: MUSCLE_COLORS[exercise.primaryMuscle] }}
                        aria-hidden="true"
                      />
                    )}
                    <p className="font-medium text-slate-100">{exercise?.name ?? 'Exercise'}</p>
                  </div>
                  <p className="font-mono text-sm tabular-nums text-slate-500">
                    {re.targetSets} × {re.targetRepRange}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 space-y-2">
          <Button fullWidth onClick={handleStart} disabled={Boolean(activeWorkout)}>
            {activeWorkout ? 'Finish current workout first' : 'Start Routine'}
          </Button>
          <Button fullWidth variant="danger" onClick={handleDelete}>
            Delete Routine
          </Button>
        </div>
      </div>
    </div>
  )
}
