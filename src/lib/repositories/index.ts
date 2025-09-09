export * from './base.repository';
export * from './badge.repository';
export * from './meta.repository';
export * from './outbox.repository';
export * from './profile.repository';
export * from './session.repository';
export * from './stats_daily.repository';
export * from './task.repository';
export * from './routine.repository';
export * from './event.repository';

// Factory helpers used in tests and dynamic wiring paths
// They return the singleton repository instances and allow DI in tests.
import { taskRepository } from './task.repository';
import { profileRepository } from './profile.repository';
import { routineRepository } from './routine.repository';
import { eventRepository } from './event.repository';
import { badgeRepository } from './badge.repository';
import { sessionRepository } from './session.repository';

export {
  profileRepository,
  routineRepository,
  taskRepository,
  badgeRepository,
  eventRepository,
  sessionRepository,
};

// Factory functions
export const createProfileRepository = () => profileRepository;
export const createRoutineRepository = () => routineRepository;
export const createTaskRepository = () => taskRepository;
export const createBadgeRepository = () => badgeRepository;
export const createEventRepository = () => eventRepository;
export const createSessionRepository = () => sessionRepository;
