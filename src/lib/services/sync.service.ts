import { db } from '@/lib/db';
import { activityRepository } from '@/lib/repositories/activity-repository';
import { ActivityEvent } from '@/lib/types';

/**
 * The SyncService is responsible for orchestrating the synchronization of
 * activity data between the client and the server. It handles fetching remote
 * changes, merging event streams, and re-calculating activity attempt states.
 */
export class SyncService {
  /**
   * Synchronizes all unsynced activity data with the server.
   */
  public async syncAll(): Promise<void> {
    // 1. Identify unsynced data
    const unsyncedEvents = await this.getUnsyncedEvents();

    if (unsyncedEvents.length === 0) {
      // No data to sync
      return;
    }

    // 2. Fetch remote changes from the server
    const { newEvents, newSyncTimestamp } = await this.fetchRemoteChanges(unsyncedEvents);

    // 3. Resolve conflicts before applying events
    await this.resolveConflicts(newEvents);

    // 4. Merge event streams and re-calculate attempt states
    await this.mergeAndApplyEvents(newEvents);

    // 5. Update the last sync timestamp
    await this.updateLastSyncTimestamp(newSyncTimestamp);
  }

  /**
   * Retrieves all local events that have not yet been synced to the server.
   * This is a placeholder implementation. The actual logic will depend on how
   * the last sync timestamp is stored.
   */
  private async getUnsyncedEvents(): Promise<ActivityEvent[]> {
    // Placeholder: In a real implementation, we would query for events
    // created after the last sync timestamp.
    return [];
  }

  /**
   * Sends unsynced events to the server and fetches any new events from other devices.
   * This is a placeholder implementation.
   */
  private async fetchRemoteChanges(events: ActivityEvent[]): Promise<{ newEvents: ActivityEvent[], newSyncTimestamp: number }> {
    // Placeholder: This would be an API call to the sync endpoint.
    console.log('Syncing events:', events);
    return { newEvents: [], newSyncTimestamp: Date.now() };
  }

  /**
   * Merges new events with the local event stream and applies the changes
   * to the corresponding activity attempts.
   */
  private async mergeAndApplyEvents(newEvents: ActivityEvent[]): Promise<void> {
    if (newEvents.length === 0) {
      return;
    }

    // Group events by attemptId
    const eventsByAttempt = newEvents.reduce((acc, event) => {
      if (!acc[event.attemptId]) {
        acc[event.attemptId] = [];
      }
      acc[event.attemptId].push(event);
      return acc;
    }, {} as Record<string, ActivityEvent[]>);

    // Apply the new events to each attempt
    for (const attemptId in eventsByAttempt) {
      await activityRepository.applyEvents(attemptId, eventsByAttempt[attemptId]);
    }
  }

  /**
   * Updates the last sync timestamp. This is a placeholder implementation.
   */
  private async updateLastSyncTimestamp(timestamp: number): Promise<void> {
    // Placeholder: This would persist the new sync timestamp to local storage or IndexedDB.
    console.log('New sync timestamp:', timestamp);
  }
  /**
   * Resolves conflicts where both local and remote data sources have an
   * active attempt for the same activity.
   */
  private async resolveConflicts(remoteEvents: ActivityEvent[]): Promise<void> {
    // Identify remote active attempts
    const remoteActiveAttempts = remoteEvents
      .filter(event => event.type === 'START')
      .map(event => ({
        attemptId: event.attemptId,
        activeKey: event.payload.activeKey,
        createdAt: event.createdAt,
      }));

    if (remoteActiveAttempts.length === 0) {
      return;
    }

    // Find local active attempts
    // const localActiveAttempts = await activityRepository.findManyBy({
    //   activeKey: { $ne: null },
    // });
    const localActiveAttempts = await db.activityAttempts.where('activeKey').notEqual(null).toArray();

    // Create a map for quick lookups
    const localActiveMap = new Map(
      localActiveAttempts.map(attempt => [attempt.activeKey, attempt])
    );

    for (const remoteAttempt of remoteActiveAttempts) {
      if (remoteAttempt.activeKey && localActiveMap.has(remoteAttempt.activeKey)) {
        const localAttempt = localActiveMap.get(remoteAttempt.activeKey)!;

        // Conflict detected: same activeKey exists locally and remotely
        const localIsNewer = localAttempt.createdAt > remoteAttempt.createdAt;

        const demotedAttemptId = localIsNewer
          ? localAttempt.id
          : remoteAttempt.attemptId;

        const demotedAttemptTimestamp = localIsNewer
          ? localAttempt.createdAt
          : remoteAttempt.createdAt;

        // Create a CANCEL_DUPLICATE event
        const cancelEvent: ActivityEvent = {
          id: '',
          attemptId: demotedAttemptId,
          occurredAt: demotedAttemptTimestamp + 1, // Ensure this event is the last one
          createdAt: demotedAttemptTimestamp + 1,
          type: 'CANCEL_DUPLICATE',
          payload: {},
          source: 'sync',
        };

        if (localIsNewer) {
          // If local is newer, apply the event directly to the local database
          await activityRepository.applyEvents(demotedAttemptId, [cancelEvent]);
        } else {
          // If remote is newer, add the event to the remote event stream
          remoteEvents.push(cancelEvent);
        }
      }
    }
  }
}

export const syncService = new SyncService();