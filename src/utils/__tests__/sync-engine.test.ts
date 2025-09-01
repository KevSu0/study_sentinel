import { SyncEngine, syncEngine } from '../sync-engine';

describe('sync-engine', () => {
  test('addListener returns unsubscribe; sync invokes listeners', () => {
    const se = new SyncEngine();
    let count = 0;
    const off = se.addListener(() => { count++; });
    se.sync();
    expect(count).toBe(1);
    off();
    se.sync();
    expect(count).toBe(1); // unchanged after unsubscribe
  });

  test('clear removes all listeners', () => {
    const se = new SyncEngine();
    let a = 0, b = 0;
    se.addListener(() => { a++; });
    se.addListener(() => { b++; });
    se.clear();
    se.sync();
    expect(a).toBe(0);
    expect(b).toBe(0);
  });

  test('singleton syncEngine works', () => {
    let fired = 0;
    const off = syncEngine.addListener(() => { fired++; });
    syncEngine.sync();
    expect(fired).toBe(1);
    off();
  });
});

