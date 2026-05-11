/**
 * SSE 连接 Composable
 * 用于建立长连接和心跳检测
 */

import { ConnectionState } from '~/types'
import { withAppBasePath } from '~/utils/base-path'

interface SSEOptions {
  sessionId: string
  onMessage?: (data: unknown) => void
  onError?: (error: Error) => void
  onStateChange?: (state: ConnectionState) => void
}

export const useSSE = () => {
  const config = useRuntimeConfig()
  const appBaseURL = config.app.baseURL
  const { getToken } = useAuth()
  let eventSource: EventSource | null = null

  /**
   * 建立 SSE 连接
   * EventSource 不支持自定义请求头，所以通过 query 参数传递 token
   */
  const connect = (options: SSEOptions) => {
    const { sessionId, onMessage, onError, onStateChange } = options

    if (eventSource) {
      eventSource.close()
    }

    onStateChange?.(ConnectionState.Connecting)

    const token = getToken()
    const params = new URLSearchParams({ sessionId })
    if (token) {
      params.set('token', token)
    }
    const url = `${withAppBasePath(appBaseURL, 'api/sse')}?${params.toString()}`
    eventSource = new EventSource(url)

    eventSource.onopen = () => {
      onStateChange?.(ConnectionState.Connected)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage?.(data)
      } catch {
        // 忽略解析错误
      }
    }

    eventSource.onerror = () => {
      onStateChange?.(ConnectionState.Error)
      onError?.(new Error('SSE 连接错误'))
      eventSource?.close()
      eventSource = null
    }

    return eventSource
  }

  /**
   * 断开连接
   */
  const disconnect = () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }

  return {
    connect,
    disconnect,
  }
}
