import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { TimerStateProvider, useTimerState } from '../use-timer-core';

describe('useTimerState', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TimerStateProvider>{children}</TimerStateProvider>
  );

  it('starts, pauses, stops and completes timer', () => {
    const { result } = renderHook(() => useTimerState(), { wrapper });
    expect(result.current.state.activeItem).toBeNull();
    act(() => result.current.startTimer({ type: 'task', id: '1', title: 'T', duration: 25 }));
    expect(result.current.state.activeItem?.id).toBe('1');
    act(() => result.current.togglePause());
    expect(result.current.state.isPaused).toBe(true);
    act(() => result.current.completeTimer());
    expect(result.current.state.activeItem).toBeNull();
    act(() => result.current.startTimer({ type: 'routine', id: 'r1', title: 'R' }));
    act(() => result.current.stopTimer());
    expect(result.current.state.activeItem).toBeNull();
  });

  // Intentionally not testing throw outside provider here to avoid React 18 unhandled error noise
});
