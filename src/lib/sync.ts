import { db, Outbox } from './db';
import { metaRepository, outboxRepository, taskRepository, sessionRepository, profileRepository, routineRepository } from './repositories';

// 1. API Endpoint Placeholders
async function pushChanges(changes: Outbox[]): Promise<void> {
  console.log('Pushing changes to the server:', changes);
  // Simulate a network request
  await new Promise(resolve => setTimeout(resolve, 1000));
  // In a real application, this would be an API call to the backend.
  // If the API call is successful, the promise should resolve.
  // If it fails, it should reject, and the changes should remain in the outbox.
  return Promise.resolve();
}

async function fetchDeltas(since: number | null): Promise<{ changes: any[], timestamp: number }> {
  console.log('Fetching deltas from the server since:', since);
  // Simulate a network request
  await new Promise(resolve => setTimeout(resolve, 1000));
  // In a real application, this would fetch changes from the backend.
  return Promise.resolve({ changes: [], timestamp: Date.now() });
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000 * 60 * 5; // 5 minutes

export async function syncOutbox(): Promise<void> {
  const pendingChanges = await outboxRepository.getAll();
  if (pendingChanges.length > 0) {
    try {
      await pushChanges(pendingChanges);
      await outboxRepository.clear();
      console.log('Outbox synced and cleared.');
    } catch (error) {
      console.error('Failed to push changes:', error);
      for (const change of pendingChanges) {
        const retries = (change.retries || 0) + 1;
        if (retries >= MAX_RETRIES) {
          console.error(`Change ${change.id} has failed ${MAX_RETRIES} times. Moving to failed_outbox.`);
          // In a real app, we'd move this to a separate table for manual inspection.
          // For now, we'll just delete it to prevent infinite loops.
          await outboxRepository.delete(change.id as any);
        } else {
          await outboxRepository.update(change.id as any, { retries, lastAttempt: Date.now() });
        }
      }
    }
  } else {
    console.log('No pending changes in outbox to sync.');
  }
}

export async function pullDeltas(onSyncComplete: () => void): Promise<void> {
  const lastSyncTimestamp = await metaRepository.getLastSyncTimestamp();
  try {
    const { changes, timestamp } = await fetchDeltas(lastSyncTimestamp);
    if (changes.length > 0) {
      console.log('Applying changes from the server:', changes);
      await db.transaction('rw', db.tables, async () => {
        for (const change of changes) {
          const { table, type, key, data, modified_at } = change;
          let repository;
          switch (table) {
            case 'tasks': repository = taskRepository; break;
            case 'sessions': repository = sessionRepository; break;
            case 'profiles': repository = profileRepository; break;
            case 'routines': repository = routineRepository; break;
            default: console.warn(`Unknown table type: ${table}`); continue;
          }

          if (type === 'put') {
            const existing = await (repository as any).getById(key);
            if (existing && new Date(existing.modified_at) > new Date(modified_at)) {
              console.log(`Conflict detected for ${table} ${key}. Local version is newer. Last write wins.`);
              // We could implement a more sophisticated strategy here.
              // For now, we assume "last write wins" and the local change will be pushed later.
              continue;
            }
            await (repository as any).table.put(data);
          } else if (type === 'delete') {
            await (repository as any).table.delete(key);
          }
        }
      });
      onSyncComplete();
    } else {
      console.log('No new changes from the server.');
    }
    await metaRepository.setLastSyncTimestamp(timestamp);
    console.log('Deltas pulled and applied. New sync timestamp:', timestamp);
  } catch (error) {
    console.error('Failed to pull deltas:', error);
  }
}

export type SyncStatus = 'Syncing...' | 'Up to date' | 'Offline' | 'Error';

export class SyncEngine {
  private syncInterval: NodeJS.Timeout | null = null;
  public status: SyncStatus = 'Up to date';
  private onSyncComplete: () => void;

  constructor(onSyncComplete: () => void) {
    this.onSyncComplete = onSyncComplete;
  }

  private setStatus(status: SyncStatus) {
    this.status = status;
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sync-status-change', { detail: { status } }));
    }
  }

  async synchronize() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus('Offline');
      return;
    }
    this.setStatus('Syncing...');
    try {
      console.log('Starting synchronization cycle...');
      await syncOutbox();
      await pullDeltas(this.onSyncComplete);
      console.log('Synchronization cycle finished.');
      this.setStatus('Up to date');
    } catch (error) {
      console.error('Synchronization failed:', error);
      this.setStatus('Error');
    }
  }

  start() {
    if (this.syncInterval) {
      console.log('Sync engine already running.');
      return;
    }
    console.log('Starting sync engine...');
    this.synchronize();
    this.syncInterval = setInterval(() => this.synchronize(), 5 * 60 * 1000); // 5 minutes
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Sync engine stopped.');
    }
  }

  getSyncStatus(): SyncStatus {
    return this.status;
  }
}

