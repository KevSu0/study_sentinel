# ADR-004: Lint and Testing Selector Policy

## Status
Accepted – 2025-09-17

## Context
We refactored the PWA and sync suites to run against real hooks and surfaces. To keep future tests consistent and maintainable we need an explicit policy for selector hierarchy, limited data-testid usage, and how we justify 
eact-hooks/exhaustive-deps exceptions.

## Decision
- Prefer ARIA roles and accessible names when querying DOM elements. Fallback to a single, well-named data-testid per surface only when no accessible hook exists.
- Centralise browser/platform mocks (service worker bus, navigator stubs, performance observers) in jest.setup.js and the new src/test/mocks/sync-fixtures.ts module.
- eslint warnings from 
eact-hooks/exhaustive-deps must be resolved via useMemo/useCallback or explicit dependency lists. Scoped disables require a one-line comment explaining why the dependency cannot be added and a follow-up ticket reference.
- Pre-commit runs lint-staged to execute ESLint and related Jest checks on staged files so regressions are caught before CI.

## Consequences
- New suites should mirror the updated harness patterns and avoid brittle text-based selectors.
- All contributors have a single reference for when a data-testid is acceptable and how to document intentional hook disables.
- CI and git hooks rely on this policy; deviations should trigger ADR updates.

## Enforcement Addendum: No-Ghost-Network
- Policy: remote_apis=false by default in dev and CI. Remote behavior is opt-in per test suite.
- Static scanner: scripts/check-remote-api-literals.js performs a fail-fast scan for string and template literals containing '/api/'.
- Scope: First-party sources {src,scripts}/**/*.{ts,tsx,js,jsx} and jest.setup.js. Excludes node_modules, build artifacts, and public assets.
- Allowlist: scripts/remote-api-allowlist.json with exact, prefix, and contains affordances. Vetted safe zones include the remote API gate/paths, src/test/**, and scripts/**.
- CI order: SW artifact check -> remote API scan -> ESLint -> typecheck -> Jest. CI sets NEXT_PUBLIC_ENABLE_REMOTE_APIS=false.
- Developer hooks: lint-staged runs the scanner for staged files. Requests to expand the allowlist must include rationale in PR review.

