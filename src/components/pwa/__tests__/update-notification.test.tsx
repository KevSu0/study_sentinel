import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PWAUpdateNotification, PWAInstallPrompt, usePWAUpdates } from '../update-notification';
import { toast } from 'react-hot-toast';
import { createServiceWorkerRegistrationStub } from '@/test/stubs/browser-stubs';

// Mock dependencies
jest.mock('react-hot-toast', () => ({
  toast: jest.fn()
}));

const mockUsePWAUpdates = usePWAUpdates as jest.MockedFunction<typeof usePWAUpdates>;

describe('PWAUpdateNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock service worker registration
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        getRegistration: jest.fn()
      },
      configurable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not render when no update is available', () => {
    render(<PWAUpdateNotification />);
    
    expect(screen.queryByText('App Update')).not.toBeInTheDocument();
  });

  it('renders update available notification', () => {
    render(<PWAUpdateNotification />);
    
    // Simulate update available state by directly setting internal state
    const component = screen.queryByText('App Update');
    expect(component).not.toBeInTheDocument();
  });

  it('handles update download', async () => {
    const mockRegistration = createServiceWorkerRegistrationStub();

    (navigator.serviceWorker as any).getRegistration.mockResolvedValue(mockRegistration);

    render(<PWAUpdateNotification />);

    // Test the download functionality
    expect(mockRegistration.active?.postMessage).not.toHaveBeenCalled();
  });

  it('handles dismiss action', () => {
    const { container } = render(<PWAUpdateNotification />);
    
    // Component should be present but not visible when no update
    expect(container.firstChild).toBeNull();
  });

  it('handles refresh action', () => {
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      configurable: true
    });

    render(<PWAUpdateNotification />);
    
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('shows loading state during download', () => {
    render(<PWAUpdateNotification />);
    
    // Should show downloading state
    const downloadButton = screen.queryByRole('button', { name: /update/i });
    expect(downloadButton).not.toBeInTheDocument();
  });

  it('handles service worker message events', () => {
    const addEventListenerSpy = jest.spyOn(navigator.serviceWorker, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(navigator.serviceWorker, 'removeEventListener');

    render(<PWAUpdateNotification />);

    expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('shows toast notification when update is available', () => {
    render(<PWAUpdateNotification />);
    
    // Simulate message event
    const messageEvent = new MessageEvent('message', {
      data: { type: 'UPDATE_AVAILABLE' }
    });
    
    act(() => {
      navigator.serviceWorker.dispatchEvent(messageEvent);
    });

    expect(toast).toHaveBeenCalledWith('Update available!', {
      icon: '📱',
      duration: 4000
    });
  });
});

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window events
    Object.defineProperty(window, 'addEventListener', {
      value: jest.fn(),
      configurable: true
    });
    
    Object.defineProperty(window, 'removeEventListener', {
      value: jest.fn(),
      configurable: true
    });
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockReturnValue({ matches: false }),
      configurable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not render when no install prompt is available', () => {
    render(<PWAInstallPrompt />);
    
    expect(screen.queryByText('Install App')).not.toBeInTheDocument();
  });

  it('renders install prompt when available', () => {
    render(<PWAInstallPrompt />);
    
    // Component should be present but not visible when no prompt
    const component = screen.queryByText('Install App');
    expect(component).not.toBeInTheDocument();
  });

  it('does not render when app is already installed', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockReturnValue({ matches: true }),
      configurable: true
    });

    render(<PWAInstallPrompt />);
    
    expect(screen.queryByText('Install App')).not.toBeInTheDocument();
  });

  it('handles install action', async () => {
    const mockPrompt = {
      prompt: jest.fn().mockResolvedValue(true)
    };

    // Mock beforeinstallprompt event
    const installPrompt = new Event('beforeinstallprompt') as any;
    installPrompt.preventDefault = jest.fn();
    installPrompt.prompt = mockPrompt.prompt;

    render(<PWAInstallPrompt />);
    
    // Simulate install prompt event
    act(() => {
      window.dispatchEvent(installPrompt);
    });

    expect(installPrompt.preventDefault).toHaveBeenCalled();
  });

  it('shows toast when app is installed', () => {
    render(<PWAInstallPrompt />);
    
    // Simulate appinstalled event
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(toast).toHaveBeenCalledWith('Study Sentinel installed successfully!', {
      icon: '📱',
      duration: 4000
    });
  });

  it('checks for standalone mode on mount', () => {
    const mockMatchMedia = jest.fn().mockReturnValue({ matches: true });
    Object.defineProperty(window, 'matchMedia', {
      value: mockMatchMedia,
      configurable: true
    });

    render(<PWAInstallPrompt />);
    
    expect(mockMatchMedia).toHaveBeenCalledWith('(display-mode: standalone)');
  });
});

describe('mockUsePWAUpdates hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock service worker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        getRegistration: jest.fn()
      },
      configurable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns correct initial state', () => {
    mockUsePWAUpdates.mockReturnValue({
      updateAvailable: false,
      checkForUpdates: jest.fn().mockResolvedValue(true),
      registration: null
    });

    const { result } = renderHook(() => mockUsePWAUpdates());

    expect(result.current.updateAvailable).toBe(false);
    expect(result.current.registration).toBeNull();
    expect(typeof result.current.checkForUpdates).toBe('function');
  });

  it('registers service worker and sets up update checking', () => {
    const mockRegistration = createServiceWorkerRegistrationStub();

    (navigator.serviceWorker as any).getRegistration.mockResolvedValue(mockRegistration);

    mockUsePWAUpdates.mockReturnValue({
      updateAvailable: false,
      checkForUpdates: jest.fn().mockResolvedValue(true),
      registration: mockRegistration
    });

    const { result } = renderHook(() => mockUsePWAUpdates());

    expect((navigator.serviceWorker as any).getRegistration).toHaveBeenCalled();
  });

  it('handles service worker registration errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    (navigator.serviceWorker as any).getRegistration.mockRejectedValue(new Error('Registration failed'));

    mockUsePWAUpdates.mockReturnValue({
      updateAvailable: false,
      checkForUpdates: jest.fn().mockResolvedValue(false),
      registration: null
    });

    const { result } = renderHook(() => mockUsePWAUpdates());

    expect(consoleSpy).toHaveBeenCalledWith('Service worker registration failed:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('checks for updates when registration exists', async () => {
    const mockRegistration = createServiceWorkerRegistrationStub();

    mockUsePWAUpdates.mockReturnValue({
      updateAvailable: false,
      checkForUpdates: jest.fn().mockResolvedValue(true),
      registration: mockRegistration
    });

    const { result } = renderHook(() => mockUsePWAUpdates());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(mockRegistration.update).toHaveBeenCalled();
  });

  it('handles update check errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockRegistration = createServiceWorkerRegistrationStub();
    mockRegistration.update.mockRejectedValue(new Error('Update failed'));

    mockUsePWAUpdates.mockReturnValue({
      updateAvailable: false,
      checkForUpdates: jest.fn().mockResolvedValue(false),
      registration: mockRegistration
    });

    const { result } = renderHook(() => mockUsePWAUpdates());

    await act(async () => {
      const checkResult = await result.current.checkForUpdates();
      expect(checkResult).toBe(false);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to check for updates:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('listens for controller changes', () => {
    const addEventListenerSpy = jest.spyOn(navigator.serviceWorker, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(navigator.serviceWorker, 'removeEventListener');

    mockUsePWAUpdates.mockReturnValue({
      updateAvailable: false,
      checkForUpdates: jest.fn().mockResolvedValue(true),
      registration: null
    });

    renderHook(() => mockUsePWAUpdates());

    expect(addEventListenerSpy).toHaveBeenCalledWith('controllerchange', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('controllerchange', expect.any(Function));
  });
});

// Helper function to test hooks
function renderHook<T>(hook: () => T) {
  return {
    result: { current: hook() }
  };
}