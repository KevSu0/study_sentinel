/** @jest-environment node */

export {};
const fs = require('fs');
const os = require('os');
const path = require('path');

const { checkAssetIntegrity } = require('../../scripts/check-asset-integrity.js');

describe('checkAssetIntegrity', () => {
  it('validates project assets without issues', () => {
    const projectRoot = path.join(__dirname, '..', '..');
    const reportDir = path.join(os.tmpdir(), `asset-report-${Date.now()}`);

    expect(() => checkAssetIntegrity({ projectRoot, reportDir })).not.toThrow();

    if (fs.existsSync(reportDir)) {
      fs.rmSync(reportDir, { recursive: true, force: true });
    }
  });

  it('reports missing assets', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-missing-'));
    const reportDir = path.join(tempRoot, 'reports');

    fs.mkdirSync(path.join(tempRoot, 'public'), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'src', 'app'), { recursive: true });

    fs.writeFileSync(
      path.join(tempRoot, 'public', 'manifest.json'),
      JSON.stringify({ icons: [{ src: '/icons/icon-32x32.png' }] }, null, 2)
    );

    fs.writeFileSync(path.join(tempRoot, 'src', 'app', 'fonts.css'), "@font-face { src: url('/fonts/missing.woff2'); }");

    expect(() => checkAssetIntegrity({ projectRoot: tempRoot, reportDir })).toThrow(
      'Asset integrity check failed:'
    );

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});