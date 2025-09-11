import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineGate, AILoadingState, useAIFeature } from '../offline-gate';
import { act } from 'react-dom/test-utils';

// Mock the useAIFeature hook
jest.mock('../offline-gate', () => ({
  ...jest.requireActual('../offline-gate'),
  useAIFeature: jest.fn()
}));

const mockUseAIFeature = useAIFeature as jest.MockedFunction<typeof useAIFeature>;

describe('OfflineGate', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true
    });
  });

  afterEach(() => {
    // Clean up any event listeners
    jest.restoreAllMocks();
  });

  it('renders children when online', () => {
    mockUseAIFeature.mockReturnValue({
      isOnline: true,
      lastCheck: null,
      checkConnectivity: jest.fn().mockResolvedValue(true),
      canUseAI: true
    });

    render(
      <OfflineGate featureName="AI Feature">
        <div>AI Content</div>
      </OfflineGate>
    );

    expect(screen.getByText('AI Content')).toBeInTheDocument();
  });

  it('shows offline UI when offline', () => {
    mockUseAIFeature.mockReturnValue({
      isOnline: false,
      lastCheck: null,
      checkConnectivity: jest.fn().mockResolvedValue(false),
      canUseAI: false
    });

    render(
      <OfflineGate featureName="AI Feature">
        <div>AI Content</div>
      </OfflineGate>
    );

    expect(screen.getByText('AI Feature Unavailable')).toBeInTheDocument();
    expect(screen.getByText('This feature requires an internet connection to function properly.')).toBeInTheDocument();
  });

  it('shows fallback when provided and offline', () => {
    mockUseAIFeature.mockReturnValue({
      isOnline: false,
      lastCheck: null,
      checkConnectivity: jest.fn().mockResolvedValue(false),
      canUseAI: false
    });

    render(
      <OfflineGate featureName="AI Feature" fallback={<div>Custom Fallback</div>}>
        <div>AI Content</div>
      </OfflineGate>
    );

    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
    expect(screen.queryByText('AI Feature Unavailable')).not.toBeInTheDocument();
  });

  it('handles retry connection click', async () => {
    const mockCheckConnectivity = jest.fn().mockResolvedValue(true);
    mockUseAIFeature.mockReturnValue({
      isOnline: false,
      lastCheck: null,
      checkConnectivity: mockCheckConnectivity,
      canUseAI: false
    });

    render(
      <OfflineGate featureName="AI Feature">
        <div>AI Content</div>
      </OfflineGate>
    );

    const retryButton = screen.getByRole('button', { name: /retry connection/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockCheckConnectivity).toHaveBeenCalled();
    });
  });

  it('shows loading state when checking connection', () => {
    mockUseAIFeature.mockReturnValue({
      isOnline: false,
      lastCheck: null,
      checkConnectivity: jest.fn(),
      canUseAI: false
    });

    render(
      <OfflineGate featureName="AI Feature">
        <div>AI Content</div>
      </OfflineGate>
    );

    const retryButton = screen.getByRole('button', { name: /retry connection/i });
    fireEvent.click(retryButton);

    expect(screen.getByText(/checking/i)).toBeInTheDocument();
  });

  it('responds to online/offline events', async () => {
    // Mock the online/offline event listeners
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    mockUseAIFeature.mockReturnValue({
      isOnline: true,
      lastCheck: null,
      checkConnectivity: jest.fn().mockResolvedValue(true),
      canUseAI: true
    });

    const { rerender } = render(
      <OfflineGate featureName="AI Feature">
        <div>AI Content</div>
      </OfflineGate>
    );

    expect(screen.getByText('AI Content')).toBeInTheDocument();

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false
    });

    // Trigger offline event
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Update mock to reflect offline state
    mockUseAIFeature.mockReturnValue({
      isOnline: false,
      lastCheck: null,
      checkConnectivity: jest.fn().mockResolvedValue(false),
      canUseAI: false
    });

    rerender(
      <OfflineGate featureName="AI Feature">
        <div>AI Content</div>
      </OfflineGate>
    );

    expect(screen.getByText('AI Feature Unavailable')).toBeInTheDocument();

    // Verify event listeners were added
    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});

describe('AILoadingState', () => {
  it('renders loading skeleton with proper structure', () => {
    render(<AILoadingState />);

    expect(screen.getAllByRole('generic')).toHaveLength(8); // Skeleton elements
    expect(screen.getByText('')).toBeInTheDocument(); // Empty text elements
  });

  it('has proper loading animation classes', () => {
    const { container } = render(<AILoadingState />);
    
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('mockUseAIFeature hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns correct initial state', () => {
    mockUseAIFeature.mockReturnValue({
      isOnline: true,
      lastCheck: null,
      checkConnectivity: jest.fn().mockResolvedValue(true),
      canUseAI: true
    });

    const { result } = renderHook(() => mockUseAIFeature());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastCheck).toBeNull();
    expect(result.current.canUseAI).toBe(true);
    expect(typeof result.current.checkConnectivity).toBe('function');
  });

  it('updates state when connectivity changes', async () => {
    const mockCheckConnectivity = jest.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    mockUseAIFeature.mockReturnValue({
      isOnline: true,
      lastCheck: null,
      checkConnectivity: mockCheckConnectivity,
      canUseAI: true
    });

    const { result } = renderHook(() => mockUseAIFeature());

    // Simulate failed connectivity check
    await act(async () => {
      await result.current.checkConnectivity();
    });

    expect(mockCheckConnectivity).toHaveBeenCalled();
    expect(result.current.lastCheck).toBeInstanceOf(Date);
  });

  it('handles fetch errors gracefully', async () => {
    const mockCheckConnectivity = jest.fn().mockRejectedValue(new Error('Network error'));
    
    mockUseAIFeature.mockReturnValue({
      isOnline: true,
      lastCheck: null,
      checkConnectivity: mockCheckConnectivity,
      canUseAI: true
    });

    const { result } = renderHook(() => mockUseAIFeature());

    await act(async () => {
      await result.current.checkConnectivity();
    });

    expect(mockCheckConnectivity).toHaveBeenCalled();
    expect(result.current.lastCheck).toBeInstanceOf(Date);
  });
});

// Helper function to test hooks
function renderHook<T>(hook: () => T) {
  return {
    result: { current: hook() }
  };
}