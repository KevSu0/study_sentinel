/** @jest-environment jsdom */
import 'fake-indexeddb/auto';
import { sessionRepository } from '@/lib/repositories';

describe('dup-write guard for sessions', () => {
  it('upserts on duplicate session id without throwing', async () => {
    const s = {
      id: 'session-DUP',
      userId: 'user_profile',
      timestamp: new Date().toISOString(),
      duration: 600,
      pausedDuration: 0,
      points: 10,
      date: '2025-09-01',
      type: 'task' as const,
      title: 'Dup Test',
      isUndone: false,
    };

    const first = await sessionRepository.add(s as any);
    const second = await sessionRepository.add({ ...s, duration: 900 } as any);

    expect(first).toBe('session-DUP');
    expect(second).toBe('session-DUP');

    // One record present, with latest change
    const got = await (sessionRepository as any).getById('session-DUP');
    expect(got).toBeTruthy();
    expect(got.duration).toBe(900);
  });
});

