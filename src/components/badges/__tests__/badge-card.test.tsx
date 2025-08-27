import React from 'react';
import { render, screen } from '@testing-library/react';
import { BadgeCard } from '../badge-card';
import type { Badge } from '@/lib/types';
import * as Icons from 'lucide-react';

// Mock the entire lucide-react library
jest.mock('lucide-react', () => {
  const originalModule = jest.requireActual('lucide-react');
  const iconMock = (name: string) => (props: any) => {
    // Remove className from props to avoid snapshot inconsistencies with generated hashes
    const { className, ...rest } = props;
    return React.createElement('svg', { ...rest, 'data-testid': `${name}Icon` });
  };

  const mocks = {
    Lock: iconMock('Lock'),
    Award: iconMock('Award'),
    Trophy: iconMock('Trophy'),
  };

  return {
    ...originalModule,
    ...mocks,
    // Default mock for any other icon
    __esModule: true,
    default: new Proxy(mocks, {
      get: (target, prop) => {
        if (typeof prop === 'string' && prop in target) {
          return (target as any)[prop];
        }
        // Return a generic mock for any icon not explicitly mocked
        return iconMock(String(prop));
      },
    }),
  };
});


const mockBadge: Badge = {
  id: 'b1',
  name: 'Master of Time',
  description: 'Log 100 hours of focused work.',
  icon: 'Trophy',
  color: '#FFD700',
  category: 'overall',
  isCustom: false,
  isEnabled: true,
  requiredCount: 1,
  conditions: [
    {
      type: 'TOTAL_STUDY_TIME',
      target: 360000,
      timeframe: 'TOTAL',
    },
  ],
};

describe('BadgeCard', () => {
  it('renders an earned badge correctly', () => {
    render(<BadgeCard badge={mockBadge} isEarned={true} />);

    // Check for content
    expect(screen.getByText('Master of Time')).toBeInTheDocument();
    expect(screen.getByText('Log 100 hours of focused work.')).toBeInTheDocument();

    // Check for correct icon and absence of lock
    expect(screen.getByTestId('TrophyIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('LockIcon')).not.toBeInTheDocument();

    // Check for earned styles (via parent element style props)
    const card = screen.getByText('Master of Time').closest('.transition-all');
    expect(card).not.toHaveClass('grayscale');
    expect(card).toHaveStyle(`borderColor: ${mockBadge.color}`);
    expect(card).toHaveStyle(`backgroundColor: ${mockBadge.color}1A`);
  });

  it('renders an unearned (locked) badge correctly', () => {
    render(<BadgeCard badge={mockBadge} isEarned={false} />);

    // Check for content
    expect(screen.getByText('Master of Time')).toBeInTheDocument();
    expect(screen.getByText('Log 100 hours of focused work.')).toBeInTheDocument();

    // Check for lock icon
    expect(screen.getByTestId('LockIcon')).toBeInTheDocument();
    
    // Check for muted/grayscale styles
    const card = screen.getByText('Master of Time').closest('.transition-all');
    expect(card).toHaveClass('grayscale');
    expect(card).toHaveClass('border-dashed');
    expect(card).not.toHaveStyle(`borderColor: ${mockBadge.color}`);
    expect(card).not.toHaveStyle(`backgroundColor: ${mockBadge.color}1A`);

    // Check that the main icon is still present but muted
    const icon = screen.getByTestId('TrophyIcon');
    expect(icon).toBeInTheDocument();
    // The icon itself doesn't get the class, its parent does.
    // We can check the parent of the icon for the muted class.
    const iconContainer = icon.parentElement;
    expect(iconContainer).toHaveClass('bg-muted');
  });

  it('falls back to the default Award icon if the specified icon is invalid', () => {
    const badgeWithInvalidIcon: Badge = {
      ...mockBadge,
      icon: 'NonExistentIcon',
    };

    render(<BadgeCard badge={badgeWithInvalidIcon} isEarned={true} />);

    // Check that the fallback icon is rendered
    expect(screen.getByTestId('AwardIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('NonExistentIcon')).not.toBeInTheDocument();
    
    // Ensure other details are still correct
    expect(screen.getByText('Master of Time')).toBeInTheDocument();
  });
});