import { BaseRepository } from './base.repository';
import { SyncConflict, db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export class SyncConflictsRepository extends BaseRepository<SyncConflict, string> {
  constructor() {
    super(db.syncConflicts);
  }

  async createConflict(
    tableName: string,
    recordId: string,
    localData: any,
    remoteData: any,
    localModifiedAt: string,
    remoteModifiedAt: string,
    resolutionStrategy: 'local_wins' | 'remote_wins' | 'manual' = 'manual'
  ): Promise<SyncConflict> {
    const conflict: SyncConflict = {
      id: uuidv4(),
      tableName,
      recordId,
      localData,
      remoteData,
      localModifiedAt,
      remoteModifiedAt,
      resolutionStrategy,
      createdAt: new Date().toISOString()
    };

    await this.add(conflict);
    return conflict;
  }

  async getConflictsByTable(tableName: string): Promise<SyncConflict[]> {
    try {
      return await this.table
        .where('tableName')
        .equals(tableName)
        .toArray();
    } catch (error) {
      console.warn(`Failed to get conflicts for table ${tableName}:`, error);
      return [];
    }
  }

  async getPendingConflicts(): Promise<SyncConflict[]> {
    try {
      return await this.table
        .where('resolutionStrategy')
        .equals('manual')
        .toArray();
    } catch (error) {
      console.warn('Failed to get pending conflicts:', error);
      return [];
    }
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'local_wins' | 'remote_wins',
    resolvedData?: any
  ): Promise<void> {
    try {
      const conflict = await this.getById(conflictId);
      if (!conflict) {
        throw new Error(`Conflict ${conflictId} not found`);
      }

      // Apply the resolution
      const dataToApply = resolution === 'local_wins' 
        ? conflict.localData 
        : (resolvedData || conflict.remoteData);

      // Update the main table with resolved data
      const table = db.table(conflict.tableName);
      await table.put(dataToApply);

      // Remove the conflict
      await this.delete(conflictId);

      console.log(`Resolved conflict ${conflictId} with strategy: ${resolution}`);
    } catch (error) {
      console.error(`Failed to resolve conflict ${conflictId}:`, error);
      throw error;
    }
  }

  async clearResolvedConflicts(): Promise<void> {
    try {
      await this.table
        .where('resolutionStrategy')
        .anyOf(['local_wins', 'remote_wins'])
        .delete();
    } catch (error) {
      console.warn('Failed to clear resolved conflicts:', error);
    }
  }

  async getConflictCount(): Promise<number> {
    try {
      return await this.table.count();
    } catch (error) {
      console.warn('Failed to get conflict count:', error);
      return 0;
    }
  }
}

export const syncConflictsRepository = new SyncConflictsRepository();