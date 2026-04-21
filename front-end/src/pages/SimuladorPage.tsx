import { useMemo, useState, useCallback, useRef, useEffect, useTransition } from 'react'
import {
  BarChart2, TrendingUp, Package, DollarSign,
  Calculator, Target, AlertCircle, ShoppingCart, Settings, Filter,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn, fmtBRL, fmtNum } from '@/lib/utils'
import { useSimuladorStore } from '@/store/simulador.store'
import { useSimuladorFiltrosDisponiveis, useSimuladorAll } from '@/hooks/useSimuladorData'
import type { SimuladorChapaRow, SimuladorFiltros } from '@/types'

import { calcSimulador, DEFAULT_VAR_LUCRO, type SimuladorCalcs, type PedidoItem } from '@/components/simulador/simulador-calcs'
import { InfoCard, LucroSlider } from '@/components/simulador/SimuladorInfoCards'
import { MatrizMateriais } from '@/components/simulador/SimuladorMatriz'
import { VendasTable } from '@/components/simulador/SimuladorVendas'
import { SimuladorPedidos, PedidoTable } from '@/components/simulador/SimuladorPedido'
import { SimMobileDrawer } from '@/components/simulador/SimuladorFiltros'

export function SimuladorPage() {
  const { filtros, setFiltros, resetFiltros } = useSimuladorStore()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: filtrosDisp, isLoading: filtrosLoading } = useSimuladorFiltrosDisponiveis()
  const { matriz, chapas, vendas, resumo } = useSimuladorAll()
  const { data: matrizData, isLoading: matrizLoading } = matriz
  const { data: chapasData, isLoading: chapasLoading } = chapas
  const { data: vendasData, isLoading: vendasLoading } = vendas
  const { data: resumoData, isLoading: resumoLoading } = resumo

  const [varLucro,    setVarLucro]    = useState(DEFAULT_VAR_LUCRO)
  const [pedidoLucro, setPedidoLucro] = useState(DEFAULT_VAR_LUCRO)
  const [dVariavel,   setDVariavel]   = useState(0)
  const [dFixa,       setDFixa]       = useState(0)
  const [pedidoDVariavel, setPedidoDVariavel] = useState(0)
  const [pedidoDFixa,     setPedidoDFixa]     = useState(0)
  const didInitRef = useRef({ lucro: false, pedidoLucro: false, indicadores: false, pedidoParams: false })
  const [, startTransition] = useTransition()

  const [pedido, setPedido] = useState<Map<string, PedidoItem>>(new Map())
  const pedidoSet = useMemo(() => new Set(pedido.keys()), [pedido])

  const addToPedido = useCallback((row: SimuladorChapaRow) => {
    const chapaKey = `${row.nBloco}-${row.chapa}`
    setPedido(prev => {
      if (prev.has(chapaKey)) return prev
      const next = new Map(prev)
      next.set(chapaKey, {
        chapaKey, nBloco: row.nBloco, chapa: row.chapa, codMa: row.codMa,
        material: row.material, pc: row.pc, metrosTotal: row.metrosTotal,
        custoTotal: row.custoTotal, custoM2: row.custoM2,
        qtde: row.metrosTotal, desconto: 0,
      })
      return next
    })
  }, [])

  const removeFromPedido = useCallback((chapaKey: string) => {
    setPedido(prev => {
      if (!prev.has(chapaKey)) return prev
      const next = new Map(prev)
      next.delete(chapaKey)
      return next
    })
  }, [])

  const updatePedidoQtde = useCallback((chapaKey: string, qtde: number) => {
    setPedido(prev => {
      const item = prev.get(chapaKey)
      if (!item || item.qtde === qtde) return prev
      const next = new Map(prev)
      next.set(chapaKey, { ...item, qtde: Math.max(0, qtde) })
      return next
    })
  }, [])

  const updatePedidoDesconto = useCallback((chapaKey: string, desconto: number) => {
    setPedido(prev => {
      const item = prev.get(chapaKey)
      if (!item || item.desconto === desconto) return prev
      const next = new Map(prev)
      next.set(chapaKey, { ...item, desconto: Math.max(0, desconto) })
      return next
    })
  }, [])

  useEffect(() => {
    if (!resumoData || resumoData.maxLucro <= 0) return
    const d = didInitRef.current
    if (!d.lucro)        { setVarLucro(resumoData.maxLucro);            d.lucro        = true }
    if (!d.pedidoLucro)  { setPedidoLucro(resumoData.maxLucro);         d.pedidoLucro  = true }
    if (!d.indicadores)  { setDVariavel(resumoData.maxDvariavel); setDFixa(resumoData.maxDfixa); d.indicadores = true }
    if (!d.pedidoParams) { setPedidoDVariavel(resumoData.maxDvariavel); setPedidoDFixa(resumoData.maxDfixa); d.pedidoParams = true }
  }, [resumoData])

  const matrizRows = useMemo(() => matrizData?.rows ?? [], [matrizData?.rows])
  const chapasRows = useMemo(() => chapasData?.rows ?? [], [chapasData?.rows])
  const vendasRows = useMemo(() => vendasData?.rows ?? [], [vendasData?.rows])

  const calcs = useMemo<SimuladorCalcs | null>(() => {
    if (!resumoData) return null
    return calcSimulador(resumoData, varLucro, dVariavel, dFixa)
  }, [resumoData, varLucro, dVariavel, dFixa])

  const pedidoCalcs = useMemo(() => {
    const items = Array.from(pedido.values())
    if (items.length === 0) return null
    const denV = 1 - pedidoDFixa - pedidoDVariavel - pedidoLucro
    const desp = 1 - pedidoDVariavel - pedidoDFixa
    const safe = (n: number) => (!isFinite(n) || isNaN(n)) ? 0 : n
    return items.reduce((acc, item) => {
      const precoComLucroM2 = denV !== 0 ? safe(item.custoM2 / denV) : 0
      const valorBruto      = precoComLucroM2 * item.qtde
      const valorTotal      = valorBruto - item.desconto
      const custoQtde       = item.custoM2 * item.qtde
      const lucro           = valorTotal - custoQtde
      const despesas        = valorTotal * desp
      const lucroLiquido    = despesas - lucro
      return {
        totalCusto:    acc.totalCusto    + custoQtde,
        totalValor:    acc.totalValor    + valorTotal,
        totalLucro:    acc.totalLucro    + lucroLiquido,
        totalM2:       acc.totalM2       + item.qtde,
        totalPc:       acc.totalPc       + item.pc,
        totalDesconto: acc.totalDesconto + item.desconto,
      }
    }, { totalCusto: 0, totalValor: 0, totalLucro: 0, totalM2: 0, totalPc: 0, totalDesconto: 0 })
  }, [pedido, pedidoDFixa, pedidoDVariavel, pedidoLucro])

  const faturamentoVariavel = useMemo(() => {
    if (!calcs || calcs.precoVendaVar === 'S/ESTOQUE') return null
    const totalM2Disponivel = matrizRows.reduce((sum, row) => sum + Math.max(0, row.metrosTotal - row.vendidas), 0)
    return totalM2Disponivel * calcs.precoVendaVar
  }, [matrizRows, calcs])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSetFiltrosDebounced = useCallback((partial: Partial<SimuladorFiltros>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { startTransition(() => { setFiltros(partial) }) }, 200)
  }, [setFiltros])

  const activeCount = filtros.materiais.length + filtros.blocos.length + filtros.situacao.length

  return (
    <div className="flex flex-col gap-4 max-w-[1800px] mx-auto pb-8">

      {/* BLOCO 1 — Materiais */}
      <ErrorBoundary>
        <Card noPadding>
          <div className="px-4 py-2.5 border-b border-surface-border flex items-center gap-2">
            <Package size={12} className="text-brand" />
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Materiais</h2>
          </div>
          <MatrizMateriais
            rows={matrizRows}
            loading={matrizLoading}
            filtrosMateriais={filtros.materiais}
            filtrosBlocos={filtros.blocos}
            setFiltros={handleSetFiltrosDebounced}
            maxHeight={280}
          />
        </Card>
      </ErrorBoundary>

      {/* BLOCO 2 — Total Realizado */}
      <ErrorBoundary>
        <Card noPadding>
          <div className="px-4 py-2.5 border-b border-surface-border flex items-center gap-2">
            <TrendingUp size={12} className="text-brand" />
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Total Realizado (Vendas Realizadas)</h2>
          </div>
          <VendasTable rows={vendasRows} loading={vendasLoading} maxHeight={240} />
        </Card>
      </ErrorBoundary>

      {/* BLOCOS 3-6 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <ErrorBoundary>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Calculator size={12} className="text-brand" />
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Simulador (Custos lançados + Indicadores)</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <InfoCard title="Preço M²"  value={calcs === null ? '—' : fmtBRL(calcs.pdrPrecoM2)}  icon={DollarSign}  accent="text-brand"         loading={resumoLoading} highlight />
              <InfoCard title="Faturado"  value={calcs === null ? '—' : fmtBRL(calcs.pdrFaturado)} icon={BarChart2}    accent="text-chart-teal"    loading={resumoLoading} />
              <InfoCard title="Lucro"     value={calcs === null ? '—' : fmtBRL(calcs.pdrLucro)}    icon={TrendingUp}   accent={calcs && calcs.pdrLucro >= 0 ? 'text-status-success' : 'text-status-danger'} loading={resumoLoading} />
            </div>
          </Card>
        </ErrorBoundary>

        <ErrorBoundary>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={12} className="text-brand" />
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Simulador de Valores</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 items-stretch">
              <InfoCard
                title="Preço de Venda (Variável)"
                value={calcs === null ? '—' : calcs.precoVendaVar === 'S/ESTOQUE' ? 'S/ESTOQUE' : fmtBRL(calcs.precoVendaVar)}
                icon={DollarSign} accent="text-chart-teal" loading={resumoLoading}
                highlight={calcs?.precoVendaVar !== 'S/ESTOQUE'}
              />
              <InfoCard
                title="Faturamento Potencial (Variável)"
                value={faturamentoVariavel === null ? 'S/ESTOQUE' : fmtBRL(faturamentoVariavel)}
                icon={TrendingUp}
                accent={faturamentoVariavel !== null && faturamentoVariavel > 0 ? 'text-status-success' : 'text-text-muted'}
                loading={resumoLoading || matrizLoading}
                highlight={faturamentoVariavel !== null && faturamentoVariavel > 0}
              />
              <InfoCard
                title="Lucro (Variável)"
                value={calcs === null ? '—' : fmtBRL(calcs.lucroVariavel)}
                icon={TrendingUp}
                accent={calcs && calcs.lucroVariavel >= 0 ? 'text-status-success' : 'text-status-danger'}
                loading={resumoLoading}
              />
            </div>
          </Card>
        </ErrorBoundary>

        <ErrorBoundary>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={12} className="text-brand" />
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Recuperação do Valor do Material</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 items-stretch">
              <InfoCard
                title="Qtde em Estq"
                value={calcs === null ? '—' : calcs.qtdeEstq === 'S/ ESTOQUE' ? 'S/ ESTOQUE' : fmtNum(calcs.qtdeEstq)}
                subtitle={calcs?.qtdeEstq === 'S/ ESTOQUE' ? 'PCs todos vendidos' : undefined}
                icon={Package}
                accent={calcs?.qtdeEstq === 'S/ ESTOQUE' ? 'text-text-muted' : typeof calcs?.qtdeEstq === 'number' && calcs.qtdeEstq < 0 ? 'text-status-danger' : 'text-chart-blue'}
                loading={resumoLoading}
              />
              <InfoCard title="Preço S/ Lucro"  value={calcs === null ? '—' : fmtBRL(calcs.precoSemLucro)} subtitle="Ponto de equilíbrio" icon={DollarSign} accent="text-chart-orange" loading={resumoLoading} />
              <InfoCard
                title="Preço a Aplicar"
                value={calcs === null ? '—' : calcs.precoAplicar === 0 ? 'S/ ESTOQUE' : fmtBRL(calcs.precoAplicar)}
                subtitle={calcs?.precoAplicar === 0 ? 'Sem peças restantes' : 'Para atingir meta'}
                icon={Target} accent="text-brand" loading={resumoLoading}
                highlight={!!(calcs && calcs.precoAplicar > 0)}
              />
            </div>
          </Card>
        </ErrorBoundary>

        <ErrorBoundary>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Target size={12} className="text-brand" />
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Indicadores (Cadastro da Empresa)</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <LucroSlider value={varLucro}  onChange={setVarLucro}  disabled={resumoLoading} />
              <LucroSlider label="% D. VARIÁVEL" value={dVariavel} onChange={setDVariavel} disabled={resumoLoading} />
              <LucroSlider label="% D. FIXA"     value={dFixa}     onChange={setDFixa}     disabled={resumoLoading} />
            </div>
          </Card>
        </ErrorBoundary>
      </div>

      <div className="w-full h-px bg-[var(--line)] my-1" />

      {/* SIMULADOR DE PEDIDOS */}
      <ErrorBoundary>
        <Card noPadding>
          <div className="px-4 py-2.5 border-b border-surface-border flex items-center gap-2">
            <ShoppingCart size={12} className="text-[color:var(--color-chart-orange,#f97316)]" />
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Simulador de Pedidos</h2>
          </div>
          <SimuladorPedidos rows={chapasRows} loading={chapasLoading} pedidoSet={pedidoSet} onAddChapa={addToPedido} maxHeight={320} />
        </Card>
      </ErrorBoundary>

      {/* PEDIDO */}
      {pedido.size > 0 && (
        <ErrorBoundary>
          <PedidoTable
            pedido={pedido} dfixa={pedidoDFixa} dvariavel={pedidoDVariavel} varLucro={pedidoLucro}
            onRemove={removeFromPedido} onUpdateQtde={updatePedidoQtde} onUpdateDesconto={updatePedidoDesconto}
            maxHeight={240}
          />
        </ErrorBoundary>
      )}

      {/* PARÂMETROS DO SIMULADOR DE PEDIDOS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <ErrorBoundary>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Settings size={12} className="text-brand" />
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Parâmetros do Simulador de Pedidos</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <LucroSlider label="% DE LUCRO"    value={pedidoLucro}     onChange={setPedidoLucro} />
              <LucroSlider label="% D. VARIÁVEL" value={pedidoDVariavel} onChange={setPedidoDVariavel} />
              <LucroSlider label="% D. FIXA"     value={pedidoDFixa}     onChange={setPedidoDFixa} />
            </div>
          </Card>
        </ErrorBoundary>

        <ErrorBoundary>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Calculator size={12} className="text-brand" />
              <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Simulador de Valores</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <InfoCard title="Valor Total - Pedido"   value={pedidoCalcs === null ? '—' : fmtBRL(pedidoCalcs.totalValor)} icon={DollarSign} accent="text-brand"         loading={resumoLoading} highlight />
              <InfoCard title="Custo Total do Pedido"  value={pedidoCalcs === null ? '—' : fmtBRL(pedidoCalcs.totalCusto)} icon={BarChart2}   accent="text-chart-teal"    loading={resumoLoading} />
              <InfoCard title="Lucro"                  value={pedidoCalcs === null ? '—' : fmtBRL(pedidoCalcs.totalLucro)} icon={TrendingUp}  accent={pedidoCalcs && (pedidoCalcs as {totalLucro: number}).totalLucro >= 0 ? 'text-status-success' : 'text-status-danger'} loading={resumoLoading} />
            </div>
          </Card>
        </ErrorBoundary>
      </div>

      {/* Drawer filtros */}
      <SimMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filtros={filtros}
        setFiltros={handleSetFiltrosDebounced}
        resetFiltros={resetFiltros}
        disponiveis={filtrosDisp}
        loading={filtrosLoading}
      />

      {/* FAB */}
      <button
        onClick={() => setDrawerOpen(v => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl',
          'flex items-center justify-center transition-all duration-200 active:scale-95',
          activeCount > 0
            ? 'bg-brand shadow-brand/30 text-surface-dark'
            : 'bg-surface border border-surface-border/80 text-text-muted hover:border-brand/40 hover:text-brand',
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
    </div>
  )
}
