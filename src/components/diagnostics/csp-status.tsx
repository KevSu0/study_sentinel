'use client';

import React from 'react';

export function CspStatus(): JSX.Element {
  const [mode] = React.useState(process.env.CSP_REPORT_ONLY === 'true' ? 'report-only' : 'enforced');
  const [connectSrc, setConnectSrc] = React.useState<string>('');

  React.useEffect(() => {
    fetch('/scripts/generated-csp.json')
      .then(r => r.json())
      .then(json => setConnectSrc((json.connectSrc || []).join(' ')))
      .catch(() => setConnectSrc('unknown'));
  }, []);

  return (
    <div className="rounded-md border p-3 text-sm">
      <div><strong>CSP mode:</strong> {mode}</div>
      <div><strong>connect-src:</strong> {connectSrc || 'unknown'}</div>
    </div>
  );
}
