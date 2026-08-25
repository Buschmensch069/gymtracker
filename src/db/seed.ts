import { db } from './schema'
import { allSeedExercises } from './seedData'

const SEED_VERSION = 1

export async function seedDatabaseIfNeeded(): Promise<void> {
  await db.transaction('rw', db.exercises, db.settings, async () => {
    const seedSetting = await db.settings.get('seedVersion')
    const currentVersion = (seedSetting?.value as number) ?? 0
    if (currentVersion >= SEED_VERSION) return

    const existingSeedCount = await db.exercises.filter((e) => !e.isCustom).count()
    if (existingSeedCount === 0) {
      await db.exercises.bulkAdd(allSeedExercises)
    }

    await db.settings.put({ key: 'seedVersion', value: SEED_VERSION })
  })
}
