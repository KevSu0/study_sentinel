import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { ActivityAttempt, ActivityEvent, HydratedActivityAttempt, Routine, StudyTask } from '../types';
import { reduceEventsToState } from '../core/reducer';

export const activityRepository = {
  async getActiveAttempt(): Promise<ActivityAttempt | null> {
    try {
      const attempt = await db.activityAttempts.where({ isActive: 1 }).first();
      return attempt || null;
    } catch (error) {
      console.error('Failed to get active attempt:', error);
      return null;
    }
  },

  async createAttempt(params: {
    entityId: string;
    userId: string;
  }): Promise<ActivityAttempt> {
    const { entityId, userId } = params;

    return db.transaction(
      'rw',
      db.activityAttempts,
      db.activityEvents,
      async () => {
        const activeKey = `${userId}|${entityId}`;
        const existingActiveAttempt = await db.activityAttempts
          .where({ activeKey })
          .first();

        if (existingActiveAttempt) {
          throw new Error('DUPLICATE_ACTIVE_ATTEMPT');
        }

        const task = await db.plans.get(entityId);
        const routine = await db.routines.get(entityId);

        if (!task && !routine) {
          throw new Error(`Entity with id ${entityId} not found.`);
        }

        const entityType = task ? 'task' : 'routine';

        const lastAttempt = await db.activityAttempts
          .where({ entityId: entityId })
          .reverse()
          .sortBy('ordinal');
        
        const lastOrdinal = lastAttempt[0] ? lastAttempt[0].ordinal : 0;
        const newOrdinal = (lastOrdinal || 0) + 1;

        const now = Date.now();
        const newAttempt: ActivityAttempt = {
          id: uuidv4(),
          entityId: entityId,
          entityType,
          ordinal: newOrdinal,
          status: 'NOT_STARTED',
          isActive: true,
          activeKey,
          createdAt: now,
          updatedAt: now,
          date: new Date(now).toISOString().slice(0, 10),
        };

        const createEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: newAttempt.id,
          type: 'CREATE',
          payload: { entityId: entityId },
          source: 'timer',
          occurredAt: now,
          createdAt: now,
        };

        await db.activityAttempts.add(newAttempt);
        await db.activityEvents.add(createEvent);

        return newAttempt;
      },
    );
  },

  async startAttempt(params: { attemptId: string }): Promise<void> {
    const { attemptId } = params;
    return db.transaction(
      'rw',
      db.activityAttempts,
      db.activityEvents,
      async () => {
        const now = Date.now();
        const startEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: attemptId,
          type: 'START',
          payload: {},
          source: 'timer',
          occurredAt: now,
          createdAt: now,
        };

        await db.activityEvents.add(startEvent);

        const allEvents = await db.activityEvents
          .where({ attemptId })
          .sortBy('occurredAt');
        const newState = reduceEventsToState(allEvents);

        await db.activityAttempts.update(attemptId, {
          ...newState,
          updatedAt: now,
        });
      },
    );
  },

  async pauseAttempt(params: { attemptId: string }): Promise<void> {
    const { attemptId } = params;
    return db.transaction(
      'rw',
      db.activityAttempts,
      db.activityEvents,
      async () => {
        const now = Date.now();
        const pauseEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: attemptId,
          type: 'PAUSE',
          payload: {},
          source: 'timer',
          occurredAt: now,
          createdAt: now,
        };

        await db.activityEvents.add(pauseEvent);

        const allEvents = await db.activityEvents
          .where({ attemptId })
          .sortBy('occurredAt');
        const newState = reduceEventsToState(allEvents);

        await db.activityAttempts.update(attemptId, {
          ...newState,
          updatedAt: now,
        });
      },
    );
  },

  async resumeAttempt(params: { attemptId: string }): Promise<void> {
    const { attemptId } = params;
    return db.transaction(
      'rw',
      db.activityAttempts,
      db.activityEvents,
      async () => {
        const now = Date.now();
        const resumeEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: attemptId,
          type: 'RESUME',
          payload: {},
          source: 'timer',
          occurredAt: now,
          createdAt: now,
        };

        await db.activityEvents.add(resumeEvent);

        const allEvents = await db.activityEvents
          .where({ attemptId })
          .sortBy('occurredAt');
        const newState = reduceEventsToState(allEvents);

        await db.activityAttempts.update(attemptId, {
          ...newState,
          updatedAt: now,
        });
      },
    );
  },

  async stopAttempt(params: { attemptId: string; reason: string }): Promise<void> {
    const { attemptId, reason } = params;
    return db.transaction(
      'rw',
      db.activityAttempts,
      db.activityEvents,
      async () => {
        const attempt = await db.activityAttempts.get(attemptId);
        if (!attempt) {
          throw new Error(`ActivityAttempt with id ${attemptId} not found.`);
        }
        if (!attempt.isActive) {
          throw new Error(`ActivityAttempt with id ${attemptId} is not active.`);
        }

        const now = Date.now();
        const stopEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: attemptId,
          type: 'CANCEL',
          payload: { reason },
          source: 'timer',
          occurredAt: now,
          createdAt: now,
        };

        await db.activityEvents.add(stopEvent);

        await db.activityAttempts.update(attemptId, {
          status: 'CANCELLED',
          isActive: false,
          activeKey: null,
          updatedAt: now,
        });
      },
    );
  },

  async completeAttempt(params: { attemptId: string }): Promise<void> {
    const { attemptId } = params;
    return db.transaction(
      'rw',
      db.activityAttempts,
      db.activityEvents,
      async () => {
        const now = Date.now();
        const completeEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: attemptId,
          type: 'COMPLETE',
          payload: {},
          source: 'timer',
          occurredAt: now,
          createdAt: now,
        };

        await db.activityEvents.add(completeEvent);

        const allEvents = await db.activityEvents
          .where({ attemptId })
          .sortBy('occurredAt');
        const finalState = reduceEventsToState(allEvents);

        await db.activityAttempts.update(attemptId, {
          ...finalState,
          status: 'COMPLETED',
          isActive: false,
          activeKey: null,
          updatedAt: now,
        });
      },
    );
  },

  async normalUndoOrRetry(params: {
    fromAttemptId: string;
    userId: string;
    type: 'UNDO_NORMAL' | 'RETRY';
  }): Promise<ActivityAttempt> {
    const { fromAttemptId, userId, type } = params;

    return db.transaction(
      'rw',
      db.activityAttempts,
      db.activityEvents,
      async () => {
        const fromAttempt = await db.activityAttempts.get(fromAttemptId);
        if (!fromAttempt) {
          throw new Error(`ActivityAttempt with id ${fromAttemptId} not found.`);
        }

        const now = Date.now();
        const event: ActivityEvent = {
          id: uuidv4(),
          attemptId: fromAttemptId,
          type: type,
          payload: { reason: 'User initiated' },
          source: 'timer',
          occurredAt: now,
          createdAt: now,
        };
        await db.activityEvents.add(event);

        return this.createAttempt({
          entityId: fromAttempt.entityId,
          userId,
        });
      },
    );
  },

  async manualLog(params: {
    entityId: string;
    duration: number;
    productiveDuration: number;
    pausedDuration: number;
    points: number;
    completedAt: number;
  }): Promise<void> {
    const {
      entityId,
      duration,
      productiveDuration,
      pausedDuration,
      points,
      completedAt,
    } = params;

    return db.transaction(
      'rw',
      db.activityAttempts,
      db.activityEvents,
      async () => {
        const now = Date.now();
        const manualLogEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: uuidv4(), // This is a new attempt
          type: 'MANUAL_LOG',
          payload: {
            entityId,
            duration,
            productiveDuration,
            pausedDuration,
            points,
            completedAt,
          },
          source: 'manual',
          occurredAt: now,
          createdAt: now,
        };

        await db.activityEvents.add(manualLogEvent);
      },
    );
  },

  async hardUndo(params: { attemptId: string }): Promise<void> {
    const { attemptId } = params;

    return db.transaction(
      'rw',
      db.activityAttempts,
      db.activityEvents,
      async () => {
        const now = Date.now();
        await db.activityAttempts.update(attemptId, {
          status: 'INVALIDATED',
          deletedAt: now,
          updatedAt: now,
        });

        await db.activityEvents.where({ attemptId }).delete();
      },
    );
  },

  async getHydratedAttempts(): Promise<any[]> {
    const attempts = await db.activityAttempts.toArray();
    const attemptIds = attempts.map(a => a.id);
    const events = await db.activityEvents.where('attemptId').anyOf(attemptIds).toArray();
    
    const eventsByAttemptId = events.reduce((acc, event) => {
      if (!acc[event.attemptId]) {
        acc[event.attemptId] = [];
      }
      acc[event.attemptId].push(event);
      return acc;
    }, {} as Record<string, ActivityEvent[]>);

    return attempts.map(attempt => ({
      ...attempt,
      events: eventsByAttemptId[attempt.id] || [],
    }));
  },

  async getHydratedAttemptsByDate(date: string): Promise<HydratedActivityAttempt[]> {
    const attempts = await db.activityAttempts.where('date').equals(date).toArray();
    if (attempts.length === 0) {
      return [];
    }

    const attemptIds = attempts.map(a => a.id);
    const events = await db.activityEvents.where('attemptId').anyOf(attemptIds).toArray();
    
    const eventsByAttemptId = events.reduce((acc, event) => {
      if (!acc[event.attemptId]) {
        acc[event.attemptId] = [];
      }
      acc[event.attemptId].push(event);
      return acc;
    }, {} as Record<string, ActivityEvent[]>);

    const templateIds = attempts.map(a => a.entityId);
    const tasks = await db.plans.where('id').anyOf(templateIds).toArray();
    const routines = await db.routines.where('id').anyOf(templateIds).toArray();

    const templatesById = [...tasks, ...routines].reduce((acc, template) => {
      acc[template.id] = template;
      return acc;
    }, {} as Record<string, StudyTask | Routine>);

    return attempts.map(attempt => ({
      ...attempt,
      events: eventsByAttemptId[attempt.id] || [],
      template: templatesById[attempt.entityId],
    }));
  },
  async applyEvents(attemptId: string, newEvents: ActivityEvent[]): Promise<void> {
    return db.transaction(
      'rw',
      db.activityAttempts,
      db.activityEvents,
      async () => {
        const attempt = await db.activityAttempts.get(attemptId);
        if (!attempt) {
          // If the attempt doesn't exist locally, it means this is a new
          // attempt from a different device. We should create it.
          // This logic can be enhanced later.
          console.warn(`ActivityAttempt with id ${attemptId} not found locally. This may be a new attempt from another device.`);
          return;
        }

        // Add the new events to the database
        await db.activityEvents.bulkAdd(newEvents);

        // Get all events for the attempt, including the new ones
        const allEvents = await db.activityEvents
          .where({ attemptId })
          .sortBy('occurredAt');

        // Re-run the reducer to calculate the new state of the attempt
        const newState = reduceEventsToState(allEvents);

        // Update the attempt with the new state
        await db.activityAttempts.update(attemptId, {
          ...newState,
          updatedAt: Date.now(),
        });
      },
    );
  },
};