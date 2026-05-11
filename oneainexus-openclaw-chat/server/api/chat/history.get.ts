import { createError, defineEventHandler, getQuery } from 'h3'
import type { MessagePart } from '~/types'
import { requireAuth } from '../../utils/auth'
import { useMessageManager } from '../../utils/messageManager'

function parseEventJson(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined
  }

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : undefined
  } catch {
    return undefined
  }
}

function parsePartsJson(value: unknown): MessagePart[] | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed as MessagePart[] : undefined
  } catch {
    return undefined
  }
}

export default defineEventHandler(async (event) => {
  await requireAuth(event).catch(() => null)

  const query = getQuery(event)
  const appId = Array.isArray(query.appId) ? query.appId[0] : query.appId as string
  const sessionId = Array.isArray(query.sessionId) ? query.sessionId[0] : query.sessionId as string
  const limitStr = Array.isArray(query.limit) ? query.limit[0] : query.limit as string

  if (!appId || !sessionId) {
    throw createError({
      statusCode: 400,
      message: 'Missing appId or sessionId',
    })
  }

  const limit = limitStr ? parseInt(limitStr, 10) : 50
  const messageManager = useMessageManager()
  const messages = await messageManager.getSessionMessages(appId, sessionId, limit)

  return {
    success: true,
    data: messages.map(msg => ({
      id: msg.id,
      role: msg.role === 'assistant' ? 'robot' : msg.role,
      content: msg.content,
      parts: parsePartsJson(msg.parts_json),
      eventType: msg.event_type || undefined,
      event: parseEventJson(msg.event_json),
      timestamp: new Date(msg.created_at).getTime(),
      sessionId: msg.session_id,
    })),
  }
})
