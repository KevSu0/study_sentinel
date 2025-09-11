import { renderHook, act } from '@testing-library/react';
import { useCalendarEvents } from '../use-calendar-events';
import { CalendarEvent, StudyBlock } from '@/lib/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto.randomUUID
Object.defineProperty(global.self, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid',
  },
});


const mockEvent: Omit<StudyBlock, 'id'> = {
  title: 'Test Event',
  type: 'study_block',
  date: '2024-01-01',
  startTime: '10:00',
  endTime: '11:00',
  isCompleted: false,
};

const mockEventWithId: StudyBlock = {
    ...mockEvent,
    id: 'mock-uuid'
}

describe('useCalendarEvents', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should initialize with an empty array if localStorage is empty', () => {
    const { result } = renderHook(() => useCalendarEvents());
    expect(result.current.events).toEqual([]);
  });

  it('should load events from localStorage on initialization', () => {
    const events = [mockEventWithId];
    localStorageMock.setItem('calendar_events', JSON.stringify(events));

    const { result } = renderHook(() => useCalendarEvents());

    expect(result.current.events).toEqual(events);
  });

  it('should handle localStorage parsing errors gracefully', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorageMock.setItem('calendar_events', 'invalid json');

    const { result } = renderHook(() => useCalendarEvents());

    expect(result.current.events).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load calendar events from local storage',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  it('should add a new event', () => {
    const { result } = renderHook(() => useCalendarEvents());

    act(() => {
      result.current.addEvent(mockEvent as Omit<CalendarEvent, 'id'>);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]).toEqual(mockEventWithId);
    expect(JSON.parse(localStorageMock.getItem('calendar_events')!)).toEqual([mockEventWithId]);
  });

  it('should update an existing event', () => {
    const events = [mockEventWithId];
    localStorageMock.setItem('calendar_events', JSON.stringify(events));

    const { result } = renderHook(() => useCalendarEvents());
    
    const updatedEvent = { ...mockEventWithId, title: 'Updated Event' };

    act(() => {
      result.current.updateEvent(updatedEvent);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].title).toBe('Updated Event');
    expect(JSON.parse(localStorageMock.getItem('calendar_events')!)[0].title).toBe('Updated Event');
  });

  it('should delete an event', () => {
    const events = [mockEventWithId, { ...mockEventWithId, id: 'another-uuid' }];
    localStorageMock.setItem('calendar_events', JSON.stringify(events));

    const { result } = renderHook(() => useCalendarEvents());

    act(() => {
      result.current.deleteEvent('mock-uuid');
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe('another-uuid');
    expect(JSON.parse(localStorageMock.getItem('calendar_events')!)).toHaveLength(1);
  });

  it('should handle errors when saving to localStorage', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const setItemSpy = jest.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
    });

    const { result } = renderHook(() => useCalendarEvents());

    act(() => {
        result.current.addEvent(mockEvent);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save calendar events to local storage',
        expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});