import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
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

/**
 * Live check of the browser's current persisted-storage grant — queried
 * directly via the Storage API rather than read back from the settings
 * table, since the OS/browser can grant persistence after the initial
 * request (e.g. once the PWA is added to the home screen).
 */
export function usePersistentStorageStatus(): boolean | undefined {
  const [persisted, setPersisted] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    if (!navigator.storage?.persisted) return
    navigator.storage.persisted().then(setPersisted)
  }, [])

  return persisted
}

export function useLastExportedAt(): number | undefined {
  return useLiveQuery(async () => {
    const setting = await db.settings.get('lastExportedAt')
    return setting?.value as number | undefined
  }, [])
}
