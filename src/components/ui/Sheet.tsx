import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

const EXIT_DURATION_MS = 200

/** Full-screen takeover sheet (not position:fixed content-over-content — it owns the whole viewport). */
export function Sheet({ title, onClose, children }: SheetProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, EXIT_DURATION_MS)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-surface-0 pt-safe sheet-transition ${visible ? 'sheet-transition-open' : ''}`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <button
          type="button"
          onClick={handleClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-slate-400 active:bg-surface-2"
          aria-label="Close"
        >
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 scroll-touch">{children}</div>
    </div>
  )
}
