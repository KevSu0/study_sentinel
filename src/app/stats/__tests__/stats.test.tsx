import React, { Suspense } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatsPage from '../page';
import { useGlobalState } from '@/hooks/use-global-state';
import { useStats } from '@/hooks/use-stats';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';
import { addDays, subDays, format } from 'date-fns';
import { getSessionDate } from '@/lib/utils';

// Mock external dependencies
jest.mock('@/hooks/use-global-state');
jest.mock('@/hooks/use-stats');

// A definitive, correct, and type-safe mock for Radix UI Tabs using reduce and explicit casting.
jest.mock('@radix-ui/react-tabs', () => {
    const React = require('react');
    
    type Accumulator = {
        list: React.ReactElement[];
        content: React.ReactElement[];
    };

    const Root = React.forwardRef(({ children, onValueChange, value, ...props }: { children: React.ReactNode; onValueChange: (value: string) => void; value: string }, ref: React.Ref<HTMLDivElement>) => {
        
        const { list, content } = React.Children.toArray(children).reduce(
            (acc: Accumulator, childNode: React.ReactNode) => {
                if (React.isValidElement(childNode)) {
                    // Explicitly cast childNode to a ReactElement after the type guard.
                    const child = childNode as React.ReactElement;

                    // Check for Tabs.List
                    if ((child.type as any).displayName === 'Tabs.List') {
                        acc.list.push(child);
                    }
                    // Check for Tabs.Content that matches the active value
                    else if (child.props.value === value) {
                        acc.content.push(child);
                    }
                }
                return acc;
            },
            { list: [], content: [] }
        );

        return (
            <div ref={ref} {...props}>
                {list.map((l: React.ReactElement, i: number) => React.cloneElement(l, { key: i, onValueChange, activeValue: value }))}
                {content}
            </div>
        );
    });
    Root.displayName = 'Tabs.Root';

    const List = React.forwardRef(({ children, onValueChange, activeValue, ...props }: { children: React.ReactNode; onValueChange: (value: string) => void; activeValue: string }, ref: React.Ref<HTMLDivElement>) => {
        const childrenWithProps = React.Children.map(children, (child: React.ReactNode) => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child as React.ReactElement, { onValueChange, activeValue });
            }
            return child;
        });
        return <div ref={ref} {...props}>{childrenWithProps}</div>;
    });
    List.displayName = 'Tabs.List';

    const Trigger = React.forwardRef(({ children, value, onValueChange, activeValue, ...props }: { children: React.ReactNode; value: string; onValueChange: (value: string) => void; activeValue: string }, ref: React.Ref<HTMLButtonElement>) => {
        return (
            <button ref={ref} {...props} role="tab" data-state={activeValue === value ? 'active' : 'inactive'} onClick={() => onValueChange(value)}>
                {children}
            </button>
        );
    });
    Trigger.displayName = 'Tabs.Trigger';

    const Content = React.forwardRef((props: { children: React.ReactNode; value: string }, ref: React.Ref<HTMLDivElement>) => <div ref={ref} {...props} />);
    Content.displayName = 'Tabs.Content';

    return { Root, List, Trigger, Content };
});


// Mock UI and child components
// Note: lucide-react is now auto-mocked by the file in __mocks__/
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div role="status" data-testid="skeleton" />,
}));
jest.mock('@/components/ui/calendar', () => ({
    Calendar: (props: { onSelect: (date: Date) => void }) => <div data-testid="calendar-popover" onClick={() => props.onSelect(new Date('2023-10-27T12:00:00.000Z'))} />,
}));
jest.mock('@/components/stats/stat-card-grid', () => ({
  StatCardGrid: ({ isLoaded }: { isLoaded: boolean }) => (
    <div data-testid="stat-card-grid">
      {!isLoaded && <div role="status" data-testid="skeleton" />}
    </div>
  ),
}));
jest.mock('@/components/stats/badge-collection', () => ({
  BadgeCollection: ({ isLoaded }: { isLoaded: boolean }) => (
    <div data-testid="badge-collection">
      {!isLoaded && <div role="status" data-testid="skeleton" />}
    </div>
  ),
}));
jest.mock('@/components/dashboard/productivity-pie-chart', () => (props: { data: any[], isLoaded: boolean }) => (
  <div data-testid="productivity-pie-chart" data-data={JSON.stringify(props.data)}>
    {!props.isLoaded && <div role="status" data-testid="skeleton" />}
  </div>
));
jest.mock('@/components/stats/daily-activity-timeline', () => ({
  DailyActivityTimeline: ({ isLoaded }: { isLoaded: boolean }) => (
    <div data-testid="daily-activity-timeline">
      {!isLoaded && <div role="status" data-testid="skeleton" />}
    </div>
  ),
}));
jest.mock('@/components/stats/performance-coach', () => ({
  PerformanceCoach: ({ isLoaded }: { isLoaded: boolean }) => (
    <div data-testid="performance-coach">
      {!isLoaded && <div role="status" data-testid="skeleton" />}
    </div>
  ),
}));
jest.mock('@/components/stats/stat-comparison', () => ({
    StatComparison: ({ isLoaded }: { isLoaded: boolean }) => (
        <div data-testid="stat-comparison">
            {!isLoaded && <div role="status" data-testid="skeleton" />}
        </div>
    ),
}));
jest.mock('@/components/stats/routine-stats-list', () => ({
    RoutineStatsList: () => <div data-testid="routine-stats-list" />,
}));
jest.mock('@/components/stats/weekly-chart', () => () => <div data-testid="weekly-chart" />);


const mockUseGlobalState = useGlobalState as jest.Mock;
const mockUseStats = useStats as jest.Mock;

const fullMockStats = {
    timeRangeStats: { points: 100, time: 3600, sessions: 5, completionRate: 0.8 },
    studyStreak: 3,
    badgeStats: { earned: 2, total: 10 },
    categorizedBadges: {},
    barChartData: [{}],
    chartDetails: { title: 'Activity', description: 'Progress' },
    dailyPieChartData: [{ name: 'Task 1', value: 60 }],
    timeRangePieChartData: [{ name: 'Task 2', value: 40 }],
    dailyComparisonStats: { today: {}, yesterday: {}, weeklyAverage: {} },
    dailyActivityTimelineData: [{}],
    performanceCoachStats: { selectedDateSession: {}, week: {} },
    routineStats: [{}],
};

const renderComponent = () => {
    return render(
        <MemoryRouterProvider>
            <Suspense fallback={<div data-testid="suspense-fallback" />}>
                <StatsPage />
            </Suspense>
        </MemoryRouterProvider>
    );
};

describe('StatsPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseGlobalState.mockReturnValue({
            state: { isLoaded: true, profile: { dailyStudyGoal: 2 } },
        });
        mockUseStats.mockReturnValue(fullMockStats);
    });

    it('should show loading skeletons when global state is not loaded', async () => {
        mockUseGlobalState.mockReturnValue({
            state: { isLoaded: false, profile: {} },
        });
        mockUseStats.mockReturnValue({
            ...fullMockStats,
            timeRangeStats: null,
            badgeStats: null,
        });
        
        renderComponent();
        
        const skeletons = await screen.findAllByTestId('skeleton');
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should handle empty stats gracefully', async () => {
        mockUseStats.mockReturnValue({
            ...fullMockStats,
            dailyPieChartData: [],
            timeRangePieChartData: [],
            routineStats: [],
        });

        renderComponent();

        expect(screen.getByTestId('productivity-pie-chart')).toHaveAttribute('data-data', '[]');
        
        fireEvent.click(screen.getByRole('tab', { name: /Last 7 Days/i }));
        
        await waitFor(() => {
            expect(screen.getByTestId('routine-stats-list')).toBeInTheDocument();
        });
    });

    describe('"Today" View', () => {
        it('should render the correct components', () => {
            renderComponent();
            expect(screen.getByTestId('performance-coach')).toBeInTheDocument();
            expect(screen.getByTestId('productivity-pie-chart')).toBeInTheDocument();
            expect(screen.getByTestId('daily-activity-timeline')).toBeInTheDocument();
            expect(screen.getByTestId('stat-comparison')).toBeInTheDocument();
        });

        it('should handle date changes via calendar', async () => {
            renderComponent();
            fireEvent.click(screen.getByRole('button', { name: /today/i }));
            const calendar = await screen.findByTestId('calendar-popover');
            fireEvent.click(calendar);
            
            await waitFor(() => {
                expect(mockUseStats).toHaveBeenCalledWith(expect.objectContaining({
                    selectedDate: new Date('2023-10-27T12:00:00.000Z'),
                }));
            });
        });

        describe('Date Navigation', () => {
            it('should navigate to the previous day', async () => {
                renderComponent();
                const prevButton = screen.getByTestId('chevron-left-icon').parentElement;
                fireEvent.click(prevButton!);

                await waitFor(() => {
                    const expectedDate = subDays(getSessionDate(), 1);
                    expect(mockUseStats).toHaveBeenCalledWith(expect.objectContaining({
                        selectedDate: expect.any(Date),
                    }));
                    const lastCall = mockUseStats.mock.calls[mockUseStats.mock.calls.length - 1][0];
                    expect(format(lastCall.selectedDate, 'yyyy-MM-dd')).toBe(format(expectedDate, 'yyyy-MM-dd'));
                });
            });

            it('should navigate to the next day', async () => {
                renderComponent();
                const nextButton = screen.getByTestId('chevron-right-icon').parentElement;
                fireEvent.click(nextButton!);

                await waitFor(() => {
                    const expectedDate = addDays(getSessionDate(), 1);
                    const lastCall = mockUseStats.mock.calls[mockUseStats.mock.calls.length - 1][0];
                    expect(format(lastCall.selectedDate, 'yyyy-MM-dd')).toBe(format(expectedDate, 'yyyy-MM-dd'));
                });
            });

            it('should display the formatted date when not today', async () => {
                renderComponent();
                const prevButton = screen.getByTestId('chevron-left-icon').parentElement;
                fireEvent.click(prevButton!);

                await waitFor(() => {
                    const expectedDate = subDays(getSessionDate(), 1);
                    expect(screen.getByText(format(expectedDate, 'MMM d, yyyy'))).toBeInTheDocument();
                });
            });
        });
    });

    describe('Other Time Range Views', () => {
        it('should render components and call useStats for "Last 7 Days"', async () => {
            renderComponent();
            expect(mockUseStats).toHaveBeenCalledTimes(1);

            const tab = screen.getByRole('tab', { name: /Last 7 Days/i });
            fireEvent.click(tab);
            
            await waitFor(() => {
                expect(mockUseStats).toHaveBeenCalledWith(expect.objectContaining({ timeRange: 'weekly' }));
            });

            expect(screen.getByTestId('stat-card-grid')).toBeInTheDocument();
            expect(screen.getByTestId('weekly-chart')).toBeInTheDocument();
            expect(screen.getByTestId('badge-collection')).toBeInTheDocument();
        });

        it('should render components and call useStats for "Last 30 Days"', async () => {
            renderComponent();
            expect(mockUseStats).toHaveBeenCalledTimes(1);

            const tab = screen.getByRole('tab', { name: /Last 30 Days/i });
            fireEvent.click(tab);
            
            await waitFor(() => {
                expect(mockUseStats).toHaveBeenCalledWith(expect.objectContaining({ timeRange: 'monthly' }));
            });

            expect(screen.getByTestId('stat-card-grid')).toBeInTheDocument();
            expect(screen.getByTestId('weekly-chart')).toBeInTheDocument();
            expect(screen.getByTestId('badge-collection')).toBeInTheDocument();
        });

        it('should render components and call useStats for "Overall"', async () => {
            renderComponent();
            expect(mockUseStats).toHaveBeenCalledTimes(1);

            const tab = screen.getByRole('tab', { name: /Overall/i });
            fireEvent.click(tab);
            
            await waitFor(() => {
                expect(mockUseStats).toHaveBeenCalledWith(expect.objectContaining({ timeRange: 'overall' }));
            });

            expect(screen.getByTestId('stat-card-grid')).toBeInTheDocument();
            expect(screen.getByTestId('weekly-chart')).toBeInTheDocument();
            expect(screen.getByTestId('badge-collection')).toBeInTheDocument();
        });
    });
});