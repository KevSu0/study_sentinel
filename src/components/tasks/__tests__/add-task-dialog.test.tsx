import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddItemDialog } from '../add-task-dialog';
import type { StudyTask, Routine } from '@/lib/types';
import { useMediaQuery } from '@/hooks/use-media-query';

// Mock dependencies
jest.mock('@/hooks/use-media-query');

describe('AddItemDialog', () => {
  const mockOnAddTask = jest.fn();
  const mockOnAddRoutine = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    (useMediaQuery as jest.Mock).mockReturnValue(true); // Force desktop view
    mockOnAddTask.mockClear();
    mockOnAddRoutine.mockClear();
    mockOnOpenChange.mockClear();
  });

  it('should allow a user to fill out and submit the task form', async () => {
    const user = userEvent.setup();
    render(
      <AddItemDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onAddTask={mockOnAddTask}
        onUpdateTask={jest.fn()}
        onAddRoutine={jest.fn()}
        onUpdateRoutine={jest.fn()}
      />
    );

    // 1. Find form elements
    const titleInput = screen.getByLabelText(/task title/i);
    const dateInput = screen.getByLabelText(/date/i);
    const timeSelectTrigger = screen.getByRole('combobox', { name: /time/i });
    const durationSelectTrigger = screen.getByRole('combobox', { name: /duration/i });
    const prioritySelectTrigger = screen.getByRole('combobox', { name: /priority/i });
    const submitButton = screen.getByRole('button', { name: /add task/i });

    // 2. Fill out the form
    await user.type(titleInput, 'My New Test Task');
    fireEvent.change(dateInput, { target: { value: '2025-08-01' } });
    
    await user.click(timeSelectTrigger);
    await user.click(screen.getByRole('option', { name: '10:00 AM' }));

    await user.click(durationSelectTrigger);
    await user.click(screen.getByRole('option', { name: '1 hour' }));

    await user.click(prioritySelectTrigger);
    await user.click(screen.getByRole('option', { name: 'High' }));

    // 3. Submit the form
    await user.click(submitButton);

    // 4. Assert that the callback was called with the correct data
    await waitFor(() => {
      expect(mockOnAddTask).toHaveBeenCalledTimes(1);
      expect(mockOnAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My New Test Task',
          date: '2025-08-01',
          time: '10:00',
          duration: 60,
          priority: 'high',
          timerType: 'countdown',
        })
      );
    });

    // 5. Assert that the dialog closes on submit
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  }, 10000);

  it('should allow a user to fill out and submit the routine form', async () => {
    const user = userEvent.setup();
    render(
      <AddItemDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onAddTask={jest.fn()}
        onUpdateTask={jest.fn()}
        onAddRoutine={mockOnAddRoutine}
        onUpdateRoutine={jest.fn()}
      />
    );

    // 1. Switch to the Routine tab
    await user.click(screen.getByRole('tab', { name: /routine/i }));

    // 2. Find form elements
    const titleInput = screen.getByLabelText(/title/i);
    const mondayCheckbox = screen.getByRole('checkbox', { name: /mon/i });
    const wednesdayCheckbox = screen.getByRole('checkbox', { name: /wed/i });
    const fridayCheckbox = screen.getByRole('checkbox', { name: /fri/i });
    const submitButton = screen.getByRole('button', { name: /add routine/i });

    // 3. Fill out the form
    await user.type(titleInput, 'My New Test Routine');
    await user.click(mondayCheckbox);
    await user.click(wednesdayCheckbox);
    await user.click(fridayCheckbox);

    // 4. Submit the form
    await user.click(submitButton);

    // 5. Assert that the callback was called with the correct data
    await waitFor(() => {
      expect(mockOnAddRoutine).toHaveBeenCalledTimes(1);
      expect(mockOnAddRoutine).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My New Test Routine',
          days: [2, 4],
        })
      );
    });

    // 6. Assert that the dialog closes on submit
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  }, 10000);

  it('should allow a user to edit an existing task', async () => {
    const user = userEvent.setup();
    const mockOnUpdateTask = jest.fn();
    const editingTask: StudyTask = {
      id: 'task-1',
      shortId: 'abcde',
      title: 'Initial Task Title',
      date: '2025-08-01',
      time: '10:00',
      duration: 60,
      priority: 'high' as const,
      status: 'todo' as const,
      timerType: 'countdown' as const,
      points: 180,
    };

    render(
      <AddItemDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onAddTask={jest.fn()}
        onUpdateTask={mockOnUpdateTask}
        onAddRoutine={jest.fn()}
        onUpdateRoutine={jest.fn()}
        editingItem={editingTask}
        itemType="task"
      />
    );

    // 1. Find form elements and verify they are pre-filled
    const titleInput = screen.getByLabelText(/task title/i);
    expect(titleInput).toHaveValue('Initial Task Title');

    // 2. Change a value
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Task Title');

    // 3. Submit the form
    const submitButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(submitButton);

    // 4. Assert that the callback was called with the updated data
    await waitFor(() => {
      expect(mockOnUpdateTask).toHaveBeenCalledTimes(1);
      expect(mockOnUpdateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-1',
          title: 'Updated Task Title',
        })
      );
    });

    // 5. Assert that the dialog closes on submit
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  }, 10000);

  it('should allow a user to edit an existing routine', async () => {
    const user = userEvent.setup();
    const mockOnUpdateRoutine = jest.fn();
    const editingRoutine: Routine = {
      id: 'routine-1',
      shortId: 'fghij',
      title: 'Initial Routine Title',
      days: [1, 3, 5], // Mon, Wed, Fri
      startTime: '09:00',
      endTime: '09:45',
      priority: 'medium' as const,
    };

    render(
      <AddItemDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onAddTask={jest.fn()}
        onUpdateTask={jest.fn()}
        onAddRoutine={jest.fn()}
        onUpdateRoutine={mockOnUpdateRoutine}
        editingItem={editingRoutine}
        itemType="routine"
      />
    );

    // 1. Verify form is pre-filled
    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toHaveValue('Initial Routine Title');
    expect(screen.getByRole('checkbox', { name: /mon/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /tue/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /wed/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /thu/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /fri/i })).toBeChecked();

    // 2. Change a value (deselect Wednesday and select Tuesday)
    await user.click(screen.getByRole('checkbox', { name: /wed/i }));
    await user.click(screen.getByRole('checkbox', { name: /tue/i }));

    // 3. Submit the form
    const submitButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(submitButton);

    // 4. Assert callback was called with updated data
    await waitFor(() => {
      expect(mockOnUpdateRoutine).toHaveBeenCalledTimes(1);
      expect(mockOnUpdateRoutine).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'routine-1',
          days: [1, 5, 2], // Mon, Fri, Tue
        })
      );
    });

    // 5. Assert dialog closes
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  }, 10000);
});