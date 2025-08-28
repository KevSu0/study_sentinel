// Minimal sync.ts for testing export
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  unresolvedConflicts: number;
}

export class SyncEngine {
  private syncListeners: ((status: SyncStatus) => void)[] = [];
  private onComplete?: () => void;

  constructor(onComplete?: () => void) {
    this.onComplete = onComplete;
  }

  getSyncStatus(): SyncStatus {
    return {
      isOnline: true,
      isSyncing: false,
      lastSyncTime: null,
      pendingChanges: 0,
      unresolvedConflicts: 0
    };
  }

  async resolveConflict(conflictId: string, resolution: 'local' | 'remote'): Promise<void> {
    // TODO: Implement conflict resolution logic
    console.log(`Resolving conflict ${conflictId} with ${resolution} strategy`);
  }

  addSyncListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners.push(listener);
  }

  removeSyncListener(listener: (status: SyncStatus) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  async getPendingChangesCount(): Promise<number> {
    // TODO: Implement pending changes count logic
    return 0;
  }

  async getConflictCount(): Promise<number> {
    // TODO: Implement conflict count logic
    return 0;
  }

  async getConflicts(): Promise<any[]> {
    // TODO: Implement get conflicts logic
    return [];
  }

  async startManualSync(): Promise<void> {
    // TODO: Implement manual sync logic
    console.log('Starting manual sync');
  }

  async manualSync(): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement manual sync logic
    console.log('Manual sync triggered');
    return { success: true };
  }

  start(): void {
    // TODO: Implement sync engine start logic
    console.log('Sync engine started');
  }

  stop(): void {
    // TODO: Implement sync engine stop logic
    console.log('Sync engine stopped');
  }
}

export const syncEngine = new SyncEngine();