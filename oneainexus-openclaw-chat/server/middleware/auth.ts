/**
 * App-credential auth middleware.
 * Routes listed in PUBLIC_PATHS handle their own auth strategy.
 */

import type { H3Event } from 'h3'
import type { App } from '~/types'
import { useAppManager } from '~/server/utils/appManager'
import { withAppBasePath } from '~/utils/base-path'

const PUBLIC_PATHS = [
  '/health',
  '/auth',
  '/apps',
  '/chat',
  '/_ws',
  '/_ws.ws',
]

function resolveApiSubPath(path: string, baseURL: string): string | null {
  const prefixedApiRoot = withAppBasePath(baseURL, 'api')
  const normalizedRoots = [prefixedApiRoot, '/api']

  for (const root of normalizedRoots) {
    if (path === root) {
      return '/'
    }
    if (path.startsWith(`${root}/`)) {
      return path.slice(root.length)
    }
  }

  return null
}

function parseAuthHeader(authHeader: string): { clientId: string; clientSecret: string } | null {
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const [clientId, clientSecret] = decoded.split(':')
      if (clientId && clientSecret) {
        return { clientId, clientSecret }
      }
    } catch {
      // Ignore malformed bearer app credentials.
    }
  }

  if (authHeader.startsWith('Basic ')) {
    const token = authHeader.slice(6)
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const [clientId, clientSecret] = decoded.split(':')
      if (clientId && clientSecret) {
        return { clientId, clientSecret }
      }
    } catch {
      // Ignore malformed basic app credentials.
    }
  }

  return null
}

function extractAuth(event: H3Event, authHeaderNames: string[]): { clientId: string; clientSecret: string } | null {
  for (const headerName of authHeaderNames) {
    const authHeader = getHeader(event, headerName)
    if (!authHeader) {
      continue
    }
    const parsed = parseAuthHeader(authHeader)
    if (parsed) {
      return parsed
    }
  }

  const query = getQuery(event)
  if (query.client_id && query.client_secret) {
    return {
      clientId: query.client_id as string,
      clientSecret: query.client_secret as string,
    }
  }

  if (query.token) {
    try {
      const decoded = Buffer.from(query.token as string, 'base64').toString('utf-8')
      const [clientId, clientSecret] = decoded.split(':')
      if (clientId && clientSecret) {
        return { clientId, clientSecret }
      }
    } catch {
      // Ignore malformed query token.
    }
  }

  return null
}

const authMiddleware = defineEventHandler(async (event) => {
  const path = event.path
  const config = useRuntimeConfig()
  const authHeaderNames = Array.from(new Set([
    String(config.authTokenHeader || 'Authentication').toLowerCase(),
    'authentication',
    'authorization',
  ]))
  const apiSubPath = resolveApiSubPath(path, config.app.baseURL)

  if (!apiSubPath) {
    return
  }

  if (PUBLIC_PATHS.some((publicPath) => apiSubPath.startsWith(publicPath))) {
    return
  }

  const auth = extractAuth(event, authHeaderNames)
  if (!auth) {
    throw createError({
      statusCode: 401,
      message: 'Missing authentication credentials',
    })
  }

  const appManager = useAppManager()
  const result = await appManager.authenticate(auth.clientId, auth.clientSecret)

  if (!result.success) {
    throw createError({
      statusCode: 401,
      message: result.error || 'Authentication failed',
    })
  }

  event.context.app = result.app
})

// Nitro websocket route resolver stops at the first matching layer.
// Mark this middleware as "resolvable" so resolver can continue to real WS routes.
;(authMiddleware as any).__resolve__ = async () => undefined

export default authMiddleware

declare module 'h3' {
  interface H3EventContext {
    app?: App
  }
}
