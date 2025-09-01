import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AppStateProvider, useAppState } from '../use-app-state';

describe('useAppState (foundation)', () => {
  it('provides default state and allows toggling isLoaded', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppStateProvider>{children}</AppStateProvider>
    );

    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(result.current.state.isLoaded).toBe(false);

    act(() => {
      result.current.setLoaded(true);
    });

    expect(result.current.state.isLoaded).toBe(true);
  });

});
