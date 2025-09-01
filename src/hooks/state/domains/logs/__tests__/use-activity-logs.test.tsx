import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ActivityLogProvider, useActivityLogs } from '../use-activity-logs';

describe('useActivityLogs', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ActivityLogProvider>{children}</ActivityLogProvider>
  );

  it('adds, updates and removes logs', () => {
    const { result } = renderHook(() => useActivityLogs(), { wrapper });
    let id = '';
    act(() => { id = result.current.addLog('TEST', { x: 1 }); });
    expect(result.current.state.logs).toHaveLength(1);
    act(() => result.current.updateLog(id, { type: 'UPDATED' }));
    expect(result.current.state.logs[0].type).toBe('UPDATED');
    act(() => result.current.removeLog(id));
    expect(result.current.state.logs).toHaveLength(0);
  });

});
