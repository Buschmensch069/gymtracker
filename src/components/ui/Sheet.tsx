import type { ReactNode } from 'react'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** Full-screen takeover sheet (not position:fixed content-over-content — it owns the whole viewport). */
export function Sheet({ title, onClose, children }: SheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 pt-safe">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-slate-400 active:bg-slate-800"
          aria-label="Close"
        >
          &times;
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
