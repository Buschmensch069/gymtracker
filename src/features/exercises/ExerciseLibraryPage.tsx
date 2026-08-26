import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Input } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { MuscleFilterBar } from './MuscleFilterBar'
import { ExerciseCard } from './ExerciseCard'
import { useExerciseList } from './useExercises'
import type { PrimaryMuscle } from '../../db/types'

export function ExerciseLibraryPage() {
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState<PrimaryMuscle | null>(null)
  const exercises = useExerciseList(search, muscle)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title="Exercises"
        action={
          <Link to="/exercises/new">
            <Button variant="secondary">+ New</Button>
          </Link>
        }
      />
      <div className="px-4 pt-3">
        <Input
          type="search"
          placeholder="Search exercises"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="pt-3">
        <MuscleFilterBar value={muscle} onChange={setMuscle} />
      </div>
      <div className="flex-1 scroll-touch">
        {exercises === undefined ? null : exercises.length === 0 ? (
          <EmptyState title="No exercises found" message="Try a different search or filter." />
        ) : (
          exercises.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} />)
        )}
      </div>
    </div>
  )
}
