import { ActivityEvent } from '@/lib/types';
import { db } from '../__mocks__/db';
import { activityRepository } from '../activity-repository';

jest.mock('../db', () => require('../__mocks__/db'));

describe('activityRepository', () => {
  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('createAttempt', () => {
    it('should create a new activity attempt and a create event', async () => {
      const params = {
        entityId: 'template-1',
        userId: 'user-1',
      };

      const newAttempt = await activityRepository.createAttempt(params);

      expect(newAttempt).toBeDefined();
      expect(newAttempt.entityId).toBe(params.entityId);
      expect(newAttempt.status).toBe('NOT_STARTED');
      expect(newAttempt.isActive).toBe(true);

      const events = await db.table('activityEvents').toArray();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('CREATE');
      expect(events[0].attemptId).toBe(newAttempt.id);
    });

    it('should throw an error if an active attempt already exists', async () => {
      const params = {
        entityId: 'template-1',
        userId: 'user-1',
      };

      await activityRepository.createAttempt(params);

      await expect(activityRepository.createAttempt(params)).rejects.toThrow(
        'An active attempt already exists for entityId: template-1',
      );
    });
  });

  describe('addEvent', () => {
    it('should add a start event', async () => {
      const { id: attemptId } = await activityRepository.createAttempt({
        entityId: 'template-1',
        userId: 'user-1',
      });

      await activityRepository.startAttempt({ attemptId });

      const events = await db.table('activityEvents').where({ attemptId }).toArray();
      expect(events.length).toBe(2);
      expect(events[1].type).toBe('START');
    });

    it('should add a pause event', async () => {
      const { id: attemptId } = await activityRepository.createAttempt({
        entityId: 'template-1',
        userId: 'user-1',
      });

      await activityRepository.pauseAttempt({ attemptId });

      const events = await db.table('activityEvents').where({ attemptId }).toArray();
      expect(events.length).toBe(2);
      expect(events[1].type).toBe('PAUSE');
    });

    it('should add a resume event', async () => {
      const { id: attemptId } = await activityRepository.createAttempt({
        entityId: 'template-1',
        userId: 'user-1',
      });

      await activityRepository.resumeAttempt({ attemptId });

      const events = await db.table('activityEvents').where({ attemptId }).toArray();
      expect(events.length).toBe(2);
      expect(events[1].type).toBe('RESUME');
    });

    it('should add a complete event', async () => {
      const { id: attemptId } = await activityRepository.createAttempt({
        entityId: 'template-1',
        userId: 'user-1',
      });

      await activityRepository.completeAttempt({
        attemptId,
      });

      const events = await db.table('activityEvents').where({ attemptId }).toArray();
      expect(events.length).toBe(2);
      expect(events[1].type).toBe('COMPLETE');
    });
  });

  describe('getHydratedAttemptsByDate', () => {
    it('should return hydrated attempts for a given date', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { id: attemptId } = await activityRepository.createAttempt({
        entityId: 'template-1',
        userId: 'user-1',
      });
      await db.table('plans').add({ id: 'template-1', name: 'Test Plan' });

      const hydratedAttempts = await activityRepository.getHydratedAttemptsByDate(today);

      expect(hydratedAttempts.length).toBe(1);
      expect(hydratedAttempts[0].id).toBe(attemptId);
      expect(hydratedAttempts[0].events.length).toBe(1);
      expect(hydratedAttempts[0].template).toBeDefined();
      expect(hydratedAttempts[0].template.title).toBe('Test Plan');
    });

    it('should return an empty array if no attempts are found for the given date', async () => {
      const hydratedAttempts = await activityRepository.getHydratedAttemptsByDate('2025-01-01');

      expect(hydratedAttempts.length).toBe(0);
    });
  });

  describe('applyEvents', () => {
    it('should apply new events to an existing attempt', async () => {
      const { id: attemptId } = await activityRepository.createAttempt({
        entityId: 'template-1',
        userId: 'user-1',
      });

      const newEvents = [
        {
          id: 'event-1',
          attemptId,
          type: 'START' as const,
          payload: {},
          source: 'LOCAL',
          createdAt: Date.now(),
          occurredAt: Date.now(),
        },
        {
          id: 'event-2',
          attemptId,
          type: 'COMPLETE' as const,
          payload: {
            productiveDuration: 100,
            pausedDuration: 0,
            points: 10,
          },
          source: 'LOCAL',
          createdAt: Date.now() + 1000,
          occurredAt: Date.now() + 1000,
        },
      ];

      await activityRepository.applyEvents(attemptId, newEvents as ActivityEvent[]);

      const updatedAttempt = await db.table('activityAttempts').get(attemptId);
      expect(updatedAttempt.status).toBe('COMPLETED');

      const events = await db.table('activityEvents').where({ attemptId }).toArray();
      expect(events.length).toBe(3);
    });

    it('should not throw an error if the attempt does not exist locally', async () => {
      const newEvents = [
        {
          id: 'event-1',
          attemptId: 'non-existent-attempt',
          type: 'START' as const,
          payload: {},
          source: 'LOCAL',
          createdAt: Date.now(),
          occurredAt: Date.now(),
        },
      ];

      await expect(
        activityRepository.applyEvents(
          'non-existent-attempt',
          newEvents as ActivityEvent[],
        ),
      ).resolves.not.toThrow();
    });
  });
});