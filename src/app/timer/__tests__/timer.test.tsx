import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimerPage from '../page';
import { useGlobalState } from '@/hooks/use-global-state';
import { useRouter } from 'next/navigation';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';

// Mocking necessary hooks and modules
jest.mock('@/hooks/use-global-state');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock child components with named exports
jest.mock('@/components/shared/motivational-quote', () => ({
  MotivationalQuote: () => <div data-testid="motivational-quote">Motivational Quote</div>,
}));
jest.mock('@/components/tasks/timer-controls', () => ({
  TimerControls: (props: any) => (
    <div data-testid="timer-controls">
      <button onClick={props.onTogglePause}>{props.isPaused ? 'Resume' : 'Pause'}</button>
      <button onClick={props.onComplete}>Complete</button>
      <button onClick={props.onStop}>Stop</button>
    </div>
  ),
}));
jest.mock('@/components/tasks/stop-timer-dialog', () => ({
  StopTimerDialog: ({ isOpen, onOpenChange, onConfirm }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="stop-dialog">
        <h1>Are you sure you want to stop the timer?</h1>
        <label htmlFor="reason">Reason for stopping</label>
        <input id="reason" defaultValue="Interrupted" />
        <button onClick={() => onConfirm('Interrupted')}>Stop Timer</button>
        <button onClick={() => onOpenChange(false)}>Cancel</button>
      </div>
    );
  },
}));
jest.mock('lucide-react', () => ({
  VolumeX: () => <div data-testid="volume-x-icon" />,
  Volume2: () => <div data-testid="volume-2-icon" />,
  Shrink: () => <div data-testid="shrink-icon" />,
  Star: ({ className }: { className: string }) => <div data-testid={className?.includes('w-32') ? 'star-animation' : 'star-icon'} className={className} />,
}));

const mockRequestWakeLock = jest.fn();
const mockReleaseWakeLock = jest.fn();
jest.mock('@/hooks/use-wake-lock', () => ({
    useWakeLock: () => {
        const { useEffect } = require('react');
        useEffect(() => {
            mockRequestWakeLock();
            return () => {
                mockReleaseWakeLock();
            };
        }, []);
    },
}));


const mockUseGlobalState = useGlobalState as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe('TimerPage', () => {
  const mockTogglePause = jest.fn();
  const mockCompleteTimer = jest.fn();
  const mockStopTimer = jest.fn();
  const mockToggleMute = jest.fn();
  const mockRouterBack = jest.fn();
  const mockRouterReplace = jest.fn();

  const setup = (state: any) => {
    mockUseRouter.mockReturnValue({
      back: mockRouterBack,
      replace: mockRouterReplace,
    });

    mockUseGlobalState.mockReturnValue({
      state: {
        activeItem: { item: { title: 'Test Timer' } },
        timeDisplay: '25:00',
        isOvertime: false,
        timerProgress: 50,
        isMuted: false,
        isPaused: false,
        starCount: 0,
        showStarAnimation: false,
        ...state,
      },
      togglePause: mockTogglePause,
      completeTimer: mockCompleteTimer,
      stopTimer: mockStopTimer,
      toggleMute: mockToggleMute,
    });

    return render(<TimerPage />, { wrapper: MemoryRouterProvider });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the timer with active item title and motivational quote', () => {
    setup({});
    expect(screen.getByText('Test Timer')).toBeInTheDocument();
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByTestId('motivational-quote')).toBeInTheDocument();
  });

  it('should redirect to home if there is no active item', () => {
    setup({ activeItem: null });
    expect(mockRouterReplace).toHaveBeenCalledWith('/');
  });

  it('should request wake lock on mount and release on unmount', () => {
    const { unmount } = setup({});
    expect(mockRequestWakeLock).toHaveBeenCalled();
    unmount();
    expect(mockReleaseWakeLock).toHaveBeenCalled();
  });

  it('should call router.back when exit fullscreen button is clicked', () => {
    setup({});
    fireEvent.click(screen.getByRole('button', { name: 'Exit Fullscreen' }));
    expect(mockRouterBack).toHaveBeenCalled();
  });

  describe.each([
    { isPaused: false, buttonLabel: 'Pause' },
    { isPaused: true, buttonLabel: 'Resume' },
  ])('Pause/Resume button', ({ isPaused, buttonLabel }) => {
    it(`should display "${buttonLabel}" and call togglePause when clicked`, () => {
      setup({ isPaused });
      const pauseButton = screen.getByRole('button', { name: buttonLabel });
      expect(pauseButton).toBeInTheDocument();
      fireEvent.click(pauseButton);
      expect(mockTogglePause).toHaveBeenCalled();
    });
  });

  it('should call completeTimer and router.back when complete button is clicked', () => {
    setup({});
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(mockCompleteTimer).toHaveBeenCalled();
    expect(mockRouterBack).toHaveBeenCalled();
  });

  describe('Stop Timer Dialog', () => {
    it('should open, interact with, and submit the dialog', async () => {
      setup({});
      fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
      
      expect(screen.getByTestId('stop-dialog')).toBeInTheDocument();
  
      const confirmButton = screen.getByRole('button', { name: 'Stop Timer' });
      fireEvent.click(confirmButton);
  
      await waitFor(() => {
        expect(mockStopTimer).toHaveBeenCalledWith('Interrupted');
        expect(mockRouterBack).toHaveBeenCalled();
      });
    });

    it('should call togglePause if timer is not paused when stop is clicked', () => {
        setup({ isPaused: false });
        fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
        expect(mockTogglePause).toHaveBeenCalled();
    });

    it('should not call togglePause if timer is already paused when stop is clicked', () => {
        setup({ isPaused: true });
        fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
        expect(mockTogglePause).not.toHaveBeenCalled();
    });

    it('should close the dialog when cancel is clicked', async () => {
        setup({});
        fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
        
        const dialog = screen.getByTestId('stop-dialog');
        expect(dialog).toBeInTheDocument();
        
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        fireEvent.click(cancelButton);

        await waitFor(() => {
            expect(screen.queryByTestId('stop-dialog')).not.toBeInTheDocument();
        });
    });
  });

  describe.each([
      { isMuted: false, buttonLabel: 'Mute' },
      { isMuted: true, buttonLabel: 'Unmute' },
  ])('Mute/Unmute button', ({ isMuted, buttonLabel }) => {
      it(`should display "${buttonLabel}" and call toggleMute when clicked`, () => {
          setup({ isMuted });
          const muteButton = screen.getByRole('button', { name: buttonLabel });
          expect(muteButton).toBeInTheDocument();
          fireEvent.click(muteButton);
          expect(mockToggleMute).toHaveBeenCalled();
      });
  });

  it('should display the timer with destructive class when in overtime', () => {
    setup({ isOvertime: true, timeDisplay: '-00:01' });
    const timeDisplay = screen.getByText('-00:01');
    expect(timeDisplay).toHaveClass('text-destructive');
  });

  describe('Visual states', () => {
    it('should display the star count when greater than 0', () => {
        setup({ starCount: 5 });
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByTestId('star-icon')).toBeInTheDocument();
    });

    it('should not display the star count when it is 0', () => {
        setup({ starCount: 0 });
        expect(screen.queryByText('5')).not.toBeInTheDocument();
        expect(screen.queryByTestId('star-icon')).not.toBeInTheDocument();
    });

    it('should show the star animation when showStarAnimation is true', () => {
        setup({ showStarAnimation: true });
        expect(screen.getByTestId('star-animation')).toBeInTheDocument();
    });

    it('should apply smaller font size for long time displays', () => {
        setup({ timeDisplay: '01:25:00' });
        const timeDisplay = screen.getByText('01:25:00');
        expect(timeDisplay).toHaveClass('text-6xl sm:text-8xl');
    });

    it('should apply larger font size for short time displays', () => {
        setup({ timeDisplay: '25:00' });
        const timeDisplay = screen.getByText('25:00');
        expect(timeDisplay).toHaveClass('text-7xl sm:text-9xl');
    });
  });
});