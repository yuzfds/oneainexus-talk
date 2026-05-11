/**
 * 应用相关类型定义
 */

/** 应用状态 */
export type AppStatus = 'active' | 'disabled'

/** 应用实体 */
export interface App {
  id: string
  clientId: string
  clientSecret: string
  name: string
  description?: string
  ownerId: string
  status: AppStatus
  callbackUrls?: string[]
  createdAt: Date
  updatedAt: Date
}

/** 创建应用请求 */
export interface CreateAppRequest {
  name: string
  description?: string
}

/** 创建应用响应 */
export interface CreateAppResponse {
  success: boolean
  app?: {
    id: string
    clientId: string
    clientSecret: string
    name: string
    description?: string
    status: AppStatus
    createdAt: Date
  }
  error?: string
}

/** 应用信息（不包含敏感信息） */
export interface AppInfo {
  id: string
  clientId: string
  name: string
  description?: string
  status: AppStatus
  createdAt: Date
  updatedAt: Date
}

/** 认证结果 */
export interface AuthResult {
  success: boolean
  app?: App
  error?: string
}
