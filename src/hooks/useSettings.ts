import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import type { UnitPreference } from '../db/types'

const DEFAULT_UNIT: UnitPreference = 'kg'

export function useUnitPreference(): [UnitPreference, (unit: UnitPreference) => Promise<void>] {
  const unit = useLiveQuery(async () => {
    const setting = await db.settings.get('unitPreference')
    return (setting?.value as UnitPreference) ?? DEFAULT_UNIT
  }, [], DEFAULT_UNIT)

  const setUnit = async (next: UnitPreference) => {
    await db.settings.put({ key: 'unitPreference', value: next })
  }

  return [unit ?? DEFAULT_UNIT, setUnit]
}
