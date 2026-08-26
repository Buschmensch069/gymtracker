import type { InputHTMLAttributes } from 'react'

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-11 w-full rounded-xl border border-border bg-surface-1 px-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none ${className}`}
      {...rest}
    />
  )
}
