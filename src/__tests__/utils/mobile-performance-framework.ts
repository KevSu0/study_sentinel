import { jest } from '@jest/globals';
import { act, fireEvent } from '@testing-library/react';

// Performance metrics interface
export interface PerformanceMetrics {
  frameRate: number;
  averageFrameTime: number;
  droppedFrames: number;
  touchLatency: number;
  renderTime: number;
  memoryUsage: number;
}

// Touch event simulation
export interface TouchEventConfig {
  type: 'touchstart' | 'touchmove' | 'touchend';
  touches: Array<{
    clientX: number;
    clientY: number;
    identifier: number;
  }>;
  timestamp?: number;
}

// Performance monitoring class
export class MobilePerformanceMonitor {
  private frameCallbacks: number[] = [];
  private touchEvents: Array<{ timestamp: number; type: string }> = [];
  private memorySnapshots: number[] = [];
  private isMonitoring = false;
  private animationFrameId: number | null = null;

  startMonitoring(): void {
    this.isMonitoring = true;
    this.frameCallbacks = [];
    this.touchEvents = [];
    this.memorySnapshots = [];
    this.scheduleFrame();
  }

  stopMonitoring(): PerformanceMetrics {
    this.isMonitoring = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    return this.calculateMetrics();
  }

  cleanup(): void {
    this.stopMonitoring();
  }

  private scheduleFrame(): void {
    if (!this.isMonitoring) return;
    
    this.animationFrameId = requestAnimationFrame((timestamp) => {
      this.frameCallbacks.push(timestamp);
      
      // Simulate memory usage tracking
      if (typeof (performance as any).memory !== 'undefined') {
        this.memorySnapshots.push((performance as any).memory.usedJSHeapSize);
      } else {
        // Mock memory usage for testing
        this.memorySnapshots.push(Math.random() * 50000000 + 10000000);
      }
      
      this.scheduleFrame();
    });
  }

  recordTouchEvent(type: string): void {
    this.touchEvents.push({
      timestamp: performance.now(),
      type
    });
  }

  private calculateMetrics(): PerformanceMetrics {
    const frameCount = this.frameCallbacks.length;
    if (frameCount < 2) {
      return {
        frameRate: 0,
        averageFrameTime: 0,
        droppedFrames: 0,
        touchLatency: 0,
        renderTime: 0,
        memoryUsage: 0
      };
    }

    const totalTime = this.frameCallbacks[frameCount - 1] - this.frameCallbacks[0];
    const averageFrameTime = totalTime / (frameCount - 1);
    const frameRate = 1000 / averageFrameTime;
    
    // Calculate dropped frames (frames that took longer than 16.67ms)
    const frameTimes = [];
    for (let i = 1; i < frameCount; i++) {
      frameTimes.push(this.frameCallbacks[i] - this.frameCallbacks[i - 1]);
    }
    const droppedFrames = frameTimes.filter(time => time > 16.67).length;

    // Calculate touch latency
    const touchLatency = this.touchEvents.length > 1 
      ? (this.touchEvents[this.touchEvents.length - 1].timestamp - this.touchEvents[0].timestamp) / this.touchEvents.length
      : 0;

    // Calculate average memory usage
    const memoryUsage = this.memorySnapshots.length > 0
      ? this.memorySnapshots.reduce((sum, usage) => sum + usage, 0) / this.memorySnapshots.length
      : 0;

    return {
      frameRate: Math.round(frameRate * 100) / 100,
      averageFrameTime: Math.round(averageFrameTime * 100) / 100,
      droppedFrames,
      touchLatency: Math.round(touchLatency * 100) / 100,
      renderTime: totalTime,
      memoryUsage: Math.round(memoryUsage)
    };
  }
}

// Touch simulation utilities
export class TouchSimulator {
  private element: Element;
  private monitor: MobilePerformanceMonitor;

  constructor(element: Element, monitor: MobilePerformanceMonitor) {
    this.element = element;
    this.monitor = monitor;
  }

  simulateTouch(config: TouchEventConfig): void {
    this.monitor.recordTouchEvent(config.type);
    
    const touchEvent = new TouchEvent(config.type, {
      bubbles: true,
      cancelable: true,
      touches: config.touches.map(touch => ({
        ...touch,
        target: this.element,
        radiusX: 10,
        radiusY: 10,
        rotationAngle: 0,
        force: 1
      } as any))
    });

    act(() => {
      fireEvent(this.element, touchEvent);
    });
  }

  simulateSwipe(startX: number, startY: number, endX: number, endY: number, duration = 300): Promise<void> {
    return new Promise((resolve) => {
      const steps = 10;
      const stepDuration = duration / steps;
      const deltaX = (endX - startX) / steps;
      const deltaY = (endY - startY) / steps;

      // Start touch
      this.simulateTouch({
        type: 'touchstart',
        touches: [{ clientX: startX, clientY: startY, identifier: 0 }]
      });

      let currentStep = 0;
      const moveInterval = setInterval(() => {
        currentStep++;
        const currentX = startX + (deltaX * currentStep);
        const currentY = startY + (deltaY * currentStep);

        this.simulateTouch({
          type: 'touchmove',
          touches: [{ clientX: currentX, clientY: currentY, identifier: 0 }]
        });

        if (currentStep >= steps) {
          clearInterval(moveInterval);
          
          // End touch
          this.simulateTouch({
            type: 'touchend',
            touches: []
          });
          
          resolve();
        }
      }, stepDuration);
    });
  }

  simulatePinch(centerX: number, centerY: number, initialDistance: number, finalDistance: number, duration = 500): Promise<void> {
    return new Promise((resolve) => {
      const steps = 15;
      const stepDuration = duration / steps;
      const distanceDelta = (finalDistance - initialDistance) / steps;

      // Calculate initial touch positions
      const angle = Math.PI / 4; // 45 degrees
      let currentDistance = initialDistance;

      // Start pinch
      const touch1X = centerX - Math.cos(angle) * (currentDistance / 2);
      const touch1Y = centerY - Math.sin(angle) * (currentDistance / 2);
      const touch2X = centerX + Math.cos(angle) * (currentDistance / 2);
      const touch2Y = centerY + Math.sin(angle) * (currentDistance / 2);

      this.simulateTouch({
        type: 'touchstart',
        touches: [
          { clientX: touch1X, clientY: touch1Y, identifier: 0 },
          { clientX: touch2X, clientY: touch2Y, identifier: 1 }
        ]
      });

      let currentStep = 0;
      const pinchInterval = setInterval(() => {
        currentStep++;
        currentDistance = initialDistance + (distanceDelta * currentStep);

        const newTouch1X = centerX - Math.cos(angle) * (currentDistance / 2);
        const newTouch1Y = centerY - Math.sin(angle) * (currentDistance / 2);
        const newTouch2X = centerX + Math.cos(angle) * (currentDistance / 2);
        const newTouch2Y = centerY + Math.sin(angle) * (currentDistance / 2);

        this.simulateTouch({
          type: 'touchmove',
          touches: [
            { clientX: newTouch1X, clientY: newTouch1Y, identifier: 0 },
            { clientX: newTouch2X, clientY: newTouch2Y, identifier: 1 }
          ]
        });

        if (currentStep >= steps) {
          clearInterval(pinchInterval);
          
          // End pinch
          this.simulateTouch({
            type: 'touchend',
            touches: []
          });
          
          resolve();
        }
      }, stepDuration);
    });
  }
}

// Performance testing utilities
export const performanceTestUtils = {
  // Test 60fps rendering
  async testFrameRate(testFunction: () => Promise<void>, expectedFps = 60, tolerance = 5): Promise<PerformanceMetrics> {
    const monitor = new MobilePerformanceMonitor();
    monitor.startMonitoring();
    
    await testFunction();
    
    // Let it run for a bit to collect frame data
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const metrics = monitor.stopMonitoring();
    
    expect(metrics.frameRate).toBeGreaterThanOrEqual(expectedFps - tolerance);
    expect(metrics.frameRate).toBeLessThanOrEqual(expectedFps + tolerance);
    
    return metrics;
  },

  // Test touch responsiveness
  async testTouchResponsiveness(element: Element, maxLatency = 100): Promise<PerformanceMetrics> {
    const monitor = new MobilePerformanceMonitor();
    const touchSim = new TouchSimulator(element, monitor);
    
    monitor.startMonitoring();
    
    // Simulate rapid touch events
    for (let i = 0; i < 10; i++) {
      touchSim.simulateTouch({
        type: 'touchstart',
        touches: [{ clientX: 100 + i * 10, clientY: 100 + i * 10, identifier: 0 }]
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      touchSim.simulateTouch({
        type: 'touchend',
        touches: []
      });
    }
    
    const metrics = monitor.stopMonitoring();
    
    expect(metrics.touchLatency).toBeLessThanOrEqual(maxLatency);
    
    return metrics;
  },

  // Test memory efficiency
  async testMemoryUsage(testFunction: () => Promise<void>, maxMemoryIncrease = 10000000): Promise<PerformanceMetrics> {
    const monitor = new MobilePerformanceMonitor();
    monitor.startMonitoring();
    
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    await testFunction();
    
    const metrics = monitor.stopMonitoring();
    const memoryIncrease = metrics.memoryUsage - initialMemory;
    
    expect(memoryIncrease).toBeLessThanOrEqual(maxMemoryIncrease);
    
    return metrics;
  },

  // Test scroll performance
  async testScrollPerformance(element: Element, scrollDistance = 1000): Promise<PerformanceMetrics> {
    const monitor = new MobilePerformanceMonitor();
    const touchSim = new TouchSimulator(element, monitor);
    
    monitor.startMonitoring();
    
    // Simulate scroll gesture
    await touchSim.simulateSwipe(100, 300, 100, 300 - scrollDistance, 1000);
    
    const metrics = monitor.stopMonitoring();
    
    // Should maintain good frame rate during scroll
    expect(metrics.frameRate).toBeGreaterThanOrEqual(45); // Allow some frame drops during scroll
    expect(metrics.droppedFrames).toBeLessThanOrEqual(5);
    
    return metrics;
  },

  // Test pinch-to-zoom performance
  async testPinchZoomPerformance(element: Element): Promise<PerformanceMetrics> {
    const monitor = new MobilePerformanceMonitor();
    const touchSim = new TouchSimulator(element, monitor);
    
    monitor.startMonitoring();
    
    // Simulate pinch-to-zoom
    await touchSim.simulatePinch(200, 200, 100, 300, 800);
    
    const metrics = monitor.stopMonitoring();
    
    // Should handle pinch gestures smoothly
    expect(metrics.frameRate).toBeGreaterThanOrEqual(40);
    expect(metrics.touchLatency).toBeLessThanOrEqual(150);
    
    return metrics;
  },

  // Test memory efficiency (alias for testMemoryUsage)
  async testMemoryEfficiency(testFunction: () => Promise<void>, maxMemoryIncrease = 10000000): Promise<PerformanceMetrics> {
    return this.testMemoryUsage(testFunction, maxMemoryIncrease);
  }
};

// Device-specific performance expectations
export const devicePerformanceExpectations = {
  'low-end': {
    minFrameRate: 30,
    maxTouchLatency: 200,
    maxMemoryUsage: 50000000, // 50MB
    maxDroppedFrames: 10
  },
  'mid-range': {
    minFrameRate: 45,
    maxTouchLatency: 150,
    maxMemoryUsage: 100000000, // 100MB
    maxDroppedFrames: 5
  },
  'high-end': {
    minFrameRate: 60,
    maxTouchLatency: 100,
    maxMemoryUsage: 200000000, // 200MB
    maxDroppedFrames: 2
  }
};

// Performance assertion helpers
export const performanceAssertions = {
  assertFrameRate(metrics: PerformanceMetrics, deviceProfile: keyof typeof devicePerformanceExpectations): void {
    const expectations = devicePerformanceExpectations[deviceProfile];
    expect(metrics.frameRate).toBeGreaterThanOrEqual(expectations.minFrameRate);
    expect(metrics.droppedFrames).toBeLessThanOrEqual(expectations.maxDroppedFrames);
  },

  assertTouchResponsiveness(metrics: PerformanceMetrics, deviceProfile: keyof typeof devicePerformanceExpectations): void {
    const expectations = devicePerformanceExpectations[deviceProfile];
    expect(metrics.touchLatency).toBeLessThanOrEqual(expectations.maxTouchLatency);
  },

  assertMemoryEfficiency(metrics: PerformanceMetrics, deviceProfile: keyof typeof devicePerformanceExpectations): void {
    const expectations = devicePerformanceExpectations[deviceProfile];
    expect(metrics.memoryUsage).toBeLessThanOrEqual(expectations.maxMemoryUsage);
  },

  assertPinchToZoom(metrics: PerformanceMetrics, deviceProfile: keyof typeof devicePerformanceExpectations): void {
    const expectations = devicePerformanceExpectations[deviceProfile];
    expect(metrics.frameRate).toBeGreaterThanOrEqual(expectations.minFrameRate);
    expect(metrics.touchLatency).toBeLessThanOrEqual(expectations.maxTouchLatency);
  },

  assertOverallPerformance(metrics: PerformanceMetrics, deviceProfile: keyof typeof devicePerformanceExpectations): void {
    this.assertFrameRate(metrics, deviceProfile);
    this.assertTouchResponsiveness(metrics, deviceProfile);
    this.assertMemoryEfficiency(metrics, deviceProfile);
  }
};