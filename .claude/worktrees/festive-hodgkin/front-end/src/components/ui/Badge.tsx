import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'default'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-status-success/10 text-status-success border-status-success/20',
  danger:  'bg-status-danger/10  text-status-danger  border-status-danger/20',
  warning: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  info:    'bg-status-info/10    text-status-info    border-status-info/20',
  default: 'bg-surface-light     text-text-secondary border-surface-border',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium border',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
