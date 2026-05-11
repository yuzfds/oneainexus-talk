/**
 * Chat composable for WebSocket-based messaging.
 */

import { ref, onBeforeUnmount } from 'vue'
import type { MessagePart } from '~/types'
import { useChatStore } from '~/stores/chat'
import { useAuth } from './useAuth'
import { withAppBasePath } from '~/utils/base-path'

const MAX_TEXT_CHARS = 200000
const MAX_WS_MESSAGE_BYTES = 12 * 1024 * 1024

type StreamChunkLike = {
  content?: string
  parts?: MessagePart[]
  done?: boolean
  finishReason?: string
  segmentBoundary?: boolean
  eventType?: string
  event?: Record<string, unknown>
  kind?: string
  data?: {
    content?: string
    parts?: MessagePart[]
    done?: boolean
    finishReason?: string
    segmentBoundary?: boolean
    eventType?: string
    event?: Record<string, unknown>
    kind?: string
  }
}

function estimatePayloadBytes(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).length
}

function getChunkContent(chunk: StreamChunkLike): string {
  return chunk.content ?? chunk.data?.content ?? ''
}

function getChunkDone(chunk: StreamChunkLike): boolean {
  return Boolean(chunk.done ?? chunk.data?.done)
}

function getChunkParts(chunk: StreamChunkLike): MessagePart[] | undefined {
  const parts = chunk.parts ?? chunk.data?.parts
  return Array.isArray(parts) ? parts : undefined
}

function getChunkFinishReason(chunk: StreamChunkLike): string | undefined {
  return chunk.finishReason ?? chunk.data?.finishReason
}

function getChunkEventType(chunk: StreamChunkLike): string {
  const value = chunk.eventType ?? chunk.data?.eventType
  return typeof value === 'string' ? value.trim() : ''
}

function getChunkEvent(chunk: StreamChunkLike): Record<string, unknown> | undefined {
  const value = chunk.event ?? chunk.data?.event
  return value && typeof value === 'object' ? value : undefined
}

function getChunkKind(chunk: StreamChunkLike): string {
  const value = chunk.kind ?? chunk.data?.kind
  return typeof value === 'string' ? value.trim() : ''
}

function hasToolEventHint(event?: Record<string, unknown>): boolean {
  if (!event) return false
  const candidates = ['toolCallId', 'itemId', 'commandId', 'phase', 'status', 'name']
  return candidates.some((key) => {
    const value = event[key]
    return typeof value === 'string' && value.trim().length > 0
  })
}

function looksLikeToolChunk(chunk: StreamChunkLike): boolean {
  const eventType = getChunkEventType(chunk)
  const kind = getChunkKind(chunk)
  const event = getChunkEvent(chunk)
  return eventType.startsWith('tool_')
    || kind === 'tool'
    || kind.startsWith('tool')
    || hasToolEventHint(event)
}

export const useChat = () => {
  const config = useRuntimeConfig()
  const appBaseURL = config.app.baseURL
  const chatStore = useChatStore()
  const { getToken } = useAuth()

  const ws = ref<WebSocket | null>(null)
  let reconnectTimer: NodeJS.Timeout | null = null

  const connect = () => {
    if (!import.meta.client) return
    if (ws.value?.readyState === WebSocket.OPEN) return
    if (!chatStore.currentApp) return

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsPath = withAppBasePath(appBaseURL, 'api/chat.ws')
    const wsUrl = `${protocol}//${location.host}${wsPath}`

    const socket = new WebSocket(wsUrl)
    ws.value = socket

    socket.onopen = () => {
      console.log('[Chat WS] Connected')
      chatStore.setConnected(true)
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'connected') {
          console.log('[Chat WS] Ready:', data.message)
        } else if (data.type === 'error') {
          chatStore.setError(data.message)
          chatStore.setLoading(false)
        } else if (data.type === 'chat_stream') {
          const chunk = data as StreamChunkLike
          const eventType = getChunkEventType(chunk)
          const event = getChunkEvent(chunk)
          if (looksLikeToolChunk(chunk)) {
            const toolText = getChunkContent(chunk)
            const toolParts = getChunkParts(chunk)
            chatStore.addToolEventMessage(toolText, eventType, event, toolParts)
            if (getChunkDone(chunk) || getChunkFinishReason(chunk)) {
              chatStore.setLoading(false)
            }
            return
          }

          const content = getChunkContent(chunk)
          const parts = getChunkParts(chunk)
          if (content || parts?.length) {
            chatStore.updateStreamingContent(content, parts)
          }

          if (getChunkDone(chunk) || getChunkFinishReason(chunk)) {
            chatStore.finishStreaming(chatStore.streamingContent, chatStore.streamingParts)
          }
        } else if (data.type === 'message') {
          chatStore.addAssistantMessage(data.message)
          chatStore.setLoading(false)
        }
      } catch (err) {
        console.error('[Chat WS] Message parse error:', err)
      }
    }

    socket.onclose = () => {
      console.log('[Chat WS] Disconnected')
      chatStore.setConnected(false)
      ws.value = null

      if (chatStore.currentApp) {
        reconnectTimer = setTimeout(() => {
          connect()
        }, 3000)
      }
    }

    socket.onerror = (err) => {
      console.error('[Chat WS] Error:', err)
      chatStore.setError('WebSocket connection error')
    }
  }

  const disconnect = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    chatStore.setConnected(false)
  }

  const sendMessage = async (payload: { content: string; parts?: MessagePart[] }): Promise<void> => {
    if (!chatStore.currentApp) {
      throw new Error('No app selected, unable to send message')
    }

    if (payload.content.length > MAX_TEXT_CHARS) {
      throw new Error(`消息文本过长，请控制在 ${MAX_TEXT_CHARS.toLocaleString()} 个字符以内`)
    }

    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
      chatStore.setError('WebSocket not connected, retrying...')
      connect()
      throw new Error('WebSocket not connected')
    }

    const messages = [
      {
        role: 'user' as const,
        content: payload.content,
        parts: payload.parts,
      },
    ]

    const token = getToken()
    const wsPayload = {
      type: 'chat',
      messages,
      appId: chatStore.currentApp.id,
      clientId: chatStore.currentApp.clientId,
      sessionId: chatStore.sessionId,
      parts: payload.parts,
      token: token || undefined,
    }

    if (estimatePayloadBytes(wsPayload) > MAX_WS_MESSAGE_BYTES) {
      chatStore.setLoading(false)
      chatStore.setError('本次发送内容过大，请减少文本长度或附件大小后重试')
      throw new Error('本次发送内容过大，请减少文本长度或附件大小后重试')
    }

    chatStore.setLoading(true)
    chatStore.setError(null)
    chatStore.updateStreamingContent('')

    try {
      ws.value.send(JSON.stringify(wsPayload))
    } catch (error) {
      chatStore.setError((error as Error).message)
      chatStore.setLoading(false)
      throw error
    }
  }

  const healthCheck = async (): Promise<boolean> => {
    try {
      const response = await fetch(withAppBasePath(appBaseURL, 'api/health'))
      const data = await response.json()
      return data.status === 'ok'
    } catch {
      return false
    }
  }

  onBeforeUnmount(() => {
    disconnect()
  })

  return {
    connect,
    disconnect,
    sendMessage,
    healthCheck,
  }
}
