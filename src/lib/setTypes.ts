import type { SetType } from '../db/types'

export const SET_TYPE_LABELS: Record<SetType, string> = {
  warmup: 'Warm Up',
  normal: 'Normal',
  failure: 'Failure',
  dropset: 'Drop Set',
}

/** The letter shown in place of a set number. `normal` has none — it shows its number instead. */
export const SET_TYPE_ABBREVIATION: Record<SetType, string> = {
  warmup: 'W',
  normal: '',
  failure: 'F',
  dropset: 'D',
}

/**
 * Text colour for a set's indicator. Colour is a second channel only: the
 * letter itself always says which type it is, so this stays readable without
 * relying on telling amber from red mid-set (same rule as `Chip`'s colour dot
 * — see CLAUDE.md's Visual Design System).
 */
export const SET_TYPE_TEXT_CLASS: Record<SetType, string> = {
  warmup: 'text-amber-400',
  normal: 'text-slate-300',
  failure: 'text-red-400',
  dropset: 'text-sky-400',
}

/** Order the types are offered in the picker — the two common ones first. */
export const SET_TYPE_PICKER_ORDER: SetType[] = ['warmup', 'normal', 'failure', 'dropset']

export interface SetDisplay {
  /** What the set's indicator reads: its number, or the type's letter. */
  label: string
  /** The number this set would take if it were switched to `normal` — the picker previews it. */
  numberIfNormal: number
}

/**
 * Working-set numbering as it is *displayed*, which is not `SetLog.setNumber`.
 *
 * `setNumber` is the stored position of the row within its exercise and counts
 * everything, warmups included; it stays that way (`deleteSet` closes gaps in
 * it, analytics and history read it). Displayed numbering instead counts only
 * `normal` sets, so a warmup shows "W" and the working sets below it read 1, 2,
 * 3 — flagging set 1 as a warmup renumbers the rest rather than leaving the
 * first working set called "2". Purely a presentation concern, hence a pure
 * function over the row list rather than anything written back to the DB.
 */
export function setDisplayInfo(sets: { type: SetType }[]): SetDisplay[] {
  let normalCount = 0
  return sets.map((set) => {
    const numberIfNormal = normalCount + 1
    if (set.type === 'normal') normalCount = numberIfNormal
    return {
      label: set.type === 'normal' ? String(numberIfNormal) : SET_TYPE_ABBREVIATION[set.type],
      numberIfNormal,
    }
  })
}
