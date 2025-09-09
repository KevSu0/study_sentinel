# Bundle Hygiene: Lazy-load strategy & CI budgets

## What and Why
- Deferred heavy libraries (framer-motion, recharts, react-day-picker) away from the shared baseline.
- Scoped animations to lazy wrappers; charts via dynamic wrappers; calendar renders on open.
- Improves initial JS for non-heavy routes; keeps gains with CI budgets.

## How to use wrappers
- Animation (examples):
```tsx
import { LazyMotion, domAnimation, LazyMotionDiv } from '@/components/lazy/animation-components'

<LazyMotion features={domAnimation}>
  <LazyMotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
</LazyMotion>
```
- Charts (examples):
```tsx
import { LazyPieChart as PieChart, LazyPie as Pie, LazyResponsiveContainer as ResponsiveContainer } from '@/components/lazy/chart-components'

<ResponsiveContainer>
  <PieChart>
    <Pie data={data} dataKey="value" />
  </PieChart>
</ResponsiveContainer>
```
- Calendar:
```tsx
const LazyCalendar = dynamic(() => import('@/components/ui/calendar').then(m => m.Calendar), { ssr: false })
```

## CI budgets and guardrails
- Budgets: 200 KB default routes, 300 KB heavy (/stats, /timer)
- Env knobs: DEFAULT_ROUTE_BUDGET_KB, HEAVY_ROUTE_BUDGET_KB, HEAVY_ROUTES
- Guardrails: fail if heavy libs in shared (main/main-app/webpack) or if shared delta > 30 KB

## Dos / Don’ts
- Do use wrappers; don’t import `recharts`, `react-day-picker`, or `framer-motion` directly in feature code.
- Prefer named imports for tree-shakable libs.

## Fix CI failures
- Import violation: move to wrappers
- Budget violation: defer module, code-split, or mark route as heavy (HEAVY_ROUTES)
- Shared leak: move import inside lazy wrapper / conditional render

## Artifacts
- Analyzer HTML reports under `analyzer-artifacts/<timestamp>`
- Logs: typecheck.txt, imports-check.txt, build-analyze.txt, bundle-budgets.txt
