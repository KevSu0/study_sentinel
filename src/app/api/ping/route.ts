// Simple ping endpoint for network connectivity checks
// Marked as static for Next.js `output: 'export'` compatibility
export const dynamic = 'force-static';

export async function GET() { return new Response('OK', { status: 200 }); }

export async function HEAD() { return new Response(null, { status: 200 }); }
