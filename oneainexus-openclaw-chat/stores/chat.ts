/**
 * 聊天状态 Store
 * 本小姐设计的优雅状态管理！(￣▽￣)ﾉ
 */

import { defineStore } from 'pinia'
import type { ChatMessage, App, MessagePart } from '~/types'
import { withAppBasePath } from '~/utils/base-path'

export interface ChatSession {
  sessionId: string
  title: string
  updatedAt: string
  unread?: boolean
}

function getEventString(event: Record<string, unknown> | undefined, key: string): string {
  const value = event?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function getEventNumber(event: Record<string, unknown> | undefined, key: string): number | null {
  const value = event?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function buildToolFallbackContent(eventType?: string, event?: Record<string, unknown>): string {
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

function normalizeToolEventKey(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  const index = value.indexOf(':')
  return index >= 0 && index < value.length - 1 ? value.slice(index + 1) : value
}

function getToolEventMergeKey(event?: Record<string, unknown>): string {
  if (!event) return ''
  const rawKey = getEventString(event, 'toolCallId')
    || getEventString(event, 'itemId')
    || getEventString(event, 'commandId')
  return normalizeToolEventKey(rawKey)
}

export const useChatStore = defineStore('chat', () => {
  const config = useRuntimeConfig()
  const apiPath = (path: string) => withAppBasePath(config.app.baseURL, path)

  // 状态
  const messages = ref<ChatMessage[]>([])
  const sessions = ref<ChatSession[]>([])
  const streamingContent = ref<string>('')
  const streamingParts = ref<MessagePart[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const sessionId = ref<string>(crypto.randomUUID())
  const isConnected = ref(false)
  const currentApp = ref<App | null>(null)

  // 添加用户消息
  const addUserMessage = (content: string, parts?: MessagePart[]) => {
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'user',
      content,
      parts,
      timestamp: Date.now(),
    })
  }

  // 添加 AI 消息
  const addAssistantMessage = (content: string, parts?: MessagePart[]) => {
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'robot',
      content,
      parts,
      timestamp: Date.now(),
      sessionId: sessionId.value,
    })
  }

  const addToolEventMessage = (
    content: string,
    eventType?: string,
    event?: Record<string, unknown>,
    parts?: MessagePart[],
  ) => {
    const safeEvent = event ? { ...event } : undefined
    const normalizedContent = content.trim() || buildToolFallbackContent(eventType, safeEvent)
    const hasParts = Array.isArray(parts) && parts.length > 0
    if (!normalizedContent && !hasParts) {
      return
    }

    messages.value.push({
      id: crypto.randomUUID(),
      role: 'tool',
      content: normalizedContent,
      parts,
      eventType,
      event: safeEvent,
      timestamp: Date.now(),
      sessionId: sessionId.value,
    })
  }

  // 更新流式内容
  const updateStreamingContent = (content: string, parts?: MessagePart[]) => {
    streamingContent.value = content
    if (parts !== undefined) {
      streamingParts.value = parts
    }
  }

  // 完成流式消息
  const finishStreaming = (content: string, parts?: MessagePart[]) => {
    const resolvedParts = parts ?? streamingParts.value
    if (content || resolvedParts.length) {
      addAssistantMessage(content, resolvedParts.length ? resolvedParts : undefined)
    }
    streamingContent.value = ''
    streamingParts.value = []
    isLoading.value = false
  }

  // 设置加载状态
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  // 设置错误
  const setError = (errorMessage: string | null) => {
    error.value = errorMessage
  }

  // 设置连接状态
  const setConnected = (connected: boolean) => {
    isConnected.value = connected
  }

  // 清空聊天
  const clearChat = () => {
    messages.value = []
    streamingContent.value = ''
    streamingParts.value = []
    error.value = null
    sessionId.value = crypto.randomUUID()
  }

  // 重置会话
  const resetSession = () => {
    sessionId.value = crypto.randomUUID()
  }

  // 设置当前应用
  const setCurrentApp = (app: App | null) => {
    // 只有当应用真正改变时，才重置 sessionId 和清空消息
    if (currentApp.value?.id !== app?.id) {
      currentApp.value = app
      if (app) {
        sessionId.value = crypto.randomUUID()
        messages.value = []
      }
    }
  }

  // 加载历史消息
  const loadHistory = async (appId: string) => {
    if (!appId || !sessionId.value) return
    
    setLoading(true)
    try {
      const response = await $fetch<{ success: boolean; data: ChatMessage[] }>(apiPath('api/chat/history'), {
        query: { appId, sessionId: sessionId.value, limit: 100 }
      })
      if (response.success && response.data) {
        messages.value = response.data
      }
    } catch (e) {
      console.error('[ChatStore] Failed to load history:', e)
    } finally {
      setLoading(false)
    }
  }

  // 获取会话列表
  const fetchSessions = async (appId: string) => {
    if (!appId) return
    try {
      const response = await $fetch<{ success: boolean; data: ChatSession[] }>(apiPath('api/chat/sessions'), {
        query: { appId }
      })
      if (response.success && response.data) {
        sessions.value = response.data
      }
    } catch (e) {
      console.error('[ChatStore] Failed to load sessions:', e)
    }
  }

  // 删除会话
  const deleteSession = async (appId: string, targetSessionId: string) => {
    try {
      const response = await $fetch<{ success: boolean }>(apiPath(`api/chat/sessions/${targetSessionId}`), {
        method: 'DELETE',
        query: { appId }
      })
      
      if (response.success) {
        // 从列表中移除
        sessions.value = sessions.value.filter(s => s.sessionId !== targetSessionId)
        
        // 如果删除的是当前会话，重置当前会话
        if (sessionId.value === targetSessionId) {
          resetSession()
          messages.value = []
        }
        return true
      }
      return false
    } catch (e) {
      console.error('[ChatStore] Failed to delete session:', e)
      return false
    }
  }

  return {
    // 状态
    messages,
    sessions,
    streamingContent,
    streamingParts,
    isLoading,
    error,
    sessionId,
    isConnected,
    currentApp,

    // 操作
    addUserMessage,
    addAssistantMessage,
    addToolEventMessage,
    updateStreamingContent,
    finishStreaming,
    setLoading,
    setError,
    setConnected,
    clearChat,
    resetSession,
    setCurrentApp,
    loadHistory,
    fetchSessions,
    deleteSession,
  }
}, {
  persist: {
    key: 'openclaw-chat-session',
    pick: ['sessionId', 'currentApp'], // 改为持久化 sessionId 和 currentApp
  },
})
