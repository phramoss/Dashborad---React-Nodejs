import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle teal glow on hover */
  interactive?: boolean
  /** Highlight border (active filter state) */
  active?: boolean
  /** Remove all padding */
  noPadding?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, active, noPadding, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl bg-[#2D2F33] border border-[rgba(66,141,148,0.20)] shadow-card',
        !noPadding && 'p-4',
        interactive && 'transition-colors duration-150 hover:border-[rgba(66,141,148,0.40)] cursor-pointer',
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
