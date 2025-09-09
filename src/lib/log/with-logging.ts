import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { childLogger, logger } from './logger'

function getRequestId(h: Headers) {
  const reqId = h.get('x-request-id') || h.get('x-correlation-id')
  return reqId || crypto.randomUUID()
}

export async function withLogging(
  req: NextRequest,
  handler: (req: NextRequest, ctx: { log: ReturnType<typeof childLogger>; requestId: string }) => Promise<Response> | Response
): Promise<Response> {
  const h = await headers()
  const requestId = getRequestId(h)
  const log = childLogger({ requestId, path: req.nextUrl.pathname, method: req.method })

  const start = performance.now()
  try {
    log.info({ req: { method: req.method, url: req.nextUrl.pathname } }, 'request:start')
    const res = await handler(req, { log, requestId })
    const ms = Math.round(performance.now() - start)
    log.info({ status: res.status, ms }, 'request:finish')
    const headers = new Headers(res.headers)
    headers.set('x-request-id', requestId)
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
  } catch (err: any) {
    const ms = Math.round(performance.now() - start)
    log.error({ err: { message: err?.message, stack: err?.stack }, ms }, 'request:error')
    return new Response(
      JSON.stringify({ error: 'internal_error', requestId }),
      { status: 500, headers: { 'content-type': 'application/json', 'x-request-id': requestId } }
    )
  }
}
