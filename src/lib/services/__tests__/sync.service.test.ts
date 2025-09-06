import { activityRepository } from '@/lib/repositories/activity-repository';
import { db } from '@/lib/repositories/__mocks__/db';
import { syncService } from '../sync.service';

jest.mock('@/lib/repositories/db', () => require('@/lib/repositories/__mocks__/db'));

describe('syncService', () => {
  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('syncAll', () => {
    it('should handle local-only changes', async () => {
      const { id: attemptId } = await activityRepository.createAttempt({
        entityId: 'template-1',
        userId: 'user-1',
      });
      await activityRepository.startAttempt({ attemptId });

      const getUnsyncedEventsSpy = jest
        .spyOn(syncService as any, 'getUnsyncedEvents')
        .mockResolvedValue(await db.table('activityEvents').toArray());
      const fetchRemoteChangesSpy = jest
        .spyOn(syncService as any, 'fetchRemoteChanges')
        .mockResolvedValue({ newEvents: [], newSyncTimestamp: Date.now() });

      await syncService.syncAll();

      expect(getUnsyncedEventsSpy).toHaveBeenCalled();
      expect(fetchRemoteChangesSpy).toHaveBeenCalled();
    });

    it('should handle remote-only changes', async () => {
      const { id: attemptId } = await activityRepository.createAttempt({
        entityId: 'template-1',
        userId: 'user-1',
      });

      const remoteEvent = {
        id: 'remote-event-1',
        attemptId,
        type: 'START',
        payload: {},
        source: 'REMOTE',
        createdAt: Date.now(),
      };

      const getUnsyncedEventsSpy = jest
        .spyOn(syncService as any, 'getUnsyncedEvents')
        .mockResolvedValue([]);
      const fetchRemoteChangesSpy = jest
        .spyOn(syncService as any, 'fetchRemoteChanges')
        .mockResolvedValue({ newEvents: [remoteEvent], newSyncTimestamp: Date.now() });

      await syncService.syncAll();

      expect(getUnsyncedEventsSpy).toHaveBeenCalled();
      expect(fetchRemoteChangesSpy).toHaveBeenCalled();

      const events = await db.table('activityEvents').where({ attemptId }).toArray();
      expect(events.length).toBe(2);
      expect(events[1].id).toBe('remote-event-1');
    });

    it('should handle both local and remote changes', async () => {
      const { id: attemptId } = await activityRepository.createAttempt({
        entityId: 'template-1',
        userId: 'user-1',
      });
      await activityRepository.startAttempt({ attemptId });

      const remoteEvent = {
        id: 'remote-event-1',
        attemptId,
        type: 'PAUSE',
        payload: {},
        source: 'REMOTE',
        createdAt: Date.now() + 1000,
      };

      const getUnsyncedEventsSpy = jest
        .spyOn(syncService as any, 'getUnsyncedEvents')
        .mockResolvedValue(await db.table('activityEvents').toArray());
      const fetchRemoteChangesSpy = jest
        .spyOn(syncService as any, 'fetchRemoteChanges')
        .mockResolvedValue({ newEvents: [remoteEvent], newSyncTimestamp: Date.now() });

      await syncService.syncAll();

      expect(getUnsyncedEventsSpy).toHaveBeenCalled();
      expect(fetchRemoteChangesSpy).toHaveBeenCalled();

      const events = await db.table('activityEvents').where({ attemptId }).toArray();
      expect(events.length).toBe(3);
    });
  });
});