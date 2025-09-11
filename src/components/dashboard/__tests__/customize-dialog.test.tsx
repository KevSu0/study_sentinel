import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {CustomizeDialog} from '@/components/dashboard/customize-dialog';
import {useDashboardLayout, WIDGET_NAMES} from '@/hooks/use-dashboard-layout';
import {useViewMode} from '@/hooks/use-view-mode';

// Mock hooks
jest.mock('@/hooks/use-dashboard-layout');
jest.mock('@/hooks/use-view-mode');

// Mock dnd-kit
let capturedOnDragEnd: (event: any) => void;
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({children, onDragEnd}: any) => {
    capturedOnDragEnd = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  },
  closestCenter: jest.fn(),
}));
jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({children}: any) => <div>{children}</div>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
  }),
  verticalListSortingStrategy: jest.fn(),
  arrayMove: jest.fn((array, from, to) => {
    const newArray = [...array];
    const [removed] = newArray.splice(from, 1);
    newArray.splice(to, 0, removed);
    return newArray;
  }),
}));
jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}));

describe('CustomizeDialog', () => {
  const mockUseDashboardLayout = useDashboardLayout as jest.Mock;
  const mockUseViewMode = useViewMode as jest.Mock;

  const mockLayout = [
    {id: 'daily_briefing', isVisible: true},
    {id: 'stats_overview', isVisible: false},
  ];
  const mockSetLayout = jest.fn();
  const mockToggleWidgetVisibility = jest.fn();
  const mockSetViewMode = jest.fn();

  beforeEach(() => {
    mockUseDashboardLayout.mockReturnValue({
      layout: mockLayout,
      setLayout: mockSetLayout,
      toggleWidgetVisibility: mockToggleWidgetVisibility,
    });
    mockUseViewMode.mockReturnValue({
      viewMode: 'card',
      setViewMode: mockSetViewMode,
    });
  });

  it('renders the dialog with correct initial state', () => {
    render(<CustomizeDialog isOpen={true} onOpenChange={jest.fn()} />);
    expect(screen.getByText('Customize Dashboard')).toBeInTheDocument();
    expect(screen.getByText(WIDGET_NAMES.daily_briefing)).toBeInTheDocument();
    expect(screen.getByText(WIDGET_NAMES.stats_overview)).toBeInTheDocument();
    const switches = screen.getAllByRole('switch');
    expect(switches[0]).toBeChecked();
    expect(switches[1]).not.toBeChecked();
  });

  it('calls setViewMode when view mode buttons are clicked', () => {
    render(<CustomizeDialog isOpen={true} onOpenChange={jest.fn()} />);
    const listButton = screen.getByRole('button', {name: /list view/i});
    fireEvent.click(listButton);
    expect(mockSetViewMode).toHaveBeenCalledWith('list');
  });

  it('calls toggleWidgetVisibility when a switch is clicked', () => {
    render(<CustomizeDialog isOpen={true} onOpenChange={jest.fn()} />);
    const firstSwitch = screen.getAllByRole('switch')[0];
    fireEvent.click(firstSwitch);
    expect(mockToggleWidgetVisibility).toHaveBeenCalledWith('daily_briefing');
  });

  it('calls setLayout on drag end', () => {
    render(<CustomizeDialog isOpen={true} onOpenChange={jest.fn()} />);
    
    const event = {
      active: {id: 'daily_briefing'},
      over: {id: 'stats_overview'},
    };

    // Directly invoke the captured onDragEnd handler
    if (capturedOnDragEnd) {
      capturedOnDragEnd(event);
    }

    expect(mockSetLayout).toHaveBeenCalled();
  });
});