import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BadgeDialog } from '../badge-dialog';
import type { Badge } from '@/lib/types';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
}));

jest.mock('@/hooks/use-global-state', () => ({
  useGlobalState: () => ({
    state: { routines: [] },
  }),
}));

jest.mock('../duration-input', () => ({
  DurationInput: (props: any) => (
    <div data-testid="duration-input">
      <label htmlFor="hours">Hours</label>
      <input id="hours" defaultValue={Math.floor(props.value / 60)} onChange={(e) => props.onChange(parseInt(e.target.value, 10) * 60 + (props.value % 60))} />
      <label htmlFor="minutes">Minutes</label>
      <input id="minutes" defaultValue={props.value % 60} onChange={(e) => props.onChange((Math.floor(props.value / 60) * 60) + parseInt(e.target.value, 10))} />
    </div>
  ),
}));

jest.mock('../icon-picker', () => ({
  IconPicker: (props: any) => (
    <button data-testid="icon-picker" onClick={() => props.onSelectIcon('Trophy')}>
      {props.selectedIcon}
    </button>
  ),
}));

const mockBadge: Badge = {
  id: 'b1',
  name: 'Existing Badge',
  description: 'This is an existing badge for testing.',
  icon: 'Star',
  category: 'weekly',
  isCustom: true,
  isEnabled: true,
  requiredCount: 5,
  conditions: [{ type: 'TASKS_COMPLETED', target: 5, timeframe: 'WEEK' }],
};

const defaultProps = {
  isOpen: true,
  onOpenChange: jest.fn(),
  onAddBadge: jest.fn(),
  onUpdateBadge: jest.fn(),
  badgeToEdit: null,
};

describe('BadgeDialog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders in "create" mode with default values', () => {
    render(<BadgeDialog {...defaultProps} />);
    
    expect(screen.getByText('Create a new badge')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
    expect(screen.getByTestId('icon-picker')).toHaveTextContent('Award');
    expect(screen.getByLabelText('Target (Count)')).toHaveValue(1);
  });

  it('renders in "edit" mode and populates form with badge data', () => {
    render(<BadgeDialog {...defaultProps} badgeToEdit={mockBadge} />);
    
    expect(screen.getByText('Edit badge')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue(mockBadge.name);
    expect(screen.getByLabelText('Description')).toHaveValue(mockBadge.description);
    expect(screen.getByTestId('icon-picker')).toHaveTextContent(mockBadge.icon);
  });

  it('calls onAddBadge with correct data on valid submission in "create" mode', async () => {
    const user = userEvent.setup();
    render(<BadgeDialog {...defaultProps} />);

    await user.type(screen.getByLabelText('Name'), 'New Awesome Badge');
    await user.type(screen.getByLabelText('Description'), 'A description for this awesome new badge.');
    await user.click(screen.getByTestId('icon-picker')); // Changes icon to 'Trophy'
    await user.clear(screen.getByLabelText('Target (Count)'));
    await user.type(screen.getByLabelText('Target (Count)'), '10');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(defaultProps.onAddBadge).toHaveBeenCalledWith({
        name: 'New Awesome Badge',
        description: 'A description for this awesome new badge.',
        icon: 'Trophy',
        condition: { type: 'TASKS_COMPLETED', count: 10 },
        category: 'overall',
        requiredCount: 10,
      });
      expect(toast.success).toHaveBeenCalledWith('Badge Created!');
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('calls onUpdateBadge with correct data on valid submission in "edit" mode', async () => {
    const user = userEvent.setup();
    render(<BadgeDialog {...defaultProps} badgeToEdit={mockBadge} />);

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Updated Badge Name');
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'A new description.');
    
    // Set condition type and count to ensure form is valid
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);
    const option = await screen.findByRole('option', { name: 'Tasks Completed' });
    await user.click(option);
    await user.clear(screen.getByLabelText('Target (Count)'));
    await user.type(screen.getByLabelText('Target (Count)'), '15');

    // Find the form and submit it
    const nameInput = screen.getByLabelText('Name');
    const form = nameInput.closest('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(defaultProps.onUpdateBadge).toHaveBeenCalledWith(
        mockBadge.id,
        expect.objectContaining({
          name: 'Updated Badge Name',
          description: 'A new description.',
          condition: { type: 'TASKS_COMPLETED', count: 15 },
        })
      );
    });
  });

  it('displays validation errors for invalid data', async () => {
    const user = userEvent.setup();
    render(<BadgeDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Badge name must be at least 3 characters.')).toBeInTheDocument();
    expect(await screen.findByText('Description must be at least 10 characters.')).toBeInTheDocument();
    expect(defaultProps.onAddBadge).not.toHaveBeenCalled();
  });

  it('closes the dialog when the Cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<BadgeDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('switches to DurationInput when condition type is "TOTAL_STUDY_TIME"', async () => {
    const user = userEvent.setup();
    render(<BadgeDialog {...defaultProps} />);

    // Open the select dropdown
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);

    // Select the 'Total Study Time' option
    const option = await screen.findByRole('option', { name: 'Total Study Time' });
    await user.click(option);

    await waitFor(() => {
      expect(screen.getByTestId('duration-input')).toBeInTheDocument();
      expect(screen.queryByLabelText('Target (Count)')).not.toBeInTheDocument();
    });
  });
});