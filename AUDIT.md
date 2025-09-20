# Study Sentinel - Full Codebase Audit

Date: 2025-09-17

## Executive Summary

- Multiple concrete 404 sources exist today (assets and endpoints).
- Key asset issues: broken/missing fonts, incorrect notification icon paths, Windows tile icon references to non-existent files, and committed, stale service worker artifacts.
- App issues likely masked by "optimistic UI" and catch blocks, but network logs will show 404s and background sync won't work as intended.
- PWA/Service Worker config has cache cleanup bugs that can leave stale assets indefinitely.

## Critical Issues (Prioritized)

1) Missing API routes cause 404s throughout the app
- No Next.js API handlers exist under `src/app/api`; yet many code paths call `/api/*`.
  - Examples:
    - `src/hooks/use-global-state.tsx:477` `fetch('/api/tasks', { method: 'POST', ... })`
    - `src/hooks/use-global-state.tsx:514` `fetch(`/api/tasks/${updatedTask.id}`, { method: 'PUT', ... })`
    - `src/hooks/use-global-state.tsx:554` `fetch(`/api/tasks/${taskId}/archive`, { method: 'POST' })`
    - `src/hooks/use-global-state.tsx:595` `fetch(`/api/tasks/${taskId}/unarchive`, { method: 'POST' })`
    - `src/hooks/use-global-state.tsx:846` `fetch('/api/routines', { method: 'POST', ... })`
    - `src/lib/sync-quotas.ts:351` `fetch('/api/sync/uplink', ...)`
    - `src/lib/ios-network-validator.ts:781` checks `['/api/health', '/manifest.json', '/sw.js']`
    - `src/lib/notifications.ts:141` subscribes via `/api/notifications/subscribe`
- Consequences:
  - Runtime 404 responses for regular app usage (task/routine operations, sync, notifications).
  - "Background sync" not triggered for 404s (requests succeeded at HTTP level but return 404; Workbox BackgroundSync only queues on network failures).
- Recommendation:
  - Implement minimal API route stubs under `src/app/api/**/route.ts` (Next.js App Router) for all referenced endpoints, or remove/replace the network calls with local persistence paths. Ensure client code checks `response.ok` before parsing JSON.

2) Broken/missing fonts (multiple 404s and bad cache)
- `src/app/fonts.css:7` references `'/fonts/inter-v12-latin-300.woff2'` which does not exist in `public/fonts` -> 404.
- The following "woff2" files in `public/fonts` are actually HTML 404 pages checked in as binary font assets:
  - `public/fonts/inter-v12-latin-500.woff2:5` contains an HTML "Error 404" page.
  - `public/fonts/inter-v12-latin-600.woff2:5` contains an HTML "Error 404" page.
  - `public/fonts/inter-v12-latin-700.woff2:5` contains an HTML "Error 404" page.
- `public/fonts/inter-v12-latin-regular.woff2` appears valid.
- Consequences:
  - Font loads fail or "succeed" with garbage content, depending on server headers. SW may cache these as 200 OK assets, making the problem sticky offline.
- Recommendation:
  - Replace the corrupt font files with correct WOFF2 binaries and either add the missing weight 300 or remove that @font-face. Consider `next/font` for robust, self-hosted fonts.

3) Stale service worker artifacts committed to `public/`
- Files: `public/sw.js`, `public/worker-*.js`, `public/workbox-*.js` are build outputs with hashed chunk names.
  - Example: `public/sw.js:1` precaches many `/_next/static/chunks/...` URLs baked from a past build.
- Consequences:
  - After a fresh build or deployment, the committed SW may precache non-existent files -> 404s and broken offline.
  - SW might import `worker-*.js` by a stale hash.
- Recommendation:
  - Do not commit generated SW artifacts. Add them to `.gitignore`. Let `next-pwa` generate SW at build. Ensure deploys serve the SW that matches the current build.

4) Cache cleanup bug in the custom service worker
- In `src/worker/index.ts:318` the `activate` handler attempts to delete caches by prefix:
  - Uses `startsWith('evergreen-')`, `startsWith('static-')`, etc.
  - Actual cache names are `evergreen-assets`, `static-assets`, `publicity-assets`, `audio-assets`, `api-data`.
- Consequences:
  - Old caches won't be removed (prefixes don't match) -> stale or wrong assets may persist, producing confusing behavior or 404s.
- Recommendation:
  - Align cleanup logic with real `cacheName`s or standardize cache name prefixes.

5) Notification icon paths are wrong
- `src/lib/notifications.ts:82` sets `icon: '/icon.png', badge: '/badge.png'` but those files don't exist at the project root.
  - Available files are under `public/icons/` (e.g., `public/icons/icon.png`, `public/icons/badge.png`).
- Consequences:
  - Notification icon requests 404.
- Recommendation:
  - Point to `/icons/icon.png` and `/icons/badge.png` (or provide root-level copies).

6) Windows tile icon references that don't exist
- `public/icons/browserconfig.xml:5` -> `/icons/icon-70x70.png`
- `public/icons/browserconfig.xml:6` -> `/icons/icon-150x150.png`
- `public/icons/browserconfig.xml:7` -> `/icons/icon-310x310.png`
- These sizes are not present in `public/icons`.
- Consequences:
  - Windows tile metadata can trigger 404s when used.
- Recommendation:
  - Either add the referenced sizes or update `browserconfig.xml` to point at existing icon sizes.

7) Offline assets and copy show encoding artifacts
- `public/offline.html:62` uses a garbled glyph in `content:` and `public/offline.html:91` shows the corrupted string `dY"s`.
- `src/components/pwa/update-notification.tsx:23` toast icons also contain garbled characters.
- Consequences:
  - Unpolished UX; potential rendering issues.
- Recommendation:
  - Clean up text/emoji encoding in these assets/components.

## Other Observations / Risks

- No custom 404 page: There's no `src/app/not-found.tsx`. Not required, but adding one improves UX and can help debug routing issues.
- Next config non-standard option: `next.config.ts:16` includes `allowedDevOrigins` which is not a standard Next.js option and is likely ignored.
- `next-pwa` compatibility: Using Next `15.3.3` with `next-pwa@5.6.0` may be brittle. Validate plugin behavior with Next 15.
- App_router/client-boundaries: Client pages that use `useRouter` are correctly marked `'use client'` (e.g., `src/app/timer/page.tsx:2`, `src/app/tasks/page.tsx:1`).
- TypeScript laxness: `tsconfig.json` sets `strict: false` and uses many `any` types across code. Not a 404 source, but increases risk of runtime surprises.

## Concrete 404 Sources (Checklist)

- API endpoints missing (see Critical Issue #1).
- Fonts
  - Missing: `/fonts/inter-v12-latin-300.woff2` (referenced by `src/app/fonts.css:7`).
  - Corrupt assets: `public/fonts/inter-v12-latin-500.woff2`, `-600.woff2`, `-700.woff2` (contain HTML 404).
- Notifications icons
  - Wrong paths: `src/lib/notifications.ts:82` -> `/icon.png` and `/badge.png` (should be under `/icons/`).
- Windows tile icons
  - `public/icons/browserconfig.xml:5-7` reference non-existent sizes.
- Stale SW artifacts
  - Committed `public/sw.js` precaches stale chunk URLs (may cause 404s after rebuilds/redeploys).

## Strategic Roadmap (low-risk path)

Work in two tracks that build on each other:

**Track 1 - PWA & Asset Hygiene (Angle C)**
- Make `src/worker/index.ts` the only service worker source; delete committed build artefacts and add them to `.gitignore`.
- Fix cache naming/cleanup so `activate` removes every pre-v1 cache and bump `CACHE_VERSION` for the rollout.
- Refresh corrupted assets: replace bad Inter font binaries, remove unused weights if design approves, correct notification icon paths, and either generate or drop Windows tile sizes.
- Clean copy/encoding issues in `public/offline.html` and `src/components/pwa/update-notification.tsx` so fallbacks render cleanly.
- Document the update policy (skip-waiting + manual refresh prompt) and publish cache/version conventions in an ADR.
- Add a service-worker kill switch (message handler that purges allow-listed caches) and include invocation steps in the runbook.
- Automate an asset integrity preflight that asserts fonts/icons/manifest files exist with correct MIME types before release.
- Audit SW scope/headers: ensure the worker is served from `/` (add `Service-Worker-Allowed: /` if needed) and verify immutable cache headers for hashed assets.
- Prove build/deploy alignment by checking that the deployed `_next/static/**` hashes match the SW precache manifest before release.
- Set cache budgets (e.g., <= 60 MB across tiers) and surface total usage in diagnostics.

**Track 2 - Local-First Hardening (Angle A)**
- Remove or feature-flag every `/api/*` call that touches local data. Use Dexie/localStorage directly and surface "sync unavailable" messaging where needed.
- Hide or disable push-notification UI until a backend exists; keep VAPID config in env for future work.
- Introduce a "zero 404s" acceptance gate: core journeys (timer, tasks, routines, dashboard, archive) must complete with a clean Network tab after caches settle.
- Automate the zero-404 crawl (Playwright/Lighthouse or similar) and wire it into CI as a blocking check before release (with whitelist for intentional `/not-found`).
- Add a lightweight diagnostics readout that shows SW version, cache keys, build SHA, flag states, last SW update time, and current cache footprint to aid support.
- Publish the "local-only" posture in docs and in-app messaging (no cloud sync, no push) and list upcoming network features for transparency; reference privacy copy stating data stays on-device.
- Add baseline CSP and Permission-Policy headers that block notifications/AI origins until backend work begins.

**Optional bridge - Thin Server Stubs (Angle B)**
- If partners require network shapes, add no-op Next.js route handlers that return 200/empty payloads and guard them behind a feature flag.

**Future programme - Real Sync & Push (Angle D)**
- Treat full uplink/downlink, auth, consent, and push delivery as a separate scoped project once ownership, contracts, and release process are defined.

## Immediate Execution Plan (first 48 hours)

1. Freeze the service worker contract: remove generated artefacts, bump cache version, publish ADR on naming/prefixes, and ensure teardown of stale caches passes QA.
2. Repair assets: swap in valid Inter fonts (or adopt `next/font`), fix icon paths, resolve Windows tile references, ensure correct MIME types, and strip garbled glyphs from offline UI/toasts.
3. Enforce the "no 404" gate: add CI/QA checklist plus automated crawl (fresh install, post-activate, offline) that fails releases if core journeys trigger any 404 after cache warm-up.
4. Feature-flag network features: default sync/push flags to false, wire UI states to reflect "coming soon" or "offline-only", and document local-only posture.
5. Health visibility: expose SW version/cache list via diagnostics panel, surface cache footprint and adoption metrics, and draft the `/api/health` contract (even if implemented later).
6. Headers & policies: verify `Service-Worker-Allowed: /`, baseline CSP, and Permission-Policy disabling notifications until backend support exists.
7. Canary plan: define 10% (or internal) canary rollout and success metrics prior to full release.

## Go/No-Go Criteria (Angle B reinforcement)

**Preflight checks**
- Single service worker verification: only `src/worker/index.ts` is registered, `public/sw.js` artefacts absent, and scope covers `/` without hosting rewrites (`Service-Worker-Allowed: /` confirmed).
- Asset integrity report passes (fonts/icons/manifest present with correct MIME types) and Windows tile decision documented.
- Automated zero-404 crawl passes for clean install, post-activate reload, and offline navigation; intentional `/not-found` route excluded and confirmed to return 404 with custom page.
- Manual cross-browser matrix (Chrome, Edge, Firefox, Safari desktop; iOS/iPadOS Safari; Android Chrome) completes with no 404s or cache mismatches; iOS/Safari versions noted in report.

**Regression safeguards**
- CI guard blocks commits containing generated SW artefacts or failing asset preflight/zero-404 jobs.
- Diagnostics panel surfaces build SHA, SW version, cache prefixes, flag states, cache footprint, and last SW update timestamp.
- Service-worker kill switch documented and validated (QA sends `CLEAR_CACHE` message and observes caches reset within session).
- Build/deploy alignment check passes (SW precache hashes match deployed `_next/static/**`).

**Rollback readiness**
- Runbook defines how to redeploy previous build, bump cache prefix back, route traffic to N-1, and trigger kill switch; owners and paging path listed.
- Canary rollout documented (e.g., 10% traffic or internal allowlist) with success criteria before full release.
- Feature flags for sync/push default OFF with approval matrix for enabling.

**Observability and comms**
- Metrics/logging (or periodic diagnostics ping) capture SW version adoption to confirm >= 90% clients on latest SW within 24 hours and cache footprint within budget.
- In-app copy and docs state "local-only" posture, data residency, and upcoming capabilities; consent/privacy review signed off; privacy/backup text updated.
- Release artefacts archived: asset preflight report, zero-404 crawl logs/HARs, cache inventory before/after activate, SW adoption chart.

Go only when every line above is green; otherwise hold release and fix gaps.


## Success Metrics

**Leading indicators**
- Zero 404s for timer, task CRUD, routines, dashboard, archive after a clean install/activate.
- Post-activate cache inventory shows only the current prefix set; legacy caches purged within one activation cycle.
- Service worker update completes (install -> activate) within five seconds once the app regains focus after deploy.
- >= 90% of active clients report the latest SW version via diagnostics ping within 24 hours of rollout.
- Cache footprint stays <= 60 MB across tiers, reported via diagnostics.
- Custom 404 route returns 404 with branded page; intentional `/not-found` whitelisted in crawls.
- Notification UI either hidden or explicitly marks push as unavailable until backend support lands.

**Lagging indicators**
- Offline task/routine completion success rate >= 99% across the device/browser matrix.
- Crash-free sessions >= 99.9% after rollout.
- Support tickets for "broken/offline assets" trend to zero for 30 days post-release.
- No increase in SW-related errors (failed fetch, unhandled rejection) during rollout window.
- When sync is revisited, time-to-first-sync after reconnect p50 < 10 s, p95 < 30 s.

## Validation & Follow-up

- Run `npm run build` to regenerate the worker; verify no generated files remain committed and hashes align with deployed `_next/static` assets.
- Execute the automated zero-404 crawl (clean install, post-activate reload, offline shell) and archive results as part of the release checklist.
- Manually exercise the cross-browser matrix (with emphasis on Safari/iOS) to confirm cache cleanup, offline fallbacks, and absence of ghost API calls.
- Use the zero-network script plus manual toggling to confirm sync/push flags prevent unwanted network requests and that the SW kill switch clears caches on demand.
- Add automated guard (lint or CI hook) that fails if `public/sw.js` or other generated artefacts have diffs or if the asset preflight reports missing files.

## Notes & Dependencies

- Confirm with product whether Windows Start tiles are required; if not, delete `browserconfig.xml` to avoid dangling references.
- Assign DRIs for service worker ownership, assets/icons, release sign-off, and any eventual backend/API work; record names (and backups) in the go/no-go checklist.
- Keep Firebase env vars documented (`src/lib/firebase.ts:5-10`) even though the backend is dormant; the hosting target remains Firebase App Hosting (`apphosting.yaml`).
- Align future documentation under `/docs` with a short ADR index covering: SW scope/headers, cache budgets & kill switch, zero-404 gate, local-only posture, canary rollout policy, rollback choreography, and CSP/Permission-Policy decisions.
- Update export/backup copy (and privacy statements) to state explicitly that data stays on-device until sync is introduced, and capture consent/privacy review sign-off.
- Confirm ability to run a canary (10% or internal allowlist) on Firebase Hosting; document fallback if not possible.

Let me know when you want me to start executing Track 1 and Track 2 tasks or draft the supporting ADRs.

