/**
 * GET /api/health
 * 健康检查端点
 */

import type { HealthResponse } from '~/types'

export default defineEventHandler(async (): Promise<HealthResponse> => {
  // 暂时模拟 gateway 状态，或根据实际情况实现健康检查
  const gatewayHealthy = true

  return {
    status: gatewayHealthy ? 'ok' : 'error',
    timestamp: Date.now(),
    uptime: process.uptime(),
    version: '1.0.0',
    services: {
      gateway: gatewayHealthy,
    },
  }
})
