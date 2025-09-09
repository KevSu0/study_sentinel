import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
  const res = NextResponse.next({ request: { headers: req.headers } })
  res.headers.set('x-request-id', requestId)
  res.headers.set('x-powered-by', 'study_sentinel')
  return res
}

export const config = {
  matcher: ['/api/:path*'],
}
