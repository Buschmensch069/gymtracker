import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, Plus } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Card } from '../../components/ui/Card'
import { Chip } from '../../components/ui/Chip'
import { useExerciseById } from '../exercises/useExercises'
import { MUSCLE_COLORS } from '../../lib/muscleColors'
import { MUSCLE_LABELS, type Exercise, type Routine } from '../../db/types'
import { formatDate } from '../../lib/dates'
import { startWorkout, useActiveWorkout } from '../workout/useActiveWorkout'
import { musclesForRoutine, useRoutineLastPerformed } from './routineStats'
import { useRoutineList } from './useRoutines'

export function RoutineListPage() {
  const routines = useRoutineList()
  const exerciseById = useExerciseById()
  const activeWorkout = useActiveWorkout()
  const navigate = useNavigate()

  const handleStartEmpty = async () => {
    await startWorkout()
    navigate('/workout')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title="Workouts"
        action={
          <Link to="/workouts/new">
            <Button variant="secondary">
              <Plus size={18} className="-ml-1 mr-1 inline" />
              New
            </Button>
          </Link>
        }
      />
      <div className="flex-1 scroll-touch px-4 py-4">
        {!activeWorkout && (
          <Button variant="secondary" fullWidth onClick={handleStartEmpty} className="mb-4">
            Start Empty Workout
          </Button>
        )}

        {routines === undefined || exerciseById === undefined ? null : routines.length === 0 ? (
          <EmptyState
            icon={<Dumbbell size={40} />}
            title="No routines yet"
            message="Create a routine to plan your sets and track progress against a target."
          />
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => (
              <RoutineCard key={routine.id} routine={routine} exerciseById={exerciseById} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RoutineCard({ routine, exerciseById }: { routine: Routine; exerciseById: Map<string, Exercise> }) {
  const lastPerformed = useRoutineLastPerformed(routine.id)
  const muscles = musclesForRoutine(routine, exerciseById)

  return (
    <Link to={`/workouts/${routine.id}`} className="block">
      <Card className="p-4 active:bg-surface-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-lg font-semibold text-slate-100">{routine.name}</p>
          <span className="shrink-0 text-sm text-slate-500">
            {routine.exercises.length} exercise{routine.exercises.length === 1 ? '' : 's'}
          </span>
        </div>
        {muscles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {muscles.map((muscle) => (
              <Chip key={muscle} label={MUSCLE_LABELS[muscle]} color={MUSCLE_COLORS[muscle]} />
            ))}
          </div>
        )}
        <p className="mt-3 text-sm text-slate-500">
          {lastPerformed ? `Last performed ${formatDate(lastPerformed)}` : 'Never performed'}
        </p>
      </Card>
    </Link>
  )
}
