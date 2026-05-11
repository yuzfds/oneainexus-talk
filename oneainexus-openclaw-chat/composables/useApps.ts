/**
 * 应用管理 Composable
 */

import type { App, CreateAppRequest, CreateAppResponse } from '~/types'
import { withAppBasePath } from '~/utils/base-path'

interface AppsState {
  apps: App[]
  loading: boolean
  error: string | null
}

const state = reactive<AppsState>({
  apps: [],
  loading: false,
  error: null,
})

export function useApps() {
  const authStore = useAuthStore()
  const config = useRuntimeConfig()
  const apiPath = (path: string) => withAppBasePath(config.app.baseURL, path)
  // 从认证系统获取当前用户标识
  const ownerId = computed(() => authStore.user?.userName || 'default-user')
  const { getAuthHeaders } = useAuth()

  /**
   * 获取应用列表
   */
  async function fetchApps(): Promise<void> {
    state.loading = true
    state.error = null

    try {
      const response = await $fetch<{ success: boolean; data: App[] }>(apiPath('api/apps'), {
        headers: getAuthHeaders(),
      })

      if (response.success) {
        state.apps = response.data
      }
    } catch (e) {
      state.error = (e as Error).message
    } finally {
      state.loading = false
    }
  }

  /**
   * 获取单个应用详情
   */
  async function fetchApp(appId: string): Promise<App | null> {
    state.loading = true
    state.error = null

    try {
      const response = await $fetch<{ success: boolean; data: App }>(apiPath(`api/apps/${appId}`), {
        headers: getAuthHeaders(),
      })

      if (response.success) {
        return response.data
      }
      return null
    } catch (e) {
      state.error = (e as Error).message
      return null
    } finally {
      state.loading = false
    }
  }

  /**
   * 创建新应用
   */
  async function createApp(request: CreateAppRequest): Promise<CreateAppResponse | null> {
    state.loading = true
    state.error = null

    try {
      const response = await $fetch<CreateAppResponse>(apiPath('api/apps'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: request,
      })

      if (response.success && response.app) {
        // 将新应用添加到列表
        const newApp: App = {
          ...response.app,
          ownerId: ownerId.value,
          updatedAt: response.app.createdAt,
        }
        state.apps.push(newApp)
      }

      return response
    } catch (e) {
      state.error = (e as Error).message
      return null
    } finally {
      state.loading = false
    }
  }

  /**
   * 删除应用
   */
  async function deleteApp(appId: string): Promise<boolean> {
    state.loading = true
    state.error = null

    try {
      await $fetch(apiPath(`api/apps/${appId}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      state.apps = state.apps.filter((app) => app.id !== appId)
      return true
    } catch (e) {
      state.error = (e as Error).message
      return false
    } finally {
      state.loading = false
    }
  }

  /**
   * 更新应用状态
   */
  async function updateAppStatus(appId: string, status: 'active' | 'disabled'): Promise<boolean> {
    state.loading = true
    state.error = null

    try {
      await $fetch(apiPath(`api/apps/${appId}/status`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: { status },
      })

      const appIndex = state.apps.findIndex((app) => app.id === appId)
      if (appIndex !== -1) {
        const app = state.apps[appIndex]
        if (app) {
          app.status = status
          app.updatedAt = new Date()
        }
      }

      return true
    } catch (e) {
      state.error = (e as Error).message
      return false
    } finally {
      state.loading = false
    }
  }

  /**
   * 重新生成密钥
   */
  async function regenerateSecret(appId: string): Promise<string | null> {
    state.loading = true
    state.error = null

    try {
      const response = await $fetch<{ success: boolean; clientSecret?: string }>(
        apiPath(`api/apps/${appId}/regenerate-secret`),
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      )

      if (response.success && response.clientSecret) {
        return response.clientSecret
      }

      return null
    } catch (e) {
      state.error = (e as Error).message
      return null
    } finally {
      state.loading = false
    }
  }

  return {
    apps: toRef(state, 'apps'),
    loading: toRef(state, 'loading'),
    error: toRef(state, 'error'),
    fetchApps,
    fetchApp,
    createApp,
    deleteApp,
    updateAppStatus,
    regenerateSecret,
  }
}
