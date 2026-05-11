/**
 * API 相关类型定义
 */

/** API 响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/** 分页参数 */
export interface PaginationParams {
  page: number
  limit: number
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

/** 健康检查响应 */
export interface HealthResponse {
  status: 'ok' | 'error'
  timestamp: number
  uptime: number
  version: string
  services?: Record<string, boolean>
}
