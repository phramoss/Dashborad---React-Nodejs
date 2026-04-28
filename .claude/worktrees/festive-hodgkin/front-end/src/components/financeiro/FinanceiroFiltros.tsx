import { memo, useEffect } from 'react'
import { SlidersHorizontal, RefreshCw, Filter, ChevronRight } from 'lucide-react'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { useFinanceiroFiltrosDisponiveis } from '@/hooks/useFinanceiroData'
import { useFinanceiroStore } from '@/store/financeiro.store'
import { cn } from '@/lib/utils'

// ─── Conta filtros ativos para o badge do FAB ─────────────────────────────────
function useActiveCount() {
  const { filtros } = useFinanceiroStore()
  return filtros.moeda.length + filtros.empresa.length + filtros.clientes.length
}

// ─── Conteúdo interno do drawer ───────────────────────────────────────────────
const INPUT_CLS = cn(
  'w-full h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]',
  'text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-brand/50 transition-all',
)

const FilterBody = memo(function FilterBody() {
  const { filtros, setMoeda, setEmpresa, setClientes,
          setVencIni, setVencFim, setEmisIni, setEmisFim } = useFinanceiroStore()
  const { data: opts, isLoading } = useFinanceiroFiltrosDisponiveis()

  const empresaOptions = (opts?.empresas ?? []).map(e => ({ id: e.id, label: e.label }))
  const clienteOptions = (opts?.clientes  ?? []).map(c => ({ id: c.id, label: c.label }))
  const moedas         = opts?.moedas ?? ['REAL', 'DOLAR', 'EURO', 'LIBRA']

  return (
    <div className="px-4 py-4 flex flex-col gap-3">

      {/* Moeda — select nativo (valores string, incompatível com MultiSelect number[]) */}
      <p className="text-[10px] text-text-muted uppercase tracking-widest">Moeda</p>
      <select
        value={filtros.moeda[0] ?? ''}
        onChange={e => setMoeda(e.target.value ? [e.target.value] : [])}
        className={INPUT_CLS}
      >
        <option value="">Todas</option>
        {moedas.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <div className="w-full h-px bg-[var(--border)] my-1" />

      <p className="text-[10px] text-text-muted uppercase tracking-widest">Empresa</p>
      <MultiSelect
        label="Empresa"
        options={empresaOptions}
        selected={filtros.empresa}
        onChange={setEmpresa}
        loading={isLoading}
      />

      <p className="text-[10px] text-text-muted uppercase tracking-widest">Cliente / Fornecedor</p>
      <MultiSelect
        label="Cliente"
        options={clienteOptions}
        selected={filtros.clientes}
        onChange={setClientes}
        loading={isLoading}
      />

      <div className="w-full h-px bg-[var(--border)] my-1" />

      <p className="text-[10px] text-text-muted uppercase tracking-widest">Vencimento</p>
      <div className="flex flex-col gap-1.5">
        <div>
          <p className="text-[9px] text-text-muted mb-1">De</p>
          <input type="date" value={filtros.venc_ini} onChange={e => setVencIni(e.target.value)} className={INPUT_CLS} />
        </div>
        <div>
          <p className="text-[9px] text-text-muted mb-1">Até</p>
          <input type="date" value={filtros.venc_fim} onChange={e => setVencFim(e.target.value)} className={INPUT_CLS} />
        </div>
      </div>

      <p className="text-[10px] text-text-muted uppercase tracking-widest">Emissão</p>
      <div className="flex flex-col gap-1.5">
        <div>
          <p className="text-[9px] text-text-muted mb-1">De</p>
          <input type="date" value={filtros.emis_ini} onChange={e => setEmisIni(e.target.value)} className={INPUT_CLS} />
        </div>
        <div>
          <p className="text-[9px] text-text-muted mb-1">Até</p>
          <input type="date" value={filtros.emis_fim} onChange={e => setEmisFim(e.target.value)} className={INPUT_CLS} />
        </div>
      </div>

      {/* Espaço para o footer sticky não cobrir o último input */}
      <div className="h-32" />
    </div>
  )
})

// ─── Drawer lateral ───────────────────────────────────────────────────────────
interface DrawerProps {
  open:    boolean
  onClose: () => void
}

export const FinanceiroFilterDrawer = memo(function FinanceiroFilterDrawer({ open, onClose }: DrawerProps) {
  const { resetFiltros } = useFinanceiroStore()
  const activeCount = useActiveCount()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm',
          'transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filtros Financeiro"
        className={cn(
          'fixed top-0 right-0 h-full z-50',
          'w-[85vw] max-w-[340px]',
          'bg-[var(--filter-bg)] border-l border-[var(--border)] shadow-2xl',
          'overflow-y-auto overscroll-contain',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-[var(--filter-bg)] border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-text-secondary">
            <SlidersHorizontal size={14} />
            <span className="text-[12px] uppercase tracking-widest font-semibold">Filtros</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand/20 text-[#428D94] text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-[var(--surface)] transition-all"
            aria-label="Fechar filtros"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <FilterBody />

        {/* Footer */}
        <div className="sticky bottom-0 z-10 px-4 py-4 bg-[var(--filter-bg)] border-t border-[var(--border)] flex flex-col gap-2">
          {activeCount > 0 && (
            <button
              onClick={() => { resetFiltros(); onClose() }}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg',
                'text-[12px] font-medium text-status-danger',
                'bg-status-danger/10 border border-status-danger/20',
                'hover:bg-status-danger/20 active:scale-[0.98] transition-all',
              )}
            >
              <RefreshCw size={12} />
              Limpar {activeCount} filtro{activeCount > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={onClose}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg',
              'text-[12px] font-medium text-text-secondary',
              'bg-[var(--surface)] border border-[var(--border)]',
              'hover:bg-[var(--surface-light)] active:scale-[0.98] transition-all',
            )}
          >
            Aplicar e fechar
          </button>
        </div>
      </div>
    </>
  )
})

// ─── FAB ──────────────────────────────────────────────────────────────────────
interface FabProps {
  onClick: () => void
}

export const FinanceiroFilterFab = memo(function FinanceiroFilterFab({ onClick }: FabProps) {
  const activeCount = useActiveCount()
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'w-14 h-14 rounded-full shadow-2xl',
        'flex items-center justify-center',
        'transition-all duration-200 active:scale-95',
        activeCount > 0
          ? 'bg-brand shadow-brand/30 text-surface-dark'
          : 'bg-[var(--filter-bg)] border border-[var(--border)] text-text-muted hover:border-brand/40 hover:text-brand',
      )}
      aria-label="Abrir filtros"
    >
      <Filter size={22} />
      {activeCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-status-danger text-white text-[10px] font-bold flex items-center justify-center shadow">
          {activeCount > 9 ? '9+' : activeCount}
        </span>
      )}
    </button>
  )
})
