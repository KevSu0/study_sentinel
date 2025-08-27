import { renderHook, waitFor } from '@testing-library/react';
import { useStats } from '../use-stats';
import {
  profileRepository,
  taskRepository,
  sessionRepository,
  badgeRepository,
} from '@/lib/repositories';
import { Badge, UserProfile } from '@/lib/types';
import { Session } from '@/lib/db';
import { format, subDays, startOfDay } from 'date-fns';

jest.mock('@/lib/repositories');

const mockProfileRepository = profileRepository as jest.Mocked<
  typeof profileRepository
>;
const mockTaskRepository = taskRepository as jest.Mocked<typeof taskRepository>;
const mockSessionRepository = sessionRepository as jest.Mocked<
  typeof sessionRepository
>;
const mockBadgeRepository = badgeRepository as jest.Mocked<
  typeof badgeRepository
>;

const mockBadges: Badge[] = [
  {
    id: '1',
    name: 'First Step',
    description: 'Complete your first task',
    category: 'daily',
    icon: 'footprints',
    isCustom: false,
    isEnabled: true,
    requiredCount: 1,
    conditions: [],
  },
  {
    id: '2',
    name: 'Weekly Warrior',
    description: 'Complete all tasks in a week',
    category: 'weekly',
    icon: 'shield',
    isCustom: false,
    isEnabled: true,
    requiredCount: 7,
    conditions: [],
  },
];

const mockUserProfile: UserProfile = {
  name: 'Test User',
  earnedBadges: {
    '1': { earnedOn: new Date().toISOString(), lastNotified: new Date().toISOString() },
  },
};

const mockCompletedWork: Session[] = [
    {
        id: '1',
        userId: 'user-profile',
        date: new Date().toISOString(),
        duration: 1800,
        pausedDuration: 300,
        type: 'task',
        title: 'Test Task',
        points: 10,
        timestamp: new Date().toISOString(),
    }
]

describe('useStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionRepository.getByDateRange.mockResolvedValue([]);
    mockTaskRepository.getByDateRange.mockResolvedValue([]);
    mockBadgeRepository.getAll.mockResolvedValue(mockBadges);
    mockProfileRepository.getById.mockResolvedValue(mockUserProfile);
  });

  it('should fetch allBadges and earnedBadges correctly', async () => {
    const { result } = renderHook(() =>
      useStats({ timeRange: 'overall', selectedDate: new Date() })
    );

    await waitFor(() => {
      expect(result.current.badgeStats.totalCount).toBe(2);
    });

    expect(badgeRepository.getAll).toHaveBeenCalled();
    expect(profileRepository.getById).toHaveBeenCalledWith('user-profile');
    expect(result.current.badgeStats).toEqual({
      earnedCount: 1,
      totalCount: 2,
    });
  });
  it('should categorize badges correctly', async () => {
    const { result } = renderHook(() =>
      useStats({ timeRange: 'overall', selectedDate: new Date() })
    );

    await waitFor(() => {
      expect(result.current.categorizedBadges.daily).toHaveLength(1);
      expect(result.current.categorizedBadges.weekly).toHaveLength(1);
      expect(result.current.categorizedBadges.monthly).toHaveLength(0);
      expect(result.current.categorizedBadges.overall).toHaveLength(0);
    });
  });

  it('should calculate timeRangeStats correctly', async () => {
    mockSessionRepository.getByDateRange.mockResolvedValue(mockCompletedWork);

    const { result } = renderHook(() =>
      useStats({ timeRange: 'daily', selectedDate: new Date() })
    );

    await waitFor(() => {
      expect(result.current.timeRangeStats.totalHours).toBe('0.4');
      expect(result.current.timeRangeStats.totalPoints).toBe(10);
      expect(result.current.timeRangeStats.completedCount).toBe(1);
      expect(result.current.timeRangeStats.focusScore).toBeCloseTo(83.33);
    });
  });

  it('should call getByDateRange with correct daily range', async () => {
    const selectedDate = new Date();
    renderHook(() =>
      useStats({ timeRange: 'daily', selectedDate })
    );

    await waitFor(() => {
        const expectedDate = format(selectedDate, 'yyyy-MM-dd');
        expect(mockTaskRepository.getByDateRange).toHaveBeenCalledWith(expectedDate, expectedDate);
        expect(mockSessionRepository.getByDateRange).toHaveBeenCalledWith(expectedDate, expectedDate);
    });
  });

  it('should call getByDateRange with correct weekly range', async () => {
    const selectedDate = new Date();
    renderHook(() =>
      useStats({ timeRange: 'weekly', selectedDate })
    );

    await waitFor(() => {
        const now = startOfDay(new Date());
        const expectedStartDate = format(subDays(now, 7), 'yyyy-MM-dd');
        const expectedEndDate = format(now, 'yyyy-MM-dd');
        expect(mockTaskRepository.getByDateRange).toHaveBeenCalledWith(expectedStartDate, expectedEndDate);
        expect(mockSessionRepository.getByDateRange).toHaveBeenCalledWith(expectedStartDate, expectedEndDate);
    });
  });

  it('should call getByDateRange with correct monthly range', async () => {
    const selectedDate = new Date();
    renderHook(() =>
      useStats({ timeRange: 'monthly', selectedDate })
    );

    await waitFor(() => {
        const now = startOfDay(new Date());
        const expectedStartDate = format(subDays(now, 30), 'yyyy-MM-dd');
        const expectedEndDate = format(now, 'yyyy-MM-dd');
        expect(mockTaskRepository.getByDateRange).toHaveBeenCalledWith(expectedStartDate, expectedEndDate);
        expect(mockSessionRepository.getByDateRange).toHaveBeenCalledWith(expectedStartDate, expectedEndDate);
    });
  });

  it('should call getByDateRange with correct overall range', async () => {
    const selectedDate = new Date();
    renderHook(() =>
      useStats({ timeRange: 'overall', selectedDate })
    );

    await waitFor(() => {
        const expectedStartDate = '1970-01-01';
        const expectedEndDate = '9999-12-31';
        expect(mockTaskRepository.getByDateRange).toHaveBeenCalledWith(expectedStartDate, expectedEndDate);
        expect(mockSessionRepository.getByDateRange).toHaveBeenCalledWith(expectedStartDate, expectedEndDate);
    });
  });
});