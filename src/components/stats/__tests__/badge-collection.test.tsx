import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BadgeCollection } from '../badge-collection';
import { Badge, BadgeCategory } from '@/lib/types';

jest.mock('@/components/badges/badge-card', () => ({
  BadgeCard: ({ badge, isEarned }: { badge: Badge; isEarned: boolean }) => (
    <div>
      <h4>{badge.name}</h4>
      {isEarned && <span>Earned</span>}
    </div>
  ),
}));

jest.mock('@/components/ui/tabs', () => {
  const React = require('react');
  const Tabs = ({
    defaultValue,
    children,
  }: {
    defaultValue: string;
    children: React.ReactNode;
  }) => {
    const [activeTab, setActiveTab] = React.useState(defaultValue);
    const childrenWithProps = React.Children.map(children, (child: any) => {
      if (child.type.name === 'TabsList') {
        return React.cloneElement(child, { activeTab, setActiveTab });
      }
      if (child.type.name === 'TabsContent' && child.props.value === activeTab) {
        return child;
      }
      return null;
    });
    return <div>{childrenWithProps}</div>;
  };

  const TabsList = ({
    children,
    activeTab,
    setActiveTab,
  }: {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (value: string) => void;
  }) => {
    const childrenWithProps = React.Children.map(children, (child: any) => {
      return React.cloneElement(child, {
        onClick: () => setActiveTab(child.props.value),
        'data-state': activeTab === child.props.value ? 'active' : 'inactive',
      });
    });
    return <div>{childrenWithProps}</div>;
  };

  const TabsTrigger = ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button onClick={onClick} role="tab" {...props}>
      {children}
    </button>
  );

  const TabsContent = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );

  return {
    __esModule: true,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
  };
});

describe('BadgeCollection', () => {
  const mockBadges: Record<BadgeCategory, Badge[]> = {
    daily: [{ id: 'd1', name: 'Daily Badge', description: '', category: 'daily', icon: 'star', isCustom: false, isEnabled: true, requiredCount: 1, conditions: [] }],
    weekly: [{ id: 'w1', name: 'Weekly Badge', description: '', category: 'weekly', icon: 'shield', isCustom: false, isEnabled: true, requiredCount: 1, conditions: [] }],
    monthly: [],
    overall: [{ id: 'o1', name: 'Overall Badge', description: '', category: 'overall', icon: 'gem', isCustom: false, isEnabled: true, requiredCount: 1, conditions: [] }],
  };

  const mockEarnedBadges = new Map([['d1', '2023-01-01']]);

  it('renders the badge collection with correct counts', () => {
    render(
      <BadgeCollection
        badgeStats={{ earnedCount: 1, totalCount: 3 }}
        categorizedBadges={mockBadges}
        earnedBadges={mockEarnedBadges}
        isLoaded={true}
      />
    );

    expect(screen.getByText('Badge Collection')).toBeInTheDocument();
    expect(screen.getByText(/You've earned 1 out of 3 possible badges/)).toBeInTheDocument();
  });

  it('shows the correct badges for the selected category', async () => {
    render(
      <BadgeCollection
        badgeStats={{ earnedCount: 1, totalCount: 3 }}
        categorizedBadges={mockBadges}
        earnedBadges={mockEarnedBadges}
        isLoaded={true}
      />
    );

    // Daily tab is active by default
    expect(screen.getByText('Daily Badge')).toBeInTheDocument();
    expect(screen.getByText('Earned')).toBeInTheDocument();

    // Switch to weekly tab
    fireEvent.click(screen.getByRole('tab', { name: /weekly/i }));

    // Wait for the "Weekly Badge" to be visible
    await waitFor(() => {
      expect(screen.getByText('Weekly Badge')).toBeInTheDocument();
    });
    expect(screen.queryByText('Earned')).not.toBeInTheDocument();
  });

  it('shows skeletons when not loaded', () => {
    render(
      <BadgeCollection
        badgeStats={{ earnedCount: 0, totalCount: 0 }}
        categorizedBadges={{ daily: [], weekly: [], monthly: [], overall: [] }}
        earnedBadges={new Map()}
        isLoaded={false}
      />
    );

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });
});