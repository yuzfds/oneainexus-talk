/**
 * WebSocket 端点
 * 供 Channel 插件通过 SDK 连接
 *
 * 路径: /api/_ws
 */

import type { SDKMessage, SDKAuthResult, SDKChatReceived, SDKChatStreamChunk, SDKError } from '~/types'
import { useAppManager } from '../utils/appManager'
import { useSDKManager } from '../utils/sdkManager'
import { defineWebSocketHandler } from 'h3'

type WebSocketPeer = {
  id: string
  send: (message: string) => unknown
}

function isSocketClosedError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes('ECONNRESET') ||
    error.message.includes('WebSocket is not open') ||
    error.message.includes('already closed')
  )
}

async function safeSend(
  peer: WebSocketPeer,
  payload: unknown,
  onFailed?: () => void,
): Promise<boolean> {
  const message = typeof payload === 'string' ? payload : JSON.stringify(payload)
  try {
    await Promise.resolve(peer.send(message))
    return true
  } catch (error) {
    // 某些运行时下会出现“握手刚完成但发送仍短暂不可用”的瞬时错误，做一次轻量重试。
    if (isSocketClosedError(error)) {
      await new Promise((resolve) => setTimeout(resolve, 10))
      try {
        await Promise.resolve(peer.send(message))
        return true
      } catch (retryError) {
        console.error(`[WS] 重试发送仍失败: ${peer.id}`, retryError)
      }
    } else {
      console.error(`[WS] 发送消息失败: ${peer.id}`, error)
    }
    onFailed?.()
    return false
  }
}

// 消息类型守卫
function isAuthMessage(msg: SDKMessage): msg is SDKMessage & { type: 'auth' } {
  return msg.type === 'auth'
}

function isChatMessage(msg: SDKMessage): msg is SDKMessage & { type: 'chat' } {
  return msg.type === 'chat'
}

function isHeartbeat(msg: SDKMessage): msg is SDKMessage & { type: 'heartbeat' } {
  return msg.type === 'heartbeat'
}

export default defineWebSocketHandler({
  /**
   * 连接打开
   */
  async open(peer) {
    console.log(`[WS] 新连接: ${peer.id}`)

    // 发送欢迎消息
    const sent = await safeSend(peer, {
      type: 'connected',
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      data: {
        connectionId: peer.id,
        message: 'Please authenticate with your client credentials',
      },
    })
    console.log(`[WS] 发送 connected ${sent ? '成功' : '失败'}: ${peer.id}`)
  },

  /**
   * 收到消息
   */
  async message(peer, message) {
    const sdkManager = useSDKManager()
    const appManager = useAppManager()

    try {
      const rawMessage = message.text()
      const msg = JSON.parse(rawMessage) as SDKMessage

      console.log(`[WS] 收到消息: ${msg.type} from ${peer.id}`)

      // 处理认证
      if (isAuthMessage(msg)) {
        const { clientId, clientSecret } = msg.data
        const authResult = await appManager.authenticate(clientId, clientSecret)

        if (authResult.success && authResult.app) {
          // 创建 SDK 连接
          let connectionId = ''
          const connection = sdkManager.createConnection(authResult.app, (msg) => {
            void safeSend(peer, msg, () => {
              if (connectionId) {
                sdkManager.removeConnection(connectionId)
              }
            })
          })
          connectionId = connection.id

          // 发送认证成功
          const response: SDKAuthResult = {
            type: 'auth_result',
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            data: {
              success: true,
              sessionId: connection.sessionId,
            },
          }
          const sent = await safeSend(peer, response, () => sdkManager.removeConnection(connection.id))
          console.log(`[WS] 发送 auth_result(success=true) ${sent ? '成功' : '失败'}: ${peer.id}`)

          // 将连接信息存储到 peer
          ;(peer as any).meta = {
            ...(peer as any).meta,
            connectionId: connection.id,
            appId: authResult.app.id,
            sessionId: connection.sessionId,
          }

          console.log(`[WS] 认证成功: ${peer.id} -> ${connection.sessionId}`)
        } else {
          // 发送认证失败
          const response: SDKAuthResult = {
            type: 'auth_result',
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            data: {
              success: false,
              error: authResult.error || 'Authentication failed',
            },
          }
          const sent = await safeSend(peer, response)
          console.log(`[WS] 发送 auth_result(success=false) ${sent ? '成功' : '失败'}: ${peer.id}`)
        }
        return
      }

      // 检查是否已认证
      const meta = (peer as any).meta as { connectionId?: string; appId?: string; sessionId?: string } | undefined
      if (!meta?.connectionId) {
        const error: SDKError = {
          type: 'error',
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          data: {
            code: 'NOT_AUTHENTICATED',
            message: 'Please authenticate first',
          },
        }
        await safeSend(peer, error)
        return
      }

      // 更新活动时间
      sdkManager.updateActivity(meta.connectionId)

      // 转发消息给所有注册的监听器
      await sdkManager.handleMessage(meta.connectionId, rawMessage)

      // 处理心跳
      if (isHeartbeat(msg)) {
        await safeSend(peer, {
          type: 'heartbeat',
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          data: { timestamp: Date.now() },
        }, () => {
          if (meta.connectionId) {
            sdkManager.removeConnection(meta.connectionId)
          }
        })
        return
      }

      // 处理聊天消息
      if (isChatMessage(msg)) {
        // 这里将消息转发给聊天处理器
        // 实际的 AI 响应由 Channel 插件处理
        // 这里只是确认收到消息
        const ack: SDKChatReceived = {
          type: 'chat_received',
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          data: {
            sessionId: msg.data.sessionId || meta.sessionId || '',
            messageId: msg.id,
            received: true,
          },
        }
        await safeSend(peer, ack, () => {
          if (meta.connectionId) {
            sdkManager.removeConnection(meta.connectionId)
          }
        })
      }
    } catch (error) {
      console.error(`[WS] 消息处理错误:`, error)
      const errorResponse: SDKError = {
        type: 'error',
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        data: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      }
      await safeSend(peer, errorResponse)
    }
  },

  /**
   * 连接关闭
   */
  close(peer) {
    const sdkManager = useSDKManager()
    const meta = (peer as any).meta as { connectionId?: string } | undefined

    if (meta?.connectionId) {
      sdkManager.removeConnection(meta.connectionId)
    }

    console.log(`[WS] 连接关闭: ${peer.id}`)
  },

  /**
   * 错误处理
   */
  error(peer, error) {
    console.error(`[WS] 错误: ${peer.id}`, error)
  },
})
