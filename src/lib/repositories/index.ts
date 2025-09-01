export * from './base.repository';
export * from './badge.repository';
export * from './meta.repository';
export * from './outbox.repository';
export * from './profile.repository';
export * from './session.repository';
export * from './stats_daily.repository';
export * from './task.repository';
export * from './routine.repository';
export * from './log.repository';

// Factory helpers used in tests and dynamic wiring paths
// They return the singleton repository instances and allow DI in tests.
import { taskRepository } from './task.repository';
import { profileRepository } from './profile.repository';
import { routineRepository } from './routine.repository';
import { logRepository } from './log.repository';
import { badgeRepository } from './badge.repository';

export const createTaskRepository = () => taskRepository;
export const createProfileRepository = () => profileRepository;
export const createRoutineRepository = () => routineRepository;
export const createLogRepository = () => logRepository;
export const createBadgeRepository = () => badgeRepository;
