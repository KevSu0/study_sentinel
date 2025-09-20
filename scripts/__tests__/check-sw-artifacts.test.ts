/** @jest-environment node */

export {};
const fs = require('fs');
const os = require('os');
const path = require('path');

const { scanForArtifacts } = require('../../scripts/check-sw-artifacts.js');

describe('scanForArtifacts', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-artifacts-test-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns an empty array when directory is missing', () => {
    const missingPath = path.join(os.tmpdir(), 'sw-artifacts-missing');
    expect(scanForArtifacts(missingPath)).toEqual([]);
  });

  it('detects service worker artifacts', () => {
    fs.writeFileSync(path.join(tempDir, 'sw.js'), '// stub');
    fs.writeFileSync(path.join(tempDir, 'worker-somehash.js'), '// worker');

    const offenders = scanForArtifacts(tempDir);

    expect(offenders).toHaveLength(2);
    expect(offenders).toEqual(
      expect.arrayContaining([
        { path: path.join('public', 'sw.js'), reason: 'service worker entry point' },
        { path: path.join('public', 'worker-somehash.js'), reason: 'hashed worker chunks' },
      ])
    );
  });
});