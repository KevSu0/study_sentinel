// Minimal Dexie/fake-indexeddb smoke test to prove persistence path works on CI
// This avoids React provider intricacies in jsdom while still validating the real storage layer.

describe('real-state smoke (Dexie path)', () => {
  it('persists and reads events via eventRepository with fake-indexeddb', async () => {
    // Ensure fake-indexeddb is active (also loaded globally in jest.setup)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('fake-indexeddb/auto');

    const { eventRepository } = await import('@/lib/repositories');

    const ts = new Date().toISOString();
    const date = new Date(ts);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const record = {
      id: `evt_${Math.random().toString(36).slice(2)}`,
      type: 'TASK_ADD' as const,
      timestamp: ts,
      dateKey,
      payload: { taskId: 'smoke', title: 'Smoke' },
      meta: { v: 1 },
    };

    await (eventRepository as any).add(record);

    const all = await eventRepository.getAll();
    expect(Array.isArray(all)).toBe(true);
    expect(all.find((e: any) => e.id === record.id)).toBeTruthy();

    const todays = await eventRepository.getEventsByDate(dateKey);
    expect(todays.some((e: any) => e.id === record.id)).toBe(true);
  });
});
