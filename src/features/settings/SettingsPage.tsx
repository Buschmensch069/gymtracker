import { PageHeader } from '../../components/layout/PageHeader'
import { ExportDataButton } from './ExportDataButton'
import { ImportDataButton } from './ImportDataButton'
import { UnitToggle } from './UnitToggle'

export function SettingsPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Settings" />
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <section>
          <h2 className="mb-2 text-sm font-medium text-slate-400">Units</h2>
          <UnitToggle />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400">Data</h2>
          <ExportDataButton />
          <ImportDataButton />
        </section>
      </div>
    </div>
  )
}
