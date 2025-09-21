/**
 * Stats Accessibility Improvements
 *
 * Enhanced keyboard navigation, screen reader support, and reduced motion
 */

import React, { useEffect, useRef, useState } from 'react';
import { useStats } from '@/hooks/use-stats';
import { useNavigate } from 'react-router-dom';

interface StatsAccessibilityProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  children: React.ReactNode;
}

export function StatsAccessibility({
  timeRange,
  onTimeRangeChange,
  selectedDate,
  onDateChange,
  children
}: StatsAccessibilityProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<string[]>([]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if stats page is focused
      if (!containerRef.current?.contains(document.activeElement)) return;

      // Prevent default for our shortcuts
      if (['1', '7', '3', '0', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
      }

      switch (event.key) {
        case '1':
          onTimeRangeChange('daily');
          announce('Switched to daily view');
          break;
        case '7':
          onTimeRangeChange('weekly');
          announce('Switched to weekly view');
          break;
        case '3':
          onTimeRangeChange('monthly');
          announce('Switched to monthly view');
          break;
        case '0':
          onTimeRangeChange('overall');
          announce('Switched to overall view');
          break;
        case 'ArrowLeft':
          if (event.altKey) {
            // Previous day
            const prevDate = new Date(selectedDate);
            prevDate.setDate(prevDate.getDate() - 1);
            onDateChange(prevDate);
            announce(`Moved to ${prevDate.toLocaleDateString()}`);
          } else if (event.ctrlKey || event.metaKey) {
            // Previous time range
            const ranges = ['daily', 'weekly', 'monthly', 'overall'];
            const currentIndex = ranges.indexOf(timeRange);
            if (currentIndex > 0) {
              onTimeRangeChange(ranges[currentIndex - 1]);
              announce(`Switched to ${ranges[currentIndex - 1]} view`);
            }
          }
          break;
        case 'ArrowRight':
          if (event.altKey) {
            // Next day
            const nextDate = new Date(selectedDate);
            nextDate.setDate(nextDate.getDate() + 1);
            onDateChange(nextDate);
            announce(`Moved to ${nextDate.toLocaleDateString()}`);
          } else if (event.ctrlKey || event.metaKey) {
            // Next time range
            const ranges = ['daily', 'weekly', 'monthly', 'overall'];
            const currentIndex = ranges.indexOf(timeRange);
            if (currentIndex < ranges.length - 1) {
              onTimeRangeChange(ranges[currentIndex + 1]);
              announce(`Switched to ${ranges[currentIndex + 1]} view`);
            }
          }
          break;
        case '/':
          // Focus search
          const searchInput = document.querySelector('[data-stats-search]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            announce('Search focused');
          }
          break;
        case 'Escape':
          // Reset filters or close modals
          announce('Filters reset');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [timeRange, selectedDate, onTimeRangeChange, onDateChange]);

  // Focus management
  const manageFocus = (elementId: string) => {
    setFocusedElement(elementId);
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
    }
  };

  // Announcements for screen readers
  const announce = (message: string) => {
    setAnnouncements(prev => [...prev, message]);
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1));
    }, 1000);
  };

  // Reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Statistics Dashboard"
      className="relative"
      tabIndex={-1}
    >
      {/* Keyboard shortcuts help */}
      <div className="sr-only" role="status" aria-live="polite">
        {announcements.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>

      {/* Live region for dynamic updates */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {focusedElement && `Focused on ${focusedElement}`}
      </div>

      {/* Stats summary */}
      <StatsSummary timeRange={timeRange} />

      {/* Main content */}
      <div className="contents">
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              'data-stats-section': index,
              tabIndex: 0,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  // Handle section activation
                }
              },
              'aria-label': `Statistics section ${index + 1}`
            });
          }
          return child;
        })}
      </div>

      {/* Skip links */}
      <div className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white p-2 rounded shadow-lg z-50">
        <a href="#stats-summary" className="block mb-2">Skip to summary</a>
        <a href="#time-range-selector" className="block mb-2">Skip to time range</a>
        <a href="#stats-cards" className="block mb-2">Skip to statistics</a>
        <a href="#charts" className="block">Skip to charts</a>
      </div>

      {/* Reduced motion warning */}
      {prefersReducedMotion && (
        <div className="fixed bottom-4 left-4 bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-sm">
          Animations reduced for better performance
        </div>
      )}
    </div>
  );
}

// Stats summary component for screen readers
function StatsSummary({ timeRange }: { timeRange: string }) {
  const { timeRangeStats, studyStreak, badgeStats } = useStats({
    tasks: [],
    allCompletedWork: [],
    allBadges: [],
    earnedBadges: new Map(),
    timeRange,
    selectedDate: new Date(),
    profile: { name: 'Test User', dailyStudyGoal: 8 }
  });

  return (
    <div id="stats-summary" className="sr-only" role="region" aria-label="Statistics Summary">
      <h2>Current Statistics Summary</h2>
      <p>
        Showing {timeRange} statistics.
        Total study time: {timeRangeStats.totalHours} hours.
        Points earned: {timeRangeStats.totalPoints}.
        Current streak: {studyStreak} days.
        Badges earned: {badgeStats.earnedCount} out of {badgeStats.totalCount}.
      </p>
    </div>
  );
}

// Accessible chart wrapper
export function AccessibleChart({
  title,
  description,
  children,
  data,
  type = 'bar'
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  data: any[];
  type?: 'bar' | 'pie' | 'line';
}) {
  return (
    <div role="img" aria-label={title} className="relative">
      <h3 className="sr-only">{title}</h3>
      <p className="sr-only">{description}</p>

      {/* Visual chart */}
      <div className={prefersReducedMotion() ? 'reduce-motion' : ''}>
        {children}
      </div>

      {/* Data table for screen readers */}
      <div className="sr-only" role="table" aria-label={`${title} data table`}>
        <div role="row">
          <div role="columnheader">Label</div>
          <div role="columnheader">Value</div>
        </div>
        {data.map((item, index) => (
          <div key={index} role="row">
            <div role="cell">{item.name || item.label}</div>
            <div role="cell">{item.value || item.hours || item.minutes}</div>
          </div>
        ))}
      </div>

      {/* Interactive elements announcement */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </div>
  );
}

// Accessible time range selector
export function AccessibleTimeRangeSelector({
  currentRange,
  onRangeChange
}: {
  currentRange: string;
  onRangeChange: (range: string) => void;
}) {
  const ranges = [
    { id: 'daily', label: 'Daily', description: 'View today\'s statistics', shortcut: '1' },
    { id: 'weekly', label: 'Weekly', description: 'View last 7 days', shortcut: '7' },
    { id: 'monthly', label: 'Monthly', description: 'View last 30 days', shortcut: '3' },
    { id: 'overall', label: 'Overall', description: 'View all time', shortcut: '0' }
  ];

  return (
    <div
      id="time-range-selector"
      role="radiogroup"
      aria-label="Time range selection"
      className="flex gap-2"
    >
      {ranges.map((range) => (
        <button
          key={range.id}
          role="radio"
          aria-checked={currentRange === range.id}
          aria-describedby={`desc-${range.id}`}
          tabIndex={currentRange === range.id ? 0 : -1}
          onClick={() => onRangeChange(range.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRangeChange(range.id);
            }
          }}
          className={`
            px-4 py-2 rounded-lg transition-colors
            ${currentRange === range.id
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 hover:bg-gray-300'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          `}
        >
          <span className="font-medium">{range.label}</span>
          <span className="ml-2 text-xs opacity-75">({range.shortcut})</span>
        </button>
      ))}
      {ranges.map((range) => (
        <div
          key={range.id}
          id={`desc-${range.id}`}
          className="sr-only"
        >
          {range.description}
        </div>
      ))}
    </div>
  );
}

// Accessible stat card
export function AccessibleStatCard({
  title,
  value,
  unit,
  description,
  trend,
  onClick
}: {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  onClick?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      role="article"
      aria-labelledby={`stat-title-${title.replace(/\s+/g, '-')}`}
      className={`
        bg-white rounded-lg shadow-sm border p-4
        hover:shadow-md transition-shadow cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-blue-500
        ${onClick ? 'cursor-pointer' : ''}
      `}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3
            id={`stat-title-${title.replace(/\s+/g, '-')}`}
            className="text-sm font-medium text-gray-600"
          >
            {title}
          </h3>
          <div className="flex items-baseline mt-1">
            <span className="text-2xl font-bold text-gray-900">
              {value}
            </span>
            {unit && (
              <span className="ml-1 text-sm text-gray-500">
                {unit}
              </span>
            )}
            {trend && (
              <span className="ml-2" aria-hidden="true">
                {trend === 'up' && '↑'}
                {trend === 'down' && '↓'}
                {trend === 'stable' && '→'}
              </span>
            )}
          </div>
        </div>
        <button
          aria-label={`More details about ${title}`}
          aria-expanded={isExpanded}
          className="p-1 rounded hover:bg-gray-100"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {description && (
        <div
          className={`
            mt-2 text-sm text-gray-600 transition-all
            ${isExpanded ? 'block' : 'hidden'}
          `}
        >
          {description}
        </div>
      )}

      {/* Screen reader only trend announcement */}
      {trend && (
        <div className="sr-only">
          Trend is {trend === 'up' ? 'increasing' : trend === 'down' ? 'decreasing' : 'stable'}
        </div>
      )}
    </div>
  );
}

// Utility functions
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Export keyboard shortcuts help component
export function KeyboardShortcutsHelp() {
  const shortcuts = [
    { key: '1', action: 'Switch to daily view' },
    { key: '7', action: 'Switch to weekly view' },
    { key: '3', action: 'Switch to monthly view' },
    { key: '0', action: 'Switch to overall view' },
    { key: 'Alt + ←', action: 'Previous day' },
    { key: 'Alt + →', action: 'Next day' },
    { key: 'Ctrl/Cmd + ←', action: 'Previous time range' },
    { key: 'Ctrl/Cmd + →', action: 'Next time range' },
    { key: '/', action: 'Focus search' },
    { key: 'Esc', action: 'Reset filters' }
  ];

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-2">Keyboard Shortcuts</h3>
      <dl className="space-y-1 text-sm">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex justify-between">
            <dt className="font-mono bg-gray-200 px-2 py-1 rounded">
              {shortcut.key}
            </dt>
            <dd className="ml-4">{shortcut.action}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}