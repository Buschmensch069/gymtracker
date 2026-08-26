import type { TextareaHTMLAttributes } from 'react'

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-xl border border-border bg-surface-1 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none ${className}`}
      {...rest}
    />
  )
}
