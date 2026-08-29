import { ArrowUpDown, Replace, Trash2 } from 'lucide-react'
import { ActionSheet, ActionSheetItem } from '../../components/ui/ActionSheet'

interface ExerciseMenuSheetProps {
  exerciseName: string
  onReorder: () => void
  onReplace: () => void
  onRemove: () => void
  onClose: () => void
}

/** The per-exercise overflow (⋮) in an active workout. */
export function ExerciseMenuSheet({
  exerciseName,
  onReorder,
  onReplace,
  onRemove,
  onClose,
}: ExerciseMenuSheetProps) {
  return (
    <ActionSheet title={exerciseName} onClose={onClose}>
      <ActionSheetItem onSelect={onReorder} leading={<ArrowUpDown size={18} />}>
        Reorder Exercises
      </ActionSheetItem>
      <ActionSheetItem onSelect={onReplace} leading={<Replace size={18} />}>
        Replace Exercise
      </ActionSheetItem>
      <ActionSheetItem destructive onSelect={onRemove} leading={<Trash2 size={18} />}>
        Remove Exercise
      </ActionSheetItem>
    </ActionSheet>
  )
}
