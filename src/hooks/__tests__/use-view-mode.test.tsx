import { renderHook, act, waitFor } from '@testing-library/react';
import { ViewModeProvider, useViewMode, type TaskViewMode } from '../use-view-mode';
import React, { type ReactNode } from 'react';

/**
 * @constant {string} VIEW_MODE_KEY - The key used to store the view mode in localStorage.
 */
const VIEW_MODE_KEY = 'studySentinelTaskViewMode';

/**
 * A wrapper component that provides the ViewModeContext to its children.
 * @param {object} props - The component props.
 * @param {ReactNode} props.children - The child components to render.
 * @returns {JSX.Element} The provider-wrapped children.
 */
const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
  <ViewModeProvider>{children}</ViewModeProvider>
);

describe('useViewMode', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console.error to prevent test logs from being cluttered
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Clear localStorage before each test to ensure a clean state
    localStorage.clear();
  });

  afterEach(() => {
    // Restore the original console.error implementation
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  /**
   * @test {useViewMode} - It should throw an error if used outside of a ViewModeProvider.
   * This test ensures that the hook correctly enforces its context provider dependency.
   */
  it('should throw an error if used outside of a ViewModeProvider', () => {
    // Suppress the expected error from appearing in the test output
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => renderHook(() => useViewMode())).toThrow(
      'useViewMode must be used within a ViewModeProvider'
    );

    console.error = originalError;
  });

  /**
   * @test {ViewModeProvider} - It should initialize with "card" as the default viewMode and isLoaded as true.
   * This test verifies the initial state of the hook when no value is in localStorage.
   */
  it('should initialize with "card" as the default viewMode and isLoaded as true', async () => {
    const { result } = renderHook(() => useViewMode(), { wrapper });

    // The isLoaded state should be true after the initial effect runs
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    
    expect(result.current.viewMode).toBe('card');
  });

  /**
   * @test {ViewModeProvider} - It should load the viewMode from localStorage if a valid value exists.
   * This test ensures that the hook correctly persists and retrieves state across sessions.
   */
  it('should load the viewMode from localStorage if it exists', async () => {
    localStorage.setItem(VIEW_MODE_KEY, 'list');
    const { result } = renderHook(() => useViewMode(), { wrapper });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.viewMode).toBe('list');
  });

  /**
   * @test {ViewModeProvider} - It should ignore invalid values in localStorage and use the default "card" mode.
   * This test checks the hook's resilience to corrupted or unexpected data in storage.
   */
  it('should ignore invalid values in localStorage and use the default', async () => {
    localStorage.setItem(VIEW_MODE_KEY, 'invalid-mode');
    const { result } = renderHook(() => useViewMode(), { wrapper });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.viewMode).toBe('card');
  });

  /**
   * @test {useViewMode} - It should allow setting the view mode and persisting it to localStorage.
   * This test verifies that the state update function works as expected.
   */
  it('should allow setting the view mode', () => {
    const { result } = renderHook(() => useViewMode(), { wrapper });

    act(() => {
      result.current.setViewMode('list');
    });

    expect(result.current.viewMode).toBe('list');
    expect(localStorage.getItem(VIEW_MODE_KEY)).toBe('list');
  });

  /**
   * @test {ViewModeProvider} - It should handle localStorage.getItem failure gracefully during initialization.
   * This test simulates a storage read error and ensures the hook falls back to the default state without crashing.
   */
  it('should handle localStorage.getItem failure gracefully', async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage inaccessible');
    });

    const { result } = renderHook(() => useViewMode(), { wrapper });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.viewMode).toBe('card');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load view mode from localStorage',
      expect.any(Error)
    );
    
    getItemSpy.mockRestore();
  });

  /**
   * @test {useViewMode} - It should handle localStorage.setItem failure gracefully when setting the mode.
   * This test simulates a storage write error and ensures the hook logs the error without crashing.
   */
  it('should handle localStorage.setItem failure gracefully', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    const { result } = renderHook(() => useViewMode(), { wrapper });

    act(() => {
      result.current.setViewMode('list');
    });

    // The view mode should still update in-memory
    expect(result.current.viewMode).toBe('list');
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save view mode to localStorage',
      expect.any(Error)
    );

    setItemSpy.mockRestore();
  });
});