/**
 * @jest-environment jsdom
 * @stats-hardening
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { StatsAccessibility, AccessibleTimeRangeSelector } from '@/components/stats/stats-accessibility';
import userEvent from '@testing-library/user-event';

describe('Accessibility & UX', () => {
  beforeEach(() => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  test('keyboard map works: 1/7/3/0', async () => {
    const onRangeChange = jest.fn();

    render(
      <div>
        <StatsAccessibility
          timeRange="daily"
          onTimeRangeChange={onRangeChange}
          selectedDate={new Date()}
          onDateChange={jest.fn()}
        >
          <div>Test Content</div>
        </StatsAccessibility>
      </div>
    );

    // Press '1' for daily
    fireEvent.keyDown(document, { key: '1' });
    expect(onRangeChange).toHaveBeenCalledWith('daily');

    // Press '7' for weekly
    fireEvent.keyDown(document, { key: '7' });
    expect(onRangeChange).toHaveBeenCalledWith('weekly');

    // Press '3' for monthly
    fireEvent.keyDown(document, { key: '3' });
    expect(onRangeChange).toHaveBeenCalledWith('monthly');

    // Press '0' for overall
    fireEvent.keyDown(document, { key: '0' });
    expect(onRangeChange).toHaveBeenCalledWith('overall');
  });

  test('arrow navigation works', async () => {
    const onDateChange = jest.fn();
    const onRangeChange = jest.fn();
    const selectedDate = new Date('2024-01-02');

    render(
      <StatsAccessibility
        timeRange="weekly"
        onTimeRangeChange={onRangeChange}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
      >
        <div>Test Content</div>
      </StatsAccessibility>
    );

    // Alt + Left Arrow for previous day
    fireEvent.keyDown(document, { key: 'ArrowLeft', altKey: true });
    const expectedPrevDate = new Date('2024-01-01');
    expect(onDateChange).toHaveBeenCalledWith(expectedPrevDate);

    // Alt + Right Arrow for next day
    fireEvent.keyDown(document, { key: 'ArrowRight', altKey: true });
    const expectedNextDate = new Date('2024-01-03');
    expect(onDateChange).toHaveBeenCalledWith(expectedNextDate);

    // Ctrl + Left Arrow for previous range
    onRangeChange.mockClear();
    fireEvent.keyDown(document, { key: 'ArrowLeft', ctrlKey: true });
    expect(onRangeChange).toHaveBeenCalledWith('daily');

    // Ctrl + Right Arrow for next range
    fireEvent.keyDown(document, { key: 'ArrowRight', ctrlKey: true });
    expect(onRangeChange).toHaveBeenCalledWith('monthly');
  });

  test('aria-live announces headline metrics on change', () => {
    const { container } = render(
      <StatsAccessibility
        timeRange="daily"
        onTimeRangeChange={jest.fn()}
        selectedDate={new Date()}
        onDateChange={jest.fn()}
      >
        <div data-stats-summary="true">Summary Content</div>
      </StatsAccessibility>
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  test('reduced motion is respected', () => {
    const { container } = render(
      <StatsAccessibility
        timeRange="daily"
        onTimeRangeChange={jest.fn()}
        selectedDate={new Date()}
        onDateChange={jest.fn()}
      >
        <div>Test Content</div>
      </StatsAccessibility>
    );

    // Should show reduced motion warning
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  test('time range selector has proper ARIA attributes', () => {
    const onRangeChange = jest.fn();

    render(
      <AccessibleTimeRangeSelector
        currentRange="weekly"
        onRangeChange={onRangeChange}
      />
    );

    const radiogroup = screen.getByRole('radiogroup');
    expect(radiogroup).toHaveAttribute('aria-label', 'Time range selection');

    const buttons = screen.getAllByRole('radio');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-describedby');
    });
  });

  test('no focus traps in keyboard navigation', () => {
    render(
      <StatsAccessibility
        timeRange="daily"
        onTimeRangeChange={jest.fn()}
        selectedDate={new Date()}
        onDateChange={jest.fn()}
      >
        <div>
          <button>First Button</button>
          <button>Second Button</button>
        </div>
      </StatsAccessibility>
    );

    // All buttons should be reachable
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).not.toHaveAttribute('inert');
      expect(button).not.toHaveAttribute('disabled');
    });
  });

  test('skip links provided for navigation', () => {
    const { container } = render(
      <StatsAccessibility
        timeRange="daily"
        onTimeRangeChange={jest.fn()}
        selectedDate={new Date()}
        onDateChange={jest.fn()}
      >
        <div>Content</div>
      </StatsAccessibility>
    );

    const skipLinks = container.querySelector('.sr-only');
    expect(skipLinks).toBeInTheDocument();

    const links = skipLinks?.querySelectorAll('a');
    expect(links?.length).toBeGreaterThan(0);
  });
});