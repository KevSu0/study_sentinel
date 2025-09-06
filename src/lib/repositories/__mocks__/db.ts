import Dexie from 'dexie';
import 'fake-indexeddb/auto';

export const db = new Dexie('test-db');

db.version(1).stores({
  activityAttempts: 'id, templateId, isActive, date, activeKey',
  activityEvents: 'id, attemptId, type, occurredAt',
  plans: 'id',
  routines: 'id',
});