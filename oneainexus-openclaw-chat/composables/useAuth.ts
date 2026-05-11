/**
 * 认证工具 Composable
 * 本小姐设计的优雅认证方案！(￣▽￣)ﾉ
 * 支持调用外部认证服务验证用户身份
 */

import type { UserInfo } from '~/types'
import { withAppBasePath } from '~/utils/base-path'

const AUTH_TOKEN_KEY = 'Authentication'

export const useAuth = () => {
  const authStore = useAuthStore()
  const config = useRuntimeConfig()
  const authVerifyPath = withAppBasePath(config.app.baseURL, 'api/auth/verify')

  const readBrowserToken = (): string | null => {
    if (!import.meta.client) {
      return null
    }

    const directToken = localStorage.getItem(AUTH_TOKEN_KEY)
    if (directToken && directToken.trim()) {
      return directToken
    }

    const persistedState = localStorage.getItem('openclaw-auth')
    if (persistedState) {
      try {
        const parsed = JSON.parse(persistedState)
        const persistedToken = parsed?.token
        if (typeof persistedToken === 'string' && persistedToken.trim()) {
          return persistedToken
        }
      } catch {
        // Ignore invalid persisted JSON and continue.
      }
    }

    return null
  }

  /**
   * 初始化认证状态
   * 在应用启动时调用，自动读取并验证 token
   */
  const initAuth = async () => {
    authStore.initAuth()
  }

  /**
   * 使用 token 进行认证
   * 调用服务端代理接口验证 token
   */
  const authenticate = async (token: string): Promise<{ success: boolean; user?: UserInfo; error?: string }> => {
    authStore.setLoading(true)
    authStore.setError(null)

    try {
      const response = await $fetch<{ success: boolean; data: UserInfo }>(authVerifyPath, {
        method: 'POST',
        body: { token },
      })

      if (response.success && response.data) {
        // 保存认证信息
        authStore.setAuth(token, response.data)
        return { success: true, user: response.data }
      }

      return { success: false, error: 'Authentication failed' }
    } catch (error) {
      const errorMessage = (error as any).data?.message || (error as Error).message || 'Authentication failed'
      authStore.setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      authStore.setLoading(false)
    }
  }

  /**
   * 登出
   */
  const logout = () => {
    authStore.logout()
  }

  /**
   * 获取存储的认证 token
   */
  const getToken = (): string | null => {
    return authStore.token || readBrowserToken()
  }

  /**
   * 检查是否已认证
   */
  const isAuthenticated = (): boolean => {
    return authStore.isAuthenticated
  }

  /**
   * 获取当前用户信息
   */
  const getUser = (): UserInfo | null => {
    return authStore.user
  }

  /**
   * 获取认证请求头
   * 使用 Authentication 请求头（笨蛋的要求！）
   */
  const getAuthHeaders = (): Record<string, string> => {
    const token = getToken()
    console.log('[useAuth] getAuthHeaders - token:', token) // 调试日志
    if (!token) {
      return {}
    }
    return {
      Authentication: token,
    }
  }

  /**
   * 创建带认证的 fetch 配置
   * 用于原生 fetch 或 $fetch
   */
  const withAuth = <T extends { headers?: Record<string, string> }>(options: T = {} as T): T => {
    return {
      ...options,
      headers: {
        ...options.headers,
        ...getAuthHeaders(),
      },
    }
  }

  return {
    // 状态
    user: computed(() => authStore.user),
    token: computed(() => authStore.token),
    loading: computed(() => authStore.loading),
    error: computed(() => authStore.error),
    isAuthenticated: computed(() => authStore.isAuthenticated),

    // 方法
    initAuth,
    authenticate,
    logout,
    getToken,
    getUser,
    getAuthHeaders,
    withAuth,
  }
}
