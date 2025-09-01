/**
 * Sync Engine for coordinating state synchronization
 */
export class SyncEngine {
  private listeners: Set<() => void> = new Set();

  /**
   * Add a listener for sync events
   */
  addListener(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Trigger sync across all listeners
   */
  sync(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Export singleton instance
export const syncEngine = new SyncEngine();