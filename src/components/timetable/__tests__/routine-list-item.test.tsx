import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import { RoutineListItem } from '../routine-list-item';
import { useGlobalState } from '@/hooks/use-global-state';
import type { Routine } from '@/lib/types';

// Mock dependencies
jest.mock('@/hooks/use-global-state');
jest.mock('react-hot-toast');
jest.mock('@/components/ui/dropdown-menu', () => {
  const React = require('react');

  const MockDropdownMenu = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = React.useState(false);
    const newChildren = React.Children.map(children, (child: any) => {
      if (child.type.name === 'DropdownMenuTrigger') {
        return React.cloneElement(child, { onClick: () => setOpen(!open) });
      }
      if (child.type.name === 'DropdownMenuContent') {
        return open ? child : null;
      }
      return child;
    });
    return <div>{newChildren}</div>;
  };

  const DropdownMenuTrigger = ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => <div onClick={onClick}>{children}</div>;
  const DropdownMenuContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const DropdownMenuItem = ({ children, onSelect }: { children: React.ReactNode, onSelect: () => void }) => <div onClick={onSelect} role="menuitem">{children}</div>;

  return {
    __esModule: true,
    DropdownMenu: MockDropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
  };
});

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode, open: boolean }) => open ? <div role="alertdialog">{children}</div> : null,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode, onClick: () => void }) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUseGlobalState = useGlobalState as jest.Mock;
const mockToastError = toast.error as jest.Mock;
const mockToastSuccess = toast.success as jest.Mock;

const mockRoutine: Routine = {
  id: 'routine-1',
  shortId: 'R-1',
  title: 'Morning Meditation',
  description: '15 minutes of guided meditation.',
  startTime: '07:00',
  endTime: '07:15',
  days: [1, 2, 3, 4, 5], // Mon-Fri
  priority: 'medium',
};

describe('RoutineListItem', () => {
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  const onComplete = jest.fn();
  const startTimer = jest.fn();
  const openRoutineLogDialog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGlobalState.mockReturnValue({
      state: { activeItem: null },
      startTimer,
      openRoutineLogDialog,
    });
  });

  it('renders routine details correctly', () => {
    render(
      <RoutineListItem
        routine={mockRoutine}
        onEdit={onEdit}
        onDelete={onDelete}
        onComplete={onComplete}
      />
    );

    expect(screen.getByText('Morning Meditation')).toBeInTheDocument();
    expect(screen.getByText('15 minutes of guided meditation.')).toBeInTheDocument();
    expect(screen.getByText('07:00 - 07:15')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
  });

  it('calls onComplete when the complete button is clicked', () => {
    render(
      <RoutineListItem
        routine={mockRoutine}
        onEdit={onEdit}
        onDelete={onDelete}
        onComplete={onComplete}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /complete/i }));
    expect(onComplete).toHaveBeenCalledWith(mockRoutine);
  });

  it('calls startTimer when the "Start Timer" button is clicked', () => {
    render(
      <RoutineListItem
        routine={mockRoutine}
        onEdit={onEdit}
        onDelete={onDelete}
        onComplete={onComplete}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /start timer/i }));
    expect(startTimer).toHaveBeenCalledWith(mockRoutine);
    expect(mockToastSuccess).toHaveBeenCalledWith('Timer for "Morning Meditation" is now running.');
  });

  it('disables the start button if another timer is active', () => {
    mockUseGlobalState.mockReturnValue({
      state: { activeItem: { type: 'task', item: { id: 'task-99' } } },
      startTimer,
      openRoutineLogDialog,
    });
    render(
      <RoutineListItem
        routine={mockRoutine}
        onEdit={onEdit}
        onDelete={onDelete}
        onComplete={onComplete}
      />
    );
    expect(screen.getByRole('button', { name: /start timer/i })).toBeDisabled();
  });

  it('disables start button when another timer is active', () => {
    mockUseGlobalState.mockReturnValue({
      state: { activeItem: { type: 'task', item: { id: 'task-99', title: 'Another Task' } } },
      startTimer,
      openRoutineLogDialog,
    });
    render(
      <RoutineListItem
        routine={mockRoutine}
        onEdit={onEdit}
        onDelete={onDelete}
        onComplete={onComplete}
      />
    );
    const startButton = screen.getByRole('button', { name: /start timer/i });
    expect(startButton).toBeDisabled();
  });

  it('displays "Stop Timer" and calls openRoutineLogDialog when its own timer is active', () => {
    mockUseGlobalState.mockReturnValue({
      state: { activeItem: { type: 'routine', item: mockRoutine } },
      startTimer,
      openRoutineLogDialog,
    });
    render(
      <RoutineListItem
        routine={mockRoutine}
        onEdit={onEdit}
        onDelete={onDelete}
        onComplete={onComplete}
      />
    );
    const stopButton = screen.getByRole('button', { name: /stop timer/i });
    expect(stopButton).toBeInTheDocument();
    fireEvent.click(stopButton);
    expect(openRoutineLogDialog).toHaveBeenCalledWith('stop');
  });

  it('opens the delete confirmation dialog when delete is selected from the menu', async () => {
    render(
      <RoutineListItem
        routine={mockRoutine}
        onEdit={onEdit}
        onDelete={onDelete}
        onComplete={onComplete}
      />
    );
    const moreButton = screen.getByTestId('more-options-button');
    fireEvent.click(moreButton);
    
    const deleteButton = await screen.findByRole('menuitem', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('This will permanently delete the routine'))
    ).toBeInTheDocument();
  });

  it('calls onDelete when the delete action is confirmed', async () => {
    render(
      <RoutineListItem
        routine={mockRoutine}
        onEdit={onEdit}
        onDelete={onDelete}
        onComplete={onComplete}
      />
    );
    const moreButton = screen.getByTestId('more-options-button');
    fireEvent.click(moreButton);

    const deleteMenuItem = await screen.findByRole('menuitem', { name: /delete/i });
    fireEvent.click(deleteMenuItem);

    const alertDialog = await screen.findByRole('alertdialog');
    const confirmButton = within(alertDialog).getByRole('button', { name: /delete/i });
    
    fireEvent.click(confirmButton);
    
    expect(onDelete).toHaveBeenCalledWith(mockRoutine.id);
  });

  it('calls onEdit when edit is selected from the menu', async () => {
    render(
      <RoutineListItem
        routine={mockRoutine}
        onEdit={onEdit}
        onDelete={onDelete}
        onComplete={onComplete}
      />
    );
    const moreButton = screen.getByTestId('more-options-button');
    fireEvent.click(moreButton);

    const editButton = await screen.findByRole('menuitem', { name: /edit/i });
    fireEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledWith(mockRoutine);
  });
});