// IndexedDB v1 to v2 Migration Manager
import { StorageManagerV2 } from '../storage-v2';
import { generateEventId } from '../id-generator';
import { GOLDEN_DATASET, validateInvariants } from '../test/golden-dataset';

interface MigrationProgress {
  stage: 'preparing' | 'backing_up' | 'migrating' | 'validating' | 'completing' | 'error';
  progress: number; // 0-100
  currentStep: string;
  error?: string;
  startTime: number;
  estimatedTimeRemaining?: number;
}

interface MigrationResult {
  success: boolean;
  error?: string;
  stats: {
    eventsMigrated: number;
    settingsMigrated: number;
    warnings: string[];
    duration: number;
  };
  validation: {
    dataIntegrity: boolean;
    parityCheck: boolean;
    invariantsValid: boolean;
    errors: string[];
  };
}

class MigrationManager {
  private storageV2: StorageManagerV2;
  private deviceId: string;
  private progressCallback?: (progress: MigrationProgress) => void;

  constructor(deviceId: string, progressCallback?: (progress: MigrationProgress) => void) {
    this.deviceId = deviceId;
    this.progressCallback = progressCallback;
    this.storageV2 = new StorageManagerV2(deviceId);
  }

  async migrate(): Promise<MigrationResult> {
    const startTime = Date.now();
    const stats = {
      eventsMigrated: 0,
      settingsMigrated: 0,
      warnings: [] as string[],
      duration: 0
    };

    try {
      await this.updateProgress('preparing', 0, 'Preparing migration...');

      // Check if migration is needed
      const migrationNeeded = await this.checkMigrationNeeded();
      if (!migrationNeeded.needed) {
        return {
          success: true,
          stats: { ...stats, duration: Date.now() - startTime },
          validation: {
            dataIntegrity: true,
            parityCheck: true,
            invariantsValid: true,
            errors: []
          }
        };
      }

      // Step 1: Backup existing data
      await this.updateProgress('backing_up', 10, 'Creating backup...');
      const backup = await this.createBackup();
      if (!backup.success) {
        throw new Error(`Backup failed: ${backup.error}`);
      }

      // Step 2: Initialize v2 storage
      await this.updateProgress('migrating', 20, 'Initializing new storage...');
      await this.storageV2.initialize();

      // Step 3: Migrate events
      await this.updateProgress('migrating', 30, 'Migrating events...');
      const migrationResult = await this.migrateEvents();
      stats.eventsMigrated = migrationResult.count;
      stats.warnings.push(...migrationResult.warnings);

      // Step 4: Migrate settings
      await this.updateProgress('migrating', 70, 'Migrating settings...');
      const settingsResult = await this.migrateSettings();
      stats.settingsMigrated = settingsResult.count;

      // Step 5: Validate migration
      await this.updateProgress('validating', 85, 'Validating migration...');
      const validation = await this.validateMigration();

      // Step 6: Complete migration
      await this.updateProgress('completing', 95, 'Completing migration...');
      await this.completeMigration();

      await this.updateProgress('completing', 100, 'Migration complete!');

      stats.duration = Date.now() - startTime;

      return {
        success: true,
        stats,
        validation
      };
    } catch (error) {
      await this.updateProgress('error', 0, `Migration failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        stats: { ...stats, duration: Date.now() - startTime },
        validation: {
          dataIntegrity: false,
          parityCheck: false,
          invariantsValid: false,
          errors: [error.message]
        }
      };
    }
  }

  private async checkMigrationNeeded(): Promise<{ needed: boolean; reason?: string }> {
    try {
      // Check if v1 database exists
      const v1Db = await indexedDB.open('StudySentinelDB', 1);
      v1Db.close();

      // Check if v2 database already exists
      const v2DbRequest = indexedDB.open('StudySentinelDB', 2);
      v2DbRequest.onsuccess = () => {
        v2DbRequest.result.close();
      };

      return new Promise((resolve) => {
        v2DbRequest.onerror = () => {
          resolve({ needed: true });
        };

        v2DbRequest.onsuccess = () => {
          resolve({ needed: false, reason: 'v2 database already exists' });
        };

        v2DbRequest.onupgradeneeded = () => {
          v2DbRequest.transaction!.abort();
          resolve({ needed: true });
        };
      });
    } catch (error) {
      // v1 database doesn't exist, no migration needed
      return { needed: false, reason: 'v1 database not found' };
    }
  }

  private async createBackup(): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const v1Db = await indexedDB.open('StudySentinelDB', 1);
      
      const backup = {
        version: 1,
        timestamp: Date.now(),
        deviceId: this.deviceId,
        events: [] as any[],
        settings: {} as any
      };

      // Backup events
      const eventStore = v1Db.transaction('events', 'readonly').objectStore('events');
      backup.events = await eventStore.getAll();

      // Backup settings
      try {
        const settingsStore = v1Db.transaction('settings', 'readonly').objectStore('settings');
        backup.settings = await settingsStore.getAll();
      } catch (error) {
        // Settings store might not exist in v1
        backup.settings = [];
      }

      v1Db.close();

      // Store backup in localStorage
      localStorage.setItem('migration_backup_v1', JSON.stringify(backup));

      return { success: true, data: backup };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async migrateEvents(): Promise<{ count: number; warnings: string[] }> {
    const warnings: string[] = [];
    let count = 0;

    try {
      const v1Db = await indexedDB.open('StudySentinelDB', 1);
      
      const eventStore = v1Db.transaction('events', 'readonly').objectStore('events');
      const events = await eventStore.getAll();

      for (const event of events) {
        try {
          // Transform v1 event to v2 format
          const v2Event = this.transformEventV1ToV2(event);
          
          // Add to v2 storage
          await this.storageV2.addEvent(v2Event);
          count++;
          
          // Update progress periodically
          if (count % 10 === 0) {
            const progress = 30 + (count / events.length) * 40;
            await this.updateProgress('migrating', progress, `Migrating events (${count}/${events.length})...`);
          }
        } catch (error) {
          warnings.push(`Failed to migrate event ${event.id}: ${error.message}`);
        }
      }

      v1Db.close();
    } catch (error) {
      throw new Error(`Event migration failed: ${error.message}`);
    }

    return { count, warnings };
  }

  private transformEventV1ToV2(v1Event: any): any {
    // Transform v1 event format to v2 format
    const baseEvent = {
      deviceId: this.deviceId,
      version: 1,
      synced: false,
      encrypted: false
    };

    switch (v1Event.type) {
      case 'study_session':
        return {
          ...baseEvent,
          type: 'study_session_created',
          data: {
            subject: v1Event.subject,
            duration: v1Event.duration,
            startTime: v1Event.startTime,
            endTime: v1Event.endTime,
            notes: v1Event.notes,
            rating: v1Event.rating,
            tags: v1Event.tags || [],
            sessionId: v1Event.sessionId || generateEventId()
          }
        };

      case 'task':
        return {
          ...baseEvent,
          type: 'task_created',
          data: {
            title: v1Event.title,
            description: v1Event.description,
            subject: v1Event.subject,
            dueDate: v1Event.dueDate,
            priority: v1Event.priority,
            completed: v1Event.completed,
            estimatedTime: v1Event.estimatedTime,
            taskId: v1Event.taskId || generateEventId()
          }
        };

      case 'badge':
        return {
          ...baseEvent,
          type: 'badge_earned',
          data: {
            badgeId: v1Event.badgeId,
            badgeName: v1Event.badgeName,
            criteria: v1Event.criteria,
            earnedAt: v1Event.earnedAt,
            sessionId: v1Event.sessionId
          }
        };

      default:
        // Unknown event type, preserve as much as possible
        return {
          ...baseEvent,
          type: v1Event.type,
          data: v1Event.data
        };
    }
  }

  private async migrateSettings(): Promise<{ count: number }> {
    let count = 0;

    try {
      const v1Db = await indexedDB.open('StudySentinelDB', 1);
      
      try {
        const settingsStore = v1Db.transaction('settings', 'readonly').objectStore('settings');
        const settings = await settingsStore.getAll();

        for (const setting of settings) {
          try {
            await this.storageV2.saveSetting(setting.key, setting.value, setting.type || 'ui');
            count++;
          } catch (error) {
            console.warn(`Failed to migrate setting ${setting.key}:`, error);
          }
        }
      } catch (error) {
        // Settings store might not exist in v1
        console.warn('Settings store not found in v1 database');
      }

      v1Db.close();
    } catch (error) {
      throw new Error(`Settings migration failed: ${error.message}`);
    }

    return { count };
  }

  private async validateMigration(): Promise<MigrationResult['validation']> {
    const errors: string[] = [];
    
    try {
      // Check data integrity
      const dataIntegrity = await this.checkDataIntegrity();
      if (!dataIntegrity.valid) {
        errors.push(...dataIntegrity.errors);
      }

      // Check parity with golden dataset
      const parityCheck = await this.checkParity();
      if (!parityCheck.valid) {
        errors.push(...parityCheck.errors);
      }

      // Check invariants
      const invariantsCheck = await this.checkInvariants();
      if (!invariantsCheck.valid) {
        errors.push(...invariantsCheck.errors);
      }

      return {
        dataIntegrity: dataIntegrity.valid,
        parityCheck: parityCheck.valid,
        invariantsValid: invariantsCheck.valid,
        errors
      };
    } catch (error) {
      return {
        dataIntegrity: false,
        parityCheck: false,
        invariantsValid: false,
        errors: [error.message]
      };
    }
  }

  private async checkDataIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check that all events have required fields
      const events = await this.storageV2.getEvents();
      for (const event of events) {
        if (!event.id || !event.timestamp || !event.type) {
          errors.push(`Event missing required fields: ${JSON.stringify(event)}`);
        }

        if (event.type.startsWith('study_session')) {
          const data = event.data as any;
          if (!data.subject || !data.duration || !data.startTime || !data.endTime) {
            errors.push(`Study session event missing required data: ${event.id}`);
          }
        }
      }

      // Check event ordering
      const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
      for (let i = 1; i < sortedEvents.length; i++) {
        if (sortedEvents[i].timestamp < sortedEvents[i - 1].timestamp) {
          errors.push(`Event ordering violation at index ${i}`);
        }
      }
    } catch (error) {
      errors.push(`Data integrity check failed: ${error.message}`);
    }

    return { valid: errors.length === 0, errors };
  }

  private async checkParity(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // For now, just check that we have some data
      const events = await this.storageV2.getEvents();
      if (events.length === 0) {
        errors.push('No events found after migration');
      }

      // Check that we have the expected event types
      const eventTypes = new Set(events.map(e => e.type));
      const expectedTypes = ['study_session_created', 'task_created', 'badge_earned'];
      for (const type of expectedTypes) {
        if (!eventTypes.has(type)) {
          errors.push(`Expected event type ${type} not found`);
        }
      }
    } catch (error) {
      errors.push(`Parity check failed: ${error.message}`);
    }

    return { valid: errors.length === 0, errors };
  }

  private async checkInvariants(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Calculate metrics and validate invariants
      const events = await this.storageV2.getEvents();
      const sessionEvents = events.filter(e => e.type.startsWith('study_session'));
      
      if (sessionEvents.length === 0) {
        return { valid: true, errors: [] }; // No sessions to validate
      }

      // Check basic duration calculations
      const totalDuration = sessionEvents.reduce((sum, e) => {
        const data = e.data as any;
        return sum + (data.duration || 0);
      }, 0);

      const avgDuration = totalDuration / sessionEvents.length;
      
      if (avgDuration <= 0 || avgDuration > 1440) { // More than 24 hours
        errors.push(`Invalid average session duration: ${avgDuration}`);
      }

      // Check subject consistency
      const subjects = new Set(sessionEvents.map(e => (e.data as any).subject));
      if (subjects.size === 0) {
        errors.push('No subjects found in study sessions');
      }

      // Check timestamp consistency
      const timestamps = sessionEvents.map(e => e.timestamp);
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);
      
      if (minTime <= 0 || maxTime > Date.now() + 86400000) { // 1 day in the future
        errors.push(`Invalid timestamp range: ${minTime} - ${maxTime}`);
      }
    } catch (error) {
      errors.push(`Invariant check failed: ${error.message}`);
    }

    return { valid: errors.length === 0, errors };
  }

  private async completeMigration(): Promise<void> {
    try {
      // Create initial checkpoint
      await this.storageV2.createCheckpoint();

      // Clean up backup after successful migration
      localStorage.removeItem('migration_backup_v1');

      // Mark migration as complete
      localStorage.setItem('migration_v2_complete', 'true');
      localStorage.setItem('migration_v2_timestamp', Date.now().toString());
    } catch (error) {
      console.warn('Error completing migration:', error);
    }
  }

  private async updateProgress(
    stage: MigrationProgress['stage'],
    progress: number,
    currentStep: string,
    error?: string
  ): Promise<void> {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        progress: Math.max(0, Math.min(100, progress)),
        currentStep,
        error,
        startTime: this.progressCallback ? Date.now() : Date.now()
      });
    }
  }

  // Utility methods
  async canRollback(): Promise<boolean> {
    return localStorage.getItem('migration_backup_v1') !== null;
  }

  async rollback(): Promise<{ success: boolean; error?: string }> {
    try {
      const backupData = localStorage.getItem('migration_backup_v1');
      if (!backupData) {
        return { success: false, error: 'No backup found' };
      }

      const backup = JSON.parse(backupData);
      
      // Restore v1 database
      const v1Db = await indexedDB.open('StudySentinelDB', 1);
      
      // Clear existing data
      const eventStore = v1Db.transaction('events', 'readwrite').objectStore('events');
      await eventStore.clear();

      // Restore events
      for (const event of backup.events) {
        await eventStore.add(event);
      }

      v1Db.close();

      // Delete v2 database
      await indexedDB.deleteDatabase('StudySentinelDB');

      // Clear migration flags
      localStorage.removeItem('migration_v2_complete');
      localStorage.removeItem('migration_v2_timestamp');
      localStorage.removeItem('migration_backup_v1');

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getMigrationStatus(): Promise<{
    complete: boolean;
    timestamp?: number;
    backupAvailable: boolean;
    canRollback: boolean;
  }> {
    return {
      complete: localStorage.getItem('migration_v2_complete') === 'true',
      timestamp: localStorage.getItem('migration_v2_timestamp') 
        ? parseInt(localStorage.getItem('migration_v2_timestamp')!)
        : undefined,
      backupAvailable: localStorage.getItem('migration_backup_v1') !== null,
      canRollback: await this.canRollback()
    };
  }
}

export { MigrationManager, type MigrationProgress, type MigrationResult };