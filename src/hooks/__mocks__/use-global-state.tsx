import React from 'react';
import {
  MOCK_USER_PROFILE,
  MOCK_STUDY_TASK,
  MOCK_COMPLETED_WORK,
} from '@/__tests__/mock-data';

const MOCK_STATE = {
  state: {
    isLoaded: true,
    tasks: [MOCK_STUDY_TASK],
    logs: [],
    profile: MOCK_USER_PROFILE,
    routines: [],
    allBadges: [],
    earnedBadges: new Map(),
    soundSettings: {
      notificationSound: 'default',
      timerSound: 'default',
    },
    activeItem: null,
    timeDisplay: '25:00',
    isPaused: true,
    isOvertime: false,
    isMuted: false,
    timerProgress: 100,
    currentQuote: 'Test Quote',
    routineLogDialog: {
      isOpen: false,
      routineId: null,
    },
    todaysLogs: [],
    previousDayLogs: [],
    allCompletedWork: MOCK_COMPLETED_WORK,
    todaysCompletedWork: MOCK_COMPLETED_WORK,
    todaysPoints: 10,
    todaysBadges: [],
    starCount: 0,
    showStarAnimation: false,
    todaysActivity: [],
    quickStartOpen: false,
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
  openQuickStart: jest.fn(),
  closeQuickStart: jest.fn(),
};

const GlobalStateContext = React.createContext(MOCK_STATE);

export const useGlobalState = () => React.useContext(GlobalStateContext);

export const GlobalStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <GlobalStateContext.Provider value={MOCK_STATE}>
      {children}
    </GlobalStateContext.Provider>
  );
};