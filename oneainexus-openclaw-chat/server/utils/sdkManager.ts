/**
 * SDK 连接管理器
 * 管理来自 Channel 插件的 SDK 连接
 */

import type {
  SDKConnection,
  SDKConnectionStats,
  SDKConnectionState,
  SDKMessage,
  SDKAuthResult,
  SDKChatStreamChunk,
  SDKError,
} from '~/types'
import type { App } from '~/types'
import { useAppManager } from './appManager'

type MessageHandler = (message: SDKMessage, connection: SDKConnection) => Promise<void>

export class SDKConnectionManager {
  private connections = new Map<string, SDKConnection>()
  private messageHandlers: MessageHandler[] = []
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.startHeartbeat()
  }

  /**
   * 创建新连接
   */
  createConnection(app: App, sendFn?: (msg: string) => void): SDKConnection {
    const connectionId = crypto.randomUUID()
    const connection: SDKConnection = {
      id: connectionId,
      sessionId: crypto.randomUUID(),
      clientId: app.clientId,
      appId: app.id,
      state: 'connected',
      connectedAt: Date.now(),
      lastActivityAt: Date.now(),
      sendFn,
    }

    this.connections.set(connectionId, connection)
    console.log(`[SDK] 连接创建: ${connectionId} (app: ${app.clientId})`)

    return connection
  }

  /**
   * 获取连接
   */
  getConnection(connectionId: string): SDKConnection | undefined {
    return this.connections.get(connectionId)
  }

  /**
   * 更新连接状态
   */
  updateConnectionState(connectionId: string, state: SDKConnectionState): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection) return false

    connection.state = state
    connection.lastActivityAt = Date.now()
    return true
  }

  /**
   * 更新连接活动时间
   */
  updateActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.lastActivityAt = Date.now()
    }
  }

  /**
   * 移除连接
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.state = 'disconnected'
      this.connections.delete(connectionId)
      console.log(`[SDK] 连接移除: ${connectionId}`)
    }
  }

  /**
   * 注册消息处理器
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler)
    return () => {
      const index = this.messageHandlers.indexOf(handler)
      if (index > -1) {
        this.messageHandlers.splice(index, 1)
      }
    }
  }

  /**
   * 处理收到的消息
   */
  async handleMessage(connectionId: string, rawMessage: string): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      console.warn(`[SDK] 未找到连接: ${connectionId}`)
      return
    }

    this.updateActivity(connectionId)

    try {
      const message = JSON.parse(rawMessage) as SDKMessage

      // 调用所有处理器
      for (const handler of this.messageHandlers) {
        await handler(message, connection)
      }
    } catch (error) {
      console.error(`[SDK] 消息解析失败:`, error)
    }
  }

  /**
   * 发送消息到连接
   */
  sendMessage(connectionId: string, message: SDKMessage): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection || connection.state !== 'connected') {
      return false
    }

    // 实际发送
    if (connection.sendFn) {
      try {
        connection.sendFn(JSON.stringify(message))
      } catch (err) {
        console.error(`[SDK] 发送消息失败:`, err)
        return false
      }
    }
    
    this.updateActivity(connectionId)
    return true
  }

  /**
   * 广播消息到应用的所有连接
   */
  broadcastToApp(appId: string, message: SDKMessage): number {
    let count = 0
    for (const connection of this.connections.values()) {
      if (connection.appId === appId && connection.state === 'connected') {
        this.sendMessage(connection.id, message)
        count++
      }
    }
    return count
  }

  /**
   * 获取连接统计
   */
  getStats(): SDKConnectionStats {
    const stats: SDKConnectionStats = {
      totalConnections: this.connections.size,
      activeConnections: 0,
      connectionsByApp: {},
    }

    for (const connection of this.connections.values()) {
      if (connection.state === 'connected') {
        stats.activeConnections++
      }
      stats.connectionsByApp[connection.appId] =
        (stats.connectionsByApp[connection.appId] || 0) + 1
    }

    return stats
  }

  /**
   * 心跳检测
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now()
      const timeout = 60000 // 60 秒超时

      for (const [id, connection] of this.connections) {
        if (now - connection.lastActivityAt > timeout) {
          console.log(`[SDK] 连接超时: ${id}`)
          this.removeConnection(id)
        }
      }
    }, 30000)

    console.log('[SDK] 心跳检测已启动')
  }

  /**
   * 关闭管理器
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    for (const [id] of this.connections) {
      this.removeConnection(id)
    }

    console.log('[SDK] 连接管理器已关闭')
  }
}

// 单例实例
let sdkManagerInstance: SDKConnectionManager | null = null

/**
 * 获取 SDK 连接管理器
 */
export function useSDKManager(): SDKConnectionManager {
  if (!sdkManagerInstance) {
    sdkManagerInstance = new SDKConnectionManager()
  }
  return sdkManagerInstance
}
