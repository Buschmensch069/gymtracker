import { db } from '../db/schema'

/**
 * Requests durable (non-evictable) storage once, on first launch only.
 * Safe to call on every boot — it's gated on the 'persistentStorageRequested'
 * settings flag so it never re-prompts/re-requests after the first run.
 */
export async function requestPersistentStorageIfNeeded(): Promise<void> {
  if (!navigator.storage?.persist) return

  const alreadyRequested = await db.settings.get('persistentStorageRequested')
  if (alreadyRequested) return

  const granted = await navigator.storage.persist()
  await db.settings.bulkPut([
    { key: 'persistentStorageRequested', value: true },
    { key: 'persistentStorageGranted', value: granted },
  ])
}
