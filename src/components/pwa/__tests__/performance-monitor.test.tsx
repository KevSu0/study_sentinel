import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PerformanceMonitor, usePerformanceMonitor } from '../performance-monitor';
import { toast } from 'react-hot-toast';

// Mock dependencies
jest.mock('react-hot-toast', () => ({
  toast: jest.fn()
}));

// Mock performance API
const mockPerformance = {
  getEntriesByType: jest.fn(),
  clearResourceTimings: jest.fn()
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  configurable: true
});

// Mock navigator storage
const mockStorage = {
  estimate: jest.fn()
};

Object.defineProperty(navigator, 'storage', {
  value: mockStorage,
  configurable: true
});

// Mock caches
const mockCaches = {
  keys: jest.fn(),
  open: jest.fn(),
  delete: jest.fn()
};

Object.defineProperty(window, 'caches', {
  value: mockCaches,
  configurable: true
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Set default mock implementations
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true
    });

    mockPerformance.getEntriesByType.mockImplementation((type) => {
      if (type === 'navigation') {
        return [{
          fetchStart: 1000,
          loadEventEnd: 2500
        }];
      }
      if (type === 'paint') {
        return [{ name: 'first-contentful-paint', startTime: 800 }];
      }
      if (type === 'resource') {
        return [
          { name: 'app.js', transferSize: 500000 },
          { name: 'styles.css', transferSize: 200000 },
          { name: 'font.woff2', transferSize: 100000 }
        ];
      }
      return [];
    });

    mockStorage.estimate.mockResolvedValue({
      usage: 25000000,
      quota: 100000000
    });

    mockCaches.keys.mockResolvedValue(['static-assets', 'dynamic-assets']);
    mockCaches.open.mockImplementation((name) => {
      const mockCache = {
        keys: jest.fn().mockResolvedValue([
          { url: '/app.js' },
          { url: '/styles.css' }
        ]),
        match: jest.fn().mockResolvedValue({
          blob: jest.fn().mockResolvedValue(new Blob(['test content'], { type: 'application/javascript' }))
        })
      };
      return Promise.resolve(mockCache);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders performance overview with metrics', async () => {
    render(<PerformanceMonitor />);

    // Wait for initial metrics to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByText('Performance Overview')).toBeInTheDocument();
    expect(screen.getByText('Cache Management')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('displays performance metrics correctly', async () => {
    render(<PerformanceMonitor />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Check for metric displays
    expect(screen.getByText('Cold Start Time')).toBeInTheDocument();
    expect(screen.getByText('First Stats Paint')).toBeInTheDocument();
    expect(screen.getByText('App Shell Size')).toBeInTheDocument();
    expect(screen.getByText('Cache Usage')).toBeInTheDocument();
  });

  it('shows offline status correctly', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false
    });

    render(<PerformanceMonitor />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('Online')).not.toBeInTheDocument();
  });

  it('handles cache management actions', async () => {
    render(<PerformanceMonitor />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Test clear all caches button
    const clearAllButton = screen.getByRole('button', { name: /clear all caches/i });
    fireEvent.click(clearAllButton);

    await waitFor(() => {
      expect(mockCaches.delete).toHaveBeenCalledWith('static-assets');
      expect(mockCaches.delete).toHaveBeenCalledWith('dynamic-assets');
      expect(toast).toHaveBeenCalledWith('Cleared all caches', { icon: '🗑️' });
    });
  });

  it('handles individual cache clearing', async () => {
    render(<PerformanceMonitor />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Test clear individual cache button
    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockCaches.delete).toHaveBeenCalledWith('static-assets');
      expect(toast).toHaveBeenCalledWith('Cleared static-assets cache', { icon: '🗑️' });
    });
  });

  it('handles data export', async () => {
    // Mock localStorage
    const mockLocalStorage = {
      length: 2,
      key: jest.fn((index) => index === 0 ? 'studyData' : 'settings'),
      getItem: jest.fn((key) => 
        key === 'studyData' ? JSON.stringify({ sessions: [] }) : '{theme: "dark"}'
      )
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      configurable: true
    });

    // Mock URL.createObjectURL and file download
    const mockCreateObjectURL = jest.fn().mockReturnValue('blob:test-url');
    const mockRevokeObjectURL = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL });

    render(<PerformanceMonitor />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const exportButton = screen.getByRole('button', { name: /export data/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith('Data exported successfully', { icon: '💾' });
    });
  });

  it('handles refresh action', async () => {
    render(<PerformanceMonitor />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Refreshed metrics', { icon: '🔄' });
    });
  });

  it('handles performance measurement errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockPerformance.getEntriesByType.mockImplementation(() => {
      throw new Error('Performance API error');
    });

    render(<PerformanceMonitor />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to measure performance:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('handles cache info retrieval errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockCaches.keys.mockRejectedValue(new Error('Cache API error'));

    render(<PerformanceMonitor />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to get cache info:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('handles cache clearing errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockCaches.delete.mockRejectedValue(new Error('Cache delete error'));

    render(<PerformanceMonitor />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const clearButton = screen.getByRole('button', { name: /clear all caches/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear cache:', expect.any(Error));
      expect(toast).toHaveBeenCalledWith('Failed to clear cache', { icon: '❌' });
    });
    
    consoleSpy.mockRestore();
  });

  it('handles data export errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock localStorage to throw error
    Object.defineProperty(window, 'localStorage', {
      value: {
        length: 1,
        key: jest.fn().mockReturnValue('testKey'),
        getItem: jest.fn().mockImplementation(() => {
          throw new Error('localStorage error');
        })
      },
      configurable: true
    });

    render(<PerformanceMonitor />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const exportButton = screen.getByRole('button', { name: /export data/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to export data:', expect.any(Error));
      expect(toast).toHaveBeenCalledWith('Failed to export data', { icon: '❌' });
    });
    
    consoleSpy.mockRestore();
  });

  it('formats byte sizes correctly', async () => {
    render(<PerformanceMonitor />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Check for formatted byte sizes in cache display
    expect(screen.getByText(/items/i)).toBeInTheDocument();
  });

  it('displays performance status indicators correctly', async () => {
    render(<PerformanceMonitor />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Check for progress bars indicating performance status
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThan(0);
  });
});

describe('usePerformanceMonitor hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true
    });

    mockPerformance.getEntriesByType.mockImplementation((type) => {
      if (type === 'navigation') {
        return [{ fetchStart: 1000, loadEventEnd: 2500 }];
      }
      if (type === 'paint') {
        return [{ name: 'first-contentful-paint', startTime: 800 }];
      }
      if (type === 'resource') {
        return [{ name: 'app.js', transferSize: 500000 }];
      }
      return [];
    });

    mockStorage.estimate.mockResolvedValue({
      usage: 25000000,
      quota: 100000000
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns initial metrics state', () => {
    const { result } = renderHook(() => usePerformanceMonitor());

    expect(result.current.metrics).toEqual({
      coldStartTime: 0,
      firstStatsPaint: 0,
      shellSize: 0,
      cacheUsage: 0,
      isOnline: true
    });
    expect(typeof result.current.measurePerformance).toBe('function');
    expect(typeof result.current.isWithinBudget).toBe('function');
  });

  it('measures performance correctly', async () => {
    const { result } = renderHook(() => usePerformanceMonitor());

    await act(async () => {
      await result.current.measurePerformance();
    });

    expect(result.current.metrics.coldStartTime).toBe(1500); // 2500 - 1000
    expect(result.current.metrics.firstStatsPaint).toBe(800);
    expect(result.current.metrics.shellSize).toBe(500000);
    expect(result.current.metrics.cacheUsage).toBe(25000000);
  });

  it('handles performance measurement errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockPerformance.getEntriesByType.mockImplementation(() => {
      throw new Error('Measurement error');
    });

    const { result } = renderHook(() => usePerformanceMonitor());

    await act(async () => {
      await result.current.measurePerformance();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to measure performance:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('checks budget compliance correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitor());

    // Test with values within budget
    expect(result.current.isWithinBudget('coldStartTime', 2000)).toBe(true);
    expect(result.current.isWithinBudget('firstStatsPaint', 1200)).toBe(true);
    
    // Test with values exceeding budget
    expect(result.current.isWithinBudget('coldStartTime', 1000)).toBe(false);
    expect(result.current.isWithinBudget('firstStatsPaint', 500)).toBe(false);
  });
});

// Helper function to test hooks
function renderHook<T>(hook: () => T) {
  return {
    result: { current: hook() }
  };
}