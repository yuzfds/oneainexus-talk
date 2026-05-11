/**
 * POST /api/chat
 * Chat endpoint for browser clients and SDK-backed app connections.
 */

import { z } from 'zod'
import { requireAuth } from '../utils/auth'
import { useAppManager } from '../utils/appManager'
import { useSDKManager } from '../utils/sdkManager'

const MAX_TEXT_CHARS = 200000
const MAX_HTTP_MESSAGE_BYTES = 12 * 1024 * 1024

const messagePartSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal('image'),
    url: z.string().min(1),
    mimeType: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    alt: z.string().optional(),
    name: z.string().optional(),
  }),
  z.object({
    type: z.literal('file'),
    url: z.string().min(1),
    name: z.string().min(1),
    mimeType: z.string().optional(),
    size: z.number().optional(),
  }),
])

const chatContentSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).optional(),
  parts: z.array(messagePartSchema).min(1).optional(),
}).refine((message) => message.content || message.parts?.length, {
  message: 'Each chat message requires content or parts',
})

const chatRequestSchema = z.object({
  messages: z.array(chatContentSchema).min(1),
  appId: z.string().optional(),
  clientId: z.string().optional(),
  sessionId: z.string().optional(),
  stream: z.boolean().optional().default(true),
})

function estimatePayloadBytes(payload: unknown): number {
  return Buffer.byteLength(JSON.stringify(payload), 'utf8')
}

function normalizeMessageContent(message: { content?: string; parts?: Array<Record<string, any>> }): string {
  if (message.content) return message.content
  if (!message.parts?.length) return ''

  return message.parts.map((part) => {
    if (part.type === 'text') return part.text || ''
    if (part.type === 'image') return part.alt || part.name || '[image]'
    if (part.type === 'file') return part.name || '[file]'
    return ''
  }).filter(Boolean).join('\n')
}

export default defineEventHandler(async (event) => {
  const authResult = await requireAuth(event)
  const sdkManager = useSDKManager()
  const appManager = useAppManager()

  try {
    const body = await readBody(event)
    const { messages, appId: requestedAppId, clientId: requestedClientId, sessionId, stream } = chatRequestSchema.parse(body)

    if (estimatePayloadBytes(body) > MAX_HTTP_MESSAGE_BYTES) {
      throw createError({
        statusCode: 413,
        message: '消息体过大，请减少文本长度或附件大小后重试',
      })
    }

    for (const message of messages) {
      if (normalizeMessageContent(message).length > MAX_TEXT_CHARS) {
        throw createError({
          statusCode: 400,
          message: `消息文本过长，请控制在 ${MAX_TEXT_CHARS.toLocaleString()} 个字符以内`,
        })
      }
    }

    let appId: string
    let clientId: string

    if (authResult.type === 'app') {
      appId = authResult.app!.id
      clientId = authResult.app!.clientId
    } else {
      const app = requestedAppId
        ? await appManager.getAppById(requestedAppId)
        : requestedClientId
          ? await appManager.getAppByClientId(requestedClientId)
          : null

      if (!app) {
        throw createError({
          statusCode: 400,
          message: 'Missing appId or clientId for user-authenticated chat request',
        })
      }

      if (app.ownerId !== authResult.user!.userName) {
        throw createError({
          statusCode: 403,
          message: 'Access denied: You do not own this application',
        })
      }

      appId = app.id
      clientId = app.clientId
    }

    const actualSessionId = sessionId || crypto.randomUUID()

    console.log(`[Chat] Received message: client=${clientId}, session=${actualSessionId}`)

    const sent = sdkManager.broadcastToApp(appId, {
      type: 'chat',
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      data: {
        sessionId: actualSessionId,
        messages,
        stream,
      },
    })

    if (!sent) {
      throw createError({
        statusCode: 503,
        message: 'No active SDK connection. Please ensure Channel plugin is connected.',
      })
    }

    return {
      success: true,
      sessionId: actualSessionId,
      message: 'Message sent. Response will be streamed via SDK connection.',
      note: 'This endpoint is for SDK-based communication. For direct streaming, use WebSocket or SSE endpoint.',
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: 'Invalid request',
        data: error.errors,
      })
    }

    throw error
  }
})
