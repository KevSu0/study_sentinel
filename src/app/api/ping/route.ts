// Simple ping endpoint for network connectivity checks
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() { return new Response('OK', { status: 200 }); }

export async function HEAD() { return new Response(null, { status: 200 }); }
