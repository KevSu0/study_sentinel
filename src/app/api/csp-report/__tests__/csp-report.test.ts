import { POST } from '@/app/api/csp-report/route';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn(),
    null: jest.fn(),
  },
}));

// Create a simple mock request
function createMockRequest(url: string, options: any = {}) {
  return {
    url,
    method: options.method || 'GET',
    headers: new Map(Object.entries(options.headers || {})),
    json: jest.fn(),
  };
}

describe('CSP Report API', () => {
  let originalCounts: Record<string, number>;
  let mockJson: jest.Mock;

  beforeEach(() => {
    // Reset the module-level counts
    const cspRoute = require('@/app/api/csp-report/route');
    originalCounts = { ...cspRoute.counts };
    cspRoute.setCounts({});

    mockJson = jest.fn();
  });

  afterEach(() => {
    // Restore original counts
    const cspRoute = require('@/app/api/csp-report/route');
    cspRoute.setCounts(originalCounts);
  });

  it('handles valid CSP report with violated-directive', async () => {
    const requestBody = {
      'csp-report': {
        'violated-directive': 'script-src',
        'effective-directive': 'script-src',
        'blocked-uri': 'https://example.com/bad.js'
      }
    };

    const request = createMockRequest('https://example.com/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    request.json = mockJson.mockResolvedValue(requestBody);

    const response = await POST(request);

    expect(mockJson).toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it('handles CSP report with csp_report format', async () => {
    const requestBody = {
      'csp_report': {
        'violated-directive': 'style-src',
        'blocked-uri': 'inline'
      }
    };

    const request = createMockRequest('https://example.com/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    request.json = mockJson.mockResolvedValue(requestBody);

    const response = await POST(request);

    expect(mockJson).toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it('handles CSP report with report-to format', async () => {
    const requestBody = {
      'report-to': {
        'violated-directive': 'img-src',
        'blocked-uri': 'http://evil.com'
      }
    };

    const request = createMockRequest('https://example.com/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    request.json = mockJson.mockResolvedValue(requestBody);

    const response = await POST(request);

    expect(mockJson).toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it('handles CSP report with effective-directive only', async () => {
    const requestBody = {
      'csp-report': {
        'effective-directive': 'connect-src'
      }
    };

    const request = createMockRequest('https://example.com/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    request.json = mockJson.mockResolvedValue(requestBody);

    const response = await POST(request);

    expect(mockJson).toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it('handles malformed JSON gracefully', async () => {
    const request = createMockRequest('https://example.com/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    request.json = mockJson.mockRejectedValue(new Error('Invalid JSON'));

    const response = await POST(request);

    expect(mockJson).toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it('handles empty body gracefully', async () => {
    const request = createMockRequest('https://example.com/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    request.json = mockJson.mockResolvedValue(null);

    const response = await POST(request);

    expect(mockJson).toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it('handles non-JSON body gracefully', async () => {
    const request = createMockRequest('https://example.com/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    request.json = mockJson.mockResolvedValue('not an object');

    const response = await POST(request);

    expect(mockJson).toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it('handles CSP report with unknown directive format', async () => {
    const requestBody = {
      'csp-report': {
        'unknown-field': 'some-value'
      }
    };

    const request = createMockRequest('https://example.com/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    request.json = mockJson.mockResolvedValue(requestBody);

    const response = await POST(request);

    expect(mockJson).toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it('increments violation counts correctly', async () => {
    const cspRoute = require('@/app/api/csp-report/route');
    cspRoute.setCounts({}); // Reset for clean test

    // First violation
    let requestBody = {
      'csp-report': { 'violated-directive': 'script-src' }
    };

    let request = createMockRequest('https://example.com/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    request.json = mockJson.mockResolvedValue(requestBody);
    await POST(request);

    expect(cspRoute.counts['script-src']).toBe(1);

    // Second same violation
    request.json = mockJson.mockResolvedValue(requestBody);
    await POST(request);

    expect(cspRoute.counts['script-src']).toBe(2);

    // Different violation
    requestBody = {
      'csp-report': { 'violated-directive': 'style-src' }
    };

    request.json = mockJson.mockResolvedValue(requestBody);
    await POST(request);

    expect(cspRoute.counts['script-src']).toBe(2);
    expect(cspRoute.counts['style-src']).toBe(1);
  });

  it('handles report without directive information', async () => {
    const requestBody = {
      'csp-report': {
        'document-uri': 'https://example.com/page',
        'referrer': 'https://example.com/'
      }
    };

    const request = createMockRequest('https://example.com/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    request.json = mockJson.mockResolvedValue(requestBody);

    const response = await POST(request);

    expect(mockJson).toHaveBeenCalled();
    expect(response.status).toBe(204);
  });
});