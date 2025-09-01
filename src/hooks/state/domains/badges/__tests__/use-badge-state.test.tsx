import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { BadgeProvider, useBadgeState, checkBadgeUnlocked } from '../use-badge-state';

describe('useBadgeState', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BadgeProvider>{children}</BadgeProvider>
  );

  it('adds, updates, deletes badges and checks unlocks', () => {
    const { result } = renderHook(() => useBadgeState(), { wrapper });
    act(() => result.current.addBadge({ name: 'B1' } as any));
    const id = result.current.state.allBadges[0].id;
    act(() => result.current.updateBadge({ ...result.current.state.allBadges[0], name: 'B2' }));
    expect(result.current.state.allBadges[0].name).toBe('B2');
    expect(checkBadgeUnlocked({ id, name: 'B2', isEnabled: true })).toBe(true);
    act(() => result.current.deleteBadge(id));
    expect(result.current.state.allBadges).toHaveLength(0);
  });

});
