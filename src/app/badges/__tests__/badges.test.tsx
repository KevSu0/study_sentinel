import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BadgesPage from '../page';
import { useGlobalState } from '@/hooks/use-global-state';
import { Badge } from '@/lib/types';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';
import router from 'next-router-mock';

// Mock dependencies
jest.mock('@/hooks/use-global-state');
jest.mock('next/router', () => require('next-router-mock'));
// Mock the BadgeCard component to isolate the page logic.
jest.mock('@/components/badges/badge-card', () => ({
  BadgeCard: jest.fn(({ badge }) => (
    <div data-testid={`badge-card-${badge.id}`}>{badge.name}</div>
  )),
}));

const mockUseGlobalState = useGlobalState as jest.Mock;

const mockBadges: Badge[] = [
  { id: '1', name: 'Daily Badge 1', description: 'Daily badge 1 description', icon: 'award', category: 'daily', isEnabled: true, isCustom: false, requiredCount: 1, conditions: [] },
  { id: '2', name: 'Weekly Badge 1', description: 'Weekly badge 1 description', icon: 'award', category: 'weekly', isEnabled: true, isCustom: false, requiredCount: 1, conditions: [] },
  { id: '3', name: 'Monthly Badge 1', description: 'Monthly badge 1 description', icon: 'award', category: 'monthly', isEnabled: true, isCustom: false, requiredCount: 1, conditions: [] },
  { id: '4', name: 'Overall Badge 1', description: 'Overall badge 1 description', icon: 'award', category: 'overall', isEnabled: true, isCustom: false, requiredCount: 1, conditions: [] },
  { id: '5', name: 'Custom Badge 1', description: 'Custom badge 1 description', icon: 'award', category: 'daily', isEnabled: true, isCustom: true, requiredCount: 1, conditions: [] },
  { id: '6', name: 'Disabled Badge', description: 'This should not be visible', icon: 'award', category: 'daily', isEnabled: false, isCustom: false, requiredCount: 1, conditions: [] },
];

describe('BadgesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGlobalState.mockReturnValue({
      state: {
        allBadges: mockBadges,
        earnedBadges: new Set(['1', '2']),
        isLoaded: true,
      },
    });
  });

  it('should render the badge categories', () => {
    render(<BadgesPage />, { wrapper: MemoryRouterProvider });
    expect(screen.getByText('daily')).toBeInTheDocument();
    expect(screen.getByText('weekly')).toBeInTheDocument();
    expect(screen.getByText('monthly')).toBeInTheDocument();
    expect(screen.getByText('overall')).toBeInTheDocument();
  });

  it('should display content for the active tab and unmount content for inactive tabs', async () => {
    const user = userEvent.setup();
    render(<BadgesPage />, { wrapper: MemoryRouterProvider });
    
    expect(screen.getByTestId('badge-card-1')).toBeInTheDocument();
    expect(screen.queryByTestId('badge-card-2')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /weekly/i }));

    expect(await screen.findByTestId('badge-card-2')).toBeInTheDocument();
    expect(screen.queryByTestId('badge-card-1')).not.toBeInTheDocument();
  });

  it('should render the loading state', () => {
    mockUseGlobalState.mockReturnValue({
      state: { allBadges: [], earnedBadges: new Set(), isLoaded: false },
    });
    render(<BadgesPage />, { wrapper: MemoryRouterProvider });
    expect(screen.getAllByRole('status')).toHaveLength(10);
  });

  it('should render custom and regular badges in the overall category', async () => {
    const user = userEvent.setup();
    render(<BadgesPage />, { wrapper: MemoryRouterProvider });
    
    expect(screen.queryByTestId('badge-card-5')).not.toBeInTheDocument();
    expect(screen.queryByTestId('badge-card-4')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /overall/i }));

    expect(await screen.findByTestId('badge-card-5')).toBeInTheDocument();
    expect(await screen.findByTestId('badge-card-4')).toBeInTheDocument();
  });

  it('should not render disabled badges', () => {
    render(<BadgesPage />, { wrapper: MemoryRouterProvider });
    expect(screen.queryByTestId('badge-card-6')).not.toBeInTheDocument();
  });

  it('should navigate to the manage page when the manage button is clicked', async () => {
    const user = userEvent.setup();
    render(<BadgesPage />, { wrapper: MemoryRouterProvider });
    await user.click(screen.getByRole('link', { name: /manage badges/i }));
    expect(router.pathname).toBe('/badges/manage');
  });

  it('should render an empty state for categories with no badges', async () => {
    const user = userEvent.setup();
    mockUseGlobalState.mockReturnValue({
      state: {
        allBadges: [
          { id: '1', name: 'Only Daily Badge', description: 'desc', icon: 'award', category: 'daily', isEnabled: true, isCustom: false, requiredCount: 1, conditions: [] },
        ],
        earnedBadges: new Set(),
        isLoaded: true,
      },
    });
    render(<BadgesPage />, { wrapper: MemoryRouterProvider });
    
    expect(screen.getByTestId('badge-card-1')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /weekly/i }));

    expect(screen.queryByTestId('badge-card-1')).not.toBeInTheDocument();
    const activeTabPanel = await screen.findByRole('tabpanel');
    expect(activeTabPanel.querySelector('[data-testid^="badge-card-"]')).toBeNull();
  });

  it('should handle the case where there are no badges at all', () => {
    mockUseGlobalState.mockReturnValue({
      state: { allBadges: [], earnedBadges: new Set(), isLoaded: true },
    });
    render(<BadgesPage />, { wrapper: MemoryRouterProvider });
    
    const activeTabPanel = screen.getByRole('tabpanel');
    expect(activeTabPanel.querySelector('[data-testid^="badge-card-"]')).toBeNull();
  });
});