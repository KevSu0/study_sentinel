# Architectural Review and Risk Analysis: Activity Tracking Event Sourcing

This document provides a final architectural review of the event-sourcing and synchronization system for activity tracking. The implementation is based on the specification in `documentation/activity-tracking-event-sourcing.md`.

## A. Confirmed Strengths

The implemented architecture successfully establishes a robust and resilient system for tracking user activities. Key strengths include:

1.  **High Data Integrity and Auditability:** The event-sourcing model provides an immutable, chronological log of all actions. This creates a reliable audit trail, simplifies debugging, and enables powerful analytics, as the state can be reconstructed at any point in time.
2.  **Clear and Simple State Transitions:** By eliminating the `IN_PROGRESS` status and inferring the running/paused state from the event stream, the core `ActivityAttempt` state machine is simplified to `NOT_STARTED` -> `COMPLETED`. This reduces state management complexity and potential for inconsistencies.
3.  **Robust Offline-First Synchronization:** The "one-active-attempt" invariant, enforced by the `activeKey` and a deterministic conflict resolution policy (`CANCEL_DUPLICATE`), provides a solid foundation for multi-device synchronization, even in offline-first scenarios.
4.  **Decoupled and Performant Read Models:** The use of reducers to create projections (e.g., `duration`, `pointsEarned`) decouples the read model from the write model. Persisting these projections ensures fast query performance for the UI, avoiding costly event stream processing on every read.

## B. Potential Gaps & Logical Problems

While the architecture is sound, several areas present potential logical gaps or long-term challenges that were not fully addressed in the specification.

1.  **Clock Skew Between Devices:**
    *   **Problem:** The specification relies on a client-side `occurredAt` timestamp for ordering events. If two devices have significant clock skew, an event that happened *later* in real-time could be recorded with an *earlier* timestamp. This could lead to incorrect state calculations, such as a `PAUSE` event being ordered before the `START` event it relates to.
    *   **Impact:** Minor clock drift might be acceptable, but significant differences could corrupt the integrity of an attempt's timeline, leading to incorrect duration calculations and confusing user-facing history.

2.  **Long-Term Consequences of Event Purging (`hardUndo`):**
    *   **Problem:** The `hardUndo` command permanently deletes an attempt's event history. While this fulfills the immediate user requirement, it breaks the core principle of an immutable event log.
    *   **Impact:** This creates data "black holes" that could compromise long-term analytics, make future data migrations more complex, and hinder debugging of issues related to the deleted attempt. It also prevents the system from ever fully reconstructing the state of the world as it once was.

3.  **Performance of Reducers with Large Event Streams:**
    *   **Problem:** The reducer re-processes the entire event stream for an `ActivityAttempt` on every update. For an attempt with hundreds of events (e.g., frequent pause/resume cycles during a long study session), this could become a performance bottleneck on the client.
    *   **Impact:** On low-end devices or for very active users, this could lead to UI lag when interacting with the timer, as the device struggles to re-calculate projections in real-time.

## C. Edge Cases to Monitor

The following scenarios represent plausible edge cases that could challenge the system's integrity and should be monitored closely.

1.  **Rapid Offline/Online Toggling During Sync:**
    *   **Scenario:** A user's device has an unstable connection and toggles rapidly between online and offline states while a sync operation is in progress.
    *   **Potential Issue:** This could lead to partially completed syncs, race conditions where the client and server have conflicting views of the latest state, or repeated conflict resolution cycles that result in confusing `CANCEL_DUPLICATE` events for the user.

2.  **Ambiguity Between `MANUAL_LOG` and Timer Events:**
    *   **Scenario:** A user manually logs a completed session on Device A for a time range (e.g., 9:00 AM to 10:00 AM). Simultaneously, Device B (offline) has a running timer for the same task that is paused at 9:30 AM.
    *   **Potential Issue:** When Device B comes online, how are these events reconciled? The system lacks a clear policy for merging manually logged time with timer-generated events, which could result in overlapping or conflicting time entries.

3.  **Cross-Device `normalUndoOrRetry` Conflict:**
    *   **Scenario:** A user completes an attempt on Device A. They then perform an `undo` action, which correctly spawns a new active attempt. However, Device B is offline and still considers the *original* completed attempt to be the latest one in the sequence. The user then starts a new, unrelated action on Device B.
    *   **Potential Issue:** When Device B syncs, it might not immediately recognize the new active attempt from Device A as the "true" latest one, potentially leading to confusion in the UI or incorrect application of the `one-active-attempt` invariant until a full sync and conflict resolution cycle is completed.

## D. Strategic Recommendations

To mitigate the identified risks and edge cases, the following high-level strategies are recommended:

1.  **For Clock Skew:**
    *   **Recommendation:** Introduce **server-assigned timestamps** as the primary authority for event ordering during synchronization. Client-side `occurredAt` timestamps can still be used for immediate UI updates, but the server should correct these upon receipt to create a globally consistent timeline.

2.  **For `hardUndo` Event Purging:**
    *   **Recommendation:** Instead of permanently deleting events, transition to a **"soft delete" or "redaction" model**. Mark the `ActivityAttempt` as `INVALIDATED` and add a `redacted: true` flag to its associated events. The reducer would then be programmed to ignore redacted events during state calculation. This preserves the audit trail while achieving the desired user-facing outcome.

3.  **For Large Event Stream Performance:**
    *   **Recommendation:** Implement **snapshotting for long-lived attempts**. After a certain number of events (e.g., every 50 events), the reducer can generate a `SNAPSHOT` event that contains the full calculated state (duration, etc.) at that point in time. The reducer can then start its next calculation from the latest snapshot instead of from the beginning of the event stream, significantly improving performance.

4.  **For Sync Robustness and Idempotency:**
    *   **Recommendation:** Add **idempotency keys to all user-initiated commands** (not just events). This ensures that if a command is sent multiple times due to network instability (e.g., creating a new attempt), it is only processed once by the server and other clients, preventing duplicate actions.

5.  **For Event Reconciliation Logic:**
    *   **Recommendation:** Develop a clear **event reconciliation policy** for merging `MANUAL_LOG` events with timer-generated events. This policy should define which event source takes precedence in cases of overlap and should be implemented consistently across all clients and the backend.