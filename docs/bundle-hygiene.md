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

## Before/After snapshot (local)
- Budgets: 200 KB default, 300 KB heavy (/stats, /timer) — PASSED locally
- Top client chunks (post-refactor):
  - 8562-ef430eacb1a9d4f1.js ~535 KB
  - 9094.faa6d2827596f3bc.js ~516 KB
  - 2977.3573439232e495e3.js ~446 KB (react-day-picker — deferred)
  - 9897-ecfcb5fee372677a.js ~341 KB
  - 7005-422cfbd861bc68fa.js ~251 KB (recharts — deferred)
- Per-route initial JS: within budgets (see CI artifact `bundle-budgets.txt` for precise bytes)
- Analyzer HTMLs available at `.next/analyze/{client,edge,nodejs}.html`

## Artifacts
- Analyzer HTML reports under `analyzer-artifacts/<timestamp>`
- Logs: typecheck.txt, imports-check.txt, build-analyze.txt, bundle-budgets.txt
- Optional appendix with metrics: see `docs/tmp_rovodev_bundle_metrics.md` (to be folded into PR notes)
