# Study Sentinel Discovery Q&A

Current as of 2025-09-17. Each response includes supporting evidence (when available) and a confidence rating.

## A. Product & Scope

1. **Critical user journeys to keep functional offline/online?**  
   **Answer:** Inferred top five journeys: (1) start/complete timer sessions (`src/app/timer/page.tsx:1`), (2) create/edit tasks (`documentation/user_flow.md:44`), (3) log/complete routines (`documentation/user_flow.md:67`), (4) review dashboard/stats (`src/app/page.tsx` + `docs/cross-browser-validation-report.md:1`), and (5) archive/unarchive tasks (`src/app/archive/page.tsx:1`). These flows appear central to the IA and zero-network guarantees.  
   **Confidence:** Medium (product documentation is descriptive but not prioritised).

2. **Minimum offline guarantees per journey?**  
   **Answer:** Tasks, routines, timer, and logs are designed for read/write offline use with optimistic updates (`src/hooks/use-global-state.tsx:227` onwards). Stats aim to show cached rollups when offline (`src/lib/database.ts:118`), while AI chat/briefing are explicitly gated by offline fallbacks (`src/components/pwa/offline-gate.tsx`). No documented staleness SLA; assumed "eventual sync" on reconnect.  
   **Confidence:** Low (no explicit SLA; derived from code behaviour).

3. **Supported platforms/browsers?**  
   **Answer:** Validation matrix covers Android Chrome, Desktop Chrome, Edge, Firefox, Safari (desktop + iOS/iPadOS) with noted Safari gaps (`docs/cross-browser-validation-report.md:5`). Target expectation seems "works everywhere, degraded on Safari".  
   **Confidence:** Medium.

4. **Do we need Windows tiles (`browserconfig.xml`)?**  
   **Answer:** No hard requirement documented; current references in `public/icons/browserconfig.xml:5` point to missing assets. Likely optional branding artifact. Recommend confirming with product before removal.  
   **Confidence:** Low.

5. **Expected UX when API unavailable?**  
   **Answer:** Present code relies on optimistic local mutations and logs console errors on failure (`src/hooks/use-global-state.tsx:505`). No user-facing error surface apart from offline gating for AI. Likely intention: silent queue with later sync.  
   **Confidence:** Low.

## B. API Surface & Data Contracts

6. **Canonical store for `/api/tasks` and routines?**  
   **Answer:** All task/routine persistence is currently client-side via localStorage and Dexie event sourcing (`src/hooks/use-global-state.tsx:207`, `src/lib/database.ts:15`). No live backend; "ghost" API documented (`docs/network-disposition-table.md:10`).  
   **Confidence:** High.

7. **Auth model for API routes?**  
   **Answer:** None implemented. There is no authentication layer or token handling in the frontend or docs. Any future API will need a design from scratch.  
   **Confidence:** High.

8. **Required response contracts?**  
   **Answer:** Frontend expects JSON bodies matching `StudyTask`/`Routine` types (`src/lib/types.ts:8`). Calls assume `response.ok` and parse JSON arrays/objects with IDs generated server-side. No error schema defined.  
   **Confidence:** Medium.

9. **`/api/sync/uplink` expectations?**  
   **Answer:** Sync engine posts events with `{eventId,eventType,payload,timestamp}` and expects 200 OK; download path expects JSON array of events and uses last event ID for checkpointing (`src/lib/sync-engine.ts:123`). Conflict resolution strategy unspecified.  
   **Confidence:** Medium.

10. **`/api/notifications/subscribe` semantics?**  
    **Answer:** Uses standard Web Push VAPID payload; posts raw `PushSubscription` JSON to the endpoint (`src/lib/notifications.ts:140`). Assumes server echoes 2xx without returning data.  
    **Confidence:** Medium.

11. **`/api/health` should verify what?**  
    **Answer:** Not defined. Validator merely fetches the endpoint to confirm reachability (`src/lib/ios-network-validator.ts:181`). Recommended scope: SW status, build SHA, essential env checks.  
    **Confidence:** Low.

12. **Any `/api/*` placeholders to deprecate?**  
    **Answer:** Network disposition doc labels task/routine endpoints as "LOCALIZE" and sync/notification endpoints as feature-flagged (`docs/network-disposition-table.md:52`). No intentional placeholders; unused endpoints should be removed or implemented.  
    **Confidence:** Medium.

## C. Service Worker Strategy

13. **Single SW source of truth?**  
    **Answer:** Intended source is `src/worker/index.ts` bundled by `next-pwa` (`next.config.ts:3`). However, stale build artifacts (`public/sw.js`, `public/worker-*.js`) are checked in, causing dual sources. Need to treat generated files as build outputs only.  
    **Confidence:** High.

14. **Caching strategies per route?**  
    **Answer:** Custom worker defines CacheFirst for fonts/icons (`src/worker/index.ts:108`), NetworkFirst for navigation pages (`src/worker/index.ts:247`), CacheFirst for scripts/styles/images, and StaleWhileRevalidate for publicity/assets tiers. AI routes use online-only with offline fallback.  
    **Confidence:** High.

15. **Background Sync scope?**  
    **Answer:** Workbox `BackgroundSyncPlugin` queues failed `POST/PUT/DELETE` to `/api/*` (`src/worker/index.ts:284`). Note: 404s aren’t retried—only network failures trigger queueing.  
    **Confidence:** High.

16. **Offline fallback for navigation?**  
    **Answer:** Generic navigations use NetworkFirst cache. AI-heavy routes (`/briefing`, `/chat`) fall back to cached `/offline.html` (`src/worker/index.ts:258`). No global offline shell beyond cached pages.  
    **Confidence:** Medium.

17. **Cache naming scheme?**  
    **Answer:** Cache tier constants (`CACHE_TIER`) use names like `evergreen-assets`, `static-assets`, `publicity-assets`, `audio-assets`, `api-data` (`src/worker/index.ts:23`). Cleanup currently mismatched (looks for prefixes without `-assets`).  
    **Confidence:** High.

18. **SW update policy?**  
    **Answer:** Worker calls `skipWaiting()`/`clients.claim()`; UI surfaces updates via `PWAUpdateNotification` with manual refresh prompt (`src/components/pwa/update-notification.tsx:10`). Update drills script enforces version bumps (`scripts/sw-update-drills.js:7`).  
    **Confidence:** High.

19. **Constraints removing committed SW artefacts?**  
    **Answer:** None observed—artefacts are vestigial. Removing them aligns with best practice and avoids cache mismatch. Add to `.gitignore`.  
    **Confidence:** High.

## D. Fonts & Icons

20. **Font source of truth?**  
    **Answer:** Self-hosted Inter weights defined in `src/app/fonts.css:1` pointing to files under `public/fonts/`. Several binaries are corrupted 404 placeholders (`public/fonts/inter-v12-latin-500.woff2`). Consider swapping to `next/font`.  
    **Confidence:** High.

21. **Weights actually needed?**  
    **Answer:** Stylesheet declares 300–700; design tokens (tailwind classes) mostly use `font-medium`, `font-bold`, implying 500/700 are necessary. 300 weight may be unused; confirm with design before pruning.  
    **Confidence:** Medium.

22. **Licensing/branding constraints?**  
    **Answer:** Inter and JetBrains Mono are open-source (SIL/OFL). No bespoke licensing seen.  
    **Confidence:** Medium.

23. **PWA icon requirements?**  
    **Answer:** Manifest lists standard sizes with maskable variants (`public/manifest.json:31`). Icons exist under `public/icons/`, but ensure maskable assets respect safe zone.  
    **Confidence:** High.

24. **Keep Windows tile support?**  
    **Answer:** Only `browserconfig.xml` references it; files missing. If Windows tiles aren’t a priority, safe to remove file or generate required 70/150/310 assets.  
    **Confidence:** Low.

25. **Notification icon style requirements?**  
    **Answer:** Scheduler references coloured PNGs (`src/lib/notifications.ts:187`). No monochrome/brand guidance documented—likely flexible but ensure transparent background for Android badges.  
    **Confidence:** Low.

## E. Notifications

26. **Provider?**  
    **Answer:** Generic Web Push using VAPID (`src/lib/notifications.ts:45`), not FCM. Requires VAPID public key (`process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY`).  
    **Confidence:** High.

27. **Permission flow?**  
    **Answer:** Simple prompt when subscribe is invoked; no staged education (`src/lib/notifications.ts:27`). Retries rely on caller re-invoking.  
    **Confidence:** Medium.

28. **Subscription scope?**  
    **Answer:** One subscription per browser profile saved to backend (not implemented). No topic/channel semantics beyond local scheduler toggles.  
    **Confidence:** Low.

29. **Payload requirements?**  
    **Answer:** Local notifications use `{title, body, icon:'/icon.png', badge:'/badge.png'}` with click-to-focus (`src/lib/notifications.ts:94`). Remote payload contract undefined; assume same fields.  
    **Confidence:** Low.

30. **QA plan for push (iOS vs Android)?**  
    **Answer:** Not documented. Cross-browser report marks notifications as 0% validated (`docs/cross-browser-validation-report.md:35`). Need test plan.  
    **Confidence:** Low.

## F. Hosting, Deploy & Runtime

31. **Hosting/CDN?**  
    **Answer:** Repository includes `apphosting.yaml` targeting Firebase App Hosting (`apphosting.yaml:1`). No CDN config noted besides Firebase defaults.  
    **Confidence:** Medium.

32. **Build artifact guarantees?**  
    **Answer:** No automation tying SW build to deployed `_next/static` hashes; manual commits of generated SW risk drift (`public/sw.js:1`). Need to regenerate during CI deploy.  
    **Confidence:** High.

33. **Headers/caching today?**  
    **Answer:** `next.config.ts:32` sets security headers only. No custom `Cache-Control` or `Service-Worker-Allowed` header. Expect Firebase defaults (immutable for `/static`).  
    **Confidence:** Medium.

34. **Environments & promotion?**  
    **Answer:** Docs reference dev/staging/production conceptually (`docs/migration-rollback-plan.md:25`), but no concrete pipeline, branch strategy, or promotion roles recorded.  
    **Confidence:** Low.

35. **Rollback mechanism?**  
    **Answer:** Migration plan outlines feature-flag and script-based rollback tiers (`docs/migration-rollback-plan.md:58`). Works for storage rollout; deploy rollback process still undefined.  
    **Confidence:** Medium.

36. **Error tracking/RUM?**  
    **Answer:** No integrations (no Sentry/Analytics references). Diagnostics rely on in-app panel (`src/components/diagnostics-panel.tsx`).  
    **Confidence:** High.

## G. Data, Auth & Privacy

37. **PII in tasks/routines?**  
    **Answer:** Tasks/routines themselves appear non-PII, but `UserProfile` stores name, contact, aspirations (`src/lib/types.ts:43`). Backups/export include entire dataset (`src/lib/sync-engine.ts:335`). Need policy.  
    **Confidence:** Medium.

38. **AuthN/AuthZ flow?**  
    **Answer:** None implemented; app currently single-user local experience. Any backend introduction must add auth.  
    **Confidence:** High.

39. **Regional data constraints?**  
    **Answer:** Not specified anywhere. Assume none yet.  
    **Confidence:** Low.

40. **Consent handling?**  
    **Answer:** No consent flows beyond browser permission prompts. Feature flag plan mentions future consent system (`docs/final-acceptance-pack.md:138`).  
    **Confidence:** Low.

## H. Testing & Validation

41. **Device/browser matrix?**  
    **Answer:** Documented in validation report (Chrome desktop/mobile fully pass; Edge, Firefox, Safari partial) (`docs/cross-browser-validation-report.md:5`).  
    **Confidence:** High.

42. **"No-404" acceptance criteria?**  
    **Answer:** Not formalised; audit notes 404s for fonts/icons/APIs. Recommend adopting "zero 404s in Network tab for core journeys" as acceptance gate.  
    **Confidence:** Low.

43. **Background Sync test scenarios?**  
    **Answer:** Zero-network script enforces blocking/allow rules (`scripts/test-zero-network.js:13`). No automated flaky-network scenarios yet—would need manual/Playwright coverage.  
    **Confidence:** Medium.

44. **SW lifecycle verification?**  
    **Answer:** `scripts/sw-update-drills.js:7` simulates version bumps, activation, cache cleanup. UI update banner also part of manual checks.  
    **Confidence:** High.

45. **E2E tests allowed to unregister SW?**  
    **Answer:** Not addressed. Current Jest setup runs in Node (no SW). Need guidance before adding browser E2E automation.  
    **Confidence:** Low.

## I. Governance & Ownership

46. **DRIs for API/SW/release?**  
    **Answer:** No ownership metadata in repo.  
    **Confidence:** Low.

47. **Reviewers required for SW changes?**  
    **Answer:** Not defined; assume standard code review only.  
    **Confidence:** Low.

48. **Incident response for PWA failures?**  
    **Answer:** Not documented. Should establish escalation path.  
    **Confidence:** Low.

49. **Documentation home / ADR needs?**  
    **Answer:** Extensive docs under `/docs` and `/documentation`, but no ADR index. Recommend adding ADR for SW/cache decisions.  
    **Confidence:** Medium.

## J. Performance & UX (Nice-to-Know)

50. **Performance budgets?**  
    **Answer:** Network disposition sets informal goals (offline cold start ≤2s, FMP ≤1.2s) (`docs/network-disposition-table.md:120`). No enforcement tooling.  
    **Confidence:** Medium.

51. **Tolerance for stale content?**  
    **Answer:** Cache tiers imply willingness to serve cached pages for 24h and API data for 6h (`src/worker/index.ts:49`). No explicit UX commitment documented.  
    **Confidence:** Low.

52. **Localization/RTL impacts?**  
    **Answer:** No localisation or RTL handling mentioned; fonts limited to Latin subset (`src/app/fonts.css:6`).  
    **Confidence:** Medium.

## K. Architecture Choices

53. **Plan to replace `next-pwa`?**  
    **Answer:** No alternative noted; roadmap assumes continuing with `next-pwa` + custom worker (`docs/next-config-optimization-plan.md` references plugin).  
    **Confidence:** Low (document not definitive).

54. **Long-term API location?**  
    **Answer:** Docs hint at future sync uplink via feature flags (likely Next.js routes or Firebase Functions) but no concrete decision.  
    **Confidence:** Low.

## L. Developer Experience

55. **CI guard against committing generated SW?**  
    **Answer:** Absent. Need lint/husky hook or CI check to prevent `public/sw.js` diffs.  
    **Confidence:** High.

56. **"404 budget" in CI?**  
    **Answer:** None. Could integrate Lighthouse/Playwright crawl to catch missing assets.  
    **Confidence:** High.

57. **Diagnostics page preference?**  
    **Answer:** Diagnostics panel already exists (`src/components/diagnostics-panel.tsx:1`). Additional health page not defined but likely welcome.  
    **Confidence:** Medium.

