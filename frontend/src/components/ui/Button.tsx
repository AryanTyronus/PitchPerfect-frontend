import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  fullWidth?: boolean
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  fullWidth = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button-${variant}${fullWidth ? ' button-full' : ''} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}
