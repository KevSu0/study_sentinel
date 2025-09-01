import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { RoutineStateProvider, useRoutineState } from '../use-routine-state';

describe('useRoutineState', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RoutineStateProvider>{children}</RoutineStateProvider>
  );

  it('adds, updates and deletes routine', () => {
    const { result } = renderHook(() => useRoutineState(), { wrapper });
    let id = '';
    act(() => { id = result.current.addRoutine({ title: 'R1', startTime: '08:00', endTime: '09:00', days: [1,2,3] }); });
    const r = result.current.state.routines[0];
    act(() => result.current.updateRoutine({ ...r, title: 'R2' }));
    expect(result.current.state.routines[0].title).toBe('R2');
    act(() => result.current.deleteRoutine(id));
    expect(result.current.state.routines).toHaveLength(0);
  });

});
