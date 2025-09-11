# Zero-Latency Offline Experience: Technical Plan

## 1. Objective

This document outlines the technical strategy to evolve the application into a complete offline-first experience. The primary goals are:
-   Eliminate all loading times when navigating between the core pages (Dashboard, Stats, Plans).
-   Enable users to perform data modification actions (e.g., creating, updating, deleting tasks) while completely offline.
-   Ensure a seamless user experience with optimistic UI updates.

## 2. Core Problems to Solve

-   **Navigation Lag:** Lazy-loaded components, even when cached, can introduce minor loading states (suspense fallbacks) on navigation.
-   **Failed Offline Actions:** API requests that modify data (`POST`, `PUT`, `DELETE`) currently fail when the user is offline.
-   **Lack of User Feedback:** The UI does not currently give immediate feedback for actions performed offline.

## 3. Proposed Solution: A Three-Pillar Strategy

### Pillar 1: Instant Navigation with Pre-caching

To eliminate navigation lag, we will move from a purely dynamic caching strategy to a more aggressive pre-caching model for our core pages.

**Implementation:**
-   **Strategy:** We will update the service worker (`src/worker/index.ts`) to use a `CacheFirst` strategy for navigation requests to the Dashboard, Stats, and Plans pages.
-   **Benefit:** Once a user has visited these pages once, subsequent navigations will be served instantly from the cache, with zero network latency.

### Pillar 2: Offline Mutations with Background Sync

To allow users to perform actions offline, we will leverage the `BackgroundSyncPlugin` from Workbox.

**Implementation:**
1.  **Intercept Failed Mutations:** A new route will be registered in the service worker to handle API requests with `POST`, `PUT`, or `DELETE` methods.
2.  **Queue Requests:** This route will use a `NetworkOnly` strategy. When a request fails due to a network error, the `BackgroundSyncPlugin` will automatically save it to a queue in IndexedDB.
3.  **Automatic Sync:** When the network connection is restored, the service worker's `sync` event will trigger, and the queued requests will be replayed to the server in the order they were made.

**Service Worker Code (`src/worker/index.ts`):**
```typescript
// 1. Import the plugin
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { NetworkOnly } from 'workbox-strategies';

// 2. Create the plugin instance
const bgSyncPlugin = new BackgroundSyncPlugin('api-mutation-queue', {
  maxRetentionTime: 24 * 60 // Retry for up to 24 hours
});

// 3. Register the route for mutations
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'DELETE'].includes(request.method),
  new NetworkOnly({
    plugins: [bgSyncPlugin]
  })
);
```

### Pillar 3: Optimistic UI Updates

To provide a seamless experience, the UI should update immediately, even before the background sync is complete.

**Implementation:**
-   **State Management:** When a user performs an action, the application's state (e.g., using React `useState` or a state management library) will be updated immediately.
-   **Example Flow (Completing a Task):**
    1.  User clicks "Complete" on a task.
    2.  The UI immediately shows the task as completed (e.g., strikes it through).
    3.  A `PUT` request is sent to `/api/tasks/{id}`.
    4.  If online, the request succeeds.
    5.  If offline, the request is queued by the service worker. The UI remains in the "completed" state.
    6.  When the user comes back online, the request is sent automatically in the background.

## 4. Action Plan

1.  [ ] **Update Service Worker:** Modify `src/worker/index.ts` to implement the `CacheFirst` navigation strategy and the background sync for API mutations.
2.  [ ] **Implement Optimistic Updates:** Review the key components that perform mutations and ensure they update the local state immediately.
3.  [ ] **Test Offline Functionality:** Rigorously test the application in an offline environment to verify that navigation is instant and all actions are correctly queued and synchronized.