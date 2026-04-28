import { memo, useMemo, useCallback, useEffect } from 'react'
import { SlidersHorizontal, RefreshCw, ChevronRight } from 'lucide-react'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { cn } from '@/lib/utils'
import { useEstoqueStore } from '@/store/estoque.store'
import { useEstoqueFiltrosDisponiveis } from '@/hooks/useEstoqueData'

function useActiveCount() {
  const filtros = useEstoqueStore(s => s.filtros)
  return (
    filtros.empresas.length + filtros.materiais.length + filtros.blocos.length +
    filtros.espessuras.length + filtros.industrializacao.length + filtros.situacao.length +
    filtros.grupos.length + filtros.chapas.length + filtros.lotes.length + filtros.unidades.length +
    (filtros.data_ini ? 1 : 0) + (filtros.data_fim ? 1 : 0)
  )
}

interface MobileDrawerProps {
  open:    boolean
  onClose: () => void
}

export const EstoqueMobileDrawer = memo(function EstoqueMobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { filtros, setFiltros, resetFiltros } = useEstoqueStore()
  const { data: opts, isLoading } = useEstoqueFiltrosDisponiveis()
  const activeCount = useActiveCount()

  const empresaOpts = useMemo(() => opts?.empresas ?? [], [opts?.empresas])
  const matOpts     = useMemo(() => opts?.materiais ?? [], [opts?.materiais])
  const espOpts     = useMemo(
    () => (opts?.espessuras ?? []).map(e => ({ id: e, label: `${e} cm` })),
    [opts?.espessuras],
  )
  const indOpts = useMemo(
    () => (opts?.composicoes ?? []).map((c, i) => ({ id: i + 1, label: c })),
    [opts?.composicoes],
  )
  const indSelected = useMemo(
    () => filtros.industrializacao.map(v => {
      const idx = (opts?.composicoes ?? []).indexOf(v)
      return idx >= 0 ? idx + 1 : -1
    }).filter(id => id > 0),
    [filtros.industrializacao, opts?.composicoes],
  )
  const handleIndChange = useCallback(
    (ids: number[]) => {
      const labels = ids.map(id => opts?.composicoes?.[id - 1] ?? '').filter(Boolean)
      setFiltros({ industrializacao: labels })
    },
    [opts?.composicoes, setFiltros],
  )
  const blocoOpts = useMemo(
    () => (opts?.blocos ?? []).map(b => ({ id: b, label: String(b) })),
    [opts?.blocos],
  )

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed top-0 right-0 h-full z-50 w-[85vw] max-w-[320px]',
          'bg-surface border-l border-surface-border shadow-2xl',
          'overflow-y-auto overscroll-contain',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-surface border-b border-surface-border">
          <div className="flex items-center gap-2 text-text-secondary">
            <SlidersHorizontal size={14} />
            <span className="text-[12px] uppercase tracking-widest font-semibold">Filtros</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand/20 text-brand text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-light transition-all">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-3">
          <MultiSelect label="Empresa" options={empresaOpts} selected={filtros.empresas}
            onChange={(ids) => setFiltros({ empresas: ids as number[] })} loading={isLoading} />
          <MultiSelect label="Espessura" options={espOpts} selected={filtros.espessuras}
            onChange={(ids) => setFiltros({ espessuras: ids as number[] })} loading={isLoading} />
          <MultiSelect label="Industrialização" options={indOpts}
            selected={indSelected} onChange={handleIndChange} loading={isLoading} />
          <MultiSelect label="Material" options={matOpts} selected={filtros.materiais}
            onChange={(ids) => setFiltros({ materiais: ids as number[] })} loading={isLoading} />
          <MultiSelect label="Bloco" options={blocoOpts} selected={filtros.blocos}
            onChange={(ids) => setFiltros({ blocos: ids as number[] })} loading={isLoading} />

          <div className="w-full h-px bg-surface-border my-1" />
          <p className="text-[9px] text-text-muted uppercase tracking-widest">Período (faturamento)</p>
          <input type="date" value={filtros.data_ini} max={today}
            onChange={(e) => setFiltros({ data_ini: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-surface border border-surface-border text-text-primary focus:outline-none focus:border-brand/50" />
          <input type="date" value={filtros.data_fim} max={today}
            onChange={(e) => setFiltros({ data_fim: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-surface border border-surface-border text-text-primary focus:outline-none focus:border-brand/50" />

          <div className="h-24" />
        </div>

        <div className="sticky bottom-0 z-10 px-4 py-4 bg-surface border-t border-surface-border flex flex-col gap-2">
          {activeCount > 0 && (
            <button onClick={() => { resetFiltros(); onClose() }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-medium text-status-danger bg-status-danger/10 border border-status-danger/20 hover:bg-status-danger/20 transition-all">
              <RefreshCw size={12} /> Limpar {activeCount} filtro{activeCount > 1 ? 's' : ''}
            </button>
          )}
          <button onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-medium text-text-secondary bg-surface-light border border-surface-border hover:bg-surface-border transition-all">
            Aplicar e fechar
          </button>
        </div>
      </div>
    </>
  )
})
