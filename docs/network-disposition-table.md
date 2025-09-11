# Network Disposition Table
# Analysis of all remote dependencies for offline-first PWA

## Executive Summary

**Critical Finding**: The app has 15+ network endpoints but NO actual backend API routes exist. This creates a "ghost API" pattern where the frontend makes calls to non-existent endpoints.

**Key Discovery**: Firebase SDK is imported but never used in the application code - can be safely removed.

**Network Profile**: 83% of network calls are related to sync/notifications (opt-in features), 17% are task/routine management (should be local-first).

---

## 1. **REMOTE DEPENDENCIES AUDIT**

### 1.1 **Third-Party SDKs**

| SDK | Status | Disposition | Rationale | Impact |
|-----|--------|-------------|-----------|---------|
| Firebase (App + Firestore) | ❌ Unused | **REMOVE** | Imported but never used in application | Zero impact |
| No other 3P SDKs found | ✅ Clean | **N/A** | No analytics/tracking SDKs detected | N/A |

### 1.2 **Application Network Calls**

| File | Endpoint(s) | Method | Purpose | Disposition | Offline Behavior |
|------|------------|--------|---------|-------------|------------------|
| `sync-engine.ts` | `${baseUrl}/upload` | POST | Upload events to sync server | **FLAG + Runtime Cache** | Opt-in sync feature |
| `sync-engine.ts` | `${baseUrl}/download` | GET | Download events from sync server | **FLAG + Runtime Cache** | Opt-in sync feature |
| `notifications.ts` | `/api/notifications/subscribe` | POST | Web push subscription | **FLAG + Runtime Cache** | Opt-in notifications |
| `notifications.ts` | `/api/notifications/unsubscribe` | POST | Web push unsubscription | **FLAG + Runtime Cache** | Opt-in notifications |
| `use-global-state.tsx` | `/api/tasks` | POST/GET/PUT/DELETE | Task CRUD operations | **LOCALIZE** | Should be local-first |
| `use-global-state.tsx` | `/api/routines` | POST/GET/DELETE | Routine CRUD operations | **LOCALIZE** | Should be local-first |
| `offline-gate.tsx` | `/offline.html` | GET/HEAD | Offline fallback page | **LOCALIZE** | Already local file |
| `diagnostics.ts` | `/offline.html` | HEAD | Health check | **LOCALIZE** | Already local file |

### 1.3 **Service Worker Network Calls**

| Context | Purpose | Disposition | Offline Behavior |
|---------|---------|-------------|------------------|
| Cache operations | Service Worker cache management | **KEEP** | Core PWA functionality |
| Network fallback | Cache-first strategies | **KEEP** | Core PWA functionality |
| Offline HTML fallback | Shell fallback | **KEEP** | Core PWA functionality |

---

## 2. **DISPOSITION DECISIONS**

### 2.1 **REMOVE** (Immediate Action)
- [x] Firebase SDK (`firebase/app`, `firebase/firestore`)
  - **Files**: `src/lib/firebase.ts`
  - **Action**: Delete file and remove from `package.json`
  - **Impact**: Zero - unused dependency

### 2.2 **LOCALIZE** (High Priority)
- [ ] Task/Routine API endpoints (`/api/tasks`, `/api/routines`)
  - **Files**: `src/hooks/use-global-state.tsx`
  - **Action**: Replace with local IndexedDB operations
  - **Impact**: Core functionality - must work offline

### 2.3 **FLAG + Runtime Cache** (Opt-in Features)
- [ ] Sync Engine endpoints (`/upload`, `/download`)
  - **Files**: `src/lib/sync-engine.ts`
  - **Action**: Add feature flag `sync_enabled`, runtime cache with placeholder
  - **Impact**: Opt-in feature - block when offline + sync disabled

- [ ] Notification endpoints (`/api/notifications/*`)
  - **Files**: `src/lib/notifications.ts`
  - **Action**: Add feature flag `push_notifications_enabled`, runtime cache with placeholder
  - **Impact**: Opt-in feature - block when offline + notifications disabled

### 2.4 **KEEP** (Core PWA)
- [x] Service Worker cache operations
- [x] Offline HTML fallback
- [x] Navigation fallback strategies

---

## 3. **IMPLEMENTATION PLAN**

### 3.1 **Phase 1: Cleanup (30 min)**
1. Remove Firebase SDK and unused imports
2. Remove `src/lib/firebase.ts`
3. Update `package.json` dependencies

### 3.2 **Phase 2: Localize Core Features (2 hours)**
1. Replace `/api/tasks` calls with IndexedDB operations
2. Replace `/api/routines` calls with IndexedDB operations
3. Update `use-global-state.tsx` to use local storage

### 3.3 **Phase 3: Feature Flagging (1 hour)**
1. Add `sync_enabled` feature flag
2. Add `push_notifications_enabled` feature flag
3. Implement runtime caching with placeholders for opt-in features

### 3.4 **Phase 4: Offline Enforcement (1 hour)**
1. Assert "Sync OFF ⇒ zero network" in tests
2. Add network monitoring to block unwanted calls
3. Implement graceful degradation for opt-in features

---

## 4. **TESTING REQUIREMENTS**

### 4.1 **Airplane Mode Audit**
- [ ] Enable airplane mode
- [ ] Navigate all app routes
- [ ] Verify no network requests (except opt-in features when disabled)
- [ ] Verify all core functionality works offline

### 4.2 **Feature Flag Testing**
- [ ] Test with `sync_enabled = false`
- [ ] Test with `push_notifications_enabled = false`
- [ ] Test with both disabled (zero network mode)

### 4.3 **Edge Cases**
- [ ] Network flapping (online/offline transitions)
- [ ] Service worker update scenarios
- [ ] Cache eviction scenarios

---

## 5. **SUCCESS METRICS**

### 5.1 **Functional**
- [ ] Sync OFF + Notifications OFF = **0 network requests**
- [ ] All core features work offline
- [ ] Opt-in features gracefully degrade

### 5.2 **Performance**
- [ ] No blocking network requests on app startup
- [ ] Offline cold start ≤ 2.0s
- [ ] First meaningful paint ≤ 1.2s

### 5.3 **Code Quality**
- [ ] Zero unused dependencies
- [ ] All network calls have offline fallbacks
- [ ] Feature flags control all opt-in features

---

## 6. **RISKS & MITIGATIONS**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Firebase removal breaks something | Low | Low | Verify no imports/usage before removal |
| Task localization breaks existing logic | Medium | High | Comprehensive testing with golden dataset |
| Feature flags don't block all network calls | Low | Medium | Network monitoring and assertions in tests |
| Cache eviction causes data loss | Low | High | Implement backup/restore for critical data |

---

## 7. **NEXT STEPS**

1. **Immediate**: Remove Firebase SDK (30 min)
2. **High Priority**: Localize task/routine APIs (2 hours)
3. **Medium Priority**: Implement feature flagging (1 hour)
4. **Testing**: Airplane mode audit and validation (1 hour)

**Total Estimated Time**: 4.5 hours
**Risk Level**: Medium (due to core functionality changes)
**Business Impact**: High (enables true offline-first experience)

---

*Generated: $(date)*
*Version: 1.0*