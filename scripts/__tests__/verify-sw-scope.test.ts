/** @jest-environment node */

export {};
const http = require('http');
const { verifyServiceWorkerScope, parseArgs, normalizeUrl, scopesMatch } = require('../../scripts/verify-sw-scope.js');

describe('verifyServiceWorkerScope', () => {
  let server;
  let url;

  beforeEach((done) => {
    server = http.createServer((req, res) => {
      if (req.url === '/sw.js') {
        res.statusCode = 200;
        res.setHeader('Service-Worker-Allowed', '/');
        res.end('self.addEventListener("install", () => {});');
      } else {
        res.statusCode = 404;
        res.end();
      }
    });

    server.listen(0, () => {
      const address = server.address();
      url = `http://127.0.0.1:${address.port}`;
      done();
    });
  });

  afterEach((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  it('resolves when header matches expected scope', async () => {
    await expect(verifyServiceWorkerScope({ baseUrl: url })).resolves.toEqual({
      url: `${url}/sw.js`,
      scope: '/',
    });
  });

  it('rejects when scope is mismatched', async () => {
    await expect(verifyServiceWorkerScope({ baseUrl: url, expectedScope: '/app/' })).rejects.toThrow('Expected scope /app/');
  });
});

describe('parseArgs', () => {
  it('parses shorthand arguments', () => {
    expect(parseArgs(['https://example.com'])).toEqual({ baseUrl: 'https://example.com' });
  });

  it('parses flags', () => {
    expect(
      parseArgs(['--url', 'https://example.com', '--expected-scope', '/app/', '--worker-path', '/custom-sw.js'])
    ).toEqual({
      baseUrl: 'https://example.com',
      expectedScope: '/app/',
      workerPath: '/custom-sw.js',
    });
  });
});

describe('normalize helpers', () => {
  it('normalizes urls and scopes consistently', () => {
    expect(normalizeUrl('https://example.com', 'sw.js')).toBe('https://example.com/sw.js');
    expect(scopesMatch('/app', '/app/')).toBe(true);
    expect(scopesMatch('/app', '/other/')).toBe(false);
  });
});