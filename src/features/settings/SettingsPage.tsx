import { PageHeader } from '../../components/layout/PageHeader'
import { useLastExportedAt } from '../../hooks/useSettings'
import { daysSince, formatDate } from '../../lib/dates'
import { ExportDataButton } from './ExportDataButton'
import { ImportDataButton } from './ImportDataButton'
import { StorageStatus } from './StorageStatus'
import { UnitToggle } from './UnitToggle'

const EXPORT_NUDGE_THRESHOLD_DAYS = 30

export function SettingsPage() {
  const lastExportedAt = useLastExportedAt()
  const daysSinceExport = lastExportedAt ? daysSince(lastExportedAt) : undefined
  const shouldNudge = daysSinceExport === undefined || daysSinceExport > EXPORT_NUDGE_THRESHOLD_DAYS

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Settings" />
      <div className="flex-1 scroll-touch space-y-6 px-4 py-4">
        <section>
          <h2 className="mb-2 text-sm font-medium text-slate-400">Units</h2>
          <UnitToggle />
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400">Storage</h2>
          <StorageStatus />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400">Data</h2>
          <p className="text-sm text-slate-500">
            {lastExportedAt ? `Last exported ${formatDate(lastExportedAt)}` : 'Never exported'}
          </p>
          {shouldNudge && (
            <p className="text-sm text-amber-400">
              {lastExportedAt
                ? "It's been over a month since your last backup — consider exporting."
                : 'You have no backup yet — consider exporting your data.'}
            </p>
          )}
          <ExportDataButton />
          <ImportDataButton />
        </section>
      </div>
    </div>
  )
}
