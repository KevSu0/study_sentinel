import React from 'react';
import {render, screen} from '@testing-library/react';
import {UnlockedBadgesWidget} from '../unlocked-badges-widget';
import {BadgeCard} from '@/components/badges/badge-card';

// Mock the child component
jest.mock('@/components/badges/badge-card', () => ({
  BadgeCard: jest.fn(({badge}) => (
    <div data-testid="badge-card">{badge.name}</div>
  )),
}));

const mockBadges = [
  {id: 'badge1', name: 'First Badge'},
  {id: 'badge2', name: 'Second Badge'},
];

describe('UnlockedBadgesWidget', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render null if todaysBadges is null', () => {
    const {container} = render(<UnlockedBadgesWidget todaysBadges={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render null if todaysBadges is an empty array', () => {
    const {container} = render(<UnlockedBadgesWidget todaysBadges={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render the widget with a list of badges', () => {
    render(<UnlockedBadgesWidget todaysBadges={mockBadges} />);

    expect(screen.getByText('Badges Unlocked Today')).toBeInTheDocument();
    const badgeCards = screen.getAllByTestId('badge-card');
    expect(badgeCards).toHaveLength(2);
    expect(badgeCards[0]).toHaveTextContent('First Badge');
    expect(badgeCards[1]).toHaveTextContent('Second Badge');
  });

  it('should pass correct props to BadgeCard', () => {
    render(<UnlockedBadgesWidget todaysBadges={mockBadges} />);

    expect(BadgeCard).toHaveBeenCalledTimes(2);
    expect(BadgeCard).toHaveBeenCalledWith(
      {
        badge: mockBadges[0],
        isEarned: true,
      },
      {}
    );
    expect(BadgeCard).toHaveBeenCalledWith(
      {
        badge: mockBadges[1],
        isEarned: true,
      },
      {}
    );
  });
});