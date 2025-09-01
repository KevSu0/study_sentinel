import { format, addDays, parse } from 'date-fns';
import { sessionRepository } from '@/lib/repositories/session.repository';
import { statsDailyRepository } from '@/lib/repositories/stats_daily.repository';
import type { DailyStat } from '@/lib/db';

export type DailyAggregate = Required<Pick<DailyStat,
  'date' | 'totalSeconds' | 'pausedSeconds' | 'points' | 'sessionsCount' | 'focusScore'>> & {
  subjects?: NonNullable<DailyStat['subjects']>;
};

export async function aggregateDay(date: string): Promise<DailyAggregate> {
  // Some test environments show inconsistent index querying; defensively filter
  const sessions = (await sessionRepository.getAll()).filter((s: any) => s.date === date);
  let totalSeconds = 0;
  let pausedSeconds = 0;
  let points = 0;
  const subjects: Record<string, { totalSeconds: number; points: number; sessionsCount: number }> = {};

  for (const s of sessions) {
    totalSeconds += s.duration || 0;
    pausedSeconds += s.pausedDuration || 0;
    points += s.points || 0;

    const subject = (s as any).subject || (s as any).subjectId || 'Unassigned';
    if (!subjects[subject]) subjects[subject] = { totalSeconds: 0, points: 0, sessionsCount: 0 };
    subjects[subject].totalSeconds += s.duration || 0;
    subjects[subject].points += s.points || 0;
    subjects[subject].sessionsCount += 1;
  }

  const productive = Math.max(0, totalSeconds - pausedSeconds);
  const focusScore = totalSeconds > 0 ? (productive / totalSeconds) * 100 : 100;

  const aggregate: DailyAggregate = {
    date,
    totalSeconds,
    pausedSeconds,
    points,
    sessionsCount: sessions.length,
    focusScore,
    subjects,
  };

  const existing = await statsDailyRepository.getByDate(date);
  if (existing?.id) {
    await statsDailyRepository.update(existing.id as string, aggregate as any);
  } else {
    await statsDailyRepository.add({ id: date, ...aggregate } as any);
  }
  return aggregate;
}

export async function aggregateRange(startDate: string, endDate: string): Promise<void> {
  const start = parse(startDate, 'yyyy-MM-dd', new Date());
  const end = parse(endDate, 'yyyy-MM-dd', new Date());
  let cursor = start;
  while (cursor <= end) {
    const d = format(cursor, 'yyyy-MM-dd');
    await aggregateDay(d);
    cursor = addDays(cursor, 1);
  }
}
