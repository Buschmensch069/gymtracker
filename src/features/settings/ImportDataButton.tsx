import { useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { countRecords, importAllData, validateExport } from './dataTransfer'

export function ImportDataButton() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChosen = async (file: File) => {
    setError(null)
    setBusy(true)
    try {
      const text = await file.text()
      const payload = validateExport(JSON.parse(text))
      const total = countRecords(payload)
      const confirmed = confirm(
        `This will replace all current data with ${total} imported records. This cannot be undone. Continue?`,
      )
      if (!confirmed) return
      await importAllData(payload)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Button
        variant="secondary"
        fullWidth
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
      >
        {busy ? 'Importing…' : 'Import Data from JSON'}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileChosen(file)
          e.target.value = ''
        }}
      />
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
