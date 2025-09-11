import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '../use-media-query';

const mockMatchMedia = (matches: boolean) => {
  const listeners: ((event: { matches: boolean }) => void)[] = [];
  return {
    matches,
    addEventListener: jest.fn((event, listener) => {
      if (event === 'change') {
        listeners.push(listener);
      }
    }),
    removeEventListener: jest.fn((event, listener) => {
      if (event === 'change') {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }),
    dispatchEvent: (matches: boolean) => {
      listeners.forEach(listener => listener({ matches }));
    },
  };
};

describe('useMediaQuery', () => {
  it('should return true when the media query matches', () => {
    window.matchMedia = jest.fn().mockImplementation(() => mockMatchMedia(true));
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('should return false when the media query does not match', () => {
    window.matchMedia = jest.fn().mockImplementation(() => mockMatchMedia(false));
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
  });

  it('should update the value when the media query match changes', () => {
    const mediaQueryList = mockMatchMedia(false);
    window.matchMedia = jest.fn().mockImplementation(() => mediaQueryList);

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);

    act(() => {
      mediaQueryList.dispatchEvent(true);
    });

    expect(result.current).toBe(true);
  });

  it('should clean up the event listener on unmount', () => {
    const mediaQueryList = mockMatchMedia(false);
    window.matchMedia = jest.fn().mockImplementation(() => mediaQueryList);

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    unmount();

    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});