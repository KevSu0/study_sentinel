import { BaseRepository } from './base.repository';
import { UserPreference, getDB } from '../db';

export class UserPreferencesRepository extends BaseRepository<UserPreference, string> {
  constructor() {
    super(() => getDB().userPreferences);
  }

  async setPreference(key: string, value: any, userId: string = 'default'): Promise<void> {
    const now = new Date().toISOString();
    const preference: UserPreference = {
      key: `${userId}:${key}`,
      userId,
      value,
      createdAt: now,
      updatedAt: now
    };

    await this.table.put(preference);
  }

  async getPreference<T>(key: string, userId: string = 'default', defaultValue?: T): Promise<T | undefined> {
    try {
      const preference = await this.getById(`${userId}:${key}` as any);
      return preference ? preference.value : defaultValue;
    } catch (error) {
      console.warn(`Failed to get preference ${key}:`, error);
      return defaultValue;
    }
  }

  async removePreference(key: string, userId: string = 'default'): Promise<void> {
    await this.delete(`${userId}:${key}` as any);
  }

  async getAllPreferences(userId: string = 'default'): Promise<Record<string, any>> {
    try {
      const preferences = await this.table
        .where('userId')
        .equals(userId)
        .toArray();
      
      const result: Record<string, any> = {};
      preferences.forEach(pref => {
        const key = pref.key.replace(`${userId}:`, '');
        result[key] = pref.value;
      });
      
      return result;
    } catch (error) {
      console.warn('Failed to get all preferences:', error);
      return {};
    }
  }

  async migrateFromLocalStorage(userId: string = 'default'): Promise<void> {
    const keysToMigrate = [
      'alarmSound',
      'timerTickSound',
      'reminderInterval',
      'theme',
      'language',
      'notifications'
    ];

    for (const key of keysToMigrate) {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) {
          let parsedValue;
          try {
            parsedValue = JSON.parse(value);
          } catch {
            parsedValue = value;
          }
          
          await this.setPreference(key, parsedValue, userId);
          localStorage.removeItem(key);
          console.log(`Migrated ${key} from localStorage to IndexedDB`);
        }
      } catch (error) {
        console.warn(`Failed to migrate ${key}:`, error);
      }
    }
  }

  async clearAllPreferences(userId: string = 'default'): Promise<void> {
    try {
      await this.table
        .where('userId')
        .equals(userId)
        .delete();
    } catch (error) {
      console.warn('Failed to clear preferences:', error);
    }
  }
}

export const userPreferencesRepository = new UserPreferencesRepository();
