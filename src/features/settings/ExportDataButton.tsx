import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { downloadExport, exportAllData } from './dataTransfer'

export function ExportDataButton() {
  const [busy, setBusy] = useState(false)

  const handleExport = async () => {
    setBusy(true)
    try {
      const payload = await exportAllData()
      downloadExport(payload)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="secondary" fullWidth onClick={handleExport} disabled={busy}>
      {busy ? 'Exporting…' : 'Export Data as JSON'}
    </Button>
  )
}
