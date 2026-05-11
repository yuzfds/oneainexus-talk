/**
 * POST /api/auth/verify
 * 认证代理接口
 * 使用 token 调用外部认证服务验证用户身份
 */

import type { AuthResponse, UserInfo } from '~/types'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { token } = body

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Token is required',
    })
  }

  const authApiUrl = config.authApiUrl
  if (!authApiUrl) {
    throw createError({
      statusCode: 500,
      message: 'Auth API URL is not configured',
    })
  }

  try {
    // 调用外部认证服务
    const response = await $fetch<AuthResponse>(authApiUrl, {
      method: 'GET',
      headers: {
        [config.authTokenHeader]: token,
      },
    })

    if (!response.success || response.code !== 'Ai.200') {
      throw createError({
        statusCode: 401,
        message: response.message || 'Authentication failed',
      })
    }

    // 返回用户信息
    return {
      success: true,
      data: response.data,
    }
  } catch (error) {
    // 如果是已经创建的错误，直接抛出
    if ((error as any).statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to connect to auth service',
    })
  }
})
