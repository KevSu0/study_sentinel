import { createPerformanceMonitor, type PerfCaps } from '@/utils/performance-monitor';

class FakePO {
  cb: any;
  constructor(cb: any) { this.cb = cb; }
  observe() {
    this.cb({ getEntries: () => [{ entryType: 'longtask' } as any] });
  }
  disconnect() {}
}

test('no PerformanceObserver branch covered', () => {
  const mon = createPerformanceMonitor({ PerformanceObserver: undefined, memory: { usedJSHeapSize: 1 } });
  mon.sampleNow();
  expect(['unknown','stable','decreasing','increasing']).toContain(mon.getTrend());
  mon.dispose();
});

test('observer branch covered (longtask path)', () => {
  const mon = createPerformanceMonitor({ PerformanceObserver: FakePO as any, memory: { usedJSHeapSize: 1 } });
  // observe() fires immediately and pushes a longTask sample
  expect(mon._state.samples.some((s: any) => s.longTask)).toBe(true);
  mon.dispose();
});

test('memory trend increasing/decreasing/stable + trim >100', () => {
  const caps: PerfCaps = { PerformanceObserver: undefined, memory: { usedJSHeapSize: 1000 } };
  const mon = createPerformanceMonitor(caps);
  // stable
  mon.sampleNow(); // 1000
  mon.sampleNow(); // 1000
  expect(mon.getTrend()).toBe('stable');
  // increasing
  caps.memory!.usedJSHeapSize = 200000;
  mon.sampleNow();
  expect(mon.getTrend()).toBe('increasing');
  // decreasing
  caps.memory!.usedJSHeapSize = 100000;
  mon.sampleNow();
  expect(mon.getTrend()).toBe('decreasing');
  // trim
  for (let i = 0; i < 150; i++) mon.sampleNow();
  expect(mon._state.samples.length).toBeLessThanOrEqual(100);
  mon.dispose();
});

