import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  message?: string
  action?: ReactNode
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <p className="text-lg font-medium text-slate-200">{title}</p>
      {message && <p className="text-sm text-slate-500">{message}</p>}
      {action}
    </div>
  )
}
