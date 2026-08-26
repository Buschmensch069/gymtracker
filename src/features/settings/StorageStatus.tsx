import { usePersistentStorageStatus } from '../../hooks/useSettings'

export function StorageStatus() {
  const persisted = usePersistentStorageStatus()

  if (persisted === undefined) return null

  return (
    <p className="text-sm text-slate-500">
      {persisted ? (
        <>Storage: <span className="text-cyan-400">Persistent</span> — iOS won't evict your data under storage pressure.</>
      ) : (
        <>
          Storage: <span className="text-amber-400">Not persistent</span> — data could be evicted under storage
          pressure. Make sure you've launched this app from the home-screen icon at least once, and export a backup
          periodically.
        </>
      )}
    </p>
  )
}
