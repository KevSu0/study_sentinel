import { NextRequest } from 'next/server'
import { withLogging } from '@/lib/log/with-logging'

export async function GET(req: NextRequest) {
  return withLogging(req, async (_req, { log }) => {
    log.debug({ msg: 'ping' })
    return new Response('OK', { status: 200 })
  })
}

export async function HEAD() { return new Response(null, { status: 200 }) }
