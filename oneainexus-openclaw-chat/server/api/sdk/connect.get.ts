/**
 * SSE 连接端点
 * 供 Channel 插件通过 SDK 建立 SSE 连接
 *
 * 路径: /api/sdk/connect
 */

import type { SDKAuthResult, SDKMessage } from '~/types'
import { useAppManager } from '../../utils/appManager'
import { useSDKManager } from '../../utils/sdkManager'
import { z } from 'zod'

const connectSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const appManager = useAppManager()
  const sdkManager = useSDKManager()

  // 从 query 参数获取认证信息
  const query = getQuery(event)
  const { client_id, client_secret } = connectSchema.parse(query)

  // 验证凭证
  const authResult = await appManager.authenticate(client_id, client_secret)

  if (!authResult.success || !authResult.app) {
    throw createError({
      statusCode: 401,
      message: authResult.error || 'Authentication failed',
    })
  }

  // 创建连接
  const connection = sdkManager.createConnection(authResult.app)

  // 设置 SSE 响应头
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // 发送事件
      const sendEvent = (event: string, data: unknown) => {
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch {
          // 连接已关闭
        }
      }

      // 发送认证成功
      const authResponse: SDKAuthResult = {
        type: 'auth_result',
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        data: {
          success: true,
          sessionId: connection.sessionId,
        },
      }
      sendEvent('auth_result', authResponse)

      // 心跳
      const heartbeatInterval = setInterval(() => {
        sendEvent('heartbeat', {
          type: 'heartbeat',
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          data: { timestamp: Date.now() },
        })
      }, 30000)

      // 清理
      event.node.req.on('close', () => {
        clearInterval(heartbeatInterval)
        sdkManager.removeConnection(connection.id)
        try {
          controller.close()
        } catch {
          // 已关闭
        }
      })
    },
  })

  return sendStream(event, stream)
})
