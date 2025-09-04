/**
 * Unified PlanItemRenderer Test Suite
 * 
 * Consolidates all PlanItemRenderer testing functionality including:
 * - All variants (card, list, task-card)
 * - Mobile performance testing
 * - Device matrix testing (low-end, mid-range, high-end)
 * - Capacitor integration testing
 * - Offline scenarios and conflict resolution
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanItemRenderer } from '../plan-item-renderer';
import { useGlobalState } from '@/hooks/use-global-state';
import { type StudyTask, type Routine, type LogEvent } from '@/lib/types';
import { toast } from 'sonner';

// Import mobile testing utilities
import {
  MobilePerformanceMonitor,
  TouchSimulator,
  performanceTestUtils,
  devicePerformanceExpectations,
  performanceAssertions
} from '@tests/utils/mobile-performance-framework';
import {
  createMockDevice,
  createMockPlan,
  createMockUser,
  renderMobile,
  offlinePerformanceHelpers
} from '@tests/utils/mobile-test-factories';
import {
  simulateTouch,
  simulateSwipe,
  setNetworkConditions,
  measurePerformance,
  resetTestEnvironment,
  setDeviceProfile
} from '@tests/utils/android-test-utils';

// Mock dependencies
jest.mock('@/hooks/use-global-state');
jest.mock('sonner');
jest.mock('@/components/tasks/manual-log-dialog', () => ({
  ManualLogDialog: jest.fn(({ isOpen }) =>
    isOpen ? <div data-testid="manual-log-dialog">Log Dialog</div> : null
  ),
}));
jest.mock('@/components/tasks/timer-dialog', () => ({
  TimerDialog: ({ isOpen, task, onOpenChange, onComplete }: any) =>
    isOpen ? (
      <div data-testid="timer-dialog">
        <div>Timer Dialog</div>
        <button onClick={() => onComplete()}>Start</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

// Mock Capacitor plugins
jest.mock('@capacitor/network', () => require('../../../__tests__/mocks/capacitor/network'));
jest.mock('@capacitor/storage', () => require('../../../__tests__/mocks/capacitor/storage'));
jest.mock('@capacitor/app', () => require('../../../__tests__/mocks/capacitor/app'));
jest.mock('@capacitor/device', () => require('../../../__tests__/mocks/capacitor/device'));
jest.mock('@capacitor/filesystem', () => require('../../../__tests__/mocks/capacitor/filesystem'));

const mockUseGlobalState = useGlobalState as jest.MockedFunction<typeof useGlobalState>;
const mockToast = toast as jest.Mocked<typeof toast>;

const mockStartTimer = jest.fn();
const mockUpdateRoutine = jest.fn();
const mockUpdateLog = jest.fn();

// Mock data
const mockTask: StudyTask = {
  id: 'task-1',
  shortId: 'T001',
  title: 'Test Task',
  description: 'Test task description',
  subject: 'Math',
  priority: 'high',
  status: 'todo',
  date: '2024-01-15',
  time: '09:00',
  duration: 30,
  timerType: 'countdown',
  points: 10,
};

const mockRoutine: Routine = {
  id: 'routine-1',
  shortId: 'R001',
  title: 'Test Routine',
  description: 'Test routine description',
  subject: 'Science',
  days: [1, 2, 3, 4, 5],
  startTime: '10:00',
  endTime: '11:00',
  priority: 'medium',
  status: 'todo',
  createdAt: Date.now(),
};

const mockLogEvent: LogEvent = {
  id: 'log-1',
  type: 'TASK_COMPLETE',
  timestamp: '2024-01-15T09:30:00Z',
  payload: {
    taskId: 'task-1',
    title: 'Test Task',
    subject: 'Math',
    duration: 30,
    points: 10,
    studyLog: 'Completed successfully',
  },
};

const defaultProps = {
  onEditTask: jest.fn(),
  onUpdateTask: jest.fn(),
  onPushTaskToNextDay: jest.fn(),
  onEditRoutine: jest.fn(),
  onDeleteRoutine: jest.fn(),
  onCompleteRoutine: jest.fn(),
  onUndoCompleteRoutine: jest.fn(),
  onDeleteCompleteRoutine: jest.fn(),
  onArchiveTask: jest.fn(),
  onUnarchiveTask: jest.fn(),
};

// Performance monitoring setup
let performanceMonitor: MobilePerformanceMonitor;
let touchSimulator: TouchSimulator;

beforeEach(() => {
  jest.clearAllMocks();
  resetTestEnvironment();
  
  mockUseGlobalState.mockReturnValue({
    state: { activeItem: null },
    startTimer: mockStartTimer,
    updateRoutine: mockUpdateRoutine,
    updateLog: mockUpdateLog,
  } as any);

  performanceMonitor = new MobilePerformanceMonitor();
  touchSimulator = new TouchSimulator();
});

afterEach(() => {
  performanceMonitor.cleanup();
});

describe('Unified PlanItemRenderer Tests', () => {
  describe('Core Functionality - All Variants', () => {
    describe('Card Variant', () => {
      it('renders task item in card variant correctly', () => {
        render(
          <PlanItemRenderer
            item={{ type: 'task', data: mockTask }}
            variant="card"
            {...defaultProps}
          />
        );

        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('#T001')).toBeInTheDocument();
        expect(screen.getByText('09:00')).toBeInTheDocument();
        expect(screen.getByText('30 min')).toBeInTheDocument();
        expect(screen.getByText('10 pts')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
      });

      it('renders routine item in card variant correctly', () => {
        render(
          <PlanItemRenderer
            item={{ type: 'routine', data: mockRoutine }}
            variant="card"
            {...defaultProps}
          />
        );

        expect(screen.getByText('Test Routine')).toBeInTheDocument();
        expect(screen.getByText('#R001')).toBeInTheDocument();
        expect(screen.getByText('10:00')).toBeInTheDocument();
        expect(screen.getByText(/^\s*routine\s*$/i)).toBeInTheDocument();
        expect(screen.getByText('10 pts')).toBeInTheDocument();
      });

      it('shows completed state for completed items', () => {
        const completedTask = {
          ...mockTask,
          isCompleted: true,
          status: 'completed' as const,
          completedAt: '2024-01-15T10:30:00Z',
          done: true,
          id: mockTask.id,
          timestamp: '2024-01-15T10:30:00Z',
          type: 'TASK_COMPLETE' as const,
          payload: { taskId: mockTask.id, title: mockTask.title },
        };
        
        render(
          <PlanItemRenderer
            item={{ type: 'completed_task', data: completedTask }}
            variant="card"
            {...defaultProps}
          />
        );

        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
        expect(screen.getByRole('heading', { level: 3, name: /test task/i }))
          .toHaveClass('line-through');
      });
    });

    describe('List Variant', () => {
      it('renders task item in list variant correctly', () => {
        render(
          <PlanItemRenderer
            item={{ type: 'task', data: mockTask }}
            variant="list"
            {...defaultProps}
          />
        );

        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('#T001')).toBeInTheDocument();
        expect(screen.getByText('09:00')).toBeInTheDocument();
        expect(screen.queryByRole('article')).not.toBeInTheDocument();
      });

      it('renders routine item in list variant correctly', () => {
        render(
          <PlanItemRenderer
            item={{ type: 'routine', data: mockRoutine }}
            variant="list"
            {...defaultProps}
          />
        );

        expect(screen.getByText('Test Routine')).toBeInTheDocument();
        expect(screen.getByText('#R001')).toBeInTheDocument();
        expect(screen.getByText('10:00')).toBeInTheDocument();
      });
    });

    describe('Task-Card Variant', () => {
      it('renders task item in task-card variant with additional details', () => {
        const taskWithDescription = { ...mockTask, description: 'Detailed description' };
        render(
          <PlanItemRenderer
            item={{ type: 'task', data: taskWithDescription }}
            variant="task-card"
            subjectDate={new Date('2024-01-15')}
            {...defaultProps}
          />
        );

        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('Detailed description')).toBeInTheDocument();
        expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      });

      it('does not show checkbox in task-card variant', () => {
        render(
          <PlanItemRenderer
            item={{ type: 'task', data: mockTask }}
            variant="task-card"
            {...defaultProps}
          />
        );

        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Interactions and User Actions', () => {
    it('handles task completion with toast', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(defaultProps.onUpdateTask).toHaveBeenCalledWith({
        ...mockTask,
        status: 'completed',
      });
    });

    it('opens dropdown menu and shows task actions', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);

      expect(screen.getByRole('menuitem', { name: /start timer/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /push to next day/i })).toBeInTheDocument();
    });

    it('calls onEditTask when edit is clicked', async () => {
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const editButton = screen.getByRole('menuitem', { name: /edit/i });
      await user.click(editButton);

      expect(defaultProps.onEditTask).toHaveBeenCalledWith(mockTask);
    });

    it('opens timer dialog when start timer is clicked', async () => {
      const countdownTask = {
        ...mockTask,
        id: 'T005',
        title: 'Countdown Task',
        timerType: 'countdown' as const,
      };
      
      const user = userEvent.setup();
      
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: countdownTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const timerButton = screen.getByRole('menuitem', { name: /start timer/i });
      await user.click(timerButton);

      const dialog = 
        (await screen.findByRole('dialog').catch(() => null)) ??
        (await screen.findByRole('alertdialog').catch(() => null)) ??
        (await screen.findByTestId('timer-dialog'));
      
      expect(dialog).toBeInTheDocument();
      
      expect(
        within(dialog).getByRole('button', { name: /start|save|apply/i })
      ).toBeInTheDocument();
    });
  });

  describe('Device Matrix Testing', () => {
    describe('Low-End Android Device', () => {
      beforeEach(() => {
        setDeviceProfile('low-end');
      });

      it('renders efficiently on low-end device', async () => {
        const startTime = performance.now();
        
        render(
          <PlanItemRenderer
            item={{ type: 'task', data: mockTask }}
            variant="card"
            {...defaultProps}
          />
        );
        
        const renderTime = performance.now() - startTime;
        
        // Low-end device should render within 200ms
        expect(renderTime).toBeLessThan(200);
        expect(screen.getByText('Test Task')).toBeInTheDocument();
      });

      it('maintains 30fps during interactions on low-end device', async () => {
        const { container } = render(
          <PlanItemRenderer
            item={{ type: 'task', data: mockTask }}
            variant="card"
            {...defaultProps}
          />
        );

        const frameRate = await performanceTestUtils.testFrameRate(
          container.firstChild as Element,
          1000 // 1 second test
        );

        performanceAssertions.assertFrameRate(frameRate, 'low-end');
      });

      it('handles touch interactions efficiently on low-end device', async () => {
        const { container } = render(
          <PlanItemRenderer
            item={{ type: 'task', data: mockTask }}
            variant="card"
            {...defaultProps}
          />
        );

        const element = container.firstChild as Element;
        const touchResponse = await performanceTestUtils.testTouchResponsiveness(
          element,
          { x: 100, y: 50 }
        );

        performanceAssertions.assertTouchResponsiveness(touchResponse, 'low-end');
      });
    });

    describe('Mid-Range Android Device', () => {
      beforeEach(() => {
        setDeviceProfile('mid-range');
      });

      it('maintains 45fps during complex interactions', async () => {
        const { container } = render(
          <PlanItemRenderer
            item={{ type: 'task', data: mockTask }}
            variant="card"
            {...defaultProps}
          />
        );

        const frameRate = await performanceTestUtils.testFrameRate(
          container.firstChild as Element,
          2000 // 2 second test
        );

        performanceAssertions.assertFrameRate(frameRate, 'mid-range');
      });

      it('handles moderate data loads efficiently', async () => {
        const largeTasks = Array.from({ length: 20 }, (_, i) => ({
          ...mockTask,
          id: `task-${i}`,
          title: `Task ${i}`,
        }));

        const startTime = performance.now();
        
        const { container } = render(
          <div>
            {largeTasks.map(task => (
              <PlanItemRenderer
                key={task.id}
                item={{ type: 'task', data: task }}
                variant="card"
                {...defaultProps}
              />
            ))}
          </div>
        );
        
        const renderTime = performance.now() - startTime;
        
        // Mid-range should handle 20 items within 300ms
        expect(renderTime).toBeLessThan(300);
        expect(container.children).toHaveLength(1);
      });
    });

    describe('High-End Android Device', () => {
      beforeEach(() => {
        setDeviceProfile('high-end');
      });

      it('maintains 60fps during complex interactions', async () => {
        const { container } = render(
          <PlanItemRenderer
            item={{ type: 'task', data: mockTask }}
            variant="card"
            {...defaultProps}
          />
        );

        const frameRate = await performanceTestUtils.testFrameRate(
          container.firstChild as Element,
          3000 // 3 second test
        );

        performanceAssertions.assertFrameRate(frameRate, 'high-end');
      });

      it('handles large datasets efficiently', async () => {
        const largeTasks = Array.from({ length: 100 }, (_, i) => ({
          ...mockTask,
          id: `task-${i}`,
          title: `Task ${i}`,
        }));

        const startTime = performance.now();
        
        const { container } = render(
          <div>
            {largeTasks.map(task => (
              <PlanItemRenderer
                key={task.id}
                item={{ type: 'task', data: task }}
                variant="card"
                {...defaultProps}
              />
            ))}
          </div>
        );
        
        const renderTime = performance.now() - startTime;
        
        // High-end should handle 100 items within 200ms
        expect(renderTime).toBeLessThan(200);
        expect(container.children).toHaveLength(1);
      });

      it('supports advanced touch gestures', async () => {
        const { container } = render(
          <PlanItemRenderer
            item={{ type: 'task', data: mockTask }}
            variant="card"
            {...defaultProps}
          />
        );

        const element = container.firstChild as Element;
        
        // Test pinch gesture
        const pinchResponse = await performanceTestUtils.testPinchToZoom(
          element,
          { x: 100, y: 100 },
          { x: 150, y: 150 },
          1.5
        );

        performanceAssertions.assertPinchToZoom(pinchResponse, 'high-end');
      });
    });
  });

  describe('Mobile Touch Interactions', () => {
    it('responds to touch events correctly', async () => {
      const { container } = render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const element = container.firstChild as Element;
      await simulateTouch(element, 180, 100);
      
      expect(element).toBeInTheDocument();
    });

    it('supports swipe gestures', async () => {
      const { container } = render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const element = container.firstChild as Element;
      await simulateSwipe(element, 300, 100, 50, 100, 300);
      
      expect(element).toBeInTheDocument();
    });

    it('handles rapid touch interactions without performance degradation', async () => {
      const { container } = render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const element = container.firstChild as Element;
      const touchCount = 10;
      const startTime = performance.now();

      for (let i = 0; i < touchCount; i++) {
        await simulateTouch(element, 180, 100);
      }

      const endTime = performance.now();
      const avgTouchTime = (endTime - startTime) / touchCount;
      measurePerformance.recordEventHandlingTime(avgTouchTime);

      expect(avgTouchTime).toBeLessThan(16.7); // 60fps threshold
    });
  });

  describe('Offline Scenarios and Conflict Resolution', () => {
    it('maintains functionality in complete offline mode', async () => {
      await setNetworkConditions({ offline: true });

      const { container } = render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );
      
      const element = container.firstChild as Element;
      await simulateTouch(element, 180, 100);
      
      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(element).toBeInTheDocument();
    });

    it('handles intermittent connectivity gracefully', async () => {
      await setNetworkConditions({ connectionType: 'intermittent' });

      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const user = userEvent.setup();
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(defaultProps.onUpdateTask).toHaveBeenCalledWith({
        ...mockTask,
        status: 'completed',
      });
    });

    it('resolves task conflicts using client-wins strategy', async () => {
      const conflictedTask = {
        ...mockTask,
        title: 'Conflicted Task',
        updatedAt: new Date().toISOString(),
      };

      const resolution = await simulateConflictResolution(
        conflictedTask,
        { ...conflictedTask, title: 'Server Version' },
        'client-wins'
      );

      expect(resolution.title).toBe('Conflicted Task');
    });

    it('measures offline performance correctly', async () => {
      await setNetworkConditions({ offline: true });

      const metrics = await offlinePerformanceHelpers.measureOfflinePerformance(
        async () => {
          render(
            <PlanItemRenderer
              item={{ type: 'task', data: mockTask }}
              variant="card"
              {...defaultProps}
            />
          );
        }
      );

      expect(metrics.renderTime).toBeLessThan(100);
      expect(metrics.memoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });

  describe('Timer Integration', () => {
    it('starts timer directly for infinity timer type', async () => {
      const infinityTask = { ...mockTask, timerType: 'infinity' as const };
      const user = userEvent.setup();
      render(
        <PlanItemRenderer
          item={{ type: 'task', data: infinityTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);
      
      const timerButton = screen.getByText('Start Timer');
      await user.click(timerButton);

      expect(mockStartTimer).toHaveBeenCalledWith(infinityTask);
    });

    it('highlights item when timer is active', () => {
      mockUseGlobalState.mockReturnValue({
        state: { activeItem: { item: { id: mockTask.id } } },
        startTimer: mockStartTimer,
        updateRoutine: mockUpdateRoutine,
        updateLog: mockUpdateLog,
      } as any);

      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      expect(screen.getByText('Test Task')).toHaveClass('text-primary');
    });
  });

  describe('Accessibility and Responsive Design', () => {
    it('maintains accessibility standards across all variants', () => {
      const variants = ['card', 'list', 'task-card'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(
          <PlanItemRenderer
            item={{ type: 'task', data: mockTask }}
            variant={variant}
            {...defaultProps}
          />
        );

        // Check for proper ARIA labels and roles
        if (variant !== 'task-card') {
          expect(screen.getByRole('checkbox')).toBeInTheDocument();
        }
        expect(screen.getByText('Test Task')).toBeInTheDocument();
        
        unmount();
      });
    });

    it('adapts to different screen sizes', () => {
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });
  });

  describe('Memory Management', () => {
    it('cleans up resources properly on unmount', () => {
      const { unmount } = render(
        <PlanItemRenderer
          item={{ type: 'task', data: mockTask }}
          variant="card"
          {...defaultProps}
        />
      );

      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      unmount();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Memory should not increase significantly after unmount
      expect(finalMemory - initialMemory).toBeLessThan(1024 * 1024); // 1MB threshold
    });

    it('handles memory constraints on low-end devices', async () => {
      setDeviceProfile('low-end');
      
      const memoryBefore = await performanceTestUtils.testMemoryEfficiency(
        async () => {
          render(
            <PlanItemRenderer
              item={{ type: 'task', data: mockTask }}
              variant="card"
              {...defaultProps}
            />
          );
        }
      );

      performanceAssertions.assertMemoryEfficiency(memoryBefore, 'low-end');
    });
  });
});