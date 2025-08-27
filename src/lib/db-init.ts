
import { db } from './db';

let dbInitialized = false;

export async function initDatabase() {
  if (dbInitialized) {
    return;
  }
  try {
    // Dexie's open() method handles both creation and versioning.
    // The 'populate' event in db.ts will handle the initial migration.
    await db.open();
    console.log('Database initialized successfully.');
    dbInitialized = true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

    