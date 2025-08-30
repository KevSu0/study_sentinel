import { NextRequest, NextResponse } from 'next/server';

// Simple ping endpoint for network connectivity checks
export async function GET() {
  return new NextResponse('OK', { status: 200 });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}