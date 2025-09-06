import { ActivityAttempt, ActivityEvent } from '@/lib/types';
import { AttemptStatus } from '@/lib/types';

/**
 * reduceEventsToState function
 *
 * This function takes an array of ActivityEvent objects and reduces them to a single
 * ActivityAttempt state. It processes the events in chronological order (first by
 * occurredAt, then by createdAt) and calculates the derived properties of the
 * activity attempt, such as its status, duration, and points earned.
 *
 * @param events - An array of ActivityEvent objects to be processed.
 * @returns A Partial<ActivityAttempt> representing the final state of the
 *          activity attempt after all events have been applied.
 */
export const reduceEventsToState = (
  events: ActivityEvent[]
): Partial<ActivityAttempt> => {
  // Sort events chronologically by occurredAt, then by createdAt
  const sortedEvents = [...events].sort((a, b) => {
    if (a.occurredAt !== b.occurredAt) {
      return a.occurredAt - b.occurredAt;
    }
    return a.createdAt - b.createdAt;
  });

  const initialState: Partial<ActivityAttempt> = {
    status: 'NOT_STARTED',
    duration: 0,
    pausedDuration: 0,
    pointsEarned: 0,
  };

  let lastTimestamp: number | null = null;
  let isPaused = false;

  const finalState = sortedEvents.reduce((state, event) => {
    if (lastTimestamp !== null) {
      const delta = event.occurredAt - lastTimestamp;
      if (isPaused) {
        state.pausedDuration = (state.pausedDuration || 0) + delta;
      } else {
        state.duration = (state.duration || 0) + delta;
      }
    }

    switch (event.type) {
      case 'START':
        if (state.startTime === undefined) {
          state.startTime = event.occurredAt;
        }
        isPaused = false;
        break;
      case 'PAUSE':
        isPaused = true;
        break;
      case 'RESUME':
        isPaused = false;
        break;
      case 'COMPLETE':
        state.status = 'COMPLETED';
        state.endTime = event.occurredAt;
        isPaused = true; // No more duration should be accumulated
        if (event.payload?.pointsAwarded) {
          state.pointsEarned =
            (state.pointsEarned || 0) + event.payload.pointsAwarded;
        }
        break;
      case 'CANCEL_DUPLICATE':
        state.status = 'CANCELLED';
        isPaused = true;
        break;
      case 'HARD_UNDO':
        state.status = 'INVALIDATED';
        isPaused = true;
        break;
      case 'POINTS_AWARDED':
        state.pointsEarned =
          (state.pointsEarned || 0) + (event.payload?.points || 0);
        break;
    }

    lastTimestamp = event.occurredAt;
    return state;
  }, initialState);

  return finalState;
};