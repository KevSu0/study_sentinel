import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../page';
import { useGlobalState } from '@/hooks/use-global-state';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import { type DragEndEvent } from '@dnd-kit/core';

// --- Mocks ---
let capturedOnDragEnd: (event: DragEndEvent) => void = () => {};
jest.mock('@dnd-kit/core', () => ({
    ...jest.requireActual('@dnd-kit/core'),
    DndContext: (props: {children: React.ReactNode, onDragEnd: (event: DragEndEvent) => void}) => {
        capturedOnDragEnd = props.onDragEnd;
        return <div>{props.children}</div>
    }
}));
jest.mock('@/hooks/use-global-state');
jest.mock('@/hooks/use-dashboard-layout');
jest.mock('next/dynamic', () => () => {
  const DynamicComponent = (props: any) => {
    if (props.isOpen) {
      return <div data-testid="customize-dialog">Customize Dialog</div>;
    }
    return null;
  };
  DynamicComponent.displayName = 'DynamicComponent';
  return DynamicComponent;
});

const mockUseGlobalState = useGlobalState as jest.Mock;
const mockUseDashboardLayout = useDashboardLayout as jest.Mock;

const mockSetLayout = jest.fn();

const defaultGlobalState = {
  isLoaded: true,
  tasks: [{ id: 'task1', title: 'Test Task' }],
  routines: [],
  todaysActivity: [],
  previousDayLogs: [],
  profile: {},
  todaysBadges: [],
};

const defaultLayoutState = {
  isLoaded: true,
  layout: [
    { id: 'todays_plan', isVisible: true },
    { id: 'todays_routines', isVisible: true },
    { id: 'stats_overview', isVisible: false },
  ],
  setLayout: mockSetLayout,
};

const renderComponent = (globalState = {}, layoutState = {}) => {
  mockUseGlobalState.mockReturnValue({
    state: { ...defaultGlobalState, ...globalState },
  });
  mockUseDashboardLayout.mockReturnValue({
    ...defaultLayoutState,
    ...layoutState,
  });

  return render(<DashboardPage />);
};

describe('DashboardPage', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeletons when data is not loaded', () => {
    renderComponent({ isLoaded: false }, { isLoaded: false });
    const main = screen.getByRole('main');
    const skeletonContainer = main.children[0];
    expect(skeletonContainer).toHaveClass('space-y-4');
    expect(skeletonContainer.children[0]).toHaveClass('h-24', 'w-full');
    expect(skeletonContainer.children[1]).toHaveClass('h-40', 'w-full');
    expect(skeletonContainer.children[2]).toHaveClass('h-28', 'w-full');
  });

  it('renders the empty state when there is no content', () => {
    renderComponent({ tasks: [], routines: [], todaysActivity: [] });
    expect(screen.getByText('A Fresh Start!')).toBeInTheDocument();
    expect(screen.getByText("No tasks or routines scheduled for today. Let's plan your day!")).toBeInTheDocument();
  });

  it('renders the main widgets when content exists', () => {
    renderComponent();
    expect(screen.getByText("Today's Plan")).toBeInTheDocument();
    expect(screen.getByText("Today's Routines")).toBeInTheDocument();
    expect(screen.queryByText('Stats Overview')).not.toBeInTheDocument();
  });

  it('opens the customize dialog on button click', async () => {
    renderComponent();
    const customizeButton = screen.getByRole('button', { name: /customize/i });
    await userEvent.click(customizeButton);
    expect(screen.getByTestId('customize-dialog')).toBeInTheDocument();
  });

  it('handles drag and drop to reorder widgets', () => {
    renderComponent();
    
    const dragEvent: DragEndEvent = {
      active: { id: 'todays_plan', data: { current: {} }, rect: { current: { initial: null, translated: null } } },
      over: { id: 'todays_routines', data: { current: {} }, rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, disabled: false },
      collisions: [],
      delta: { x: 0, y: 0 },
      activatorEvent: new MouseEvent('dragend') as any,
    };

    // Simulate the drag end event
    capturedOnDragEnd(dragEvent);

    expect(mockSetLayout).toHaveBeenCalledTimes(1);
    const updaterFunction = mockSetLayout.mock.calls[0][0];
    const newLayout = updaterFunction(defaultLayoutState.layout);
    
    // Expect 'todays_plan' to have moved to the 'todays_routines' position
    expect(newLayout[0].id).toBe('todays_routines');
    expect(newLayout[1].id).toBe('todays_plan');
  });

  it('does not reorder if dragged item is dropped in the same place', () => {
    renderComponent();
    
    const dragEvent: DragEndEvent = {
      active: { id: 'todays_plan', data: { current: {} }, rect: { current: { initial: null, translated: null } } },
      over: { id: 'todays_plan', data: { current: {} }, rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, disabled: false },
      collisions: [],
      delta: { x: 0, y: 0 },
      activatorEvent: new MouseEvent('dragend') as any,
    };

    capturedOnDragEnd(dragEvent);
    expect(mockSetLayout).not.toHaveBeenCalled();
  });

  it('does not reorder if there is no drop target', () => {
    renderComponent();
    
    const dragEvent: DragEndEvent = {
      active: { id: 'todays_plan', data: { current: {} }, rect: { current: { initial: null, translated: null } } },
      over: null,
      collisions: [],
      delta: { x: 0, y: 0 },
      activatorEvent: new MouseEvent('dragend') as any,
    };

    capturedOnDragEnd(dragEvent);
    expect(mockSetLayout).not.toHaveBeenCalled();
  });
});