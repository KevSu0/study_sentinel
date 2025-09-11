import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {AddItemDialog} from '@/components/dashboard/add-item-dialog';
import {useGlobalState} from '@/hooks/use-global-state';

// Mock hooks and dependencies
jest.mock('@/hooks/use-global-state');

const MockUnifiedDialog = jest.fn((props: any) => null);
jest.mock('@/components/tasks/add-task-dialog', () => ({
  __esModule: true,
  AddItemDialog: (props: any) => {
    MockUnifiedDialog(props);
    return props.isOpen ? <div data-testid="unified-dialog" /> : null;
  },
}));

describe('AddItemDialog', () => {
  const mockUseGlobalState = useGlobalState as jest.Mock;
  const mockAddTask = jest.fn();
  const mockAddRoutine = jest.fn();
  const mockUpdateTask = jest.fn();
  const mockUpdateRoutine = jest.fn();

  beforeEach(() => {
    mockUseGlobalState.mockReturnValue({
      addTask: mockAddTask,
      addRoutine: mockAddRoutine,
      updateTask: mockUpdateTask,
      updateRoutine: mockUpdateRoutine,
    });
    MockUnifiedDialog.mockClear();
  });

  it('renders the add item button', () => {
    render(<AddItemDialog />);
    expect(screen.getByRole('button', {name: /add item/i})).toBeInTheDocument();
  });

  it('does not render the dialog initially', () => {
    render(<AddItemDialog />);
    expect(screen.queryByTestId('unified-dialog')).not.toBeInTheDocument();
  });

  it('opens the dialog on button click and passes correct props', async () => {
    render(<AddItemDialog />);
    const addButton = screen.getByRole('button', {name: /add item/i});
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('unified-dialog')).toBeInTheDocument();
    });

    expect(MockUnifiedDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        onAddTask: mockAddTask,
        onAddRoutine: mockAddRoutine,
        onUpdateTask: mockUpdateTask,
        onUpdateRoutine: mockUpdateRoutine,
      })
    );
  });
});