import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-cyan-500 text-slate-950 active:bg-cyan-400',
  secondary: 'bg-slate-800 text-slate-100 active:bg-slate-700',
  ghost: 'bg-transparent text-slate-300 active:bg-slate-800',
  danger: 'bg-red-600 text-white active:bg-red-500',
}

export function Button({
  variant = 'primary',
  fullWidth,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`min-h-11 rounded-xl px-4 font-medium disabled:opacity-40 ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
