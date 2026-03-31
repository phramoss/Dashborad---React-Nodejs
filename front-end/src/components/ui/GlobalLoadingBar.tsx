import { useGlobalLoading } from '@/hooks/useGlobalLoading'
import { cn } from '@/lib/utils'

export function GlobalLoadingBar() {
  const isLoading = useGlobalLoading()

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 h-[2px] z-[9999] overflow-hidden',
        'transition-opacity duration-300',
        isLoading ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div
        className="h-full w-full animate-pulse"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #00D4AA 40%, #00FFCC 60%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: isLoading
            ? 'shimmer 1.4s ease-in-out infinite'
            : 'none',
        }}
      />
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  )
}
