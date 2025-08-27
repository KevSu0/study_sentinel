import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManageBadgesPage from '../page';
import { useGlobalState } from '@/hooks/use-global-state';
import { Badge } from '@/lib/types';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';

jest.mock('@/hooks/use-global-state');
jest.mock('lucide-react');
// Mocking BadgeDialog is essential to prevent its async loading logic from interfering with tests
jest.mock('@/components/badges/badge-dialog', () => ({
  BadgeDialog: jest.fn(({ isOpen, onOpenChange, onAddBadge, onUpdateBadge, badgeToEdit }) => {
    if (!isOpen) return null;
    const handleSave = () => {
      if (badgeToEdit) {
        onUpdateBadge('3', { description: 'Updated description' });
      } else {
        onAddBadge({ name: 'New Awesome Badge', description: 'A very cool description', icon: 'activity', conditions: [{ type: 'TASKS_COMPLETED', target: 10, timeframe: 'TOTAL' }] });
      }
    };
    return (
      <div role="dialog" aria-modal="true">
        <h2>{badgeToEdit ? 'Edit badge' : 'Create a new badge'}</h2>
        <input aria-label="Name" defaultValue={badgeToEdit?.name || ''} />
        <input aria-label="Description" defaultValue={badgeToEdit?.description || ''} />
        <input aria-label="Target" type="number" defaultValue={badgeToEdit?.conditions[0]?.target || 0} />
        <div data-testid="icon-picker-trigger">Icon Picker</div>
        <button onClick={handleSave}>Save</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    );
  }),
}));


const mockUseGlobalState = useGlobalState as jest.Mock;

const mockBadges: Badge[] = [
  { id: '1', name: 'Daily Badge 1', description: 'Daily desc', icon: 'award', category: 'daily', isEnabled: true, isCustom: false, requiredCount: 1, conditions: [{ type: 'DAY_STREAK', target: 1, timeframe: 'DAY' }] },
  { id: '2', name: 'Weekly Badge 1', description: 'Weekly desc', icon: 'award', category: 'weekly', isEnabled: true, isCustom: false, requiredCount: 1, conditions: [{ type: 'TASKS_COMPLETED', target: 7, timeframe: 'WEEK' }] },
  { id: '3', name: 'Custom Badge 1', description: 'Custom desc', icon: 'star', category: 'daily', isEnabled: true, isCustom: true, requiredCount: 5, conditions: [{ type: 'TASKS_COMPLETED', target: 5, timeframe: 'TOTAL' }] },
  { id: '4', name: 'Another System Badge', description: 'Another system desc', icon: 'shield', category: 'weekly', isEnabled: true, isCustom: false, requiredCount: 3, conditions: [{ type: 'POINTS_EARNED', target: 100, timeframe: 'WEEK' }] },
];

describe('ManageBadgesPage', () => {
  const mockUpdateBadge = jest.fn();
  const mockAddBadge = jest.fn();
  const mockDeleteBadge = jest.fn();

  const setup = (state: any) => {
    mockUseGlobalState.mockReturnValue({
      state: {
        allBadges: mockBadges,
        earnedBadges: new Set(),
        isLoaded: true,
        ...state,
      },
      updateBadge: mockUpdateBadge,
      addBadge: mockAddBadge,
      deleteBadge: mockDeleteBadge,
    });
    return render(<ManageBadgesPage />, { wrapper: MemoryRouterProvider });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the list of all badges', () => {
    setup({});
    expect(screen.getByText('Daily Badge 1')).toBeInTheDocument();
    expect(screen.getByText('Custom Badge 1')).toBeInTheDocument();
  });

  it('should sort custom badges before system badges', () => {
    setup({});
    const customBadge = screen.getByText('Custom Badge 1');
    const dailyBadge = screen.getByText('Daily Badge 1');
    const anotherSystemBadge = screen.getByText('Another System Badge');

    // Check that custom badge appears before system badges in the DOM
    expect(customBadge.compareDocumentPosition(dailyBadge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(customBadge.compareDocumentPosition(anotherSystemBadge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should show the loading state', () => {
    setup({ isLoaded: false });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('should call deleteBadge when the delete button on a custom badge is clicked', () => {
    setup({});
    const customBadgeItem = screen.getByText('Custom Badge 1').closest('div[class*="rounded-lg"]');
    if (!customBadgeItem) throw new Error('Custom badge item not found');
    const deleteButton = within(customBadgeItem as HTMLElement).getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);
    expect(mockDeleteBadge).toHaveBeenCalledWith('3');
  });

  it('should call updateBadge when the toggle switch is clicked', () => {
    setup({});
    const customBadgeItem = screen.getByText('Custom Badge 1').closest('div[class*="rounded-lg"]');
    if (!customBadgeItem) throw new Error('Custom badge item not found');
    const toggle = within(customBadgeItem as HTMLElement).getByRole('switch');
    fireEvent.click(toggle);
    expect(mockUpdateBadge).toHaveBeenCalledWith('3', { isEnabled: false });
  });

  it('should navigate to /badges when "View Earned Badges" is clicked', () => {
    setup({});
    const link = screen.getByRole('link', { name: /View Earned Badges/i });
    expect(link).toHaveAttribute('href', '/badges');
  });

  describe('when there are no badges', () => {
    it('should display the empty state message', () => {
      setup({ allBadges: [] });
      expect(screen.getByText('No Badges Found')).toBeInTheDocument();
      expect(screen.getByText('Create your first custom badge to start a new challenge!')).toBeInTheDocument();
    });

    it('should open the create dialog when the "Create Badge" button is clicked from the empty state', async () => {
      setup({ allBadges: [] });
      const createButton = screen.getByRole('button', { name: /Create Badge/i });
      fireEvent.click(createButton);
      expect(await screen.findByText('Create a new badge')).toBeInTheDocument();
    });
  });

  describe('BadgeDialog in Create Mode', () => {
    it('should open, and submit a new custom badge', async () => {
      setup({});
      fireEvent.click(screen.getByText('Create Custom Badge'));
      
      await screen.findByText('Create a new badge');

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockAddBadge).toHaveBeenCalledWith(expect.objectContaining({
          name: 'New Awesome Badge',
        }));
      });
    });

    it('should close the dialog when the close action is triggered', async () => {
      setup({});
      fireEvent.click(screen.getByText('Create Custom Badge'));
      await screen.findByText('Create a new badge');
  
      fireEvent.click(screen.getByRole('button', { name: /Close/i }));
  
      await waitFor(() => {
        expect(screen.queryByText('Create a new badge')).not.toBeInTheDocument();
      });
    });
  });

  describe('BadgeDialog in Edit Mode', () => {
    it('should open with pre-filled data and submit updated data', async () => {
      setup({});
      const customBadgeItem = screen.getByText('Custom Badge 1').closest('div[class*="rounded-lg"]');
      if (!customBadgeItem) throw new Error('Custom badge item not found');
      const editButton = within(customBadgeItem as HTMLElement).getByRole('button', { name: /Edit/i });
      fireEvent.click(editButton);

      await screen.findByText('Edit badge');

      // Check if form is pre-filled
      expect(screen.getByLabelText('Name')).toHaveValue('Custom Badge 1');
      expect(screen.getByLabelText('Description')).toHaveValue('Custom desc');
      expect(screen.getByLabelText('Target')).toHaveValue(5);

      // Update a field
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockUpdateBadge).toHaveBeenCalledWith('3', expect.objectContaining({
          description: 'Updated description',
        }));
      });
    });
  });
});