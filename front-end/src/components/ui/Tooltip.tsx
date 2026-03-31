import {
  useState,
  useRef,
  type ReactNode,
  type CSSProperties,
} from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const positionStyles: CSSProperties = {
    top:    side === 'bottom' ? '100%' : side === 'top' ? 'auto' : '50%',
    bottom: side === 'top' ? '100%' : 'auto',
    left:   side === 'right' ? '100%' : side === 'left' ? 'auto' : '50%',
    right:  side === 'left' ? '100%' : 'auto',
    transform:
      side === 'top' || side === 'bottom'
        ? 'translateX(-50%)'
        : 'translateY(-50%)',
    marginBottom: side === 'top' ? '6px' : undefined,
    marginTop:    side === 'bottom' ? '6px' : undefined,
    marginLeft:   side === 'right' ? '6px' : undefined,
    marginRight:  side === 'left' ? '6px' : undefined,
  }

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          style={positionStyles}
          className={cn(
            'absolute z-50 px-2 py-1 rounded-lg text-xs whitespace-nowrap pointer-events-none',
            'bg-surface-light border border-surface-border text-text-primary shadow-card',
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
