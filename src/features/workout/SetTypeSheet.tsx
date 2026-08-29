import { Trash2 } from 'lucide-react'
import { ActionSheet, ActionSheetItem } from '../../components/ui/ActionSheet'
import type { SetType } from '../../db/types'
import {
  SET_TYPE_ABBREVIATION,
  SET_TYPE_LABELS,
  SET_TYPE_PICKER_ORDER,
  SET_TYPE_TEXT_CLASS,
} from '../../lib/setTypes'

interface SetTypeSheetProps {
  current: SetType
  /** The number this set shows (or would show) as a normal set — previewed on the Normal row. */
  numberIfNormal: number
  onSelect: (type: SetType) => void
  onRemove: () => void
  onClose: () => void
}

/** Reached by tapping a set's indicator. Also the discoverable home of "Remove Set" now that the row deletes by swipe. */
export function SetTypeSheet({ current, numberIfNormal, onSelect, onRemove, onClose }: SetTypeSheetProps) {
  return (
    <ActionSheet title="Set Type" onClose={onClose}>
      {SET_TYPE_PICKER_ORDER.map((type) => (
        <ActionSheetItem
          key={type}
          selected={type === current}
          onSelect={() => onSelect(type)}
          leading={
            <span className={`font-mono text-base font-bold tabular-nums ${SET_TYPE_TEXT_CLASS[type]}`}>
              {type === 'normal' ? numberIfNormal : SET_TYPE_ABBREVIATION[type]}
            </span>
          }
        >
          {SET_TYPE_LABELS[type]}
        </ActionSheetItem>
      ))}

      <ActionSheetItem destructive onSelect={onRemove} leading={<Trash2 size={18} />}>
        Remove Set
      </ActionSheetItem>
    </ActionSheet>
  )
}
