import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { ActivityAttempt, ActivityEvent } from '../types';

export const activityRepository = {
  async getActiveAttempt(): Promise<ActivityAttempt | null> {
    const attempt = await db.activityAttempts.where({ isActive: 1 }).first();
    return attempt || null;
  },

  async createAttempt(params: {
    templateId: string;
    userId: string;
  }): Promise<ActivityAttempt> {
    const { templateId, userId } = params;

    return db.transaction(
      'rw',
      db.activityAttempts,
      db.activityEvents,
      async () => {
        const existingActiveAttempt = await db.activityAttempts
          .where({ templateId, isActive: 1 })
          .first();

        if (existingActiveAttempt) {
          throw new Error(
            `An active attempt already exists for templateId: ${templateId}`,
          );
        }

        const lastAttempt = await db.activityAttempts
          .where({ templateId })
          .reverse()
          .sortBy('ordinal');
        
        const lastOrdinal = lastAttempt[0] ? lastAttempt[0].ordinal : 0;
        const newOrdinal = (lastOrdinal || 0) + 1;

        const now = Date.now();
        const newAttempt: ActivityAttempt = {
          id: uuidv4(),
          templateId,
          ordinal: newOrdinal,
          status: 'NOT_STARTED',
          isActive: true,
          activeKey: `${userId}|${templateId}`,
          createdAt: now,
          updatedAt: now,
        };

        const createEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: newAttempt.id,
          type: 'CREATE',
          payload: { templateId },
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
        const attempt = await db.activityAttempts.get(attemptId);
        if (!attempt) {
          throw new Error(`ActivityAttempt with id ${attemptId} not found.`);
        }
        if (!attempt.isActive) {
          throw new Error(`ActivityAttempt with id ${attemptId} is not active.`);
        }
        if (attempt.status !== 'NOT_STARTED') {
          throw new Error(
            `ActivityAttempt with id ${attemptId} has already started.`,
          );
        }

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
        const attempt = await db.activityAttempts.get(attemptId);
        if (!attempt) {
          throw new Error(`ActivityAttempt with id ${attemptId} not found.`);
        }
        if (!attempt.isActive) {
          throw new Error(`ActivityAttempt with id ${attemptId} is not active.`);
        }

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
        const attempt = await db.activityAttempts.get(attemptId);
        if (!attempt) {
          throw new Error(`ActivityAttempt with id ${attemptId} not found.`);
        }
        if (!attempt.isActive) {
          throw new Error(`ActivityAttempt with id ${attemptId} is not active.`);
        }

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

  async completeAttempt(params: {
    attemptId: string;
    duration: number;
    productiveDuration: number;
    pausedDuration: number;
    points: number;
  }): Promise<void> {
    const {
      attemptId,
      duration,
      productiveDuration,
      pausedDuration,
      points,
    } = params;
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
        const completeEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: attemptId,
          type: 'COMPLETE',
          payload: {
            duration,
            productiveDuration,
            pausedDuration,
            points,
          },
          source: 'timer',
          occurredAt: now,
          createdAt: now,
        };

        await db.activityEvents.add(completeEvent);

        await db.activityAttempts.update(attemptId, {
          status: 'COMPLETED',
          isActive: false,
          activeKey: null,
          updatedAt: now,
        });
      },
    );
  },

  async normalUndoOrRetry(params: {
    attemptIdToUndo: string;
    userId: string;
  }): Promise<ActivityAttempt> {
    const { attemptIdToUndo, userId } = params;

    return db.transaction(
      'rw',
      db.activityAttempts,
      db.activityEvents,
      async () => {
        const attemptToUndo = await db.activityAttempts.get(attemptIdToUndo);

        if (!attemptToUndo) {
          throw new Error(`ActivityAttempt with id ${attemptIdToUndo} not found.`);
        }
        if (attemptToUndo.status !== 'COMPLETED') {
          throw new Error(
            `ActivityAttempt with id ${attemptIdToUndo} is not completed.`,
          );
        }
        if (attemptToUndo.isActive) {
          throw new Error(
            `ActivityAttempt with id ${attemptIdToUndo} is still active.`,
          );
        }

        const now = Date.now();
        await db.activityAttempts.update(attemptIdToUndo, {
          status: 'INVALIDATED',
          deletedAt: now,
          updatedAt: now,
        });

        const undoEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: attemptIdToUndo,
          type: 'UNDO_NORMAL',
          payload: { reason: 'User initiated undo/retry' },
          source: 'timer',
          occurredAt: now,
          createdAt: now,
        };

        const newOrdinal = attemptToUndo.ordinal + 1;
        const newAttempt: ActivityAttempt = {
          id: uuidv4(),
          templateId: attemptToUndo.templateId,
          ordinal: newOrdinal,
          status: 'NOT_STARTED',
          isActive: true,
          activeKey: `${userId}|${attemptToUndo.templateId}`,
          createdAt: now,
          updatedAt: now,
        };

        const retryEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: newAttempt.id,
          type: 'RETRY',
          payload: { fromAttemptId: attemptIdToUndo },
          source: 'timer',
          occurredAt: now,
          createdAt: now,
        };

        await db.activityEvents.add(undoEvent);
        await db.activityAttempts.add(newAttempt);
        await db.activityEvents.add(retryEvent);

        return newAttempt;
      },
    );
  },

  async manualLog(params: {
    templateId: string;
    duration: number;
    productiveDuration: number;
    pausedDuration: number;
    points: number;
    completedAt: number; // Timestamp for when the activity was completed
  }): Promise<ActivityAttempt> {
    const {
      templateId,
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
        const lastAttempt = await db.activityAttempts
          .where({ templateId })
          .reverse()
          .sortBy('ordinal');

        const lastOrdinal = lastAttempt[0] ? lastAttempt[0].ordinal : 0;
        const newOrdinal = (lastOrdinal || 0) + 1;

        const completedAtDate = completedAt;

        const newAttempt: ActivityAttempt = {
          id: uuidv4(),
          templateId,
          ordinal: newOrdinal,
          status: 'COMPLETED',
          isActive: false,
          activeKey: null,
          createdAt: completedAtDate,
          updatedAt: completedAtDate,
        };

        const createEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: newAttempt.id,
          type: 'CREATE',
          payload: { templateId },
          source: 'manual',
          occurredAt: completedAt - duration,
          createdAt: completedAtDate,
        };

        const completeEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: newAttempt.id,
          type: 'COMPLETE',
          source: 'manual',
          payload: {
            duration,
            productiveDuration,
            pausedDuration,
            points,
          },
          occurredAt: completedAtDate,
          createdAt: completedAtDate,
        };

        await db.activityAttempts.add(newAttempt);
        await db.activityEvents.bulkAdd([createEvent, completeEvent]);

        return newAttempt;
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
        const attemptToUndo = await db.activityAttempts.get(attemptId);

        if (!attemptToUndo) {
          throw new Error(`ActivityAttempt with id ${attemptId} not found.`);
        }
        if (attemptToUndo.status !== 'COMPLETED') {
          throw new Error(
            `ActivityAttempt with id ${attemptId} is not completed.`,
          );
        }

        const now = Date.now();
        await db.activityAttempts.update(attemptId, {
          status: 'INVALIDATED',
          deletedAt: now,
          updatedAt: now,
        });

        const invalidateEvent: ActivityEvent = {
          id: uuidv4(),
          attemptId: attemptId,
          type: 'INVALIDATE',
          payload: { reason: 'User initiated hard undo/delete' },
          source: 'timer',
          occurredAt: now,
          createdAt: now,
        };

        await db.activityEvents.add(invalidateEvent);
      },
    );
  },
};