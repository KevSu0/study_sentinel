# CI Recovery Execution Plan

## Context
- Objective: Restore green CI within two working days without architectural changes.
- Drivers: React lint violations (product code) and Jest failures (stray Vitest import, stale selectors).
- DRIs: ESLint/product fixes — You; Tests & mocks — You; CI & pre-commit — You.
- Constraints: Product React lint rules remain enforced; exceptions limited to tests and worker code; Jest is sole runner; Node 22.15 on Ubuntu CI; up to five approved `data-testid` anchors; no snapshot tests; no copy changes expected this week.

## Task Breakdown

### 1. ESLint Policy & Overrides
- **Goal:** Scope strict rules to product code while relaxing tests/worker contexts.
- **Subtasks:**
  - Introduce ESLint overrides for `src/worker/**`, `**/__tests__/**`, and `**/*.test.*`.
  - Document rule posture in an ADR stub.
  - Dry-run `next lint` to capture true product errors.
- **Acceptance:** `npm run lint` surfaces only product-code violations; overrides prevent noise from tests/worker files.

### 2. Product Remediations
- **Goal:** Eliminate product lint violations without changing behavior.
- **Subtasks:**
  - Add `'use client'` where hooks/router APIs are used.
  - Add display names for exported components (including HOC/forwardRef outputs).
  - Escape JSX entities flagged by `react/no-unescaped-entities`.
  - Address `react-hooks/exhaustive-deps` via dependency additions, memoization, or scoped disables with rationale.
- **Acceptance:** `next lint` passes with zero errors; smoke tests (timer, tasks, routines) unaffected.

### 3. Runner Convergence (Jest Only)
- **Goal:** Remove Vitest usage causing runtime failure.
- **Subtasks:**
  - Replace Vitest imports in `zero-network-guarantee.test.tsx` with Jest equivalents.
  - Confirm no remaining Vitest references in tests or scripts.
- **Acceptance:** `npm test` launches without Vitest CJS errors.

### 4. Test Stabilization
- **Goal:** Repair failing suites with durable selectors and centralized mocks.
- **Subtasks:**
  - Update SyncPanel, PWA toast, and zero-network tests to role-first queries; add approved `data-testid`s.
  - Consolidate navigator/service-worker/notification mocks in `jest.setup.js`.
  - Replace brittle text assertions with state/role checks.
- **Acceptance:** Jest suite passes twice consecutively; no reliance on copy changes.

### 5. Pre-commit & CI Hardening
- **Goal:** Speed local feedback while locking CI to Node 22.15.
- **Subtasks:**
  - Configure `lint-staged` to run ESLint + `tsc --noEmit` on staged files.
  - Update Husky pre-commit hook to call lint-staged.
  - Pin CI to Node 22.15, reorder jobs (SW guard ? lint ? typecheck ? Jest ? build on main).
- **Acceptance:** Pre-commit finishes =5s on typical change; CI prints Node/OS and finishes =7m.

### 6. Governance & Documentation
- **Goal:** Capture policy and process for future contributors.
- **Subtasks:**
  - Publish ADR covering ESLint contexts and rule posture.
  - Extend testing guide with selector strategy, approved test IDs, and mocks list.
  - Update README with Jest-only runner, Node version, and quickstart steps.
- **Acceptance:** Docs merged with implementation PRs; evidence pack includes lint/test deltas and rationale for any rule suppressions.

## Milestones & Timeline
- **Day 1:** Complete tasks 1–3 and begin task 4.
- **Day 2:** Finish test stabilization, implement lint-staged + CI pinning, finalize documentation, and ensure CI green.

## Evidence Pack Checklist
- Before/after lint counts per rule.
- Test run outputs (PR + main) with timing.
- CI logs showing Node/OS version pin.
- Inventory of `'use client'` additions and any `eslint-disable` comments (with rationale).
- List of deployed `data-testid`s.
- Links to ADR and testing guide updates.
