import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ProfileProvider, useProfileState } from '../use-profile-state';

describe('useProfileState', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ProfileProvider>{children}</ProfileProvider>
  );

  it('returns default and updates profile', () => {
    const { result } = renderHook(() => useProfileState(), { wrapper });
    expect(result.current.state.profile.name).toBeDefined();
    act(() => result.current.updateProfile({ name: 'Alice' }));
    expect(result.current.state.profile.name).toBe('Alice');
  });

});
