// no Next imports needed for this handler in tests

import { counts } from './counts';

export async function POST(req: any) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const report = (body && (body['csp-report'] || body['csp_report'] || body['report-to'])) || {};
    const violated = (report['violated-directive'] || report['effective-directive'] || 'unknown') as string;
    counts[violated] = (counts[violated] || 0) + 1;
  } catch {
    // ignore
  }
  // In runtime, return a real Response; in Jest/node tests, fall back to a plain object
// eslint-disable-next-line no-undef
if (typeof Response !== 'undefined') {
  return new Response(null, { status: 204 });
}
return { status: 204 } as any;
}

function getCspReportCounts() {
  return { ...counts };
}

// Test utilities moved to separate file to avoid type issues
