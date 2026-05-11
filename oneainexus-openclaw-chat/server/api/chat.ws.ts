import { defineWebSocketHandler } from 'h3'
import { useSDKManager } from '../utils/sdkManager'
import { useAppManager } from '../utils/appManager'
import { useMessageManager } from '../utils/messageManager'
import { z } from 'zod'
import type { MessagePart } from '~/types'
import { withAppBasePath } from '~/utils/base-path'

const MAX_TEXT_CHARS = 200000
const MAX_WS_MESSAGE_BYTES = 12 * 1024 * 1024

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
  role: z.enum(['user', 'robot']),
  content: z.string().min(1).optional(),
  parts: z.array(messagePartSchema).min(1).optional(),
}).refine((message) => message.content || message.parts?.length, {
  message: 'Each chat message requires content or parts',
})

const chatMessageSchema = z.object({
  type: z.literal('chat'),
  messages: z.array(chatContentSchema).min(1),
  appId: z.string(),
  clientId: z.string(),
  sessionId: z.string().optional(),
  token: z.string().optional(),
})

function extractTextFromParts(parts?: Array<Record<string, any>>): string {
  if (!parts?.length) return ''

  return parts.map((part) => {
    if (part.type === 'text') return part.text || ''
    if (part.type === 'image') return part.alt || part.name || '[image]'
    if (part.type === 'file') return part.name || '[file]'
    return ''
  }).filter(Boolean).join('\n')
}

function normalizeMessageContent(message: { content?: string; parts?: Array<Record<string, any>> }): string {
  return message.content || extractTextFromParts(message.parts)
}

function validatePayloadSize(rawMessage: string) {
  if (Buffer.byteLength(rawMessage, 'utf8') > MAX_WS_MESSAGE_BYTES) {
    throw new Error('Payload too large')
  }
}

function validateMessagesContent(messages: Array<{ content?: string; parts?: Array<Record<string, any>> }>) {
  for (const message of messages) {
    const normalizedContent = normalizeMessageContent(message)
    if (normalizedContent.length > MAX_TEXT_CHARS) {
      throw new Error('Message text too long')
    }
  }
}

function updateStreamingTextState(
  state: {
    streamingContent: string
    lastPartialText: string
  },
  incomingContent: string,
): { segmentBoundary: boolean; completedSegment: string } {
  if (!incomingContent) {
    return {
      segmentBoundary: false,
      completedSegment: '',
    }
  }

  state.lastPartialText = incomingContent
  state.streamingContent = incomingContent

  return {
    segmentBoundary: false,
    completedSegment: '',
  }
}

function getChunkSessionId(message: Record<string, any>): string | undefined {
  return message.data?.sessionId || message.sessionId
}

function getChunkContent(message: Record<string, any>): string {
  return message.data?.content ?? message.content ?? ''
}

function getChunkDone(message: Record<string, any>): boolean {
  return Boolean(message.data?.done || message.done)
}

function getChunkFinishReason(message: Record<string, any>): string | undefined {
  return message.data?.finishReason || message.finishReason
}

function getChunkEventType(message: Record<string, any>): string {
  const value = message.eventType ?? message.data?.eventType
  return typeof value === 'string' ? value.trim() : ''
}

function getChunkEvent(message: Record<string, any>): Record<string, unknown> | undefined {
  const value = message.event ?? message.data?.event
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined
}

function getEventString(event: Record<string, unknown> | undefined, key: string): string {
  const value = event?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function getEventNumber(event: Record<string, unknown> | undefined, key: string): number | null {
  const value = event?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function buildToolFallbackContent(eventType: string, event?: Record<string, unknown>): string {
  if (!eventType || !event) {
    return ''
  }

  if (eventType === 'tool_start') {
    const name = getEventString(event, 'name')
    const phase = getEventString(event, 'phase')
    if (name && phase) return `[tool] ${name} (${phase})`
    return name || phase
  }

  if (eventType === 'tool_item') {
    const title = getEventString(event, 'title')
      || getEventString(event, 'name')
      || getEventString(event, 'kind')
      || getEventString(event, 'itemId')
    const status = getEventString(event, 'status') || getEventString(event, 'phase')
    const summary = getEventString(event, 'summary') || getEventString(event, 'progressText')
    return [title, status, summary].filter(Boolean).join('\n')
  }

  if (eventType === 'tool_output') {
    const name = getEventString(event, 'name')
    const status = getEventString(event, 'status')
    const output = getEventString(event, 'output')
    const exitCode = getEventNumber(event, 'exitCode')
    const header = [name, status || (exitCode === null ? '' : `exit ${exitCode}`)].filter(Boolean).join(' ')
    return [header, output].filter(Boolean).join('\n\n')
  }

  return ''
}

type AssistantStreamState = {
  appId: string
  sessionId: string
  streamingContent: string
  lastPartialText: string
  parts: MessagePart[]
  lastSavedSignature: string
}

const activeAssistantStreams = new Map<string, AssistantStreamState>()
let persistenceListenerRegistered = false

function getStreamKey(appId: string, sessionId: string): string {
  return `${appId}:${sessionId}`
}

function looksLikeToolChunk(message: Record<string, any>): boolean {
  return message.kind === 'tool'
    || String(message.eventType || message.data?.eventType || '').startsWith('tool_')
    || String(message.data?.kind || '').startsWith('tool')
}

function buildAssistantSaveSignature(content: string, parts: MessagePart[]): string {
  return JSON.stringify({
    content,
    parts,
  })
}

async function saveAssistantMessageIfChanged(
  streamEntry: AssistantStreamState,
  content: string,
): Promise<void> {
  if (!content && streamEntry.parts.length === 0) {
    return
  }

  const signature = buildAssistantSaveSignature(content, streamEntry.parts)
  if (signature === streamEntry.lastSavedSignature) {
    return
  }

  const messageManager = useMessageManager()
  await messageManager.saveMessage(
    streamEntry.appId,
    streamEntry.sessionId,
    'assistant',
    content,
    {
      parts: streamEntry.parts,
    },
  )
  streamEntry.lastSavedSignature = signature
}

async function persistToolChunk(message: Record<string, any>): Promise<void> {
  const sessionId = getChunkSessionId(message)
  if (!sessionId) {
    return
  }

  const streamEntry = Array.from(activeAssistantStreams.values())
    .find(entry => entry.sessionId === sessionId)
  if (!streamEntry) {
    return
  }

  const eventType = getChunkEventType(message)
  const event = getChunkEvent(message)
  const parts = (message.parts || message.data?.parts || []) as MessagePart[]
  const rawContent = getChunkContent(message).trim()
  const content = rawContent || buildToolFallbackContent(eventType, event)
  if (!content && !eventType && !event && parts.length === 0) {
    return
  }

  const messageManager = useMessageManager()
  await messageManager.saveMessage(
    streamEntry.appId,
    streamEntry.sessionId,
    'tool',
    content,
    {
      eventType: eventType || undefined,
      event,
      parts,
    },
  )
}

async function persistAssistantChunk(message: Record<string, any>): Promise<void> {
  const sessionId = getChunkSessionId(message)
  if (!sessionId) {
    return
  }

  const streamEntry = Array.from(activeAssistantStreams.values())
    .find(entry => entry.sessionId === sessionId)
  if (!streamEntry) {
    return
  }

  if (looksLikeToolChunk(message)) {
    await persistToolChunk(message)
    return
  }

  const chunkContent = getChunkContent(message)
  const chunkDone = getChunkDone(message)
  const chunkFinishReason = getChunkFinishReason(message)
  const chunkParts = (message.parts || message.data?.parts || []) as MessagePart[]

  if (chunkContent) {
    const segmentUpdate = updateStreamingTextState(streamEntry, chunkContent)
    if (segmentUpdate.completedSegment) {
      await saveAssistantMessageIfChanged(streamEntry, segmentUpdate.completedSegment)
    }
  }

  if (chunkParts.length > 0) {
    streamEntry.parts = chunkParts
  }

  if ((chunkDone || chunkFinishReason) && !chunkContent && streamEntry.lastPartialText) {
    streamEntry.streamingContent = streamEntry.lastPartialText
  }

  if (chunkDone || chunkFinishReason) {
    if (streamEntry.streamingContent || streamEntry.parts.length > 0) {
      await saveAssistantMessageIfChanged(streamEntry, streamEntry.streamingContent)
    }

    activeAssistantStreams.delete(getStreamKey(streamEntry.appId, streamEntry.sessionId))
  }
}

function ensurePersistenceListener(): void {
  if (persistenceListenerRegistered) {
    return
  }

  persistenceListenerRegistered = true
  const sdkManager = useSDKManager()
  sdkManager.onMessage(async (sdkMsg) => {
    if (sdkMsg.type !== 'chat_stream') {
      return
    }

    await persistAssistantChunk(sdkMsg as Record<string, any>)
  })
}

export default defineWebSocketHandler({
  open(peer) {
    console.log(`[Frontend WS] New connection: ${peer.id}`)
    peer.send(JSON.stringify({ type: 'connected', message: 'Ready for chat' }))
  },

  async message(peer, message) {
    const rawMessage = message.text()
    let msg: any
    try {
      msg = JSON.parse(rawMessage)
    } catch {
      return
    }

    if (msg.type === 'chat') {
      try {
        validatePayloadSize(rawMessage)
        const { messages, appId: requestedAppId, clientId: requestedClientId, sessionId, token } = chatMessageSchema.parse(msg)
        validateMessagesContent(messages)

        const appManager = useAppManager()
        const app = requestedAppId
          ? await appManager.getAppById(requestedAppId)
          : requestedClientId
            ? await appManager.getAppByClientId(requestedClientId)
            : null

        if (!app) {
          peer.send(JSON.stringify({ type: 'error', message: 'Missing appId or clientId' }))
          return
        }

        if (token) {
          try {
            const authVerifyPath = withAppBasePath(useRuntimeConfig().app.baseURL, 'api/auth/verify')
            const authRes = await $fetch<{ success: boolean; data: any }>(authVerifyPath, {
              method: 'POST',
              body: { token },
            })
            if (authRes.success && authRes.data && app.ownerId !== authRes.data.userName) {
              peer.send(JSON.stringify({ type: 'error', message: 'Access denied: You do not own this application' }))
              return
            }
          } catch (e) {
            console.error('[Frontend WS] Token verification failed:', e)
            peer.send(JSON.stringify({ type: 'error', message: 'Token verification failed' }))
            return
          }
        }

        const actualSessionId = sessionId || crypto.randomUUID()
        ensurePersistenceListener()
        activeAssistantStreams.set(getStreamKey(app.id, actualSessionId), {
          appId: app.id,
          sessionId: actualSessionId,
          streamingContent: '',
          lastPartialText: '',
          parts: [],
          lastSavedSignature: '',
        })

        const meta = (peer as any).meta || {}
        if (!meta.listening) {
          const sdkManager = useSDKManager()
          const unsubscribe = sdkManager.onMessage(async (sdkMsg) => {
            if (sdkMsg.type !== 'chat_stream') {
              return
            }

            const normalizedMessage = sdkMsg as Record<string, any>
            const chunkSessionId = getChunkSessionId(normalizedMessage)
            const currentMeta = (peer as any).meta || {}

            if (chunkSessionId !== currentMeta.sessionId) {
              return
            }

            const chunkContent = getChunkContent(normalizedMessage)
            const chunkParts = normalizedMessage.parts || normalizedMessage.data?.parts
            const chunkDone = getChunkDone(normalizedMessage)
            const chunkFinishReason = getChunkFinishReason(normalizedMessage)
            const looksLikeToolChunk = normalizedMessage.kind === 'tool'
              || String(normalizedMessage.eventType || normalizedMessage.data?.eventType || '').startsWith('tool_')
              || String(normalizedMessage.data?.kind || '').startsWith('tool')

            // DO NOT drop tool chunks, we need to send them to the frontend for rendering
            // if (looksLikeToolChunk && (!Array.isArray(chunkParts) || chunkParts.length === 0)) {
            //   return
            // }

            if (!currentMeta.streamingContent) {
              currentMeta.streamingContent = ''
            }
            if (!currentMeta.lastPartialText) {
              currentMeta.lastPartialText = ''
            }
            let segmentBoundary = false
            if (chunkContent) {
              if (!looksLikeToolChunk) {
                const segmentUpdate = updateStreamingTextState(currentMeta, chunkContent)
                segmentBoundary = segmentUpdate.segmentBoundary
                if (segmentUpdate.completedSegment) {
                  // Assistant text persistence is handled by the global SDK listener.
                }
              }
            }
            if (!looksLikeToolChunk && (chunkDone || chunkFinishReason) && !chunkContent && currentMeta.lastPartialText) {
              currentMeta.streamingContent = currentMeta.lastPartialText
            }

            peer.send(JSON.stringify({
              type: 'chat_stream',
              content: looksLikeToolChunk ? chunkContent : currentMeta.streamingContent,
              parts: chunkParts,
              done: chunkDone,
              finishReason: chunkFinishReason,
              segmentBoundary,
              eventType: normalizedMessage.eventType || normalizedMessage.data?.eventType,
              event: normalizedMessage.event || normalizedMessage.data?.event,
              kind: normalizedMessage.kind || normalizedMessage.data?.kind,
            }))
            if (!looksLikeToolChunk && (chunkDone || chunkFinishReason)) {
              currentMeta.streamingContent = ''
              currentMeta.lastPartialText = ''
            }
          })

          ;(peer as any).meta = {
            ...meta,
            listening: true,
            unsubscribe,
            sessionId: actualSessionId,
            streamingContent: '',
            lastPartialText: '',
          }
        } else {
          ;(peer as any).meta = {
            ...meta,
            sessionId: actualSessionId,
            streamingContent: '',
            lastPartialText: '',
          }
        }

        const lastUserMessage = messages[messages.length - 1]
        if (lastUserMessage && lastUserMessage.role === 'user') {
          const messageManager = useMessageManager()
          await messageManager.saveMessage(
            app.id,
            actualSessionId,
            'user',
            normalizeMessageContent(lastUserMessage),
            {
              parts: (lastUserMessage.parts || []) as MessagePart[],
            },
          )
        }

        const sdkManager = useSDKManager()
        const sent = sdkManager.broadcastToApp(app.id, {
          type: 'chat',
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          data: {
            sessionId: actualSessionId,
            messages: messages.map(m => ({
              role: m.role === 'robot' ? 'assistant' : m.role,
              content: normalizeMessageContent(m),
              parts: m.parts,
            })),
            stream: true,
          },
        })

        if (!sent) {
          peer.send(JSON.stringify({ type: 'error', message: 'No active SDK connection. Please ensure Channel plugin is connected.' }))
        }
      } catch (err) {
        console.error('[Frontend WS] Error:', err)
        const errorMessage = err instanceof Error
          ? err.message === 'Payload too large'
            ? '消息体过大，请减少文本长度或附件大小后重试'
            : err.message === 'Message text too long'
              ? `消息文本过长，请控制在 ${MAX_TEXT_CHARS.toLocaleString()} 个字符以内`
              : 'Invalid request or internal error'
          : 'Invalid request or internal error'
        peer.send(JSON.stringify({ type: 'error', message: errorMessage }))
      }
    }
  },

  close(peer) {
    console.log(`[Frontend WS] Connection closed: ${peer.id}`)
    const meta = (peer as any).meta
    if (meta?.unsubscribe) {
      meta.unsubscribe()
    }
  },

  error(peer, error) {
    console.error(`[Frontend WS] Error: ${peer.id}`, error)
  },
})
