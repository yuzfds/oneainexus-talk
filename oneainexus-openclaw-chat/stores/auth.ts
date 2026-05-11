/**
 * 认证状态 Store
 * 本小姐设计的优雅认证状态管理！(￣▽￣)ﾉ
 */

import { defineStore } from 'pinia'
import type { UserInfo, AuthState } from '~/types'
import { withAppBasePath } from '~/utils/base-path'

const AUTH_TOKEN_KEY = 'Authentication'
const USER_INFO_KEY = 'UserInfo'

export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig()
  const authVerifyPath = withAppBasePath(config.app.baseURL, 'api/auth/verify')

  // 状态
  const isAuthenticated = ref(false)
  const user = ref<UserInfo | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

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
   * 从 localStorage 恢复状态，如果存在 token 则自动验证
   */
  const initAuth = () => {
    if (import.meta.client) {
      console.log('[AuthStore] initAuth - state:', { token: token.value, user: user.value, isAuthenticated: isAuthenticated.value })
      console.log('[AuthStore] initAuth - storage snapshot:', {
        authentication: localStorage.getItem(AUTH_TOKEN_KEY),
        persistedAuth: localStorage.getItem('openclaw-auth'),
      })
      
      // 如果 pinia-plugin-persistedstate 没有恢复状态，尝试从旧版 localStorage 恢复
      if (!token.value) {
        const legacyToken = readBrowserToken()
        const legacyUser = localStorage.getItem(USER_INFO_KEY)
        
        if (legacyToken) {
          console.log('[AuthStore] initAuth - migrating legacy state')
          token.value = legacyToken
          
          if (legacyUser && legacyUser !== 'undefined') {
            try {
              user.value = JSON.parse(legacyUser)
              isAuthenticated.value = true
            } catch (e) {
              console.warn('[AuthStore] initAuth - legacy user parse failed', e)
              verifyToken()
            }
          } else {
            verifyToken()
          }
          return
        }
      }

      if (token.value && !user.value) {
        console.log('[AuthStore] initAuth - token only, verifying...')
        verifyToken()
      } else if (!token.value) {
        console.log('[AuthStore] initAuth - no token found')
      } else {
        console.log('[AuthStore] initAuth - already authenticated')
      }
    }
  }

  /**
   * 验证 token
   * 调用服务端验证接口
   */
  const verifyToken = async () => {
    if (!token.value) return

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ success: boolean; data: UserInfo }>(authVerifyPath, {
        method: 'POST',
        body: { token: token.value },
      })

      if (response.success && response.data) {
        user.value = response.data
        isAuthenticated.value = true
      } else {
        // 服务端明确返回验证失败
        clearAuth()
      }
    } catch (error: any) {
      console.error('[AuthStore] verifyToken failed:', error)
      // 只有在明确是 401/403 等认证失败时才清除状态
      // 如果是 500 或网络错误，保留 token 以便后续重试
      const statusCode = error.response?.status || error.statusCode || error.data?.statusCode
      if (statusCode === 401 || statusCode === 403) {
        clearAuth()
      } else {
        // 网络错误或服务端错误，仅设置错误信息，不清除 token
        error.value = '无法验证身份，请检查网络或稍后重试'
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 设置认证信息
   */
  const setAuth = (authToken: string, userInfo: UserInfo) => {
    token.value = authToken
    user.value = userInfo
    isAuthenticated.value = true
    error.value = null

    // 为了兼容旧代码，保留原生 localStorage 写入
    if (import.meta.client) {
      localStorage.setItem(AUTH_TOKEN_KEY, authToken)
    }
  }

  /**
   * 清除认证信息
   */
  const clearAuth = () => {
    console.log('[AuthStore] clearAuth - triggered', new Error().stack)
    token.value = null
    user.value = null
    isAuthenticated.value = false
    error.value = null

    if (import.meta.client) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(USER_INFO_KEY)
    }
  }

  /**
   * 登出
   */
  const logout = () => {
    clearAuth()
  }

  /**
   * 设置加载状态
   */
  const setLoading = (isLoading: boolean) => {
    loading.value = isLoading
  }

  /**
   * 设置错误
   */
  const setError = (errorMessage: string | null) => {
    error.value = errorMessage
  }

  /**
   * 更新用户信息
   */
  const updateUser = (userInfo: Partial<UserInfo>) => {
    if (user.value) {
      user.value = { ...user.value, ...userInfo }
    }
  }

  return {
    // 状态
    isAuthenticated,
    user,
    token,
    loading,
    error,

    // 操作
    initAuth,
    setAuth,
    clearAuth,
    logout,
    setLoading,
    setError,
    updateUser,
  }
}, {
  persist: {
    key: 'openclaw-auth',
    pick: ['token', 'user', 'isAuthenticated'],
  },
})
