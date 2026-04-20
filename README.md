# 📊 Dashboard Comercial — React + Node.js

> Dashboard analítico comercial construído do zero como alternativa ao Power BI, consumindo dados de um banco Firebird legado via API Node.js/Express.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?style=flat-square&logo=node.js)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-dark_theme-06B6D4?style=flat-square&logo=tailwindcss)

---

## ✨ Visão Geral

Este projeto nasceu de uma necessidade real: substituir o Power BI por uma solução web própria, com controle total sobre os dados, filtros e visualizações, sem custo de licença por usuário.

O resultado é um dashboard analítico completo com **4 módulos principais**, integrado diretamente a um banco Firebird legado via API REST.

---

## 🖥️ Módulos

### 1. Visão Geral (`/visao-geral`)
- 5 KPI cards: Faturamento, M², M³, Ticket Médio, Nº de Pedidos
- Gráfico de faturamento por período com **drill-down temporal** (ano → meses)
- Donut por grupo de produto
- Top Clientes, Top Materiais, Top Vendedores (barras horizontais)
- **Mapa interativo** (Leaflet) com faturamento por município/UF
- **Cross-filter** — clicar em qualquer gráfico filtra todos os outros em tempo real

### 2. Estoque (`/estoque`)
- Matriz hierárquica com drill-down por tipo de material (Chapa, Bloco, Faturamento)
- Expansão inline sem modal
- **Colunas sticky** para navegação horizontal
- Cross-filter por clique em linha

### 3. Buraco de Vendas (`/buraco-vendas`)
- Análise de descontinuidade de compras: quais clientes pararam de comprar determinado material
- Matriz Cliente × Mês com coluna sticky e campo adicional de contexto
- Matriz Material × Mês de estoque por faturamento
- Tabelas de Materiais Comprados, Chapa e Bloco

### 4. Simulador de Análise (`/simulador`)
- Cruzamento de estoque (blocos de material) com vendas realizadas
- Cálculo de custo real por bloco e material
- **Simulação de preço em tempo real** via slider de % de lucro (sem nova requisição)
- Comparativo entre preço calculado pelo sistema e preço necessário para atingir a meta

---

## 🛠️ Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Estado (UI) | Zustand |
| Estado (servidor) | TanStack Query (React Query) |
| Gráficos | Apache ECharts |
| Mapa | Leaflet + React-Leaflet |
| Estilo | Tailwind CSS (tema dark) |
| Backend | Node.js + Express 5 |
| Banco de dados | Firebird (legado) via node-firebird |
| Autenticação | JWT |
| HTTP client | Axios |

---

## ⚙️ Como Rodar

### Pré-requisitos
- Node.js 18+
- Banco Firebird acessível e configurado

### Backend (porta 3001)
```bash
cd back-end
npm install
# Configure o .env (veja .env.example)
npm run dev
```

### Frontend (porta 3000)
```bash
cd front-end
npm install
npm run dev
```
Acesse: [http://localhost:3000](http://localhost:3000)


> O Vite está configurado com proxy: todas as requisições `/api` são redirecionadas para `localhost:3001` automaticamente.

### Variáveis de Ambiente (back-end/.env)
```env
FB_HOST=localhost
FB_DATABASE=caminho/para/o/banco.fdb
FB_USER=SYSDBA
FB_PASSWORD=sua_senha
JWT_SECRET=seu_segredo_jwt
PORT=3001
```

---

## 🏗️ Estrutura de Pastas

```
front-end/src/
├── pages/           → OverviewPage, EstoquePage, BuracoVendasPage, SimuladorPage
├── components/
│   ├── charts/      → Todos os gráficos ECharts + Leaflet
│   ├── filters/     → FiltroBar, drawer mobile
│   ├── kpi/         → KPI cards
│   ├── layout/      → Sidebar, TopBar, DashboardLayout
│   └── ui/          → MultiSelect, Card, Skeleton, ErrorBoundary
├── hooks/           → useDashboardCombined, useDebouncedFiltros, useSimuladorData
├── store/           → filtros.store.ts, estoque.store.ts, buraco-vendas.store.ts, simulador.store.ts
└── services/        → api.ts, dashboard.service.ts, params-adapter.ts, estoque.service.ts

back-end/src/
├── server.js        → Entry point Express
├── db.js            → Pool de conexão Firebird
└── routes/
    ├── analytics.js      → Queries de faturamento
    ├── estoque.js        → Queries de estoque
    ├── buraco-vendas.js  → Queries de buraco de vendas
    ├── simulador.js      → Queries do simulador
    └── filtros.js        → Opções de filtros disponíveis
```

---

## 🔄 Fluxo de Dados

```
FiltroBar → Zustand Store → debounce 300ms
→ TanStack Query (cache invalidation)
→ GET /api/analytics/dashboard
→ Express → SQL Firebird
→ JSON response
→ Charts + KPIs re-render
```

---

## ⚠️ Dívidas Técnicas Conhecidas

| Criticidade | Item |
|-------------|------|
| 🔴 Alta | JWT armazenado em localStorage (risco XSS) — migrar para httpOnly cookies |
| 🔴 Alta | Credenciais no `.env` sem secrets manager |
| 🔴 Alta | Caminho absoluto do banco Firebird no `.env` |
| 🟡 Média | Normalização de case do Firebird espalhada em múltiplos pontos |
| 🟡 Média | CORS aberto (`origin: true`) — restringir em produção |
| 🟡 Média | Lógica de drill-down com 3 modos interdependentes sem state machine explícita |
| 🟢 Baixa | Sem suíte de testes automatizados |

---

## 📌 Decisões de Arquitetura

- **Zustand + TanStack Query separados**: Zustand gerencia estado de UI (filtros ativos, modo drill). TanStack Query gerencia cache e sincronização com a API. Responsabilidades distintas, código mais legível.
- **Debounce de 300ms**: Evita requisições a cada interação do usuário, reduzindo carga na API sem prejudicar a experiência.
- **Apache ECharts sobre Recharts**: Maior flexibilidade de configuração para drill-down temporal e gráficos customizados.
- **`params-adapter.ts` como camada de tradução**: Converte o estado do Zustand em query params da API. Ponto único de mapeamento front ↔ back.

*Projeto em desenvolvimento ativo. Contribuições e feedbacks são bem-vindos.*
