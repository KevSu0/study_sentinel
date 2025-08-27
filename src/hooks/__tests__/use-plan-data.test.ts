import { renderHook } from '@testing-library/react';
import { usePlanData } from '../use-plan-data';
import { useGlobalState, ActivityFeedItem } from '@/hooks/use-global-state';
import { format } from 'date-fns';
import { StudyTask, Routine, UserProfile, SoundSettings, LogEvent } from '@/lib/types';

jest.mock('@/hooks/use-global-state', () => ({
  ...jest.requireActual('@/hooks/use-global-state'),
  useGlobalState: jest.fn(),
}));
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn(),
}));

const mockUseGlobalState = useGlobalState as jest.MockedFunction<typeof useGlobalState>;
const mockFormat = format as jest.Mock;

const mockTasks: StudyTask[] = [
  { id: '1', shortId: 's1', date: '2024-01-10', time: '10:00', status: 'todo', title: 'Task 1', points: 10, priority: 'medium', timerType: 'infinity' },
  { id: '2', shortId: 's2', date: '2024-01-10', time: '09:00', status: 'todo', title: 'Task 2', points: 10, priority: 'medium', timerType: 'infinity' },
  { id: '3', shortId: 's3', date: '2024-01-10', time: '11:00', status: 'completed', title: 'Task 3', points: 10, priority: 'medium', timerType: 'infinity' },
  { id: '4', shortId: 's4', date: '2024-01-09', time: '12:00', status: 'todo', title: 'Overdue Task', points: 10, priority: 'medium', timerType: 'infinity' },
];

const mockRoutines: Routine[] = [
  { id: 'r1', shortId: 'sr1', days: [3], startTime: '08:00', title: 'Wednesday Routine', endTime: '08:30', priority: 'medium' }, // Wednesday is 3
  { id: 'r2', shortId: 'sr2', days: [3], startTime: '07:00', title: 'Another Wednesday Routine', endTime: '07:30', priority: 'medium' },
  { id: 'r3', shortId: 'sr3', days: [4], startTime: '09:00', title: 'Thursday Routine', endTime: '09:30', priority: 'medium' },
];

const mockTodaysActivity: ActivityFeedItem[] = [
    { type: 'TASK_COMPLETE', data: { task: mockTasks[2] }, timestamp: '2024-01-10T11:00:00Z' },
    { type: 'ROUTINE_COMPLETE', data: { payload: { routineId: 'r1' } }, timestamp: '2024-01-10T08:00:00Z' }
];

const mockProfile: UserProfile = {
    name: 'Test User',
};

const mockSoundSettings: SoundSettings = {
    alarm: 'alarm_clock',
    tick: 'tick_tock',
    notificationInterval: 5,
};

const mockInitialState = {
    isLoaded: true,
    tasks: mockTasks,
    routines: mockRoutines,
    todaysActivity: mockTodaysActivity,
    logs: [],
    profile: mockProfile,
    allBadges: [],
    earnedBadges: new Map(),
    soundSettings: mockSoundSettings,
    activeItem: null,
    timeDisplay: '00:00',
    isPaused: true,
    isOvertime: false,
    isMuted: false,
    timerProgress: null,
    currentQuote: '',
    routineLogDialog: {isOpen: false, action: null},
    todaysLogs: [],
    previousDayLogs: [],
    allCompletedWork: [],
    todaysCompletedWork: [],
    todaysPoints: 0,
    todaysBadges: [],
    starCount: 0,
    showStarAnimation: false,
    quickStartOpen: false,
};

describe('usePlanData', () => {
  beforeEach(() => {
    mockUseGlobalState.mockReturnValue({
      state: mockInitialState,
    } as any);
    // Mock current date to be 2024-01-10
    mockFormat.mockImplementation((date, formatString) => {
        if (date instanceof Date && date.getFullYear() === 2024 && date.getMonth() === 0 && date.getDate() === 10) {
            return '2024-01-10';
        }
        if (date instanceof Date && date.getFullYear() === 2024 && date.getMonth() === 0 && date.getDate() === 9) {
            return '2024-01-09';
        }
        return jest.requireActual('date-fns').format(new Date('2024-01-10T12:00:00Z'), formatString);
    });
  });

  it('should return empty arrays when not loaded', () => {
    mockUseGlobalState.mockReturnValue({
      state: { ...mockInitialState, isLoaded: false, tasks: [], routines: [], todaysActivity: [] },
    } as any);
    const selectedDate = new Date('2024-01-10T00:00:00Z');
    const { result } = renderHook(() => usePlanData(selectedDate));

    expect(result.current.upcomingItems).toEqual([]);
    expect(result.current.overdueTasks).toEqual([]);
    expect(result.current.completedForDay).toEqual([]);
  });

  it('should return filtered and sorted upcoming items for a selected date', () => {
    const selectedDate = new Date('2024-01-10T00:00:00Z'); // A Wednesday
    const { result } = renderHook(() => usePlanData(selectedDate));

    expect(result.current.upcomingItems.length).toBe(3);
    // Sorted by time
    expect(result.current.upcomingItems[0].data.title).toBe('Another Wednesday Routine'); // 07:00
    expect(result.current.upcomingItems[1].data.title).toBe('Task 2'); // 09:00
    expect(result.current.upcomingItems[2].data.title).toBe('Task 1'); // 10:00
  });

  it('should return overdue tasks', () => {
    const selectedDate = new Date('2024-01-10T00:00:00Z');
    const { result } = renderHook(() => usePlanData(selectedDate));

    expect(result.current.overdueTasks.length).toBe(1);
    expect(result.current.overdueTasks[0].title).toBe('Overdue Task');
  });

  it('should return completed items for the selected day', () => {
    const selectedDate = new Date('2024-01-10T00:00:00Z');
    const { result } = renderHook(() => usePlanData(selectedDate));
    
    expect(result.current.completedForDay.length).toBe(2);
  });

  it('should not show completed tasks and routines in upcoming items', () => {
    const selectedDate = new Date('2024-01-10T00:00:00Z');
    const { result } = renderHook(() => usePlanData(selectedDate));

    const upcomingIds = result.current.upcomingItems.map((item: any) => item.data.id);
    expect(upcomingIds).not.toContain('3'); // completed task
    expect(upcomingIds).not.toContain('r1'); // completed routine
  });
});