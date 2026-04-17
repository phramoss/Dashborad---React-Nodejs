import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  active?: boolean
  noPadding?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, active, noPadding, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-card transition-colors duration-200',
        !noPadding && 'p-4',
        interactive && 'transition-colors duration-150 hover:border-[var(--border-mid)] cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
)
Card.displayName = 'Card'

const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-between mb-3', className)} {...props} />
)

const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-xs font-medium text-text-secondary uppercase tracking-widest', className)} {...props} />
)

const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('', className)} {...props} />
)

export { Card, CardHeader, CardTitle, CardContent }
