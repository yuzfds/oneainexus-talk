/**
 * GET /api/sse
 * SSE 连接端点（用于长连接心跳和推送）
 */

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const sessionId = query.sessionId as string

  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: 'Missing sessionId',
    })
  }

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
      let heartbeatInterval: ReturnType<typeof setInterval>

      // 发送事件
      const sendEvent = (event: string, data: unknown) => {
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch {
          // 连接已关闭
          clearInterval(heartbeatInterval)
        }
      }

      // 发送连接成功
      sendEvent('connected', { sessionId, timestamp: Date.now() })

      // 心跳检测
      heartbeatInterval = setInterval(() => {
        sendEvent('heartbeat', { timestamp: Date.now() })
      }, 30000)

      // 清理
      event.node.req.on('close', () => {
        clearInterval(heartbeatInterval)
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
