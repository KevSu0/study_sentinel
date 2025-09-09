# Bundle Hygiene: Lazy-load strategy & CI budgets

TL;DR
- Scoped motion to lazy wrappers; deferred charts and calendar
- CI budgets enforced: 200 KB (default), 300 KB (heavy: /stats, /timer)
- Shared-chunk guardrails: fail if heavy libs in main/shared; shared delta > 30 KB fails

Before/After (attach artifacts from analyzer-artifacts)
- Top chunks summary
- Per-route initial JS summary

Checklist
- [ ] No direct imports of `recharts` / `react-day-picker` / `framer-motion` (lazy wrappers only)
- [ ] Routes meet budgets (200 KB default / 300 KB heavy) or have justification
- [ ] No heavy libs in shared chunks; shared delta ≤ 30 KB
- [ ] Timer/Stats visual QA (animations, charts, calendar) pass

Docs
- Confluence: Bundle Hygiene — Lazy-load strategy & CI budgets (link)

Notes
- Budgets adjustable via env: DEFAULT_ROUTE_BUDGET_KB, HEAVY_ROUTE_BUDGET_KB, HEAVY_ROUTES
