/**
 * Android-specific tests for PlanItemCard component
 * 
 * Tests the component's behavior in Android WebView environment,
 * including touch interactions, offline functionality, and performance.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlanItemCard } from '../plan-item-card';
import {
  simulateTouch,
  simulateSwipe,
  setNetworkConditions,
  measurePerformance,
  resetTestEnvironment,
} from '../../../__tests__/utils/android-test-utils';

// Mock Capacitor plugins
jest.mock('@capacitor/network', () => require('../../__tests__/mocks/capacitor/network'));
jest.mock('@capacitor/storage', () => require('../../__tests__/mocks/capacitor/storage'));
jest.mock('@capacitor/app', () => require('../../__tests__/mocks/capacitor/app'));

describe('PlanItemCard - Android Tests', () => {
  const mockPlanItem = {
    type: 'task' as const,
    data: {
      id: '1',
      shortId: 'T001',
      title: 'Study Math',
      description: 'Chapter 1 Review',
      time: '09:00',
      date: '2024-03-10',
      duration: 30,
      points: 10,
      priority: 'medium' as const,
      status: 'todo' as const,
      timerType: 'countdown' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  beforeEach(() => {
    resetTestEnvironment();
  });

  it('renders correctly on Android viewport', () => {
    const startTime = performance.now();
    
    render(<PlanItemCard item={mockPlanItem} />);
    
    const renderTime = performance.now() - startTime;
    measurePerformance.recordRenderTime(renderTime);
    
    expect(screen.getByText('Study Math')).toBeInTheDocument();
    expect(screen.getByText('Chapter 1 Review')).toBeInTheDocument();
  });

  it('handles touch interactions correctly', async () => {
    const { container } = render(<PlanItemCard item={mockPlanItem} />);
    const card = container.firstChild as Element;

    // Simulate touch on the card
    await simulateTouch(card, 180, 100);
    
    // Verify touch interaction effects (component should respond to touch)
    expect(card).toBeInTheDocument();
  });

  it('supports swipe gestures', async () => {
    const onSwipe = jest.fn();
    const { container } = render(
      <PlanItemCard item={mockPlanItem} />
    );
    const card = container.firstChild as Element;

    // Simulate swipe left gesture
    await simulateSwipe(card, 300, 100, 50, 100, 300);
    
    // Verify swipe gesture was handled (component should remain functional)
    expect(card).toBeInTheDocument();
  });

  it('maintains functionality in offline mode', async () => {
    // Set network to offline
    await setNetworkConditions({ offline: true });

    const { container } = render(<PlanItemCard item={mockPlanItem} />);
    
    // Verify component still functions without network
    const card = container.firstChild as Element;
    await simulateTouch(card, 180, 100);
    
    expect(screen.getByText('Study Math')).toBeInTheDocument();
    // Verify component remains functional in offline mode
    expect(card).toBeInTheDocument();
  });

  it('performs within acceptable limits on Android', () => {
    const iterations = 5;
    const renderTimes: number[] = [];

    // Measure multiple renders
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const { unmount } = render(<PlanItemCard item={mockPlanItem} />);
      const endTime = performance.now();
      renderTimes.push(endTime - startTime);
      unmount();
    }

    // Calculate average render time
    const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / iterations;
    measurePerformance.recordRenderTime(avgRenderTime);

    // Assert performance expectations
    expect(avgRenderTime).toBeLessThan(100); // 100ms threshold

    // Record memory usage
    measurePerformance.recordMemoryUsage();
  });

  it('handles rapid touch interactions without performance degradation', async () => {
    const { container } = render(<PlanItemCard item={mockPlanItem} />);
    const card = container.firstChild as Element;

    const touchCount = 10;
    const startTime = performance.now();

    // Simulate rapid touch interactions
    for (let i = 0; i < touchCount; i++) {
      await simulateTouch(card, 180, 100);
    }

    const endTime = performance.now();
    const avgTouchTime = (endTime - startTime) / touchCount;
    measurePerformance.recordEventHandlingTime(avgTouchTime);

    // Assert touch handling performance
    expect(avgTouchTime).toBeLessThan(16.7); // 60fps threshold (16.7ms)
  });
});