# Sync Conflict Resolution Strategy

This document outlines the conflict resolution strategy for the offline-first, event-sourced activity tracking feature. The primary goal is to ensure data consistency when a user's data is synced from multiple devices.

## 1. Core Strategy: Immutable Event Merging

Given the event-sourced nature of the `ActivityAttempt` and `ActivityEvent` data models, the conflict resolution strategy is based on merging immutable event streams. This approach avoids traditional state-based conflicts, as events are facts that have already occurred. The challenge is to ensure the final, merged event stream is correctly ordered and that the `ActivityAttempt`'s state is a correct projection of this stream.

## 2. Client-Side Sync Process

The client-side sync engine, likely a new `SyncService`, will follow these steps for each `ActivityAttempt` that needs to be synced:

1.  **Identify Unsynced Data:** The client will maintain a watermark (e.g., the timestamp of the last successful sync) to identify local `ActivityEvent`s that have not yet been sent to the server.

2.  **Fetch Remote Changes:** The client will make an API call to the server, sending the unsynced local events. The server will process these events and return any new events from other devices that the client doesn't have.

3.  **Merge Event Streams:** The client will merge the newly received remote events with its local event stream. The merging logic will be based on the `occurredAt` timestamp of each event, with the `createdAt` timestamp used as a tie-breaker. This ensures a consistent, chronological ordering of events.

4.  **Re-calculate Attempt State:** After the event stream is merged, the client will re-run the reducer function for the corresponding `ActivityAttempt`. This will re-calculate the projections (e.g., `duration`, `status`, `pointsEarned`) based on the complete and ordered event stream.

5.  **Persist Changes:** The updated `ActivityAttempt` and any new `ActivityEvent`s will be persisted to the local IndexedDB.

## 3. API Data Structures

The sync process will be facilitated by a single API endpoint (e.g., `/api/sync/activity`).

### Sync Request Payload

The client will send a payload containing the unsynced events and the last sync timestamp.

```json
{
  "lastSyncTimestamp": 1678886400000,
  "events": [
    {
      "id": "evt_local_123",
      "attemptId": "atmpt_abc",
      "type": "START",
      "occurredAt": 1678886401000,
      "createdAt": 1678886401000,
      "source": "user"
    }
  ]
}
```

### Sync Response Payload

The server will respond with any new events from other devices that the client needs to incorporate.

```json
{
  "newEvents": [
    {
      "id": "evt_remote_456",
      "attemptId": "atmpt_abc",
      "type": "PAUSE",
      "occurredAt": 1678886402000,
      "createdAt": 1678886402000,
      "source": "user"
    }
  ],
  "newSyncTimestamp": 1678886403000
}
```

## 4. Edge Cases and Solutions

### Clock Skew

-   **Problem:** Different devices may have slightly different clock settings, leading to incorrect event ordering if we only rely on the client-generated `occurredAt` timestamp.
-   **Solution:** While the client-generated `occurredAt` is crucial for capturing the user's intended sequence of actions, the server should assign its own timestamp upon receiving an event. This server-assigned timestamp can be used as the primary sorting key during the merge process, with the client's `occurredAt` as a secondary key. This ensures a globally consistent event order.

### Network Latency

-   **Problem:** A user might perform actions on one device while another device is in the process of syncing.
-   **Solution:** The event-sourced model is resilient to this. As long as all events are eventually captured and merged, the final state will be consistent. The use of idempotency keys for events can also prevent duplicate events from being processed if a sync operation is retried.

## 5. High-Level Implementation Plan

### New `SyncService`

A new `SyncService` module will be created at `src/lib/services/sync.service.ts`. This service will encapsulate the logic for:

-   Detecting unsynced data.
-   Communicating with the sync API.
-   Orchestrating the merging of event streams.
-   Triggering the re-calculation of `ActivityAttempt` states.

### Modifications to `activity-repository.ts`

The existing [`activity-repository.ts`](src/lib/repositories/activity-repository.ts) will be enhanced with a new method:

-   `applyEvents(attemptId: string, events: ActivityEvent[]): Promise<void>`: This function will take an `attemptId` and a list of new events, merge them with the existing events for that attempt, re-run the reducer, and persist the updated `ActivityAttempt`.