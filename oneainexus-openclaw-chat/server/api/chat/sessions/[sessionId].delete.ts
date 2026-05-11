import { defineEventHandler, createError, getRouterParam, getQuery } from 'h3'
import { useMessageManager } from '../../../utils/messageManager'
import { requireAuth } from '../../../utils/auth'
import { useSDKManager } from '../../../utils/sdkManager'

export default defineEventHandler(async (event) => {
  // 可以根据需要验证用户或应用认证
  await requireAuth(event).catch(() => null)
  
  const sessionId = getRouterParam(event, 'sessionId')
  const query = getQuery(event)
  const appId = Array.isArray(query.appId) ? query.appId[0] : query.appId as string
  
  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: 'Missing sessionId'
    })
  }

  if (!appId) {
    throw createError({
      statusCode: 400,
      message: 'Missing appId'
    })
  }

  const messageManager = useMessageManager()
  const success = await messageManager.deleteSession(appId, sessionId)
  let syncRequested = false

  if (success) {
    const sdkManager = useSDKManager()
    syncRequested = sdkManager.broadcastToApp(appId, {
      type: 'session_delete',
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      data: {
        sessionId,
      },
    }) > 0

    if (!syncRequested) {
      console.warn(`[Chat] Session ${sessionId} deleted in app, but no active SDK connection was available for OpenClaw sync.`)
    }
  }

  return {
    success,
    syncRequested,
  }
})
