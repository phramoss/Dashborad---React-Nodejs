# Dashboard Comercial

Dashboard analítico em React, replicando tela Power BI com interações de cross-filter.

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS (design tokens no tailwind.config.js)
- Apache ECharts (echarts-for-react)
- TanStack Query v5
- Zustand v5

## Setup

```bash
npm install
npm run dev        # Dev com mock data
```

## Para conectar ao backend
```
VITE_USE_MOCK=false no .env.development
VITE_API_URL=http://localhost:3001
```

## Estrutura
```
src/
├── types/           # Tipos TypeScript do domínio
├── lib/             # Utilitários (formatação, cn)
├── services/        # Axios + camada de serviços
├── store/           # Zustand (filtros globais)
├── hooks/           # TanStack Query hooks
├── components/
│   ├── ui/          # Primitivos (Card, Badge, Skeleton...)
│   ├── charts/      # Gráficos ECharts
│   ├── kpi/         # KPI cards
│   ├── filters/     # Filtros interativos
│   └── layout/      # Sidebar, TopBar, Layout
└── pages/           # OverviewPage
```
