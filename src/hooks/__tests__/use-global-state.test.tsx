import { renderHook, act, waitFor } from '@testing-library/react';
import { GlobalStateProvider, useGlobalState } from '../use-global-state';
import { StudyTask } from '@/lib/types';
import React, { ReactNode } from 'react';

// Mocking fetch
global.fetch = jest.fn();

// Mocking localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Confetti
jest.mock('@/components/providers/confetti-provider', () => ({
  useConfetti: () => ({ fire: jest.fn() }),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <GlobalStateProvider>{children}</GlobalStateProvider>
);

describe('useGlobalState - Basic Tests', () => {
  it('should initialize with default state', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.isLoaded).toBe(true);
    });
  });

  it('should handle adding a task', async () => {
    const { result } = renderHook(() => useGlobalState(), { wrapper });

    const taskToAdd: Omit<StudyTask, 'id' | 'status' | 'shortId'> = {
      title: 'Test Task',
      date: '2025-07-30',
      time: '10:00',
      points: 10,
      priority: 'medium',
      timerType: 'countdown',
      duration: 30,
    };

    act(() => {
      result.current.addTask(taskToAdd);
    });

    await waitFor(() => {
      expect(result.current.state.tasks).toHaveLength(1);
    });
  });
});