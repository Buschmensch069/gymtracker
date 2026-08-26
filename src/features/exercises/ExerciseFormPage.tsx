import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Chip } from '../../components/ui/Chip'
import { MUSCLE_COLORS } from '../../lib/muscleColors'
import {
  PRIMARY_MUSCLES,
  MUSCLE_LABELS,
  EQUIPMENT_TYPES,
  EQUIPMENT_LABELS,
  type Exercise,
  type PrimaryMuscle,
  type Equipment,
} from '../../db/types'
import { createCustomExercise, deleteExercise, updateExercise, useExercise } from './useExercises'

export function ExerciseFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const existing = useExercise(id)

  // Wait for the existing exercise to load before mounting the form so its
  // useState initializers can seed directly from it (no sync effect needed).
  if (isEdit && existing === undefined) return null

  return <ExerciseFormFields key={id ?? 'new'} id={id} existing={existing} />
}

function ExerciseFormFields({ id, existing }: { id: string | undefined; existing: Exercise | undefined }) {
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [name, setName] = useState(existing?.name ?? '')
  const [primaryMuscle, setPrimaryMuscle] = useState<PrimaryMuscle>(existing?.primaryMuscle ?? 'chest')
  const [secondaryMuscles, setSecondaryMuscles] = useState<PrimaryMuscle[]>(existing?.secondaryMuscles ?? [])
  const [equipment, setEquipment] = useState<Equipment>(existing?.equipment ?? 'barbell')
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const toggleSecondary = (muscle: PrimaryMuscle) => {
    setSecondaryMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle],
    )
  }

  const canSave = name.trim().length > 0

  const handleSave = async () => {
    if (!canSave) return
    const payload = {
      name: name.trim(),
      primaryMuscle,
      secondaryMuscles: secondaryMuscles.filter((m) => m !== primaryMuscle),
      equipment,
      notes,
    }
    if (isEdit && id) {
      await updateExercise(id, payload)
      navigate(`/exercises/${id}`)
    } else {
      const newId = await createCustomExercise(payload)
      navigate(`/exercises/${newId}`)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    if (!confirm('Delete this custom exercise? This cannot be undone.')) return
    await deleteExercise(id)
    navigate('/exercises')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title={isEdit ? 'Edit Exercise' : 'New Exercise'} />
      <div className="flex-1 scroll-touch space-y-5 px-4 py-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Exercise name" />
        </Field>

        <Field label="Primary muscle">
          <select
            className="min-h-11 w-full rounded-xl border border-border bg-surface-1 px-3 text-slate-100"
            value={primaryMuscle}
            onChange={(e) => setPrimaryMuscle(e.target.value as PrimaryMuscle)}
          >
            {PRIMARY_MUSCLES.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Secondary muscles">
          <div className="flex flex-wrap gap-2">
            {PRIMARY_MUSCLES.filter((m) => m !== primaryMuscle).map((m) => (
              <Chip
                key={m}
                label={MUSCLE_LABELS[m]}
                color={MUSCLE_COLORS[m]}
                active={secondaryMuscles.includes(m)}
                onClick={() => toggleSecondary(m)}
              />
            ))}
          </div>
        </Field>

        <Field label="Equipment">
          <select
            className="min-h-11 w-full rounded-xl border border-border bg-surface-1 px-3 text-slate-100"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as Equipment)}
          >
            {EQUIPMENT_TYPES.map((eq) => (
              <option key={eq} value={eq}>
                {EQUIPMENT_LABELS[eq]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Notes">
          <Textarea
            className="min-h-24"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
          />
        </Field>

        <div className="space-y-2 pt-2">
          <Button fullWidth onClick={handleSave} disabled={!canSave}>
            Save
          </Button>
          {isEdit && (
            <Button fullWidth variant="danger" onClick={handleDelete}>
              Delete Exercise
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-400">{label}</label>
      {children}
    </div>
  )
}
