import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/** Elevated surface primitive (surface-1 + border) — the raised-card look used by routine, history, and PR list rows. */
export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface-1 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
