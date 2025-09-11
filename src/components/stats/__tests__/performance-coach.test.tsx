import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PerformanceCoach } from '../performance-coach';
import { set } from 'date-fns';

describe('PerformanceCoach', () => {
  const today = new Date(2023, 6, 27, 10, 0, 0); // A fixed date for consistent tests
  const baseProps = {
    todaySeconds: 7200, // 2 hours
    yesterdaySeconds: 3600, // 1 hour
    weeklyAverageSeconds: 5400, // 1.5 hours
    todaySession: { start: set(today, { hours: 9 }).getTime(), end: set(today, { hours: 11 }).getTime() },
    weekAvgStart: set(today, { hours: 8, minutes: 30 }).getTime(),
    weekAvgEnd: set(today, { hours: 10, minutes: 30 }).getTime(),
    selectedDate: today,
    idealStartTime: '08:00',
    idealEndTime: '12:00',
    dailyStudyGoal: 2, // 2 hours
  };

  it('renders the component title', () => {
    render(<PerformanceCoach {...baseProps} />);
    expect(screen.getByText('Your Performance Coach')).toBeInTheDocument();
  });

  describe('Productivity Comparison', () => {
    it('shows a positive comparison against yesterday', () => {
      render(<PerformanceCoach {...baseProps} />);
      expect(screen.getByText(/vs. Yesterday:/)).toHaveTextContent('+1h 0m');
      expect(screen.getByText(/vs. Yesterday:/).querySelector('.text-green-500')).toBeInTheDocument();
    });

    it('shows a negative comparison against weekly average', () => {
        const props = { ...baseProps, todaySeconds: 3600, weeklyAverageSeconds: 7200 };
        render(<PerformanceCoach {...props} />);
        expect(screen.getByText(/Weekly Avg:/)).toHaveTextContent('-1h 0m');
        expect(screen.getByText(/Weekly Avg:/).querySelector('.text-red-500')).toBeInTheDocument();
    });

    it('shows "Even" when times are the same', () => {
      const props = { ...baseProps, yesterdaySeconds: 7200 };
      render(<PerformanceCoach {...props} />);
      expect(screen.getByText(/vs. Yesterday:/)).toHaveTextContent('Even');
    });
  });

  describe('Daily Goal Feedback', () => {
    it('shows a success message when the goal is met', () => {
      render(<PerformanceCoach {...baseProps} dailyStudyGoal={1} />);
      expect(screen.getByText(/Great job!/)).toBeInTheDocument();
      expect(screen.getByText(/surpassed your daily goal/)).toBeInTheDocument();
    });

    it('shows how much is left to meet the goal', () => {
      render(<PerformanceCoach {...baseProps} dailyStudyGoal={3} />);
      expect(screen.getByText(/You're on your way!/)).toBeInTheDocument();
      const goalText = screen.getByText((content, element) => {
        return !!element && element.tagName.toLowerCase() === 'p' && /You're on your way!.*1h 0m.*left to hit your goal/.test(element.textContent || '');
      });
      expect(goalText).toBeInTheDocument();
    });

    it('shows a message to get started when no work is done', () => {
        render(<PerformanceCoach {...baseProps} todaySeconds={0} />);
        expect(screen.getByText(/Your goal is/)).toBeInTheDocument();
        expect(screen.getByText(/Let's get started!/)).toBeInTheDocument();
    });
  });

  describe('Time Feedback', () => {
    it('shows a message when there is no session data', () => {
      render(<PerformanceCoach {...baseProps} todaySession={null} />);
      expect(screen.getByText('Log your study time to get start and end time feedback.')).toBeInTheDocument();
    });

    it('gives positive feedback for an early start', () => {
      const props = { ...baseProps, todaySession: { start: set(today, { hours: 7 }).getTime(), end: set(today, { hours: 9 }).getTime() } };
      render(<PerformanceCoach {...props} />);
      expect(screen.getByText(/Your start of/)).toHaveTextContent('is excellent!');
    });

    it('gives negative feedback for a late start', () => {
      const props = { ...baseProps, todaySession: { start: set(today, { hours: 9 }).getTime(), end: set(today, { hours: 11 }).getTime() } };
      render(<PerformanceCoach {...props} />);
      expect(screen.getByText(/Your start of/)).toHaveTextContent('is poor.');
    });

    it('gives positive feedback for a good end time', () => {
        const props = { ...baseProps, todaySession: { start: set(today, { hours: 10 }).getTime(), end: set(today, { hours: 13 }).getTime() } };
        render(<PerformanceCoach {...props} />);
        expect(screen.getByText(/Your end time of/)).toHaveTextContent('surpasses the');
    });

    it('gives negative feedback for an early end time', () => {
        const props = { ...baseProps, todaySession: { start: set(today, { hours: 9 }).getTime(), end: set(today, { hours: 11 }).getTime() } };
        render(<PerformanceCoach {...props} />);
        expect(screen.getByText(/Your end time of/)).toHaveTextContent('is poor.');
    });
  });
});