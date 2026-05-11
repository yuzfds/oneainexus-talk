import { createError, defineEventHandler, readBody } from 'h3'
import { requireAuth } from '../../utils/auth'
import { useMessageManager } from '../../utils/messageManager'
import { useSDKManager } from '../../utils/sdkManager'

type CreateSessionBody = {
  appId?: string
  sessionId?: string
}

export default defineEventHandler(async (event) => {
  await requireAuth(event).catch(() => null)

  const body = await readBody<CreateSessionBody>(event).catch(() => ({} as CreateSessionBody))
  const appId = typeof body.appId === 'string' ? body.appId.trim() : ''
  const requestedSessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''

  if (!appId) {
    throw createError({
      statusCode: 400,
      message: 'Missing appId',
    })
  }

  const actualSessionId = requestedSessionId || crypto.randomUUID()
  const messageManager = useMessageManager()
  const success = await messageManager.createSession(appId, actualSessionId)

  if (!success) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create session',
    })
  }

  const sdkManager = useSDKManager()
  const syncRequested = sdkManager.broadcastToApp(appId, {
    type: 'session_create',
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    data: {
      sessionId: actualSessionId,
      title: '新对话',
    },
  }) > 0

  if (!syncRequested) {
    console.warn(`[Chat] Session ${actualSessionId} created in app, but no active SDK connection was available for OpenClaw sync.`)
  }

  return {
    success: true,
    data: {
      sessionId: actualSessionId,
      title: '新对话',
      updatedAt: new Date().toISOString(),
    },
    syncRequested,
  }
})
