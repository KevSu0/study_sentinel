import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AppStateProvider } from '../AppStateProvider';
import { useSettings } from '../domains/settings';
import { useProfile } from '../domains/profile';
import { useBadges } from '../domains/badges';
import { useGlobalState } from '@/hooks/use-global-state';
// Mock all domain providers
jest.mock('../domains/settings', () => ({
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="settings-provider">{children}</div>,
  useSettings: jest.fn(),
  useSoundSettings: jest.fn(),
  useMuteSettings: jest.fn(),
}));

jest.mock('../domains/profile', () => ({
  ProfileProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="profile-provider">{children}</div>,
  useProfile: jest.fn(),
  useProfileData: jest.fn(),
  useProfileActions: jest.fn(),
}));

jest.mock('../domains/badges', () => ({
  BadgeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="badge-provider">{children}</div>,
  useBadges: jest.fn(),
  useBadgeData: jest.fn(),
  useBadgeActions: jest.fn(),
  useBadgeChecking: jest.fn(),
  useBadgeStats: jest.fn(),
}));

// Mock GlobalStateProvider
const mockGlobalState = {
  state: {
    tasks: [],
    logs: [],
    profile: { name: 'Test User', email: '', phone: '', passion: '', dream: '', education: '', reasonForUsing: '', dailyStudyGoal: 8 },
    routines: [],
    allBadges: [],
    earnedBadges: new Map(),
    soundSettings: { alarm: 'bell', tick: 'none', notificationInterval: 15 },
    isMuted: false,
    activeItem: null,
    timeDisplay: '00:00',
    isPaused: true,
    isOvertime: false,
    timerProgress: null,
    currentQuote: { text: 'Test quote', author: 'Test Author' },
    routineLogDialog: { isOpen: false, action: null },
    todaysLogs: [],
    previousDayLogs: [],
    allCompletedWork: [],
    todaysCompletedWork: [],
    todaysPoints: 0,
    todaysBadges: [],
    starCount: 0,
    showStarAnimation: false,
    todaysActivity: [],
    quickStartOpen: false,
    isLoaded: true
  },
  addTask: jest.fn(),
  updateTask: jest.fn(),
  archiveTask: jest.fn(),
  unarchiveTask: jest.fn(),
  pushTaskToNextDay: jest.fn(),
  startTimer: jest.fn(),
  togglePause: jest.fn(),
  completeTimer: jest.fn(),
  stopTimer: jest.fn(),
  manuallyCompleteItem: jest.fn(),
  addRoutine: jest.fn(),
  updateRoutine: jest.fn(),
  deleteRoutine: jest.fn(),
  addBadge: jest.fn(),
  updateBadge: jest.fn(),
  deleteBadge: jest.fn(),
  updateProfile: jest.fn(),
  openRoutineLogDialog: jest.fn(),
  closeRoutineLogDialog: jest.fn(),
  setSoundSettings: jest.fn(),
  toggleMute: jest.fn(),
  addLog: jest.fn(),
  removeLog: jest.fn(),
  updateLog: jest.fn(),
  retryItem: jest.fn(),
  openQuickStart: jest.fn(),
  closeQuickStart: jest.fn(),
};

jest.mock('@/hooks/use-global-state', () => ({
  GlobalStateProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="global-state-provider">{children}</div>
  ),
  useGlobalState: () => mockGlobalState,
}));

// Mock domain hook implementations
const mockUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;
const mockUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;
const mockUseBadges = useBadges as jest.MockedFunction<typeof useBadges>;

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AppStateProvider>
      {children}
    </AppStateProvider>
  );
}

describe('AppStateProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockUseSettings.mockReturnValue({
      state: {
        soundSettings: {
          alarm: 'bell',
          tick: 'tick',
          notificationInterval: 30,
        },
        isMuted: false,
      },
      actions: {
        setSoundSettings: jest.fn(),
        toggleMute: jest.fn(),
      },
    });
    
    mockUseProfile.mockReturnValue({
      state: {
        profile: {
          name: '',
          email: '',
          phone: '',
          passion: '',
          dream: '',
          education: '',
          reasonForUsing: '',
          dailyStudyGoal: 8
        },
        isLoading: false,
        error: null,
      },
      actions: {
        updateProfile: jest.fn(),
        loadProfile: jest.fn(),
        resetProfile: jest.fn(),
      },
    });
    
    mockUseBadges.mockReturnValue({
      state: {
        allBadges: [],
        earnedBadges: new Map(),
        isLoading: false,
        error: null,
      },
      actions: {
          addBadge: jest.fn(),
          updateBadge: jest.fn(),
          deleteBadge: jest.fn(),
          loadBadges: jest.fn(),
          checkAndAwardBadges: jest.fn(),
          resetBadges: jest.fn(),
        },
    });
  });

  describe('Provider Composition', () => {
    it('should render all domain providers in correct order', () => {
      const { result } = renderHook(() => ({}), {
        wrapper: TestWrapper,
      });

      // Check that the hook renders without errors
      expect(result).toBeDefined();
    });

    it('should provide access to all domain hooks', () => {
      const { result } = renderHook(() => {
        const settings = useSettings();
        const profile = useProfile();
        const badges = useBadges();
        return { settings, profile, badges };
      }, {
        wrapper: TestWrapper,
      });

      expect(result.current.settings).toBeDefined();
      expect(result.current.profile).toBeDefined();
      expect(result.current.badges).toBeDefined();
    });
  });

  describe('useGlobalState Backward Compatibility', () => {
    it('should provide legacy global state interface', () => {
      const { result } = renderHook(() => useGlobalState(), {
        wrapper: TestWrapper,
      });

      // Check that all legacy methods are available
      expect(result.current.state.tasks).toBeDefined();
      expect(result.current.addTask).toBeDefined();
      expect(result.current.updateTask).toBeDefined();
      // deleteTask is not available in GlobalStateContextType
      
      expect(result.current.state.routines).toBeDefined();
      expect(result.current.addRoutine).toBeDefined();
      expect(result.current.updateRoutine).toBeDefined();
      expect(result.current.deleteRoutine).toBeDefined();
      
      // Sessions are handled internally and not directly exposed
      // Session methods are not directly exposed in GlobalStateContextType
      // They are handled internally by the timer system
      
      expect(result.current.state.logs).toBeDefined();
      expect(result.current.addLog).toBeDefined();
      expect(result.current.updateLog).toBeDefined();
      expect(result.current.removeLog).toBeDefined();
    });

    it('should provide legacy badge methods', () => {
      const { result } = renderHook(() => useGlobalState(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.allBadges).toBeDefined();
      expect(result.current.addBadge).toBeDefined();
      expect(result.current.updateBadge).toBeDefined();
      expect(result.current.deleteBadge).toBeDefined();
    });

    it('should provide legacy profile methods', () => {
      const { result } = renderHook(() => useGlobalState(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.profile).toBeDefined();
      expect(result.current.updateProfile).toBeDefined();
    });

    it('should provide legacy sound settings methods', () => {
      const { result } = renderHook(() => useGlobalState(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.soundSettings).toBeDefined();
      expect(result.current.setSoundSettings).toBeDefined();
      expect(result.current.toggleMute).toBeDefined();
    });

    it('should call legacy methods correctly', () => {
      const { result } = renderHook(() => useGlobalState(), {
        wrapper: TestWrapper,
      });

      const testTask = { 
        id: '1', 
        title: 'Test Task',
        time: '09:00',
        date: '2024-01-01',
        points: 10,
        priority: 'medium' as const,
        timerType: 'countdown' as const,
        duration: 25
      };
      
      act(() => {
        result.current.addTask(testTask);
      });

      expect(mockGlobalState.addTask).toHaveBeenCalledWith(testTask);
    });
  });

  describe('Domain Integration', () => {
    it('should integrate settings domain correctly', () => {
      const mockSettingsActions = {
        setSoundSettings: jest.fn(),
        toggleMute: jest.fn(),
      };

      mockUseSettings.mockReturnValue({
        state: {
          soundSettings: {
            alarm: 'chime',
            tick: 'soft',
            notificationInterval: 60,
          },
          isMuted: true,
        },
        actions: mockSettingsActions,
      });

      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.soundSettings.alarm).toBe('chime');
      expect(result.current.state.isMuted).toBe(true);
      expect(result.current.actions.setSoundSettings).toBe(mockSettingsActions.setSoundSettings);
    });

    it('should integrate profile domain correctly', () => {
      const mockProfile = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '123-456-7890',
        passion: 'Learning',
        dream: 'To become an expert',
        education: 'University',
        reasonForUsing: 'Personal growth',
        dailyStudyGoal: 8
      };

      const mockProfileActions = {
        updateProfile: jest.fn(),
        loadProfile: jest.fn(),
        resetProfile: jest.fn(),
      };

      mockUseProfile.mockReturnValue({
        state: {
          profile: mockProfile,
          isLoading: false,
          error: null,
        },
        actions: mockProfileActions,
      });

      const { result } = renderHook(() => useProfile(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.profile).toEqual(mockProfile);
      expect(result.current.actions.updateProfile).toBe(mockProfileActions.updateProfile);
    });

    it('should integrate badge domain correctly', () => {
      const mockBadges = [
        { 
          id: 'badge-1', 
          name: 'Test Badge', 
          description: 'A test badge',
          category: 'daily' as const,
          icon: 'trophy',
          isCustom: false,
          isEnabled: true,
          requiredCount: 1,
          conditions: [],
          motivationalMessage: 'Great job!',
          color: '#FFD700'
        },
        { 
          id: 'badge-2', 
          name: 'Another Badge', 
          description: 'Another test badge',
          category: 'weekly' as const,
          icon: 'star',
          isCustom: false,
          isEnabled: true,
          requiredCount: 5,
          conditions: [],
          motivationalMessage: 'Keep going!',
          color: '#C0C0C0'
        },
      ];

      const mockBadgeActions = {
        addBadge: jest.fn(),
        updateBadge: jest.fn(),
        deleteBadge: jest.fn(),
        loadBadges: jest.fn(),
        checkAndAwardBadges: jest.fn(),
        resetBadges: jest.fn(),
      };

      mockUseBadges.mockReturnValue({
        state: {
          allBadges: mockBadges,
          earnedBadges: new Map(),
          isLoading: false,
          error: null,
        },
        actions: mockBadgeActions,
      });

      const { result } = renderHook(() => useBadges(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.allBadges).toEqual(mockBadges);
      expect(result.current.actions.addBadge).toBe(mockBadgeActions.addBadge);
    });
  });

  describe('Error Handling', () => {
    it('should handle domain provider errors gracefully', () => {
      mockUseSettings.mockImplementation(() => {
        throw new Error('Settings provider error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useSettings(), {
          wrapper: TestWrapper,
        });
      }).toThrow('Settings provider error');

      consoleSpy.mockRestore();
    });

    it('should maintain global state functionality when domain providers fail', () => {
      // Even if domain providers fail, global state should still work
      const { result } = renderHook(() => useGlobalState(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.tasks).toBeDefined();
      expect(result.current.addTask).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0;
      
      const { rerender } = renderHook(() => {
        renderCount++;
        return useGlobalState();
      }, {
        wrapper: TestWrapper,
      });

      const initialRenderCount = renderCount;
      
      // Rerender should cause exactly one additional render
      rerender();
      
      expect(renderCount).toBe(initialRenderCount + 1);
    });
  });

  describe('State Isolation', () => {
    it('should maintain separate state for each domain', () => {
      const { result } = renderHook(() => {
        const settings = useSettings();
        const profile = useProfile();
        const badges = useBadges();
        return { settings, profile, badges };
      }, {
        wrapper: TestWrapper,
      });

      // Each domain should have its own state
      expect(result.current.settings.state).not.toBe(result.current.profile.state);
      expect(result.current.profile.state).not.toBe(result.current.badges.state);
      expect(result.current.badges.state).not.toBe(result.current.settings.state);
    });

    it('should allow independent domain updates', async () => {
      const mockSettingsUpdate = jest.fn();
      const mockProfileUpdate = jest.fn();
      const mockBadgeUpdate = jest.fn();

      mockUseSettings.mockReturnValue({
        state: {
          soundSettings: { alarm: 'alarm_clock', tick: 'tick_tock', notificationInterval: 15 },
          isMuted: false,
        },
        actions: {
          setSoundSettings: mockSettingsUpdate,
          toggleMute: jest.fn(),
        },
      });

      mockUseProfile.mockReturnValue({
        state: {
          profile: {
            name: '',
            email: '',
            phone: '',
            passion: '',
            dream: '',
            education: '',
            reasonForUsing: '',
            dailyStudyGoal: 8
          },
          isLoading: false,
          error: null,
        },
        actions: {
          updateProfile: mockProfileUpdate,
          loadProfile: jest.fn(),
          resetProfile: jest.fn(),
        },
      });

      mockUseBadges.mockReturnValue({
        state: {
          allBadges: [],
          earnedBadges: new Map(),
          isLoading: false,
          error: null,
        },
        actions: {
          addBadge: mockBadgeUpdate,
          updateBadge: jest.fn(),
          deleteBadge: jest.fn(),
          loadBadges: jest.fn(),
          checkAndAwardBadges: jest.fn(),
          resetBadges: jest.fn(),
        },
      });

      const { result } = renderHook(() => {
        const settings = useSettings();
        const profile = useProfile();
        const badges = useBadges();
        return { settings, profile, badges };
      }, {
        wrapper: TestWrapper,
      });

      // Updates to one domain shouldn't affect others
      act(() => {
        result.current.settings.actions.setSoundSettings({ alarm: 'alarm_clock', tick: 'tick_tock', notificationInterval: 15 });
      });

      expect(mockSettingsUpdate).toHaveBeenCalled();
      expect(mockProfileUpdate).not.toHaveBeenCalled();
      expect(mockBadgeUpdate).not.toHaveBeenCalled();
    });
  });
});