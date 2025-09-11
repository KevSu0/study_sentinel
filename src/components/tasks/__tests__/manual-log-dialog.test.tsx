import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ManualLogDialog } from '../manual-log-dialog';
import { useGlobalState } from '@/hooks/use-global-state';
import type { StudyTask, Routine } from '@/lib/types';

// Mock the useGlobalState hook
jest.mock('@/hooks/use-global-state', () => ({
  useGlobalState: jest.fn(),
}));

// Mock child components to isolate the component under test
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode, open: boolean }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/badges/duration-input', () => ({
    DurationInput: ({ value, onChange }: { value: number, onChange: (value: number) => void }) => (
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label="Duration"
        />
    )
}));


describe('ManualLogDialog', () => {
  const mockManuallyCompleteItem = jest.fn();
  const mockOnOpenChange = jest.fn();
  const mockTaskItem: StudyTask = {
    id: 'task-1',
    shortId: 't1',
    title: 'Test Task',
    time: '10:00',
    date: '2024-07-30',
    status: 'todo',
    points: 10,
    timerType: 'countdown',
    duration: 45,
    priority: 'high',
  };
  const mockRoutineItem: Routine = {
    id: 'routine-1',
    shortId: 'r1',
    title: 'Test Routine',
    days: [1], // Monday
    startTime: '09:00',
    endTime: '10:00',
    priority: 'medium',
  };

  beforeEach(() => {
    (useGlobalState as jest.Mock).mockReturnValue({
      manuallyCompleteItem: mockManuallyCompleteItem,
    });
    jest.clearAllMocks();
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof ManualLogDialog> > = {}) => {
    const defaultProps = {
      isOpen: true,
      onOpenChange: mockOnOpenChange,
      item: mockTaskItem,
    };
    return render(<ManualLogDialog {...defaultProps} {...props} />);
  };

  it('renders the dialog with correct title and description', () => {
    renderComponent();
    expect(screen.getByText('Log Productive Time')).toBeInTheDocument();
    expect(screen.getByText(`Manually log time for "${mockTaskItem.title}". This will mark it as complete.`)).toBeInTheDocument();
  });

  it('initializes form with duration from item if available', async () => {
    renderComponent({ item: mockTaskItem });
    const durationInput = screen.getByLabelText('Duration');
    expect(durationInput).toHaveValue(mockTaskItem.duration);
  });

  it('initializes form with default duration of 30 if item has no duration', async () => {
    renderComponent({ item: mockRoutineItem });
    const durationInput = screen.getByLabelText('Duration');
    expect(durationInput).toHaveValue(30);
  });

  it('calls onOpenChange with false when Cancel button is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockManuallyCompleteItem).not.toHaveBeenCalled();
  });

  it('submits the form with updated values and calls manuallyCompleteItem', async () => {
    renderComponent();
    const durationInput = screen.getByLabelText('Duration');
    const notesInput = screen.getByPlaceholderText('What did you work on?');

    fireEvent.change(durationInput, { target: { value: '60' } });
    fireEvent.change(notesInput, { target: { value: 'Test notes' } });
    fireEvent.click(screen.getByText('Log and Complete'));

    await waitFor(() => {
      expect(mockManuallyCompleteItem).toHaveBeenCalledWith(mockTaskItem, 60, 'Test notes');
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows a validation error if duration is less than 1', async () => {
    renderComponent();
    const durationInput = screen.getByLabelText('Duration');

    fireEvent.change(durationInput, { target: { value: '0' } });
    fireEvent.click(screen.getByText('Log and Complete'));

    await waitFor(() => {
      expect(screen.getByText('Duration must be at least 1 minute.')).toBeInTheDocument();
    });

    expect(mockManuallyCompleteItem).not.toHaveBeenCalled();
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });
  
  it('resets form fields when dialog is reopened', () => {
    const { rerender } = renderComponent({ item: mockRoutineItem });
    
    const durationInput = screen.getByLabelText('Duration');
    const notesInput = screen.getByPlaceholderText('What did you work on?');

    fireEvent.change(durationInput, { target: { value: '15' } });
    fireEvent.change(notesInput, { target: { value: 'Initial notes' } });

    expect(durationInput).toHaveValue(15);
    expect(notesInput).toHaveValue('Initial notes');

    // "Close" the dialog
    rerender(<ManualLogDialog isOpen={false} onOpenChange={mockOnOpenChange} item={mockRoutineItem} />);
    
    // "Reopen" the dialog
    rerender(<ManualLogDialog isOpen={true} onOpenChange={mockOnOpenChange} item={mockRoutineItem} />);

    expect(screen.getByLabelText('Duration')).toHaveValue(30);
    expect(screen.getByPlaceholderText('What did you work on?')).toHaveValue('');
  });

  it('updates the form when the item prop changes while the dialog is open', () => {
    const initialItem: StudyTask = { ...mockTaskItem, id: 'task-1', duration: 25 };
    const newItem: StudyTask = { ...mockTaskItem, id: 'task-2', duration: 50 };

    const { rerender } = renderComponent({ item: initialItem });

    const durationInput = screen.getByLabelText('Duration');
    expect(durationInput).toHaveValue(25);

    // Rerender with a new item
    rerender(<ManualLogDialog isOpen={true} onOpenChange={mockOnOpenChange} item={newItem} />);

    expect(durationInput).toHaveValue(50);
  });

  it('shows a validation error for non-numeric duration input', async () => {
    renderComponent();
    const durationInput = screen.getByLabelText('Duration');
    
    // userEvent is better for simulating real user input
    fireEvent.change(durationInput, { target: { value: 'abc' } });
    fireEvent.click(screen.getByText('Log and Complete'));

    await waitFor(() => {
      // Zod's coerce will turn non-numeric strings into NaN, which fails the .min(1) check.
      expect(screen.getByText('Duration must be at least 1 minute.')).toBeInTheDocument();
    });

    expect(mockManuallyCompleteItem).not.toHaveBeenCalled();
  });
});