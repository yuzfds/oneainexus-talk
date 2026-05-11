/**
 * Types used by the OpenClaw Channel SDK bridge.
 */

import type { MessagePart } from './chat'

export type SDKConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export type SDKMessageType =
  | 'auth'
  | 'auth_result'
  | 'chat'
  | 'chat_received'
  | 'chat_stream'
  | 'session_create'
  | 'session_create_result'
  | 'session_delete'
  | 'session_delete_result'
  | 'heartbeat'
  | 'error'

export interface SDKBaseMessage {
  type: SDKMessageType
  id: string
  timestamp: number
}

export interface SDKAuthRequest extends SDKBaseMessage {
  type: 'auth'
  data: {
    clientId: string
    clientSecret: string
  }
}

export interface SDKAuthResult extends SDKBaseMessage {
  type: 'auth_result'
  data: {
    success: boolean
    sessionId?: string
    error?: string
  }
}

export interface SDKChatRequest extends SDKBaseMessage {
  type: 'chat'
  data: {
    sessionId: string
    messages: Array<{
      role: 'user' | 'assistant' | 'system'
      content?: string
      parts?: MessagePart[]
    }>
    stream?: boolean
  }
}

export interface SDKChatReceived extends SDKBaseMessage {
  type: 'chat_received'
  data: {
    sessionId: string
    messageId: string
    received: boolean
  }
}

export interface SDKChatStreamChunk extends SDKBaseMessage {
  type: 'chat_stream'
  content?: string
  parts?: MessagePart[]
  eventType?: string
  kind?: string
  event?: Record<string, unknown>
  data: {
    sessionId: string
    content?: string
    parts?: MessagePart[]
    done: boolean
    finishReason?: string
    eventType?: string
    kind?: string
    event?: Record<string, unknown>
  }
}

export interface SDKSessionDeleteRequest extends SDKBaseMessage {
  type: 'session_delete'
  data: {
    sessionId: string
  }
}

export interface SDKSessionCreateRequest extends SDKBaseMessage {
  type: 'session_create'
  data: {
    sessionId: string
    title?: string
  }
}

export interface SDKSessionCreateResult extends SDKBaseMessage {
  type: 'session_create_result'
  data: {
    success: boolean
    sessionId: string
    error?: string
  }
}

export interface SDKSessionDeleteResult extends SDKBaseMessage {
  type: 'session_delete_result'
  data: {
    success: boolean
    sessionId: string
    error?: string
  }
}

export interface SDKHeartbeat extends SDKBaseMessage {
  type: 'heartbeat'
  data: {
    timestamp: number
  }
}

export interface SDKError extends SDKBaseMessage {
  type: 'error'
  data: {
    code: string
    message: string
  }
}

export type SDKMessage =
  | SDKAuthRequest
  | SDKAuthResult
  | SDKChatRequest
  | SDKChatReceived
  | SDKChatStreamChunk
  | SDKSessionCreateRequest
  | SDKSessionCreateResult
  | SDKSessionDeleteRequest
  | SDKSessionDeleteResult
  | SDKHeartbeat
  | SDKError

export interface SDKConnection {
  id: string
  sessionId: string
  clientId: string
  appId: string
  state: SDKConnectionState
  connectedAt: number
  lastActivityAt: number
  sendFn?: (msg: string) => void
}

export interface SDKConnectionStats {
  totalConnections: number
  activeConnections: number
  connectionsByApp: Record<string, number>
}
