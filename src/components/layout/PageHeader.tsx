import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  action?: ReactNode
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3 pt-safe">
      <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
      {action}
    </header>
  )
}
