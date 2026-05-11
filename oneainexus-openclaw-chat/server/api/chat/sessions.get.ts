import { defineEventHandler, getQuery, createError } from 'h3'
import { useMessageManager } from '../../utils/messageManager'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  // 可以根据需要验证用户或应用认证
  const authResult = await requireAuth(event).catch(() => null)
  
  const query = getQuery(event)
  const appId = Array.isArray(query.appId) ? query.appId[0] : query.appId as string
  
  if (!appId) {
    throw createError({
      statusCode: 400,
      message: 'Missing appId'
    })
  }

  const messageManager = useMessageManager()
  const sessions = await messageManager.getSessionList(appId)

  return {
    success: true,
    data: sessions
  }
})
