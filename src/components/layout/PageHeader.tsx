import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  action?: ReactNode
}

/**
 * `pt-safe` sets padding-top outright (it wins the cascade over `py-*`), so
 * the safe-area inset and the header's own visual padding have to live on
 * separate elements — otherwise the title sits flush against the bottom edge
 * of the status bar in standalone mode (inset ≈ 59px, zero gap) and flush
 * against the very top of the viewport in-browser (inset 0). Same split as
 * Sheet.tsx.
 */
export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border pt-safe">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">{title}</h1>
        {action}
      </div>
    </header>
  )
}
