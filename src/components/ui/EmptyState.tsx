import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      {icon && <div className="mb-1 text-slate-600">{icon}</div>}
      <p className="text-lg font-semibold text-slate-200">{title}</p>
      {message && <p className="text-sm text-slate-500">{message}</p>}
      {action}
    </div>
  )
}
