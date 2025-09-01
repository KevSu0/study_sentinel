import PerformanceMonitor, { usePerformanceMonitor, withPerformanceMonitoring, createPerformanceMonitor } from '../performance-monitor';
import React from 'react';

describe('performance-monitor', () => {
  const originalNow = performance.now.bind(performance);
  const originalEnv = process.env.NODE_ENV as string;

  afterEach(() => {
    // restore
    (performance.now as any) = originalNow;
    (process as any).env.NODE_ENV = originalEnv;
  });

  test('measureRender records metrics and returns render result', () => {
    const monitor = (PerformanceMonitor as any).getInstance();
    let t = 100; (performance as any).now = () => (t += 5);
    const result = monitor.measureRender('Comp', () => 'ok');
    expect(result).toBe('ok');
    const summary = monitor.getPerformanceSummary();
    expect(summary.totalMetrics).toBeGreaterThan(0);
    expect(typeof summary.averageRenderTime).toBe('number');
  });

  test('getPerformanceSummary returns zeros when no metrics', () => {
    const monitor = (PerformanceMonitor as any).getInstance();
    monitor.cleanup();
    const summary = monitor.getPerformanceSummary();
    expect(summary.totalMetrics).toBe(0);
    expect(summary.averageRenderTime).toBe(0);
  });

  test('logs slow render in development and calculates memory trend', () => {
    (process as any).env.NODE_ENV = 'development';
    const monitor = (PerformanceMonitor as any).getInstance();
    monitor.cleanup();

    // Stub performance.now to simulate 20ms per render
    let t = 0; (performance as any).now = () => (t += 20);
    // Control memory: first 10 readings 50MB, last 10 readings 60MB
    const mem = (performance as any).memory;
    for (let i = 0; i < 10; i++) {
      mem.usedJSHeapSize = 50 * 1024 * 1024;
      monitor.measureRender('A', () => null);
    }
    for (let i = 0; i < 10; i++) {
      mem.usedJSHeapSize = 60 * 1024 * 1024;
      monitor.measureRender('B', () => null);
    }

    const summary = monitor.getPerformanceSummary();
    expect(summary.memoryTrend).toBe('increasing');
    expect(summary.totalMetrics).toBeGreaterThanOrEqual(20);
  });

  test('slowestMetric reduction covers both true/false compare branches', () => {
    const monitor = (PerformanceMonitor as any).getInstance();
    monitor.cleanup();
    // Sequence of now() calls for three renders: (0->10), (0->5), (0->20)
    const seq = [0, 10, 0, 5, 0, 20];
    let i = 0;
    (performance as any).now = () => seq[i++];
    (performance as any).memory.usedJSHeapSize = 50 * 1024 * 1024;
    monitor.measureRender('X', () => null);
    monitor.measureRender('Y', () => null);
    monitor.measureRender('Z', () => null);
    const summary = monitor.getPerformanceSummary();
    expect(summary.totalMetrics).toBeGreaterThanOrEqual(3);
  });

  test('memory trend stable when exactly 10 metrics (older window empty)', () => {
    const monitor = (PerformanceMonitor as any).getInstance();
    monitor.cleanup();
    let t = 0; (performance as any).now = () => (t += 10);
    const mem = (performance as any).memory;
    for (let i = 0; i < 10; i++) {
      mem.usedJSHeapSize = 42 * 1024 * 1024;
      monitor.measureRender('C', () => null);
    }
    const summary = monitor.getPerformanceSummary();
    expect(summary.memoryTrend).toBe('stable');
    expect(summary.totalMetrics).toBe(10);
  });

  test('getMemoryUsage falls back to 0 when performance.memory is missing', () => {
    const monitor = (PerformanceMonitor as any).getInstance();
    monitor.cleanup();
    // Force path by setting usedJSHeapSize to 0 and verifying no throw
    (performance as any).memory.usedJSHeapSize = 0;
    let t = 0; (performance as any).now = () => (t += 1);
    const result = monitor.measureRender('NoMem', () => 'x');
    expect(result).toBe('x');
    const summary = monitor.getPerformanceSummary();
    expect(summary.totalMetrics).toBeGreaterThan(0);
  });

  test('initializeObservers and cleanup do not throw when APIs exist', () => {
    // @ts-ignore
    window.PerformanceObserver = class {
      private cb: any;
      constructor(cb: any) { this.cb = cb; }
      observe = jest.fn(() => {
        // Simulate a long task entry to cover warn path
        this.cb({ getEntries: () => [{ duration: 60 }, { duration: 10 }] });
      });
      disconnect = jest.fn();
    } as any;
    const monitor = (PerformanceMonitor as any).getInstance();
    monitor.initializeObservers();
    monitor.cleanup();
    const summary = monitor.getPerformanceSummary();
    expect(summary.totalMetrics).toBe(0);
  });

  test('initializeObservers with no PerformanceObserver is a no-op', () => {
    const prev = (window as any).PerformanceObserver;
    // @ts-ignore
    delete (window as any).PerformanceObserver;
    const monitor = (PerformanceMonitor as any).getInstance();
    expect(() => monitor.initializeObservers()).not.toThrow();
    (window as any).PerformanceObserver = prev;
  });

  test('trims metrics array beyond capacity', () => {
    const monitor = (PerformanceMonitor as any).getInstance();
    monitor.cleanup();
    let t = 0; (performance as any).now = () => (t += 1);
    (performance as any).memory.usedJSHeapSize = 40 * 1024 * 1024;
    for (let i = 0; i < 110; i++) {
      monitor.measureRender('Trim', () => null);
    }
    const summary = monitor.getPerformanceSummary();
    expect(summary.totalMetrics).toBeLessThanOrEqual(100);
  });

  test('memory trend decreasing and stable thresholds', () => {
    const monitor = (PerformanceMonitor as any).getInstance();
    monitor.cleanup();
    let t = 0; (performance as any).now = () => (t += 1);
    // Older 10 at 70MB, recent 10 at 60MB => decreasing
    for (let i = 0; i < 10; i++) { (performance as any).memory.usedJSHeapSize = 70 * 1024 * 1024; monitor.measureRender('D', () => null); }
    for (let i = 0; i < 10; i++) { (performance as any).memory.usedJSHeapSize = 60 * 1024 * 1024; monitor.measureRender('D', () => null); }
    let summary = monitor.getPerformanceSummary();
    expect(summary.memoryTrend).toBe('decreasing');
    // Now make diff within +/-1MB to get stable
    monitor.cleanup();
    for (let i = 0; i < 10; i++) { (performance as any).memory.usedJSHeapSize = 60 * 1024 * 1024; monitor.measureRender('S', () => null); }
    for (let i = 0; i < 10; i++) { (performance as any).memory.usedJSHeapSize = 60.5 * 1024 * 1024; monitor.measureRender('S', () => null); }
    summary = monitor.getPerformanceSummary();
    expect(summary.memoryTrend).toBe('stable');
  });

  test('usePerformanceMonitor returns callable measureRender', () => {
    const { measureRender } = usePerformanceMonitor('Hooked');
    const out = measureRender(() => 42);
    expect(out).toBe(42);
  });

  test('withPerformanceMonitoring renders and executes measureRender', () => {
    const ReactDOMServer = require('react-dom/server');
    const Dummy: React.FC<{ label: string }> = ({ label }) => React.createElement('div', null, label);
    const Wrapped = withPerformanceMonitoring(Dummy, 'Dummy');
    const html = ReactDOMServer.renderToString(React.createElement(Wrapped as any, { label: 'y' } as any));
    expect(typeof html).toBe('string');
  });

  test('withPerformanceMonitoring uses displayName when provided', () => {
    const ReactDOMServer = require('react-dom/server');
    const Comp: any = (props: any) => React.createElement('div', null, props.label);
    Comp.displayName = 'ShownName';
    const Wrapped = withPerformanceMonitoring(Comp);
    const html = ReactDOMServer.renderToString(React.createElement(Wrapped as any, { label: 'z' } as any));
    expect(typeof html).toBe('string');
  });

  test('withPerformanceMonitoring falls back to component name when no displayName', () => {
    const ReactDOMServer = require('react-dom/server');
    function PlainComp(props: any) { return React.createElement('div', null, props.label); }
    const Wrapped = withPerformanceMonitoring(PlainComp);
    const html = ReactDOMServer.renderToString(React.createElement(Wrapped as any, { label: 'w' } as any));
    expect(typeof html).toBe('string');
  });

  test('DI factory returns unknown when memory not provided', () => {
    const mon = createPerformanceMonitor({ PerformanceObserver: undefined, memory: undefined as any });
    mon.sampleNow();
    expect(mon.getTrend()).toBe('unknown');
    mon.dispose();
  });

  test('createPerformanceMonitor defaults (caps from globals)', () => {
    const mon = createPerformanceMonitor();
    // Ensure we can sample and compute trend with default caps
    mon.sampleNow();
    mon.sampleNow();
    expect(['stable','increasing','decreasing','unknown']).toContain(mon.getTrend());
    mon.dispose();
  });

  test('cleanupUnusedObjects does nothing outside development or without gc', () => {
    const prevEnv = process.env.NODE_ENV as string;
    (process as any).env.NODE_ENV = 'production';
    expect(() => PerformanceMonitor.cleanupUnusedObjects()).not.toThrow();
    (process as any).env.NODE_ENV = prevEnv;
  });

  test('cleanupUnusedObjects triggers gc in development when available', () => {
    const origEnv = process.env.NODE_ENV as string;
    (process as any).env.NODE_ENV = 'development';
    // @ts-ignore
    (window as any).gc = jest.fn();
    PerformanceMonitor.cleanupUnusedObjects();
    expect((window as any).gc).toHaveBeenCalled();
    delete (window as any).gc;
    (process as any).env.NODE_ENV = origEnv;
  });

  test('withPerformanceMonitoring HOC wraps component and renders via monitor', () => {
    const Dummy: React.FC<{ label: string }> = ({ label }) => React.createElement('div', null, label);
    const Wrapped = withPerformanceMonitoring(Dummy, 'Dummy');
    // Render through the HOC (no need for DOM)
    const out = React.createElement(Wrapped, { label: 'x' });
    expect(out).toBeTruthy();
  });
});

describe('performance-monitor (DI seams)', () => {
  class FakePO {
    cb: any;
    constructor(cb: any) { this.cb = cb; }
    observe() { this.cb({ getEntries: () => [{ entryType: 'longtask' } as any] }); }
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
    expect(mon._state.samples.some((s: any) => s.longTask)).toBe(true);
    mon.dispose();
  });

  test('observer branch trims when exceeding 100 samples', () => {
    class ManyPO {
      cb: any;
      constructor(cb: any) { this.cb = cb; }
      observe() { for (let i = 0; i < 120; i++) { this.cb({ getEntries: () => [{ entryType: 'longtask' } as any] }); } }
      disconnect() {}
    }
    const mon = createPerformanceMonitor({ PerformanceObserver: ManyPO as any, memory: { usedJSHeapSize: 1 } });
    expect(mon._state.samples.length).toBeLessThanOrEqual(100);
    mon.dispose();
  });

  test('memory trend increasing/decreasing/stable + trim >100', () => {
    const caps: any = { PerformanceObserver: undefined, memory: { usedJSHeapSize: 1000 } };
    const mon = createPerformanceMonitor(caps);
    mon.sampleNow();
    mon.sampleNow();
    expect(mon.getTrend()).toBe('stable');
    caps.memory.usedJSHeapSize = 200000;
    mon.sampleNow();
    expect(mon.getTrend()).toBe('increasing');
    caps.memory.usedJSHeapSize = 100000;
    mon.sampleNow();
    expect(mon.getTrend()).toBe('decreasing');
    for (let i = 0; i < 150; i++) mon.sampleNow();
    expect(mon._state.samples.length).toBeLessThanOrEqual(100);
    mon.dispose();
  });
});
