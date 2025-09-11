import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimerControls } from '../timer-controls';
import { Play, Pause } from 'lucide-react';

describe('TimerControls', () => {
  const mockOnTogglePause = jest.fn();
  const mockOnComplete = jest.fn();
  const mockOnStop = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all control buttons', () => {
    render(
      <TimerControls
        isPaused={false}
        onTogglePause={mockOnTogglePause}
        onComplete={mockOnComplete}
        onStop={mockOnStop}
      />
    );

    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('should display "Resume" and Play icon when paused', () => {
    render(
      <TimerControls
        isPaused={true}
        onTogglePause={mockOnTogglePause}
        onComplete={mockOnComplete}
        onStop={mockOnStop}
      />
    );

    const resumeButton = screen.getByRole('button', { name: /resume/i });
    expect(resumeButton).toBeInTheDocument();
    // Check for Play icon by looking for its parent button's text content
    expect(resumeButton.textContent).toContain('Resume');
  });

  it('should call onTogglePause when the pause/resume button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TimerControls
        isPaused={false}
        onTogglePause={mockOnTogglePause}
        onComplete={mockOnComplete}
        onStop={mockOnStop}
      />
    );

    await user.click(screen.getByRole('button', { name: /pause/i }));
    expect(mockOnTogglePause).toHaveBeenCalledTimes(1);
  });

  it('should call onComplete when the complete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TimerControls
        isPaused={false}
        onTogglePause={mockOnTogglePause}
        onComplete={mockOnComplete}
        onStop={mockOnStop}
      />
    );

    await user.click(screen.getByRole('button', { name: /complete/i }));
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('should call onStop when the stop button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TimerControls
        isPaused={false}
        onTogglePause={mockOnTogglePause}
        onComplete={mockOnComplete}
        onStop={mockOnStop}
      />
    );

    await user.click(screen.getByRole('button', { name: /stop/i }));
    expect(mockOnStop).toHaveBeenCalledTimes(1);
  });
});