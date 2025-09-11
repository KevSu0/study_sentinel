import React from 'react';
import {render, screen} from '@testing-library/react';
import {UnlockedBadgesWidget} from '@/components/dashboard/widgets/unlocked-badges-widget';
import type {Badge} from '@/lib/types';

// Mock the lucide-react library to control icon rendering in tests
jest.mock('lucide-react', () => {
  const icons = {};
  const handler = {
    get: function (_target: any, prop: string) {
      // Return a mock component for any icon, using the icon's name as a key
      return (props: any) => <div data-testid={`icon-${prop}`} {...props} />;
    },
  };
  return new Proxy(icons, handler);
});

const mockBadges: Badge[] = [
  {
    id: 'b1',
    name: 'First Badge',
    description: 'A badge for testing',
    category: 'daily',
    icon: 'test-icon',
    color: '#ff0000',
    isCustom: false,
    isEnabled: true,
    requiredCount: 1,
    conditions: [],
  },
  {
    id: 'b2',
    name: 'Second Badge',
    description: 'Another badge for testing',
    category: 'daily',
    icon: 'test-icon-2',
    color: '#00ff00',
    isCustom: false,
    isEnabled: true,
    requiredCount: 1,
    conditions: [],
  },
];

describe('UnlockedBadgesWidget', () => {
  describe('Online User Flows', () => {
    it('renders nothing when there are no badges', () => {
      const {container} = render(<UnlockedBadgesWidget todaysBadges={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when todaysBadges is null', () => {
      const {container} = render(<UnlockedBadgesWidget todaysBadges={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders a list of badges using the actual BadgeCard component', () => {
      render(<UnlockedBadgesWidget todaysBadges={mockBadges} />);
      expect(screen.getByText('Badges Unlocked Today')).toBeInTheDocument();

      expect(screen.getByText('First Badge')).toBeInTheDocument();
      expect(screen.getByText('Second Badge')).toBeInTheDocument();

      // Verify that the mocked lucide icons are rendered
      expect(screen.getByTestId('icon-test-icon')).toBeInTheDocument();
      expect(screen.getByTestId('icon-test-icon-2')).toBeInTheDocument();
    });
  });

  describe('Offline User Flows', () => {
    it('renders nothing when there are no badges and the user is offline', () => {
      const {container} = render(<UnlockedBadgesWidget todaysBadges={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders a list of badges when the user is offline', () => {
      render(<UnlockedBadgesWidget todaysBadges={mockBadges} />);
      expect(screen.getByText('Badges Unlocked Today')).toBeInTheDocument();

      expect(screen.getByText('First Badge')).toBeInTheDocument();
      expect(screen.getByText('Second Badge')).toBeInTheDocument();

      // Verify that the mocked lucide icons are rendered
      expect(screen.getByTestId('icon-test-icon')).toBeInTheDocument();
      expect(screen.getByTestId('icon-test-icon-2')).toBeInTheDocument();
    });
  });
});