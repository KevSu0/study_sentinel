import { NextRequest, NextResponse } from 'next/server';

let counts: Record<string, number> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const report = (body && (body['csp-report'] || body['csp_report'] || body['report-to'])) || {};
    const violated = (report['violated-directive'] || report['effective-directive'] || 'unknown') as string;
    counts[violated] = (counts[violated] || 0) + 1;
  } catch {
    // ignore
  }
  return new NextResponse(null, { status: 204 });
}

function getCspReportCounts() {
  return { ...counts };
}
