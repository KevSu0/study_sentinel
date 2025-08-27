
import { Dexie, Transaction } from 'dexie';
import { taskRepository } from './repositories/task.repository';
import { profileRepository } from './repositories/profile.repository';
import { sessionRepository } from './repositories/session.repository';
import { badgeRepository } from './repositories/badge.repository';
import { SYSTEM_BADGES } from './badges';

export async function runMigration(tx: Transaction) {
  try {
    console.log('Running migration within transaction...');
    
    // Using the transaction objects directly for population
    const tasksTable = tx.table('plans');
    const profileTable = tx.table('users');
    const sessionsTable = tx.table('sessions');
    const badgesTable = tx.table('badges');

    const tasks = JSON.parse(localStorage.getItem('studySentinelTasks_v3') || '[]');
    const profile = JSON.parse(localStorage.getItem('studySentinelProfile_v3') || '{}');
    const sessions = JSON.parse(localStorage.getItem('studySentinelSessions_v3') || '[]');

    if (tasks.length > 0) {
      await tasksTable.bulkAdd(tasks);
      console.log(`${tasks.length} tasks migrated.`);
    }

    if (Object.keys(profile).length > 0) {
      const profileWithId = { ...profile, id: 'user_profile' };
      await profileTable.add(profileWithId);
      console.log(`Profile migrated.`);
    }

    if (sessions.length > 0) {
      await sessionsTable.bulkAdd(sessions);
      console.log(`${sessions.length} sessions migrated.`);
    }

    const systemBadges = SYSTEM_BADGES.map((b, i) => ({ ...b, id: `system_${i + 1}`, isCustom: false, isEnabled: true }));
    await badgesTable.bulkAdd(systemBadges);
    console.log(`${systemBadges.length} system badges populated.`);
    
    console.log('Migration completed successfully.');

  } catch (error) {
    console.error('Migration failed:', error);
    // Dexie will automatically abort the transaction on error.
  }
}

    