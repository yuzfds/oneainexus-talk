/**
 * 认证工具函数
 *
 * 本小姐帮你处理认证逻辑！(￣▽￣)ﾉ
 * 支持两种认证方式：
 * 1. 用户 Token 认证（从 Authentication 请求头读取）
 * 2. 应用凭证认证（client_id + client_secret）
 */

import type { App, UserInfo } from '~/types'
import type { H3Event } from 'h3'
import { useAppManager } from './appManager'

function isBase64EncodedAppCredential(value: string): boolean {
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf-8')
    const [clientId, clientSecret] = decoded.split(':')
    return Boolean(clientId && clientSecret)
  } catch {
    return false
  }
}

/**
 * 从请求中提取用户 Token
 * 从 Authentication 请求头读取
 */
function extractUserToken(event: H3Event): string | null {
  const config = useRuntimeConfig(event)
  const configuredHeader = (config.authTokenHeader || 'Authentication').toLowerCase()

  const configuredToken = getHeader(event, configuredHeader)
  if (configuredToken) {
    return configuredToken
  }

  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()

    // Reserve base64(client_id:client_secret) Bearer tokens for app auth.
    if (token && !isBase64EncodedAppCredential(token)) {
      return token
    }
  }

  return null
}

/**
 * 从请求中提取应用凭证
 * 支持多种认证方式：
 * 1. Authorization Header (Bearer/Basic)
 * 2. Query 参数 (client_id + client_secret)
 * 3. Query 参数 token (Bearer token 格式，用于 EventSource)
 */
function extractAppCredentials(event: H3Event): { clientId: string; clientSecret: string } | null {
  // 1. 从 Authorization Header 获取 (Bearer token 或 Basic auth)
  const authHeader = getHeader(event, 'authorization')

  if (authHeader) {
    // Bearer token 格式: client_id:client_secret (base64)
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8')
        const [clientId, clientSecret] = decoded.split(':')
        if (clientId && clientSecret) {
          return { clientId, clientSecret }
        }
      } catch {
        // 解析失败
      }
    }

    // Basic auth 格式
    if (authHeader.startsWith('Basic ')) {
      const token = authHeader.slice(6)
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8')
        const [clientId, clientSecret] = decoded.split(':')
        if (clientId && clientSecret) {
          return { clientId, clientSecret }
        }
      } catch {
        // 解析失败
      }
    }
  }

  // 2. 从 Query 参数获取 (支持 EventSource 等无法设置请求头的场景)
  const query = getQuery(event)
  if (query.client_id && query.client_secret) {
    return {
      clientId: query.client_id as string,
      clientSecret: query.client_secret as string,
    }
  }

  // 3. 从 Query 参数的 token 字段获取 (Bearer token 格式)
  // 用于 EventSource 等无法设置请求头的场景
  if (query.token) {
    try {
      const decoded = Buffer.from(query.token as string, 'base64').toString('utf-8')
      const [clientId, clientSecret] = decoded.split(':')
      if (clientId && clientSecret) {
        return { clientId, clientSecret }
      }
    } catch {
      // 解析失败
    }
  }

  return null
}

/**
 * 验证用户 Token
 * 调用外部认证服务验证
 */
async function verifyUserToken(token: string, event: H3Event): Promise<UserInfo> {
  const config = useRuntimeConfig(event)
  const authApiUrl = config.authApiUrl
  const tokenHeader = config.authTokenHeader || 'Authentication'

  if (!authApiUrl) {
    throw createError({
      statusCode: 500,
      message: 'Auth API URL not configured',
    })
  }

  try {
    const response = await $fetch<{
      code: string
      data: UserInfo
      message: string
      responseCode: number
      success: boolean
    }>(authApiUrl, {
      method: 'GET',
      headers: {
        [tokenHeader]: token,
      },
    })

    if (!response.success || response.code !== 'Ai.200') {
      throw createError({
        statusCode: 401,
        message: response.message || 'Token verification failed',
      })
    }

    return response.data
  } catch (error: any) {
    // 如果是已创建的 H3 错误，直接抛出
    if (error.statusCode) {
      throw error
    }

    // 网络错误等
    throw createError({
      statusCode: 503,
      message: 'Auth service unavailable',
    })
  }
}

/**
 * 认证结果类型
 */
export interface AuthResult {
  type: 'user' | 'app'
  user?: UserInfo
  app?: App
}

/**
 * 要求认证并返回认证结果
 * 优先使用用户 Token 认证，其次使用应用凭证认证
 */
export async function requireAuth(event: H3Event): Promise<AuthResult> {
  // 1. 优先尝试用户 Token 认证
  const userToken = extractUserToken(event)
  if (userToken) {
    const user = await verifyUserToken(userToken, event)
    event.context.user = user
    return { type: 'user', user }
  }

  // 2. 尝试应用凭证认证
  const appCredentials = extractAppCredentials(event)
  if (appCredentials) {
    const appManager = useAppManager()
    const result = await appManager.authenticate(appCredentials.clientId, appCredentials.clientSecret)

    if (!result.success) {
      throw createError({
        statusCode: 401,
        message: result.error || 'Authentication failed',
      })
    }

    event.context.app = result.app
    return { type: 'app', app: result.app! }
  }

  // 没有提供任何认证信息
  throw createError({
    statusCode: 401,
    message: 'Missing authentication credentials',
  })
}

/**
 * 获取已认证的用户（可选认证）
 */
export async function getAuth(event: H3Event): Promise<AuthResult | null> {
  try {
    // 1. 优先尝试用户 Token 认证
    const userToken = extractUserToken(event)
    if (userToken) {
      const user = await verifyUserToken(userToken, event)
      event.context.user = user
      return { type: 'user', user }
    }

    // 2. 尝试应用凭证认证
    const appCredentials = extractAppCredentials(event)
    if (appCredentials) {
      const appManager = useAppManager()
      const result = await appManager.authenticate(appCredentials.clientId, appCredentials.clientSecret)

      if (result.success) {
        event.context.app = result.app
        return { type: 'app', app: result.app! }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * 仅要求用户认证
 */
export async function requireUserAuth(event: H3Event): Promise<UserInfo> {
  const userToken = extractUserToken(event)

  if (!userToken) {
    throw createError({
      statusCode: 401,
      message: 'Missing user authentication token',
    })
  }

  const user = await verifyUserToken(userToken, event)
  event.context.user = user
  return user
}

/**
 * 仅要求应用认证
 */
export async function requireAppAuth(event: H3Event): Promise<App> {
  const appCredentials = extractAppCredentials(event)

  if (!appCredentials) {
    throw createError({
      statusCode: 401,
      message: 'Missing application credentials',
    })
  }

  const appManager = useAppManager()
  const result = await appManager.authenticate(appCredentials.clientId, appCredentials.clientSecret)

  if (!result.success) {
    throw createError({
      statusCode: 401,
      message: result.error || 'Authentication failed',
    })
  }

  event.context.app = result.app
  return result.app!
}
