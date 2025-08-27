import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BadgeListItem } from '../badge-list-item';
import type { Badge } from '@/lib/types';
import * as Icons from 'lucide-react';

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const originalModule = jest.requireActual('lucide-react');
  const iconMock = (name: string) => (props: any) => React.createElement('svg', { ...props, 'data-testid': `${name}Icon` });

  const mocks = {
    Pencil: iconMock('Pencil'),
    Trash2: iconMock('Trash2'),
    ShieldCheck: iconMock('ShieldCheck'),
    Wrench: iconMock('Wrench'),
    CalendarCheck2: iconMock('CalendarCheck2'),
    Award: iconMock('Award'),
  };

  return {
    ...originalModule,
    ...mocks,
    __esModule: true,
    default: new Proxy(mocks, {
      get: (target, prop) => (target as any)[prop] || iconMock(String(prop)),
    }),
  };
});

const baseBadge: Badge = {
  id: 'b1',
  name: 'Test Badge',
  description: 'A badge for testing purposes.',
  icon: 'Trophy',
  category: 'daily',
  isCustom: false,
  isEnabled: true,
  requiredCount: 1,
  conditions: [{ type: 'TASKS_COMPLETED', target: 1, timeframe: 'DAY' }],
};

const defaultProps = {
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onToggle: jest.fn(),
  isEarned: false,
};

describe('BadgeListItem', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a system badge correctly', () => {
    render(<BadgeListItem {...defaultProps} badge={baseBadge} />);
    
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
    expect(screen.getByText('A badge for testing purposes.')).toBeInTheDocument();
    expect(screen.getByTestId('ShieldCheckIcon')).toBeInTheDocument();
    expect(screen.getByText('System Badge')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
  });

  it('renders a custom badge correctly with Edit and Delete buttons', () => {
    const customBadge = { ...baseBadge, isCustom: true };
    render(<BadgeListItem {...defaultProps} badge={customBadge} />);
    
    expect(screen.getByTestId('WrenchIcon')).toBeInTheDocument();
    expect(screen.getByText('Custom Badge')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('shows the toggle switch for an unearned badge', () => {
    render(<BadgeListItem {...defaultProps} badge={baseBadge} />);
    
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.queryByTestId('CalendarCheck2Icon')).not.toBeInTheDocument();
  });

  it('shows the "Earned" status and hides the toggle for an earned badge', () => {
    render(<BadgeListItem {...defaultProps} badge={baseBadge} isEarned={true} />);
    
    expect(screen.getByTestId('CalendarCheck2Icon')).toBeInTheDocument();
    expect(screen.getByText('Earned')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('applies an opacity style when the badge is disabled', () => {
    const disabledBadge = { ...baseBadge, isEnabled: false };
    const { container } = render(<BadgeListItem {...defaultProps} badge={disabledBadge} />);
    
    expect(container.firstChild).toHaveClass('opacity-50');
  });

  it('calls onToggle when the switch is clicked', async () => {
    const user = userEvent.setup();
    render(<BadgeListItem {...defaultProps} badge={baseBadge} />);
    
    const toggle = screen.getByRole('switch');
    await user.click(toggle);
    
    expect(defaultProps.onToggle).toHaveBeenCalledWith(baseBadge.id, { isEnabled: false });
  });

  it('calls onEdit when the Edit/View button is clicked', async () => {
    const user = userEvent.setup();
    render(<BadgeListItem {...defaultProps} badge={baseBadge} />);
    
    await user.click(screen.getByRole('button', { name: /View/i }));
    
    expect(defaultProps.onEdit).toHaveBeenCalledWith(baseBadge);
  });

  it('calls onDelete when the Delete button is clicked for a custom badge', async () => {
    const user = userEvent.setup();
    const customBadge = { ...baseBadge, isCustom: true };
    render(<BadgeListItem {...defaultProps} badge={customBadge} />);
    
    await user.click(screen.getByRole('button', { name: /Delete/i }));
    
    expect(defaultProps.onDelete).toHaveBeenCalledWith(customBadge.id);
  });

  it('falls back to Award icon if badge icon is invalid', () => {
    const invalidIconBadge = { ...baseBadge, icon: 'InvalidIcon' };
    render(<BadgeListItem {...defaultProps} badge={invalidIconBadge} />);
    
    expect(screen.getByTestId('AwardIcon')).toBeInTheDocument();
  });
});