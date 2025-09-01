import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { TaskStateProvider, useTaskState } from '../use-task-state';

describe('useTaskState', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TaskStateProvider>{children}</TaskStateProvider>
  );

  it('adds, updates, archives, unarchives and pushes task', () => {
    const { result } = renderHook(() => useTaskState(), { wrapper });
    let id = '';
    act(() => { id = result.current.addTask({ title: 'T1', date: '2024-01-01', time: '10:00', timerType: 'countdown' }); });
    const t = result.current.state.tasks[0];
    act(() => result.current.updateTask({ ...t, title: 'T2' }));
    expect(result.current.state.tasks[0].title).toBe('T2');
    act(() => result.current.archiveTask(id));
    expect(result.current.state.tasks[0].status).toBe('archived');
    act(() => result.current.unarchiveTask(id));
    expect(result.current.state.tasks[0].status).toBe('todo');
    const prevDate = result.current.state.tasks[0].date;
    act(() => result.current.pushTaskToNextDay(id));
    expect(result.current.state.tasks[0].date > prevDate).toBe(true);
  });

});
