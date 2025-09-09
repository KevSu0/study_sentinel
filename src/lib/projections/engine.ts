import { format } from 'date-fns';
import { eventRepository } from '../repositories';
import { buildSessionsFromEvents } from './sessions';
import { buildActivityFromEvents } from './activity';
import type { StudyTask, Routine, CompletedWork } from '../types';
import { getStudyDayBounds } from '../utils';

export type DailyProjection = {
  dateKey: string;
  sessions: CompletedWork[];
  activity: any[];
};

export async function projectDay(date: Date, tasks: StudyTask[], routines: Routine[]): Promise<DailyProjection> {
  const dateKey = format(date, 'yyyy-MM-dd');
  const { start, end } = getStudyDayBounds(date);
  const repo: any = eventRepository as any;
  const events = typeof repo.getByTimestampRange === 'function'
    ? await repo.getByTimestampRange(start.toISOString(), end.toISOString())
    : await eventRepository.getEventsByDate(dateKey);
  const sessions = buildSessionsFromEvents(events as any);
  const activity = buildActivityFromEvents(events as any, tasks, routines);
  return { dateKey, sessions, activity };
}
