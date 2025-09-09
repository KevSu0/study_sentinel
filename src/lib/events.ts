import { z } from 'zod';

// Canonical event types supported by the app
export type EventType =
  | 'TIMER_START'
  | 'TIMER_PAUSE'
  | 'TIMER_RESUME'
  | 'TIMER_STOP'
  | 'TIMER_SESSION_COMPLETE'
  | 'TASK_ADD'
  | 'TASK_UPDATE'
  | 'TASK_ARCHIVE'
  | 'TASK_UNARCHIVE'
  | 'TASK_PUSH_NEXT_DAY'
  | 'ROUTINE_ADD'
  | 'ROUTINE_UPDATE'
  | 'ROUTINE_DELETE'
  | 'ROUTINE_SESSION_COMPLETE'
  | 'TASK_RETRY'
  | 'ROUTINE_RETRY'
  | 'COMPLETION_REVOKED'
  | 'BADGE_EARNED'
  | 'SETTINGS_UPDATED'
  | 'PROFILE_UPDATED';

export const EventPayloadSchema = z.record(z.any());

export const EventSchema = z.object({
  id: z.string().min(1),
  type: z.custom<EventType>(),
  timestamp: z.string().min(1), // ISO 8601
  payload: EventPayloadSchema,
  dateKey: z.string().min(1), // yyyy-MM-dd of the study day
  meta: z
    .object({
      v: z.number().default(1),
      seq: z.number().optional(),
      idempotencyKey: z.string().optional(),
      refs: z
        .object({
          originalEventId: z.string().optional(),
          entityId: z.string().optional(),
        })
        .partial()
        .optional(),
    })
    .default({ v: 1 }),
});

export type EventRecord = z.infer<typeof EventSchema>;

